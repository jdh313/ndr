import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { migrateCommand, applyBodiesCommand } from "./migrate.ts";

const OLD_ATOM = `---
id: '0153'
title: 'Taxonomy enforcement: hard gate at capture, advisory at doctor'
status: current
decision_date: '2026-06-04'
aliases: []
project: '[[ndr]]'
derived_from: []
informed_by:
- '[[Decisions/0073-zod-schema-validates-per-record]]'
supersedes:
- '[[Decisions/0072-taxonomy-as-sibling-swamp-model]]'
superseded_by: []
area: architecture
topic: write-side
impacts: []
revisit_triggers: []
reversibility: medium
tags:
- decision
- meta-chain
---
# 0153 — Taxonomy enforcement

## Decision

One sentence.

## Why

Gist line.

> [!info]- Full reasoning
> Longer prose here.
> Second line of prose.

## Consequences

A · B

> [!info]- Detail
> - bullet one
`;

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function writeAtom(dir: string, filename: string, content: string): Promise<void> {
  await fs.writeFile(path.join(dir, filename), content, "utf8");
}

async function writeOldTaxonomy(dir: string): Promise<void> {
  const taxonomyDir = path.join(dir, ".taxonomy");
  await fs.mkdir(taxonomyDir, { recursive: true });
  await fs.writeFile(
    path.join(taxonomyDir, "areas.yaml"),
    "- architecture\n- interfaces\n",
    "utf8",
  );
  await fs.writeFile(path.join(taxonomyDir, "topics.yaml"), "- write-side\n- read-side\n", "utf8");
}

