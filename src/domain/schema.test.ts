import { describe, expect, test } from "bun:test";

import { FrontmatterSchema } from "./schema.ts";

const valid = {
  id: "0042",
  title: "Use FastAPI for the auth service",
  status: "current",
  decision_date: "2026-05-14",
  author: "Jacob Hoehler",
  conviction: "tentative",
  project: "ndr",
  labels: ["write-side", "taxonomy"],
  binds: ["src/adapters/**"],
  supersedes: [],
  superseded_by: [],
  derived_from: [],
  informed_by: [],
};

describe("FrontmatterSchema", () => {
  test("accepts a fully-populated new-format atom", () => {
    const r = FrontmatterSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  test("defaults binds, derived_from, informed_by, superseded_by to []", () => {
    const { binds, derived_from, informed_by, superseded_by, ...rest } = valid;
    const r = FrontmatterSchema.parse(rest);
    expect(r.binds).toEqual([]);
    expect(r.derived_from).toEqual([]);
    expect(r.informed_by).toEqual([]);
    expect(r.superseded_by).toEqual([]);
  });

  test("rejects missing author", () => {
    const { author, ...rest } = valid;
    expect(FrontmatterSchema.safeParse(rest).success).toBe(false);
  });

  test("rejects unknown conviction value", () => {
    expect(FrontmatterSchema.safeParse({ ...valid, conviction: "medium" }).success).toBe(false);
  });

  test("rejects empty labels list", () => {
    expect(FrontmatterSchema.safeParse({ ...valid, labels: [] }).success).toBe(false);
  });

  test("rejects more than 4 labels", () => {
    const labels = ["a", "b", "c", "d", "e"];
    expect(FrontmatterSchema.safeParse({ ...valid, labels }).success).toBe(false);
  });

  test("project must be a plain string, not a wikilink", () => {
    expect(FrontmatterSchema.safeParse({ ...valid, project: "[[ndr]]" }).success).toBe(false);
    expect(FrontmatterSchema.safeParse({ ...valid, project: "ndr" }).success).toBe(true);
  });

  test("supersedes entries must be atom ids, not wikilinks", () => {
    const bad = { ...valid, supersedes: ["[[Decisions/0072-old-atom]]"] };
    expect(FrontmatterSchema.safeParse(bad).success).toBe(false);
    const good = { ...valid, supersedes: ["0072"] };
    expect(FrontmatterSchema.safeParse(good).success).toBe(true);
  });

  test("rejects unquoted numeric id (ndr:0139)", () => {
    expect(FrontmatterSchema.safeParse({ ...valid, id: 42 }).success).toBe(false);
  });

  test("rejects removed legacy fields via strict mode", () => {
    expect(FrontmatterSchema.safeParse({ ...valid, reversibility: "easy" }).success).toBe(false);
    expect(FrontmatterSchema.safeParse({ ...valid, area: "tooling" }).success).toBe(false);
    expect(FrontmatterSchema.safeParse({ ...valid, aliases: [] }).success).toBe(false);
  });
});
