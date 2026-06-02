import { describe, expect, test } from "bun:test";
import path from "node:path";

import { currentCommand, lineageCommand, resolveCommand, searchCommand } from "./index.ts";

const FIXTURES = path.resolve(import.meta.dir, "../../test/fixtures/ledger");

describe("ndr resolve <atom-id>", () => {
  test("head atom returns brief with no drift warning", async () => {
    const result = await resolveCommand("0102", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Markdown remains canonical");
    expect(result.stdout).toContain(
      "(0102-markdown-remains-canonical-for-ndrs-swamp-migration-paused)",
    );
    expect(result.stdout).toContain("area: substrate, topic: substrate");
    expect(result.stdout).toContain("reversibility: easy");
    expect(result.stdout).toContain("Lineage: 0102");
    expect(result.stdout).toContain("- ndr:0102");
    expect(result.stdout).toContain("- ndr:substrate/substrate");
    expect(result.stdout).not.toContain("Drift");
  });

  test("superseded seed returns head brief with drift warning + multi-step lineage", async () => {
    const result = await resolveCommand("0070", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("⚠ Drift: seed 0070 superseded → head 0102");
    expect(result.stdout).toContain("Markdown remains canonical");
    expect(result.stdout).toContain("Lineage: 0070 → 0102");
  });

  test("missing atom prints not-found on stderr and exits 1", async () => {
    const result = await resolveCommand("9999", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("no atom with id 9999");
    expect(result.stderr).toContain(FIXTURES);
  });

  test("unrecognized grain is rejected with a clear stderr message", async () => {
    const result = await resolveCommand("abc", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("unrecognized reference");
  });

  test("--ledger override resolves against a different path", async () => {
    const result = await resolveCommand("0049", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ndr:0049");
    expect(result.stdout).toContain("Lineage: 0049");
  });

  test("missing atom in empty ledger still exits cleanly", async () => {
    const result = await resolveCommand("0001", path.join(FIXTURES, "..", "does-not-exist"));
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("no atom with id 0001");
  });
});

describe("ndr resolve #<slug>", () => {
  test("minted slug resolves to its current head with no drift warning", async () => {
    const result = await resolveCommand("#oxc-stack", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Oxc stack");
    expect(result.stdout).toContain("(0132-ndr-uses-the-oxc-stack-for-lint-and-format)");
    expect(result.stdout).not.toContain("Drift");
  });

  test("ndr- prefixed slug form resolves to the same atom", async () => {
    const result = await resolveCommand("#ndr-oxc-stack", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("(0132-ndr-uses-the-oxc-stack-for-lint-and-format)");
  });

  test("unminted slug exits 1 with a not-found message", async () => {
    const result = await resolveCommand("#no-such-slug", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("no atom with slug #no-such-slug");
  });
});

describe("ndr resolve <area>/<topic>", () => {
  test("topic grain lists only current heads in scope", async () => {
    const result = await resolveCommand("substrate/substrate", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    // 0102 is the current head; 0070 is superseded and must not appear.
    expect(result.stdout).toContain("0102");
    expect(result.stdout).toContain("[substrate/substrate]");
    expect(result.stdout).not.toContain("0070");
  });

  test("--verbose expands the topic listing to full briefs", async () => {
    const result = await resolveCommand("tooling/referencing", FIXTURES, { verbose: true });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("0049");
    expect(result.stdout).toContain("0050");
    expect(result.stdout).toContain("References:");
  });

  test("topic grain with no current atoms exits 1", async () => {
    const result = await resolveCommand("tooling/nonexistent", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("no current atoms for tooling/nonexistent");
  });
});

describe("ndr search <query>", () => {
  test("matching query returns compact lines", async () => {
    const result = await searchCommand("supersession", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim().length).toBeGreaterThan(0);
    expect(result.stdout).toContain("0051");
  });

  test("no-match query reports cleanly on stdout and exits 0", async () => {
    const result = await searchCommand("zzz-no-match-zzz", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("no atoms match");
  });
});

describe("ndr lineage <id>", () => {
  test("walks the full chain with statuses and arrow form", async () => {
    const result = await lineageCommand("0070", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("0070");
    expect(result.stdout).toContain("(superseded)");
    expect(result.stdout).toContain("(current)");
    expect(result.stdout).toContain("0070 → 0102");
  });

  test("missing atom exits 1", async () => {
    const result = await lineageCommand("9999", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("no atom with id 9999");
  });

  test("non-atom-id argument is rejected", async () => {
    const result = await lineageCommand("abc", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("lineage takes a 4-digit atom-id");
  });
});

describe("ndr current", () => {
  test("lists all current atoms and excludes superseded", async () => {
    const result = await currentCommand(FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("0049");
    expect(result.stdout).toContain("0132");
    expect(result.stdout).not.toContain("0070");
  });

  test("--area filter narrows the scope", async () => {
    const result = await currentCommand(FIXTURES, { area: "substrate" });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("0102");
    expect(result.stdout).not.toContain("0131");
  });

  test("empty scope reports cleanly on stdout and exits 0", async () => {
    const result = await currentCommand(FIXTURES, { area: "nonexistent" });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("no current atoms in area nonexistent");
  });
});
