import os from "node:os";
import path from "node:path";

import { Command } from "commander";

import { AtomNotFoundError, MarkdownLedgerAdapter } from "../adapters/markdown/adapter.ts";
import type { Atom } from "../domain/index.ts";
import { asAtomId } from "../domain/index.ts";

export const DEFAULT_LEDGER_PATH = path.join(os.homedir(), "Loose Ends", "Decisions");

export interface ResolveResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export async function run(argv: readonly string[]): Promise<number> {
  const program = new Command();

  program
    .name("ndr")
    .description("Capture and resolution tooling for nested decision records.")
    .version("0.0.0");

  let exitCode = 0;

  program
    .command("resolve <ref>")
    .description("Resolve an ndr reference to its current head and print a brief.")
    .option("--ledger <path>", "Ledger directory to resolve against.", DEFAULT_LEDGER_PATH)
    .action(async (ref: string, options: { ledger: string }) => {
      const result = await resolveCommand(ref, options.ledger);
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      exitCode = result.exitCode;
    });

  await program.parseAsync([...argv]);
  return exitCode;
}

export async function resolveCommand(ref: string, ledgerPath: string): Promise<ResolveResult> {
  if (!/^\d{4}$/.test(ref)) {
    return {
      stdout: "",
      stderr: `invalid ref ${JSON.stringify(ref)} — only atom-id grain (4-digit) is supported in this release\n`,
      exitCode: 1,
    };
  }

  const id = asAtomId(ref);
  const adapter = new MarkdownLedgerAdapter(ledgerPath);

  let chain: Atom[];
  try {
    chain = await adapter.walkLineage(id);
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
  return {
    stdout: formatBrief(chain, headFilename),
    stderr: "",
    exitCode: 0,
  };
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
