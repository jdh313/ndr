import { Command } from "commander";

import {
  AtomNotFoundError,
  DraftValidationError,
  HalfStateError,
  MarkdownLedgerAdapter,
  SupersessionConflictError,
} from "../adapters/markdown/adapter.ts";
import {
  DEFAULT_LEDGER_PATH,
  RepoConfigError,
  findRepoConfig,
  resolveLedgerPath,
} from "./config.ts";
import type {
  Atom,
  AtomDraft,
  CheckClass,
  DoctorReport,
  RepairCandidate,
} from "../domain/index.ts";
import { CHECK_CLASSES, asAtomId, diagnose } from "../domain/index.ts";

// Both atom-id shapes (ndr:0144): legacy 4-digit and 6-char base32. Keep in
// lockstep with ATOM_ID_PATTERN in domain/atom.ts.
const ATOM_ID_REF = /^(?:\d{4}|[0-9a-z]{6})$/;

export { DEFAULT_LEDGER_PATH } from "./config.ts";

export interface ResolveResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export interface ListOptions {
  readonly verbose?: boolean;
}

export interface CurrentOptions extends ListOptions {
  readonly area?: string;
  readonly topic?: string;
}

export async function run(argv: readonly string[]): Promise<number> {
  const program = new Command();

  program
    .name("ndr")
    .description("Capture and resolution tooling for nested decision records.")
    .version("0.0.0");

  let exitCode = 0;
  const emit = (result: ResolveResult) => {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    exitCode = result.exitCode;
  };

  // Ledger resolution order: --ledger flag > .ndr.toml walk-up from CWD >
  // vault default (ndr:0130, ndr:0147). A broken .ndr.toml fails loudly;
  // null signals the action to bail after the error has been emitted.
  const resolveLedger = (flag: string | undefined): string | null => {
    try {
      return resolveLedgerPath(flag, process.cwd());
    } catch (err) {
      if (err instanceof RepoConfigError) {
        emit({ stdout: "", stderr: `${err.message}\n`, exitCode: 1 });
        return null;
      }
      throw err;
    }
  };

  program
    .command("resolve <ref>")
    .description("Resolve an ndr reference (atom-id, #slug, or area/topic) and print a brief.")
    .option(
      "--ledger <path>",
      "Ledger directory to resolve against (default: .ndr.toml walk-up, then vault).",
    )
    .option("--verbose", "Expand multi-atom results to full briefs.", false)
    .action(async (ref: string, options: { ledger?: string; verbose: boolean }) => {
      const ledger = resolveLedger(options.ledger);
      if (ledger === null) return;
      emit(await resolveCommand(ref, ledger, { verbose: options.verbose }));
    });

  program
    .command("search <query>")
    .description("Free-text search across atom title and body.")
    .option(
      "--ledger <path>",
      "Ledger directory to search (default: .ndr.toml walk-up, then vault).",
    )
    .option("--verbose", "Expand results to full briefs.", false)
    .action(async (query: string, options: { ledger?: string; verbose: boolean }) => {
      const ledger = resolveLedger(options.ledger);
      if (ledger === null) return;
      emit(await searchCommand(query, ledger, { verbose: options.verbose }));
    });

  program
    .command("lineage <id>")
    .description("Walk the supersession chain from an atom-id to its head.")
    .option("--ledger <path>", "Ledger directory to walk (default: .ndr.toml walk-up, then vault).")
    .action(async (id: string, options: { ledger?: string }) => {
      const ledger = resolveLedger(options.ledger);
      if (ledger === null) return;
      emit(await lineageCommand(id, ledger));
    });

  program
    .command("current")
    .description("List all current atoms, optionally filtered by area and/or topic.")
    .option("--ledger <path>", "Ledger directory to list (default: .ndr.toml walk-up, then vault).")
    .option("--area <area>", "Restrict to a single area.")
    .option("--topic <topic>", "Restrict to a single topic.")
    .option("--verbose", "Expand results to full briefs.", false)
    .action(
      async (options: { ledger?: string; area?: string; topic?: string; verbose: boolean }) => {
        const ledger = resolveLedger(options.ledger);
        if (ledger === null) return;
        emit(
          await currentCommand(ledger, {
            area: options.area,
            topic: options.topic,
            verbose: options.verbose,
          }),
        );
      },
    );

  program
    .command("doctor")
    .description("Run corpus health checks over a ledger; --fix repairs missing back-links.")
    .option(
      "--ledger <path>",
      "Ledger directory to check (default: .ndr.toml walk-up, then vault).",
    )
    .option("--fix", "Repair missing superseded_by back-links (the one auto-fixable class).", false)
    .option("--json", "Emit a structured JSON report instead of the human one.", false)
    .action(async (options: { ledger?: string; fix: boolean; json: boolean }) => {
      const ledger = resolveLedger(options.ledger);
      if (ledger === null) return;
      emit(await doctorCommand(ledger, { fix: options.fix, json: options.json }));
    });

  program
    .command("capture")
    .description("Capture a decision atom from a draft read as JSON on stdin.")
    .option(
      "--ledger <path>",
      "Ledger directory to write to (wins over the draft's vault_decisions).",
    )
    .action(async (options: { ledger?: string }) => {
      const raw = await readStdin();
      // Precedence: flag > draft vault_decisions > .ndr.toml walk-up > vault
      // default. The walk-up runs eagerly so a broken .ndr.toml fails loudly
      // even when the draft carries its own ledger.
      let fallback: string;
      try {
        fallback = findRepoConfig(process.cwd())?.ledger ?? DEFAULT_LEDGER_PATH;
      } catch (err) {
        if (err instanceof RepoConfigError) {
          emit({ stdout: "", stderr: `${err.message}\n`, exitCode: 1 });
          return;
        }
        throw err;
      }
      emit(await captureCommand(raw, options.ledger, fallback));
    });

  await program.parseAsync([...argv]);
  return exitCode;
}

