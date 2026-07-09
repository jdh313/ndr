import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { parse as parseYaml } from "yaml";

import { extractAtomIdFromRef } from "../domain/index.ts";
import { splitFrontmatter, joinFrontmatter } from "../adapters/markdown/fence.ts";
import { parseFrontmatterYaml, stringifyFrontmatter } from "../adapters/markdown/yaml.ts";
import type { ResolveResult } from "./index.ts";

const execFileAsync = promisify(execFile);

interface MigrateOptions {
  readonly dryRun?: boolean;
  readonly json?: boolean;
}

// Pass 1 of the format migration: mechanical frontmatter conversion and
// callout flattening. Pass 2 (body reshaping — Context extraction,
// Commitments filtering) is judgment work owned by the migrate-ledger skill.
export async function migrateCommand(
  ledgerPath: string,
  repoRoot: string | null,
  opts: MigrateOptions = {},
): Promise<ResolveResult> {
  const ledger = path.resolve(ledgerPath);
  let entries: string[];
  try {
    entries = (await fs.readdir(ledger)).filter((n) => n.endsWith(".md") && !n.startsWith("."));
  } catch (err) {
    return {
      stdout: "",
      stderr: `cannot read ledger ${ledger}: ${err instanceof Error ? err.message : String(err)}\n`,
      exitCode: 1,
    };
  }

  const migrated: string[] = [];
  const skipped: string[] = [];
  const failed: { path: string; reason: string }[] = [];
  const strayLabels = new Set<string>();

  for (const name of entries) {
    const file = path.join(ledger, name);
    const raw = await fs.readFile(file, "utf8");
    let data: Record<string, unknown>;
    let body: string;
    try {
      const split = splitFrontmatter(raw);
      data = (parseFrontmatterYaml(split.yaml).data ?? {}) as Record<string, unknown>;
      body = split.body;
    } catch (err) {
      failed.push({ path: name, reason: err instanceof Error ? err.message : String(err) });
      continue;
    }

    // Old-format detection: `area` is the sentinel — the new schema forbids it.
    if (data.area === undefined) {
      skipped.push(name);
      continue;
    }

    const next = convertFrontmatter(data, await firstCommitAuthor(repoRoot, ledger, name));
    for (const l of next.labels as string[]) strayLabels.add(l);
    const nextBody = flattenCallouts(body);

    if (opts.dryRun !== true) {
      await fs.writeFile(
        file,
        joinFrontmatter(
          stringifyFrontmatter(next),
          nextBody.startsWith("\n") ? nextBody : `\n${nextBody}`,
        ),
        "utf8",
      );
    }
    migrated.push(name);
  }

  if (opts.dryRun !== true && migrated.length > 0) {
    await seedLabelsYaml(ledger, strayLabels);
  }

  const summary = {
    ledger,
    migrated: migrated.length,
    skipped: skipped.length,
    failed,
    dry_run: opts.dryRun === true,
  };
  const stdout =
    opts.json === true
      ? JSON.stringify(summary, null, 2) + "\n"
      : `migrated ${migrated.length}, skipped ${skipped.length} (already new-format), failed ${failed.length}${opts.dryRun ? " [dry-run]" : ""}\n`;
  return { stdout, stderr: "", exitCode: failed.length > 0 ? 1 : 0 };
}

// Field-by-field conversion per the format migration table. Preserves any
// unknown extra fields by dropping them deliberately: the new schema is
// strict, so carrying baggage would re-break the atom.
function convertFrontmatter(
  data: Record<string, unknown>,
  author: string,
): Record<string, unknown> {
  const asStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const toIds = (v: unknown): string[] =>
    asStringArray(v)
      .map((link) => extractAtomIdFromRef(link))
      .filter((id): id is NonNullable<typeof id> => id !== null);
  const stripWikilink = (v: unknown): string =>
    typeof v === "string" ? v.replace(/^\[\[|\]\]$/g, "") : "";

  const labels = [
    ...(typeof data.area === "string" ? [data.area] : []),
    ...(typeof data.topic === "string" ? [data.topic] : []),
    ...asStringArray(data.tags).filter((t) => t !== "decision"),
  ];

  return {
    id: data.id,
    title: data.title,
    status: data.status,
    decision_date: data.decision_date,
    author,
    conviction: "tentative",
    project: stripWikilink(data.project),
    labels: [...new Set(labels)].slice(0, 4),
    binds: [],
    supersedes: toIds(data.supersedes),
    superseded_by: toIds(data.superseded_by),
    derived_from: asStringArray(data.derived_from).map(stripWikilink),
    informed_by: toIds(data.informed_by),
  };
}

// Strip Obsidian callout syntax in place: the `> [!info]- Title` marker line is
// dropped, subsequent `> ` continuation lines are unindented. Content order is
// untouched — reshaping is pass 2.
export function flattenCallouts(body: string): string {
  const out: string[] = [];
  for (const line of body.split("\n")) {
    if (/^>\s*\[!\w+\]-?\s*/.test(line)) {
      continue;
    }
    if (/^>\s?/.test(line)) {
      out.push(line.replace(/^>\s?/, ""));
      continue;
    }
    out.push(line);
  }
  // Collapse runs of 3+ blank lines left by dropped markers.
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

// Author backfill: first-commit author of the atom file, falling back to the
// current git user, then "unknown".
async function firstCommitAuthor(
  repoRoot: string | null,
  ledger: string,
  filename: string,
): Promise<string> {
  const root = repoRoot ?? ledger;
  try {
    const { stdout } = await execFileAsync("git", [
      "-C",
      root,
      "log",
      "--follow",
      "--diff-filter=A",
      "--format=%aN",
      "--",
      path.join(ledger, filename),
    ]);
    const lines = stdout.trim().split("\n").filter(Boolean);
    const first = lines[lines.length - 1];
    if (first) return first;
  } catch {
    // fall through
  }
  try {
    const { stdout } = await execFileAsync("git", ["config", "user.name"]);
    if (stdout.trim()) return stdout.trim();
  } catch {
    // fall through
  }
  return "unknown";
}

// labels.yaml = union of old areas.yaml + topics.yaml + labels seen on atoms.
// The old axis files are removed — one axis, one file.
async function seedLabelsYaml(ledger: string, fromAtoms: ReadonlySet<string>): Promise<void> {
  const dir = path.join(ledger, ".taxonomy");
  const union = new Set<string>(fromAtoms);
  for (const old of ["areas.yaml", "topics.yaml"]) {
    try {
      const parsed: unknown = parseYaml(await fs.readFile(path.join(dir, old), "utf8"));
      if (Array.isArray(parsed)) {
        for (const v of parsed) if (typeof v === "string") union.add(v);
      }
    } catch {
      continue;
    }
  }
  await fs.mkdir(dir, { recursive: true });
  const list = [...union].sort();
  await fs.writeFile(
    path.join(dir, "labels.yaml"),
    "# Labels — merged from areas.yaml + topics.yaml + corpus tags by `ndr migrate`.\n" +
      list.map((l) => `- ${l}`).join("\n") +
      "\n",
    "utf8",
  );
  for (const old of ["areas.yaml", "topics.yaml"]) {
    await fs.rm(path.join(dir, old), { force: true });
  }
}
