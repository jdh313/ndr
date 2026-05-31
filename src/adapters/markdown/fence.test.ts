import { expect, test, describe } from "bun:test";
import { promises as fs } from "node:fs";
import path from "node:path";

import { joinFrontmatter, splitFrontmatter, FenceError } from "./fence.ts";

const FIXTURES_DIR = path.resolve(import.meta.dir, "../../../test/fixtures/ledger");

describe("splitFrontmatter", () => {
  test("splits a simple frontmatter block", () => {
    const src = "---\nfoo: bar\n---\nhello\n";
    const { yaml, body } = splitFrontmatter(src);
    expect(yaml).toBe("foo: bar");
    expect(body).toBe("hello\n");
  });

  test("normalizes CRLF", () => {
    const src = "---\r\nfoo: bar\r\n---\r\nhello\r\n";
    const { yaml, body } = splitFrontmatter(src);
    expect(yaml).toBe("foo: bar");
    expect(body).toBe("hello\n");
  });

  test("throws on missing opening fence", () => {
    expect(() => splitFrontmatter("foo: bar\n---\nhello\n")).toThrow(FenceError);
  });

  test("throws on missing closing fence", () => {
    expect(() => splitFrontmatter("---\nfoo: bar\nhello\n")).toThrow(FenceError);
  });

  test("round-trips byte-stable on all fixtures (after CRLF normalize)", async () => {
    const files = (await fs.readdir(FIXTURES_DIR)).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const raw = await fs.readFile(path.join(FIXTURES_DIR, file), "utf8");
      const normalized = raw.replace(/\r\n/g, "\n");
      const { yaml, body } = splitFrontmatter(raw);
      const rejoined = joinFrontmatter(yaml, body);
      expect(rejoined).toBe(normalized);
    }
  });
});