export async function resolveCommand(
  ref: string,
  ledgerPath: string,
  opts: ListOptions = {},
): Promise<ResolveResult> {
  const adapter = new MarkdownLedgerAdapter(ledgerPath);

  if (ref.startsWith("#")) {
    return await resolveSlug(adapter, ref.slice(1), ledgerPath);
  }
  if (ref.includes("/")) {
    return await resolveTopic(adapter, ref, ledgerPath, opts.verbose ?? false);
  }
  if (ATOM_ID_REF.test(ref)) {
    return await resolveAtomId(adapter, ref, ledgerPath);
  }
  return {
    stdout: "",
    stderr: `unrecognized reference ${JSON.stringify(ref)} — use an atom-id (e.g. 0042 or k3m9xq), #<slug>, or <area>/<topic>\n`,
    exitCode: 1,
  };
}

async function resolveAtomId(
  adapter: MarkdownLedgerAdapter,
  ref: string,
  ledgerPath: string,
): Promise<ResolveResult> {
  let chain: Atom[];
  try {
    chain = await adapter.walkLineage(asAtomId(ref));
  } catch (err) {
    if (err instanceof AtomNotFoundError) {
      return {
        stdout: "",
        stderr: `no atom with id ${ref} in ledger ${ledgerPath}\n`,
        exitCode: 1,
      };
    }
    throw err;
  }

  const head = chain[chain.length - 1]!;
  const headFilename = await adapter.getAtomFilename(asAtomId(head.frontmatter.id));
  return { stdout: formatBrief(chain, headFilename), stderr: "", exitCode: 0 };
}

