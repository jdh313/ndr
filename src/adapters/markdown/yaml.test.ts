import { expect, test, describe } from "bun:test";
import { parseFrontmatterYaml, stringifyFrontmatter } from "./yaml.ts";

describe("parseFrontmatterYaml", () => {
  test("preserves quoted id as string", () => {
    const { data } = parseFrontmatterYaml(`id: "0042"\nfoo: bar\n`);
    expect((data as { id: unknown }).id).toBe("0042");
  });

  test("an unquoted numeric id becomes a number — schema must reject it", () => {
    const { data } = parseFrontmatterYaml(`id: 0042\n`);
    // eemeli/yaml parses unquoted numerics as numbers. The schema is what rejects
    // this — the parser is honest about what was on disk.
    expect(typeof (data as { id: unknown }).id).toBe("number");
  });
});

describe("stringifyFrontmatter", () => {
  test("forces id to double-quoted style", () => {
    const out = stringifyFrontmatter({ id: "0042", title: "x" });
    expect(out).toContain(`id: "0042"`);
  });

  test("renders empty arrays as flow style", () => {
    const out = stringifyFrontmatter({
      id: "0042",
      title: "x",
      supersedes: [],
      aliases: [],
    });
    expect(out).toContain("supersedes: []");
    expect(out).toContain("aliases: []");
  });

  test("renders non-empty arrays as block style", () => {
    const out = stringifyFrontmatter({
      id: "0042",
      title: "x",
      supersedes: ["[[Decisions/0001]]"],
    });
    expect(out).toMatch(/supersedes:\n\s+- /);
  });
});
