import { describe, expect, test } from "bun:test";
import path from "node:path";

import { resolveCommand } from "./index.ts";

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

  test("non-4-digit ref is rejected with a clear stderr message", async () => {
    const result = await resolveCommand("abc", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("only atom-id grain");
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