async function resolveSlug(
  adapter: MarkdownLedgerAdapter,
  slug: string,
  ledgerPath: string,
): Promise<ResolveResult> {
  if (slug.length === 0) {
    return { stdout: "", stderr: "empty slug reference — use #<slug>\n", exitCode: 1 };
  }

  const head = await adapter.findBySlug(slug);
  if (head === null) {
    return {
      stdout: "",
      stderr: `no atom with slug #${slug} in ledger ${ledgerPath}\n`,
      exitCode: 1,
    };
  }

  // A slug tracks forward to the head, so there is no drift to surface
  // (ndr:0049, ndr:0050) — render the head alone.
  const headFilename = await adapter.getAtomFilename(asAtomId(head.frontmatter.id));
  return { stdout: formatBrief([head], headFilename), stderr: "", exitCode: 0 };
}

async function resolveTopic(
  adapter: MarkdownLedgerAdapter,
  ref: string,
  ledgerPath: string,
  verbose: boolean,
): Promise<ResolveResult> {
  const parts = ref.split("/");
  if (parts.length !== 2 || parts[0]!.length === 0 || parts[1]!.length === 0) {
    return {
      stdout: "",
      stderr: `invalid topic reference ${JSON.stringify(ref)} — use <area>/<topic>\n`,
      exitCode: 1,
    };
  }

  const [area, topic] = parts as [string, string];
  const atoms = await adapter.listCurrent({ area, topic });
  if (atoms.length === 0) {
    return {
      stdout: "",
      stderr: `no current atoms for ${area}/${topic} in ledger ${ledgerPath}\n`,
      exitCode: 1,
    };
  }

  return { stdout: await formatAtomList(atoms, verbose, adapter), stderr: "", exitCode: 0 };
}

export async function searchCommand(
  query: string,
  ledgerPath: string,
  opts: ListOptions = {},
): Promise<ResolveResult> {
  const adapter = new MarkdownLedgerAdapter(ledgerPath);
  const atoms = await adapter.searchFreeText(query);
  if (atoms.length === 0) {
    return { stdout: `no atoms match ${JSON.stringify(query)}\n`, stderr: "", exitCode: 0 };
  }

  const sorted = [...atoms].sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
  return {
    stdout: await formatAtomList(sorted, opts.verbose ?? false, adapter),
    stderr: "",
    exitCode: 0,
  };
}

export async function lineageCommand(ref: string, ledgerPath: string): Promise<ResolveResult> {
  if (!ATOM_ID_REF.test(ref)) {
    return {
      stdout: "",
      stderr: `invalid atom-id ${JSON.stringify(ref)} — lineage takes an atom-id (4-digit or 6-char base32)\n`,
      exitCode: 1,
    };
  }

  const adapter = new MarkdownLedgerAdapter(ledgerPath);
  let chain: Atom[];
  try {
    chain = await adapter.walkLineage(asAtomId(ref));
  } catch (err) {
    if (err instanceof AtomNotFoundError) {
      return {
        stdout: "",
        stderr: `no atom with id ${ref} in ledger ${ledgerPath}\n`,
        exitCode: 1,
      };
    }
    throw err;
  }

  return { stdout: formatLineage(chain), stderr: "", exitCode: 0 };
}

export async function currentCommand(
  ledgerPath: string,
  opts: CurrentOptions = {},
): Promise<ResolveResult> {
  const adapter = new MarkdownLedgerAdapter(ledgerPath);
  const atoms = await adapter.listCurrent({ area: opts.area, topic: opts.topic });
  if (atoms.length === 0) {
    return {
      stdout: `no current atoms${describeScope(opts.area, opts.topic)}\n`,
      stderr: "",
      exitCode: 0,
    };
  }

  return {
    stdout: await formatAtomList(atoms, opts.verbose ?? false, adapter),
    stderr: "",
    exitCode: 0,
  };
}

