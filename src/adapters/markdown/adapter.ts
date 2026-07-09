import { promises as fs } from "node:fs";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import {
  FrontmatterSchema,
  asAtomId,
  asLedger,
  extractAtomIdFromRef,
  generateAtomId,
  type Atom,
  type AtomDraft,
  type AtomId,
  type Frontmatter,
  type Ledger,
  type LedgerScan,
  type MalformedFile,
  type ScannedAtom,
  type Taxonomy,
} from "../../domain/index.ts";
import type { DoctorPort } from "../../ports/doctor.ts";
import type { CurrentFilter, ReadPort } from "../../ports/read.ts";
import type { CaptureResult, SupersededRecord, WritePort } from "../../ports/write.ts";
import { joinFrontmatter, splitFrontmatter } from "./fence.ts";
import { appendToSequence, parseFrontmatterYaml, stringifyFrontmatter } from "./yaml.ts";

export class AtomValidationError extends Error {
  readonly file: string;
  readonly issues: readonly { path: string; message: string }[];

  constructor(file: string, issues: readonly { path: string; message: string }[]) {
    super(
      `Atom at ${file} failed schema validation:\n` +
        issues.map((i) => `  - ${i.path}: ${i.message}`).join("\n"),
    );
    this.file = file;
    this.issues = issues;
  }
}

export class AtomNotFoundError extends Error {
  constructor(id: string) {
    super(`No atom with id ${id} found in ledger`);
  }
}

// Capture rejected before any write — required fields, enums, taxonomy, binds
// glob syntax, or a dangling/unreadable supersedes reference. Maps to CLI exit
// code 1.
export class DraftValidationError extends Error {
  readonly messages: readonly string[];

  constructor(messages: readonly string[]) {
    super(`Draft validation failed:\n${messages.map((m) => `  - ${m}`).join("\n")}`);
    this.messages = messages;
  }
}

// A predecessor is already superseded by a different atom — refuse cleanly
// before writing anything. Maps to CLI exit code 2.
export class SupersessionConflictError extends Error {
  readonly messages: readonly string[];

  constructor(messages: readonly string[]) {
    super(`Supersession conflict:\n${messages.map((m) => `  - ${m}`).join("\n")}`);
    this.messages = messages;
  }
}

export interface HalfState {
  readonly successor_written: string;
  readonly superseded_so_far: readonly SupersededRecord[];
  readonly failed_predecessor: string;
}

// The successor was written but a predecessor patch failed mid-transaction. The
// successor exists and is discoverable (overcount, never undercount — ndr:0051);
// the half-state names what was written vs patched. Maps to CLI exit code 3.
export class HalfStateError extends Error {
  readonly halfState: HalfState;