describe("ndr migrate", () => {
  let ledgerDir: string;
  const repoRoot: string | null = null;

  beforeEach(async () => {
    ledgerDir = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-migrate-"));
  });

  afterEach(async () => {
    await fs.rm(ledgerDir, { recursive: true, force: true });
  });

  test("migrate converts frontmatter to the new format", async () => {
    await writeAtom(ledgerDir, "0153-taxonomy-enforcement.md", OLD_ATOM);
    await writeOldTaxonomy(ledgerDir);
    const result = await migrateCommand(ledgerDir, repoRoot, { json: true });
    expect(result.exitCode).toBe(0);

    const raw = await fs.readFile(path.join(ledgerDir, "0153-taxonomy-enforcement.md"), "utf8");
    expect(raw).toContain("project: ndr");
    expect(raw).toContain("author:");
    expect(raw).toContain("conviction: tentative");
    expect(raw).toMatch(/labels:\n\s*- architecture\n\s*- write-side\n\s*- meta-chain/);
    expect(raw).toMatch(/supersedes:\n\s*- ["']?0072["']?/);
    expect(raw).not.toContain("reversibility");
    expect(raw).not.toContain("[[Decisions/");
    expect(raw).not.toContain("[!info]-");
    expect(raw).toContain("Longer prose here.");
  });

  test("non-empty revisit_triggers are relocated into a ## Revisit if body stub", async () => {
    const atom = OLD_ATOM.replace(
      "revisit_triggers: []",
      "revisit_triggers:\n- swamp ships a native round-trip\n- markdown stops being canonical",
    );
    await writeAtom(ledgerDir, "0153-taxonomy-enforcement.md", atom);
    await writeOldTaxonomy(ledgerDir);
    await migrateCommand(ledgerDir, repoRoot, { json: true });

    const raw = await fs.readFile(path.join(ledgerDir, "0153-taxonomy-enforcement.md"), "utf8");
    expect(raw).toContain("## Revisit if");
    expect(raw).toContain("- swamp ships a native round-trip");
    expect(raw).toContain("- markdown stops being canonical");
    // Still gone from frontmatter — carried into the body, not left in the head.
    expect(raw).not.toMatch(/^revisit_triggers:/m);
  });

  test("a hard-to-undo reversibility is surfaced as a strippable Commitments hint", async () => {
    const atom = OLD_ATOM.replace("reversibility: medium", "reversibility: low");
    await writeAtom(ledgerDir, "0153-taxonomy-enforcement.md", atom);
    await writeOldTaxonomy(ledgerDir);
    await migrateCommand(ledgerDir, repoRoot, { json: true });

    const raw = await fs.readFile(path.join(ledgerDir, "0153-taxonomy-enforcement.md"), "utf8");
    expect(raw).toContain("<!-- migrate: reversibility");
    expect(raw).toContain("Commitments bullet");
    // The killed frontmatter field is still gone.
    expect(raw).not.toMatch(/^reversibility:/m);
  });

  test("an easily-reversible reversibility carries nothing (genuinely nothing to preserve)", async () => {
    const atom = OLD_ATOM.replace("reversibility: medium", "reversibility: high");
    await writeAtom(ledgerDir, "0153-taxonomy-enforcement.md", atom);
    await writeOldTaxonomy(ledgerDir);
    await migrateCommand(ledgerDir, repoRoot, { json: true });

    const raw = await fs.readFile(path.join(ledgerDir, "0153-taxonomy-enforcement.md"), "utf8");
    expect(raw).not.toContain("reversibility");
  });

  test("migrate seeds labels.yaml from areas+topics+stray tags and removes the old files", async () => {
    await writeAtom(ledgerDir, "0153-taxonomy-enforcement.md", OLD_ATOM);
    await writeOldTaxonomy(ledgerDir);
    await migrateCommand(ledgerDir, repoRoot, { json: true });

    const labels = await fs.readFile(path.join(ledgerDir, ".taxonomy", "labels.yaml"), "utf8");
    expect(labels).toContain("architecture");
    expect(labels).toContain("write-side");
    expect(labels).toContain("meta-chain");
    expect(await exists(path.join(ledgerDir, ".taxonomy", "areas.yaml"))).toBe(false);
    expect(await exists(path.join(ledgerDir, ".taxonomy", "topics.yaml"))).toBe(false);
  });

  test("migrate is idempotent — second run reports already_migrated and changes nothing", async () => {
    await writeAtom(ledgerDir, "0153-taxonomy-enforcement.md", OLD_ATOM);
    await writeOldTaxonomy(ledgerDir);

    const first = await migrateCommand(ledgerDir, repoRoot, { json: true });
    expect(JSON.parse(first.stdout).migrated).toBe(1);
    const before = await fs.readFile(path.join(ledgerDir, "0153-taxonomy-enforcement.md"), "utf8");
    const second = await migrateCommand(ledgerDir, repoRoot, { json: true });
    const after = await fs.readFile(path.join(ledgerDir, "0153-taxonomy-enforcement.md"), "utf8");
    expect(after).toBe(before);
    expect(JSON.parse(second.stdout).skipped).toBeGreaterThan(0);
  });

  test("dry-run reports the plan without writing", async () => {
    await writeAtom(ledgerDir, "0153-taxonomy-enforcement.md", OLD_ATOM);
    await writeOldTaxonomy(ledgerDir);

    const result = await migrateCommand(ledgerDir, repoRoot, { dryRun: true, json: true });
    const raw = await fs.readFile(path.join(ledgerDir, "0153-taxonomy-enforcement.md"), "utf8");
    expect(raw).toContain("area: architecture"); // untouched
    expect(JSON.parse(result.stdout).migrated).toBeGreaterThan(0);

    expect(await exists(path.join(ledgerDir, ".taxonomy", "labels.yaml"))).toBe(false);
    expect(await exists(path.join(ledgerDir, ".taxonomy", "areas.yaml"))).toBe(true);
    expect(await exists(path.join(ledgerDir, ".taxonomy", "topics.yaml"))).toBe(true);
  });

  test("labels beyond the 4-label cap are reported as truncated", async () => {
    const wideAtom = OLD_ATOM.replace(
      "tags:\n- decision\n- meta-chain\n",
      "tags:\n- decision\n- meta-chain\n- extra-one\n- extra-two\n",
    );
    await writeAtom(ledgerDir, "0153-taxonomy-enforcement.md", wideAtom);
    await writeOldTaxonomy(ledgerDir);

    const result = await migrateCommand(ledgerDir, repoRoot, { json: true });
    const summary = JSON.parse(result.stdout);
    expect(summary.labels_truncated).toEqual([
      {
        path: "0153-taxonomy-enforcement.md",
        dropped: ["extra-two"],
      },
    ]);

    const plainLedgerDir = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-migrate-"));
    try {
      await writeAtom(plainLedgerDir, "0153-taxonomy-enforcement.md", wideAtom);
      await writeOldTaxonomy(plainLedgerDir);
      const plain = await migrateCommand(plainLedgerDir, repoRoot, {});
      expect(plain.stdout).toContain("1 atom(s) had labels truncated");
    } finally {
      await fs.rm(plainLedgerDir, { recursive: true, force: true });
    }
  });

  test("an unreadable ledger directory returns exit 1 with a stderr message", async () => {
    const missing = path.join(ledgerDir, "does-not-exist");
    const result = await migrateCommand(missing, repoRoot, { json: true });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(missing);
  });

  test("a per-file parse failure lands in failed while other atoms still migrate", async () => {
    await writeAtom(ledgerDir, "0153-taxonomy-enforcement.md", OLD_ATOM);
    await writeAtom(ledgerDir, "0154-malformed.md", "not frontmatter at all\n");
    await writeOldTaxonomy(ledgerDir);

    const result = await migrateCommand(ledgerDir, repoRoot, { json: true });
    expect(result.exitCode).toBe(1);

    const summary = JSON.parse(result.stdout);
    expect(summary.migrated).toBe(1);
    expect(summary.failed).toHaveLength(1);
    expect(summary.failed[0].path).toBe("0154-malformed.md");
    expect(summary.failed[0].reason).toContain("fence");
  });

  test("a new-format atom (no `area`) is skipped as already_migrated", async () => {
    await writeAtom(
      ledgerDir,
      "0001-new-format.md",
      `---
id: "0001"
title: Already new
status: current
decision_date: "2026-07-01"
author: "Jacob Hoehler"
conviction: tentative
project: ndr
labels: [architecture]
binds: []
supersedes: []
superseded_by: []
---
# 0001 — Already new

## Decision

Body.
`,
    );
    const result = await migrateCommand(ledgerDir, repoRoot, { json: true });
    expect(result.exitCode).toBe(0);
    const summary = JSON.parse(result.stdout);
    expect(summary.migrated).toBe(0);
    expect(summary.skipped).toBe(1);
  });
});

const NEW_ATOM = `---
id: "0153"
title: Taxonomy enforcement
status: current
decision_date: "2026-06-04"
author: Jacob Hoehler
conviction: tentative
project: ndr
labels: [architecture]
binds: []
supersedes: []
superseded_by: []
---
# 0153 — old body

## Decision

Placeholder body pass 2 will replace.
`;

describe("ndr migrate --apply-bodies", () => {
  let ledgerDir: string;

  beforeEach(async () => {
    ledgerDir = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-apply-"));
  });

  afterEach(async () => {
    await fs.rm(ledgerDir, { recursive: true, force: true });
  });

  test("splices the reshaped body while preserving frontmatter verbatim", async () => {
    const atomPath = path.join(ledgerDir, "0153-taxonomy-enforcement.md");
    await fs.writeFile(atomPath, NEW_ATOM, "utf8");
    const bodiesPath = path.join(ledgerDir, "bodies.json");
    await fs.writeFile(
      bodiesPath,
      JSON.stringify({
        atoms: [{ path: atomPath, body: "# 0153 — reshaped\n\n## Decision\n\nReshaped prose." }],
      }),
      "utf8",
    );

    const result = await applyBodiesCommand(bodiesPath, { json: true });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).applied).toBe(1);

    const raw = await fs.readFile(atomPath, "utf8");
    // Frontmatter untouched.
    expect(raw).toContain("conviction: tentative");
    expect(raw).toContain("author: Jacob Hoehler");
    // Body replaced, with a blank line after the fence and a trailing newline.
    expect(raw).toContain("Reshaped prose.");
    expect(raw).not.toContain("Placeholder body pass 2 will replace.");
    expect(raw).toMatch(/---\n\n# 0153 — reshaped/);
    expect(raw.endsWith("\n")).toBe(true);
  });

  test("guarantees a trailing newline when the body lacks one", async () => {
    const atomPath = path.join(ledgerDir, "0153.md");
    await fs.writeFile(atomPath, NEW_ATOM, "utf8");
    const bodiesPath = path.join(ledgerDir, "bodies.json");
    await fs.writeFile(
      bodiesPath,
      JSON.stringify({ atoms: [{ path: atomPath, body: "# t\n\n## Decision\n\nNo newline" }] }),
      "utf8",
    );

    await applyBodiesCommand(bodiesPath, { json: true });
    const raw = await fs.readFile(atomPath, "utf8");
    expect(raw.endsWith("No newline\n")).toBe(true);
  });

  test("tolerates double-JSON-encoded payloads (mailbox relay artifact)", async () => {
    const atomPath = path.join(ledgerDir, "0153.md");
    await fs.writeFile(atomPath, NEW_ATOM, "utf8");
    const bodiesPath = path.join(ledgerDir, "bodies.json");
    // A JSON string that itself contains the JSON payload.
    await fs.writeFile(
      bodiesPath,
      JSON.stringify(
        JSON.stringify({ atoms: [{ path: atomPath, body: "# t\n\n## Decision\n\nX" }] }),
      ),
      "utf8",
    );

    const result = await applyBodiesCommand(bodiesPath, { json: true });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).applied).toBe(1);
  });

  test("reports a bad entry as failed without aborting the batch", async () => {
    const goodPath = path.join(ledgerDir, "good.md");
    await fs.writeFile(goodPath, NEW_ATOM, "utf8");
    const bodiesPath = path.join(ledgerDir, "bodies.json");
    await fs.writeFile(
      bodiesPath,
      JSON.stringify({
        atoms: [
          { path: goodPath, body: "# g\n\n## Decision\n\nok" },
          { path: 42, body: "bad" },
          { path: path.join(ledgerDir, "missing.md"), body: "# m\n\n## Decision\n\nx" },
        ],
      }),
      "utf8",
    );

    const result = await applyBodiesCommand(bodiesPath, { json: true });
    expect(result.exitCode).toBe(1);
    const summary = JSON.parse(result.stdout);
    expect(summary.applied).toBe(1);
    expect(summary.failed).toHaveLength(2);
  });

  test("an unreadable bodies file returns exit 1 with a stderr message", async () => {
    const result = await applyBodiesCommand(path.join(ledgerDir, "nope.json"), { json: true });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("cannot read bodies file");
  });

  test("a non-JSON bodies file returns exit 1", async () => {
    const bodiesPath = path.join(ledgerDir, "bodies.json");
    await fs.writeFile(bodiesPath, "not json {", "utf8");
    const result = await applyBodiesCommand(bodiesPath, { json: true });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("not valid JSON");
  });
});