// Capture a decision atom. `rawJson` is the draft read from stdin; `ledgerFlag`
// is the --ledger value if the user passed one. Ledger precedence: flag wins,
// then the draft's `vault_decisions`, then `fallbackLedger` (the .ndr.toml
// walk-up result or the vault default, resolved by the caller). Outcomes map
// to exit codes 0 (ok) / 1 (validation) / 2 (supersession conflict) / 3
// (half-state).
export async function captureCommand(
  rawJson: string,
  ledgerFlag?: string,
  fallbackLedger: string = DEFAULT_LEDGER_PATH,
): Promise<ResolveResult> {
  let payload: unknown;
  try {
    payload = JSON.parse(rawJson);
  } catch (err) {
    return errorResult("bad_json", [err instanceof Error ? err.message : String(err)], 1);
  }
  if (typeof payload !== "object" || payload === null) {
    return errorResult(
      "bad_input",
      ["payload must be a JSON object with `frontmatter` and `body`"],
      1,
    );
  }

  const p = payload as Record<string, unknown>;
  const ledgerPath =
    ledgerFlag ?? (typeof p.vault_decisions === "string" ? p.vault_decisions : fallbackLedger);

  if (typeof p.frontmatter !== "object" || p.frontmatter === null) {
    return errorResult("bad_input", ["`frontmatter` must be an object"], 1);
  }
  if (typeof p.body !== "string") {
    return errorResult("bad_input", ["`body` must be a string"], 1);
  }

  // A top-level `supersedes` overrides the frontmatter field (persist.py parity).
  const frontmatter = { ...(p.frontmatter as Record<string, unknown>) };
  if (Array.isArray(p.supersedes)) frontmatter.supersedes = p.supersedes;
  const draft = { frontmatter, body: p.body } as unknown as AtomDraft;

  const adapter = new MarkdownLedgerAdapter(ledgerPath);
  try {
    const result = await adapter.captureAtom(draft);
    return { stdout: JSON.stringify(result, null, 2) + "\n", stderr: "", exitCode: 0 };
  } catch (err) {
    if (err instanceof DraftValidationError) return errorResult("validation", err.messages, 1);
    if (err instanceof SupersessionConflictError) {
      return errorResult("supersession_conflict", err.messages, 2);
    }
    if (err instanceof HalfStateError) {
      return {
        stdout: "",
        stderr:
          JSON.stringify(
            { error: { kind: "half_state", message: err.message, half_state: err.halfState } },
            null,
            2,
          ) + "\n",
        exitCode: 3,
      };
    }
    throw err;
  }
}

export interface DoctorOptions {
  readonly fix?: boolean;
  readonly json?: boolean;
}

interface RepairApplied {
  readonly path: string;
  readonly kind: "appended_back_pointer";
  readonly value: string;
}

// Corpus health checks (JUN-178, absorbing the ndr-curator agent's mechanical
// sweep). Read-only unless --fix; --fix repairs exactly one finding class —
// missing superseded_by back-links — then re-scans so the reported findings
// reflect the post-repair ledger. Exit codes: 0 healthy (or all findings
// repaired), 1 findings present, 3 a repair write failed mid-fix (ndr:0145).
export async function doctorCommand(
  ledgerPath: string,
  opts: DoctorOptions = {},
): Promise<ResolveResult> {
  const adapter = new MarkdownLedgerAdapter(ledgerPath);
  const taxonomy = await adapter.readTaxonomy();
  let report = diagnose(await adapter.scanLedger(), taxonomy);

  const repairsApplied: RepairApplied[] = [];
  if (opts.fix === true) {
    for (const candidate of report.repairCandidates) {
      try {
        await adapter.repairBackPointer(candidate.predecessorPath, candidate.wikilink);
      } catch (err) {
        return {
          stdout: "",
          stderr:
            JSON.stringify(
              {
                error: {
                  kind: "repair_failed",
                  message: `repairing ${candidate.predecessorPath} failed: ${err instanceof Error ? err.message : String(err)}`,
                  repairs_applied: repairsApplied,
                },
              },
              null,
              2,
            ) + "\n",
          exitCode: 3,
        };
      }
      repairsApplied.push({
        path: candidate.predecessorPath,
        kind: "appended_back_pointer",
        value: candidate.wikilink,
      });
    }
    // Re-diagnose so the report shows what is still wrong after the repairs —
    // this also makes a second --fix run naturally find nothing to repair.
    if (repairsApplied.length > 0) {
      report = diagnose(await adapter.scanLedger(), taxonomy);
    }
  }

  const stderr = report.taxonomyChecked
    ? ""
    : `ndr: no readable .taxonomy/ in ${ledgerPath} — taxonomy checks skipped\n`;
  const stdout =
    opts.json === true
      ? formatDoctorJson(report, ledgerPath, repairsApplied)
      : formatDoctorReport(report, ledgerPath, repairsApplied, opts.fix === true);

  return { stdout, stderr, exitCode: report.findings.length > 0 ? 1 : 0 };
}