  constructor(halfState: HalfState, cause: unknown) {
    super(
      `Capture left a half-state: successor ${halfState.successor_written} was written, ` +
        `but patching predecessor ${halfState.failed_predecessor} failed: ` +
        `${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.halfState = halfState;
  }
}

// A predecessor read during pre-flight, carried into the write phase so the patch
// preserves the original frontmatter shape (key order, no injected defaults).
interface PredecessorState {
  readonly id: string;
  readonly filename: string;
  readonly data: Record<string, unknown>;
  readonly body: string;
}

export class MarkdownLedgerAdapter implements ReadPort, WritePort, DoctorPort {
  readonly ledger: Ledger;

  constructor(ledgerPath: string) {
    this.ledger = asLedger(path.resolve(ledgerPath));
  }

  async getAtom(id: AtomId): Promise<Atom> {
    const file = await this.findFileForId(id);
    if (file === null) {
      throw new AtomNotFoundError(id);
    }
    return await this.readAtomFile(file);
  }

  async getAtomFilename(id: AtomId): Promise<string | null> {
    const file = await this.findFileForId(id);
    return file ? path.basename(file) : null;
  }

  // Raw on-disk text for a single atom, frontmatter included — frozen, with no
  // supersession walk. Backs `ndr show <atom-id>`, whose contract is to be
  // byte-equivalent to reading the file directly (ndr:0136 successor).
  async getRawAtom(id: AtomId): Promise<string> {
    const file = await this.findFileForId(id);
    if (file === null) {
      throw new AtomNotFoundError(id);
    }
    return await fs.readFile(file, "utf8");
  }

  async walkLineage(id: AtomId): Promise<Atom[]> {
    const chain: Atom[] = [];
    const seen = new Set<string>();
    let cursor: AtomId | null = id;
    while (cursor !== null) {
      if (seen.has(cursor)) {
        throw new Error(`Cycle detected in supersession chain at ${cursor}`);
      }
      seen.add(cursor);
      const atom = await this.getAtom(cursor);
      chain.push(atom);
      const next = atom.frontmatter.superseded_by[0];
      cursor = next ? extractAtomIdFromRef(next) : null;
    }
    return chain;
  }

  async listCurrent(filter: CurrentFilter = {}): Promise<Atom[]> {
    const atoms = await this.readAllAtoms();
    return atoms
      .filter(
        (a) =>
          a.frontmatter.status === "current" &&
          (filter.label === undefined || a.frontmatter.labels.includes(filter.label)),
      )
      .sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
  }

  async searchFreeText(query: string): Promise<Atom[]> {
    const needle = query.toLowerCase();
    const atoms = await this.readAllAtoms();
    return atoms.filter(
      (a) =>
        a.body.toLowerCase().includes(needle) || a.frontmatter.title.toLowerCase().includes(needle),
    );
  }

  async captureAtom(draft: AtomDraft): Promise<CaptureResult> {
    // 1. Mint an id if the draft omits one, apply capture-intent defaults for
    //    the fields a fresh decision almost always carries (the shared schema
    //    stays strict so on-disk reads are unaffected), then validate.
    const id = draft.frontmatter.id ?? (await this.mintFreshId());
    const parsed = this.validateDraft(withCaptureDefaults({ ...draft.frontmatter, id }));

    // 2. Taxonomy gate — labels must be in the on-disk taxonomy (ndr:0144
    //    keeps the human axis in slugs/taxonomy now that ids are opaque).
    await this.assertTaxonomy(parsed.labels);

    // 3. Pre-flight every predecessor before touching disk: a dangling reference is
    //    exit 1, an already-superseded predecessor is a clean exit-2 refusal. No
    //    orphan successor — only genuine mid-write failures leave a half-state.
    const predecessors = await this.preflightSupersession(parsed.supersedes);

    // 4. Advisories: non-blocking warnings composed before the write so both
    //    kinds land in the same result (binds narrowing, cross-author
    //    supersession). Exit code stays 0 — these are prompts, not gates.
    const advisories: string[] = [];
    for (const pred of predecessors) {
      const predBinds = Array.isArray(pred.data.binds)
        ? pred.data.binds.filter((b): b is string => typeof b === "string")
        : [];
      const uncovered = predBinds.filter((b) => !parsed.binds.includes(b));
      if (uncovered.length > 0) {
        advisories.push(
          `successor narrows predecessor ${pred.id}'s binding: [${uncovered.join(", ")}] — intentional?`,
        );
      }
      const predAuthor = typeof pred.data.author === "string" ? pred.data.author : null;
      if (predAuthor !== null && predAuthor !== parsed.author) {
        advisories.push(
          `superseding a decision authored by ${predAuthor} — flag them before merging`,
        );
      }
    }

    // 5. Write the successor FIRST (ndr:0051 ordering) so a crash overcounts
    //    rather than drops.
    const filename = `${id}-${slugifyTitle(parsed.title)}.md`;
    const body = patchBodyPlaceholder(draft.body, id);
    await this.writeAtomFile(filename, parsed, body);

    // 6. Patch each predecessor: flip to superseded, add the plain-id back-link.
    //    A failure here is a reported half-state, not a silent drop.
    const superseded: SupersededRecord[] = [];
    for (const pred of predecessors) {
      try {
        await this.patchPredecessor(pred, id);
      } catch (err) {
        throw new HalfStateError(
          {
            successor_written: filename,
            superseded_so_far: superseded,
            failed_predecessor: pred.filename,
          },
          err,
        );
      }
      superseded.push({ id: pred.id, path: pred.filename });
    }

    return { id: asAtomId(id), path: filename, superseded, advisories };
  }

  // Validate the draft frontmatter against the schema, then gate `binds` on
  // glob syntax only — no must-match-a-file rule, since a fresh binding can
  // legitimately point at code that doesn't exist yet.
  private validateDraft(candidate: Record<string, unknown>): Frontmatter {
    const result = FrontmatterSchema.safeParse(candidate);
    if (!result.success) {
      throw new DraftValidationError(
        result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
      );
    }
    const badGlobs = result.data.binds.filter((p) => {
      try {
        new Bun.Glob(p).match("probe");
        return false;
      } catch {
        return true;
      }
    });
    if (badGlobs.length > 0) {
      throw new DraftValidationError(badGlobs.map((p) => `binds glob \`${p}\` is not parseable`));
    }
    return result.data;
  }

  private async assertTaxonomy(labels: readonly string[]): Promise<void> {
    const known = await this.readTaxonomyList(path.join(this.ledger, ".taxonomy", "labels.yaml"));
    const errors = labels
      .filter((l) => !known.includes(l))
      .map((l) => `label \`${l}\` not in taxonomy labels [${known.join(", ")}]`);
    if (errors.length > 0) throw new DraftValidationError(errors);
  }

  private async readTaxonomyList(file: string): Promise<string[]> {
    let raw: string;
    try {
      raw = await fs.readFile(file, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new DraftValidationError([`taxonomy file missing: ${file}`]);
      }
      throw err;
    }
    const parsed: unknown = parseYaml(raw);
    if (!Array.isArray(parsed)) {
      throw new DraftValidationError([`taxonomy file ${file} must be a YAML list`]);
    }
    return parsed.filter((x): x is string => typeof x === "string");
  }

  private async preflightSupersession(links: readonly string[]): Promise<PredecessorState[]> {
    const out: PredecessorState[] = [];
    const errors: string[] = [];
    const conflicts: string[] = [];

    for (const link of links) {
      const predId = extractAtomIdFromRef(link);
      if (predId === null) {
        errors.push(`supersedes entry \`${link}\` is not a recognizable atom reference`);
        continue;
      }
      const file = await this.findFileForId(predId);
      if (file === null) {
        errors.push(`predecessor ${predId} (from \`${link}\`) not found in ledger`);
        continue;
      }
      let data: Record<string, unknown>;
      let body: string;
      try {
        const raw = await fs.readFile(file, "utf8");
        const split = splitFrontmatter(raw);
        const parsedFm = parseFrontmatterYaml(split.yaml);
        data = (parsedFm.data ?? {}) as Record<string, unknown>;
        body = split.body;
      } catch (err) {
        errors.push(
          `predecessor ${predId} could not be read: ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }

      if (data.status === "superseded") {
        const by = Array.isArray(data.superseded_by) ? data.superseded_by : [];
        conflicts.push(
          `predecessor ${predId} is already superseded by ${JSON.stringify(by)} — refusing to add a competing successor`,
        );
        continue;
      }

      out.push({ id: predId, filename: path.basename(file), data, body });
    }

    // Dangling/unreadable references are the more fundamental error — surface them
    // (exit 1) before a conflict refusal (exit 2).
    if (errors.length > 0) throw new DraftValidationError(errors);
    if (conflicts.length > 0) throw new SupersessionConflictError(conflicts);
    return out;
  }

  private async writeAtomFile(
    filename: string,
    frontmatter: Frontmatter,
    body: string,
  ): Promise<void> {
    const yaml = stringifyFrontmatter(frontmatter as unknown as Record<string, unknown>);
    const normalizedBody = body.startsWith("\n") ? body : `\n${body}`;
    const file = joinFrontmatter(yaml, normalizedBody);
    await fs.mkdir(this.ledger, { recursive: true });
    try {
      // `wx` refuses to clobber — a freshly minted id should never collide, but
      // guard against it rather than silently overwriting an existing atom.
      await fs.writeFile(path.join(this.ledger, filename), file, { encoding: "utf8", flag: "wx" });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") {
        throw new Error(`target already exists: ${filename}`);
      }
      throw err;
    }
  }

  // Patch the raw parsed frontmatter (not the schema-shaped object) so the
  // predecessor keeps its original key order and gains no injected defaults.
  // The back-link is the plain successor id (ndr:0144 drops wikilinks).
  private async patchPredecessor(pred: PredecessorState, successorId: string): Promise<void> {
    const data: Record<string, unknown> = { ...pred.data };
    data.status = "superseded";
    const backlinks = Array.isArray(data.superseded_by) ? [...data.superseded_by] : [];
    if (!backlinks.includes(successorId)) backlinks.push(successorId);
    data.superseded_by = backlinks;
    const yaml = stringifyFrontmatter(data);
    const bodyBlock = pred.body.startsWith("\n") ? pred.body : `\n${pred.body}`;
    await fs.writeFile(
      path.join(this.ledger, pred.filename),
      joinFrontmatter(yaml, bodyBlock),
      "utf8",
    );
  }

  private async findFileForId(id: AtomId): Promise<string | null> {
    const entries = await this.listMarkdownFiles();
    const prefix = `${id}-`;
    const match = entries.find((name) => name.startsWith(prefix));
    return match ? path.join(this.ledger, match) : null;
  }

  private async readAtomFile(file: string): Promise<Atom> {
    const raw = await fs.readFile(file, "utf8");
    const { yaml, body } = splitFrontmatter(raw);
    const { data } = parseFrontmatterYaml(yaml);
    const result = FrontmatterSchema.safeParse(data);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      throw new AtomValidationError(file, issues);
    }
    return { frontmatter: result.data, body };
  }

  // Bulk read for the corpus-wide verbs (search, current, slug lookup). A single
  // malformed atom must not abort the whole command — skip it with a warning and
  // keep going (ndr:0138). Targeted reads (getAtom / resolve <id>) still throw,
  // so a direct lookup of a bad atom surfaces the validation error.
  private async readAllAtoms(): Promise<Atom[]> {
    const scan = await this.scanLedger();
    for (const m of scan.malformed) {
      console.warn(`ndr: skipping malformed atom ${m.path} (${m.reason})`);
    }
    return scan.atoms.map((a) => ({ frontmatter: a.frontmatter, body: a.body }));
  }

  // Full ledger sweep for `ndr doctor`: every markdown file lands either in
  // `atoms` (schema-valid) or `malformed` (fence/YAML failure or schema
  // rejection) — nothing is dropped. Raw frontmatter data rides along on
  // schema rejections so the domain layer can classify missing required
  // fields apart from other violations.
  async scanLedger(): Promise<LedgerScan> {
    const atoms: ScannedAtom[] = [];
    const malformed: MalformedFile[] = [];
    for (const name of await this.listMarkdownFiles()) {
      const raw = await fs.readFile(path.join(this.ledger, name), "utf8");

      let data: unknown;
      let body: string;
      try {
        const split = splitFrontmatter(raw);
        data = parseFrontmatterYaml(split.yaml).data;
        body = split.body;
      } catch (err) {
        malformed.push({
          path: name,
          kind: "parse_error",
          // Collapse multi-line parser context — findings are one line each.
          reason: (err instanceof Error ? err.message : String(err)).replace(/\s+/g, " ").trim(),
          data: null,
        });
        continue;
      }

      const result = FrontmatterSchema.safeParse(data);
      if (!result.success) {
        malformed.push({
          path: name,
          kind: "schema_invalid",
          reason: result.error.issues
            .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
            .join("; "),
          data:
            typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null,
        });
        continue;
      }

      atoms.push({ path: name, frontmatter: result.data, body });
    }
    return { atoms, malformed };
  }

  // Taxonomy for doctor checks. Unlike the capture-time gate (which refuses the
  // write), a missing or unreadable taxonomy here returns null so the sweep
  // proceeds with taxonomy checks skipped.
  async readTaxonomy(): Promise<Taxonomy | null> {
    try {
      return {
        labels: await this.readTaxonomyList(path.join(this.ledger, ".taxonomy", "labels.yaml")),
      };
    } catch (err) {
      if (err instanceof DraftValidationError) return null;
      throw err;
    }
  }

  // The one auto-fixable doctor repair: append the successor id to a
  // predecessor's `superseded_by:`. Mutates only that node of the parsed YAML
  // document so untouched frontmatter keeps its original formatting (ndr:0134).
  // Idempotent — a link that is already present is left alone.
  async repairBackPointer(predecessorPath: string, successorId: string): Promise<void> {
    const file = path.join(this.ledger, predecessorPath);
    const raw = await fs.readFile(file, "utf8");
    const { yaml, body } = splitFrontmatter(raw);
    const { doc } = parseFrontmatterYaml(yaml);
    appendToSequence(doc, "superseded_by", successorId);
    await fs.writeFile(file, joinFrontmatter(doc.toString(), body), "utf8");
  }

  private async listMarkdownFiles(): Promise<string[]> {
    let entries: string[];
    try {
      entries = await fs.readdir(this.ledger);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
    return entries.filter((name) => name.endsWith(".md") && !name.startsWith("."));
  }

  // Mint a fresh base32 id (ndr:0144), re-rolling on the vanishingly unlikely
  // event of a same-ledger collision before the write would clobber.
  private async mintFreshId(): Promise<string> {
    const taken = new Set<string>();
    for (const name of await this.listMarkdownFiles()) {
      const m = /^([0-9a-z]+)-/.exec(name);
      if (m) taken.add(m[1]!);
    }
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const id = generateAtomId();
      if (!taken.has(id)) return id;
    }
    throw new Error("could not mint a collision-free atom id after 8 attempts");
  }
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Capture-intent defaults: a fresh decision almost always carries these exact
// values, so the capture path supplies them when a draft omits the field. The
// shared FrontmatterSchema stays strict (no `.default` on status/supersedes) so
// on-disk atom reads still require them — only inbound drafts get the shortcut.
function withCaptureDefaults(fm: Record<string, unknown>): Record<string, unknown> {
  return {
    status: "current",
    supersedes: [],
    ...fm,
  };
}

// The drafter leaves a literal `# PLACEHOLDER —` heading; stamp the real id in
// once it is assigned. String.replace hits only the first occurrence (as in
// persist.py) so a body that legitimately mentions "PLACEHOLDER" elsewhere is
// left untouched.
function patchBodyPlaceholder(body: string, id: string): string {
  return body.replace("# PLACEHOLDER —", `# ${id} —`).replace("# PLACEHOLDER -", `# ${id} -`);
}
