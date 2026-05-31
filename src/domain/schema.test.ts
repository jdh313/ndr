import { expect, test, describe } from "bun:test";
import { promises as fs } from "node:fs";
import path from "node:path";

import { FrontmatterSchema } from "./schema.ts";
import { splitFrontmatter } from "../adapters/markdown/fence.ts";
import { parseFrontmatterYaml } from "../adapters/markdown/yaml.ts";

const FIXTURES_DIR = path.resolve(import.meta.dir, "../../test/fixtures/ledger");

describe("FrontmatterSchema", () => {
  test("validates 5+ real vault atoms in fixtures", async () => {
    const files = (await fs.readdir(FIXTURES_DIR)).filter((f) => f.endsWith(".md"));
    expect(files.length).toBeGreaterThanOrEqual(5);
    for (const file of files) {
      const raw = await fs.readFile(path.join(FIXTURES_DIR, file), "utf8");
      const { yaml } = splitFrontmatter(raw);
      const { data } = parseFrontmatterYaml(yaml);
      const result = FrontmatterSchema.safeParse(data);
      if (!result.success) {
        throw new Error(
          `Fixture ${file} failed validation:\n${result.error.issues
            .map((i) => `  ${i.path.join(".")}: ${i.message}`)
            .join("\n")}`,
        );
      }
    }
  });

  test("rejects unquoted integer id (no coerce guard)", () => {
    const result = FrontmatterSchema.safeParse({
      id: 42,
      title: "x",
      status: "current",
      decision_date: "2026-01-01",
      project: "[[X]]",
      supersedes: [],
      area: "tooling",
      topic: "framework",
      reversibility: "easy",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const idIssue = result.error.issues.find((i) => i.path[0] === "id");
      expect(idIssue).toBeDefined();
    }
  });

  test("rejects id without leading zeros", () => {
    const result = FrontmatterSchema.safeParse({
      id: "42",
      title: "x",
      status: "current",
      decision_date: "2026-01-01",
      project: "[[X]]",
      supersedes: [],
      area: "tooling",
      topic: "framework",
      reversibility: "easy",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing supersedes field", () => {
    const result = FrontmatterSchema.safeParse({
      id: "0001",
      title: "x",
      status: "current",
      decision_date: "2026-01-01",
      project: "[[X]]",
      area: "tooling",
      topic: "framework",
      reversibility: "easy",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "supersedes");
      expect(issue).toBeDefined();
    }
  });

  test("accepts empty supersedes", () => {
    const result = FrontmatterSchema.safeParse({
      id: "0001",
      title: "x",
      status: "current",
      decision_date: "2026-01-01",
      project: "[[X]]",
      supersedes: [],
      area: "tooling",
      topic: "framework",
      reversibility: "easy",
    });
    expect(result.success).toBe(true);
  });

  test("rejects bad status enum", () => {
    const result = FrontmatterSchema.safeParse({
      id: "0001",
      title: "x",
      status: "active",
      decision_date: "2026-01-01",
      project: "[[X]]",
      supersedes: [],
      area: "tooling",
      topic: "framework",
      reversibility: "easy",
    });
    expect(result.success).toBe(false);
  });

  test("rejects bad reversibility enum", () => {
    const result = FrontmatterSchema.safeParse({
      id: "0001",
      title: "x",
      status: "current",
      decision_date: "2026-01-01",
      project: "[[X]]",
      supersedes: [],
      area: "tooling",
      topic: "framework",
      reversibility: "irreversible",
    });
    expect(result.success).toBe(false);
  });
});
