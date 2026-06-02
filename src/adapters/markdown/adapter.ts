import { promises as fs } from "node:fs";
import path from "node:path";

import {
  FrontmatterSchema,
  asAtomId,
  asLedger,
  type Atom,
  type AtomDraft,
  type AtomId,
  type Ledger,
} from "../../domain/index.ts";
import type { CurrentFilter, ReadPort } from "../../ports/read.ts";
import type { WritePort } from "../../ports/write.ts";
import { joinFrontmatter, splitFrontmatter } from "./fence.ts";
import { parseFrontmatterYaml, stringifyFrontmatter } from "./yaml.ts";

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

export class MarkdownLedgerAdapter implements ReadPort, WritePort {
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
      cursor = next ? extractAtomIdFromWikilink(next) : null;
    }
    return chain;
  }

  async findBySlug(slug: string): Promise<Atom | null> {
    const target = normalizeSlug(slug);
    const atoms = await this.readAllAtoms();
    const match =
      atoms.find((a) => a.frontmatter.status === "current" && hasAlias(a, target)) ??
      atoms.find((a) => hasAlias(a, target));
    if (match === undefined) return null;
    // Walk to the head so a slug always resolves current, even if a ledger
    // bug left the alias on a superseded atom instead of its successor.
    const chain = await this.walkLineage(asAtomId(match.frontmatter.id));
    return chain[chain.length - 1]!;
  }

  async listCurrent(filter: CurrentFilter = {}): Promise<Atom[]> {
    const atoms = await this.readAllAtoms();
    return atoms
      .filter(
        (a) =>
          a.frontmatter.status === "current" &&
          (filter.area === undefined || a.frontmatter.area === filter.area) &&
          (filter.topic === undefined || a.frontmatter.topic === filter.topic),
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

  async captureAtom(draft: AtomDraft): Promise<AtomId> {
    const id = draft.frontmatter.id ?? (await this.mintNextId());
    const frontmatter = { ...draft.frontmatter, id };
    const parsed = FrontmatterSchema.parse(frontmatter);

    const slug = slugifyTitle(parsed.title);
    const filename = `${id}-${slug}.md`;
    const target = path.join(this.ledger, filename);

    const yaml = stringifyFrontmatter(parsed as unknown as Record<string, unknown>);
    const body = draft.body.startsWith("\n") ? draft.body : `\n${draft.body}`;
    const file = joinFrontmatter(yaml, body);

    await fs.mkdir(this.ledger, { recursive: true });
    await fs.writeFile(target, file, "utf8");
    return asAtomId(id);
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
  // keep going. Targeted reads (getAtom / resolve <id>) still throw, so a direct
  // lookup of a bad atom surfaces the validation error.
  private async readAllAtoms(): Promise<Atom[]> {
    const entries = await this.listMarkdownFiles();
    const atoms: Atom[] = [];
    for (const name of entries) {
      const file = path.join(this.ledger, name);
      try {
        atoms.push(await this.readAtomFile(file));
      } catch (err) {
        if (err instanceof AtomValidationError) {
          const detail = err.issues.map((i) => `${i.path}: ${i.message}`).join("; ");
          console.warn(`ndr: skipping malformed atom ${name} (${detail})`);
          continue;
        }
        throw err;
      }
    }
    return atoms;
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

  private async mintNextId(): Promise<string> {
    const entries = await this.listMarkdownFiles();
    let max = 0;
    for (const name of entries) {
      const m = /^(\d{4})-/.exec(name);
      if (m) {
        const n = Number.parseInt(m[1]!, 10);
        if (n > max) max = n;
      }
    }
    return String(max + 1).padStart(4, "0");
  }
}

// Slugs are stored in `aliases:` with an `ndr-` namespace prefix (ndr:0050),
// but referenced without it (`ndr:#monorepo-shape`, ndr:0049). Normalize the
// prefix away on both sides so either form matches.
function normalizeSlug(value: string): string {
  return value.toLowerCase().replace(/^ndr-/, "");
}

function hasAlias(atom: Atom, normalizedTarget: string): boolean {
  return atom.frontmatter.aliases.some((alias) => normalizeSlug(alias) === normalizedTarget);
}

function extractAtomIdFromWikilink(link: string): AtomId | null {
  const cleaned = link.replace(/^\[\[|\]\]$/g, "");
  const tail = cleaned.split("/").pop() ?? cleaned;
  const m = /^(\d{4})(?:-|$)/.exec(tail);
  return m ? asAtomId(m[1]!) : null;
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