function doctorSummary(report: DoctorReport, repairs: readonly RepairApplied[]): string {
  if (report.findings.length === 0 && repairs.length === 0) {
    return `${report.scanned} files scanned; corpus healthy.`;
  }
  const parts = [`${report.scanned} files scanned`, `${report.findings.length} finding(s)`];
  if (report.repairCandidates.length > 0) {
    parts.push(`${report.repairCandidates.length} repairable with --fix`);
  }
  if (repairs.length > 0) {
    parts.push(`${repairs.length} repair(s) applied`);
  }
  return parts.join("; ") + ".";
}

const CHECK_CLASS_LABELS: Record<CheckClass, string> = {
  chain_integrity: "chain integrity",
  status_coherence: "status coherence",
  alias_drift: "alias drift",
  taxonomy: "taxonomy",
  missing_fields: "missing required fields",
  frontmatter_body_drift: "frontmatter/body drift",
  malformed: "malformed",
};

function formatDoctorReport(
  report: DoctorReport,
  ledgerPath: string,
  repairs: readonly RepairApplied[],
  fix: boolean,
): string {
  const lines: string[] = [`ndr doctor: ${ledgerPath}`, ""];

  for (const check of CHECK_CLASSES) {
    const group = report.findings.filter((f) => f.check === check);
    if (group.length === 0) continue;
    lines.push(`${CHECK_CLASS_LABELS[check]}:`);
    for (const f of group) {
      lines.push(`  ${f.path}  ${f.kind}  ${f.detail}`);
    }
    lines.push("");
  }

  if (repairs.length > 0) {
    lines.push("repairs applied:");
    for (const r of repairs) {
      lines.push(`  ${r.path}  ${r.kind}  ${r.value}`);
    }
    lines.push("");
  }

  if (!fix && report.repairCandidates.length > 0) {
    lines.push(`run with --fix to repair ${report.repairCandidates.length} missing back-link(s)`);
    lines.push("");
  }

  lines.push(doctorSummary(report, repairs));
  return lines.join("\n") + "\n";
}

function formatDoctorJson(
  report: DoctorReport,
  ledgerPath: string,
  repairs: readonly RepairApplied[],
): string {
  const issues = {} as Record<CheckClass, { path: string; kind: string; detail: string }[]>;
  for (const check of CHECK_CLASSES) {
    issues[check] = [];
  }
  for (const f of report.findings) {
    issues[f.check].push({ path: f.path, kind: f.kind, detail: f.detail });
  }
  return (
    JSON.stringify(
      {
        scanned_atoms: report.scanned,
        ledger: ledgerPath,
        taxonomy_checked: report.taxonomyChecked,
        issues,
        repair_candidates: report.repairCandidates.map((c: RepairCandidate) => ({
          path: c.predecessorPath,
          successor: c.successorPath,
          value: c.wikilink,
        })),
        repairs_applied: repairs,
        summary: doctorSummary(report, repairs),
      },
      null,
      2,
    ) + "\n"
  );
}

