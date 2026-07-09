import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { migrateCommand } from "./migrate.ts";

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