function errorResult(kind: string, messages: readonly string[], exitCode: number): ResolveResult {
  return {
    stdout: "",
    stderr: JSON.stringify({ error: { kind, messages } }, null, 2) + "\n",
    exitCode,
  };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function formatBrief(chain: readonly Atom[], headFilename: string | null): string {
  const seed = chain[0]!;
  const head = chain[chain.length - 1]!;
  const drifted = seed.frontmatter.id !== head.frontmatter.id;

  const lines: string[] = [];

  if (drifted) {
    lines.push(`⚠ Drift: seed ${seed.frontmatter.id} superseded → head ${head.frontmatter.id}`);
    lines.push("");
  }

  const fm = head.frontmatter;
  const pathRef = headFilename ? headFilename.replace(/\.md$/, "") : `ndr:${fm.id}`;
  lines.push(`${fm.title} (${pathRef})`);
  lines.push(`  area: ${fm.area}, topic: ${fm.topic}, decision: ${formatDate(fm.decision_date)}`);
  lines.push(`  reversibility: ${fm.reversibility}`);
  lines.push("");

  const gist = extractGist(head.body);
  if (gist !== null) {
    lines.push(gist);
    lines.push("");
  }

  const lineageIds = chain.map((atom) => atom.frontmatter.id);
  lines.push(`Lineage: ${lineageIds.join(" → ")}`);
  lines.push("");

  lines.push("References:");
  lines.push(`  - ndr:${fm.id}`);
  for (const alias of fm.aliases) {
    lines.push(`  - ndr:#${alias}`);
  }
  lines.push(`  - ndr:${fm.area}/${fm.topic}`);

  return lines.join("\n") + "\n";
}

// Compact one-line summary used by the list verbs (search, current, resolve
// area/topic) when --verbose is not set.
function formatCompactLine(atom: Atom): string {
  const fm = atom.frontmatter;
  return `${fm.id}  ${fm.title}  [${fm.area}/${fm.topic}]`;
}

async function formatAtomList(
  atoms: readonly Atom[],
  verbose: boolean,
  adapter: MarkdownLedgerAdapter,
): Promise<string> {
  if (!verbose) {
    return atoms.map(formatCompactLine).join("\n") + "\n";
  }

  const blocks: string[] = [];
  for (const atom of atoms) {
    const filename = await adapter.getAtomFilename(asAtomId(atom.frontmatter.id));
    blocks.push(formatBrief([atom], filename));
  }
  return blocks.join("\n");
}

// Explicit chain listing for `ndr lineage` — every step with its status, then
// the compact arrow form.
function formatLineage(chain: readonly Atom[]): string {
  const lines: string[] = ["Lineage:"];
  for (const atom of chain) {
    const fm = atom.frontmatter;
    lines.push(`  ${fm.id}  ${fm.title}  (${fm.status})`);
  }
  lines.push("");
  lines.push(chain.map((atom) => atom.frontmatter.id).join(" → "));
  return lines.join("\n") + "\n";
}

function describeScope(area?: string, topic?: string): string {
  if (area !== undefined && topic !== undefined) return ` for ${area}/${topic}`;
  if (area !== undefined) return ` in area ${area}`;
  if (topic !== undefined) return ` with topic ${topic}`;
  return "";
}

function formatDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function extractGist(body: string): string | null {
  const decisionIdx = body.search(/^##\s+Decision\s*$/m);
  let section = body;
  if (decisionIdx !== -1) {
    section = body.slice(decisionIdx).replace(/^##\s+Decision\s*\n+/, "");
    const nextHeading = section.search(/^##\s/m);
    if (nextHeading !== -1) section = section.slice(0, nextHeading);
  }
  const paragraphs = section
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.startsWith("#") && !p.startsWith(">"));
  return paragraphs[0] ?? null;
}

// Re-export low-level helpers for tests.
export { AtomNotFoundError };
