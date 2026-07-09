import { expect, test, describe } from "bun:test";
import { asAtomId, generateAtomId, extractAtomIdFromRef } from "./atom.ts";

describe("asAtomId", () => {
  test("accepts 4-digit zero-padded string (legacy)", () => {
    expect(asAtomId("0042") as string).toBe("0042");
  });

  test("accepts 6-char lowercase base32 string (ndr:0144)", () => {
    expect(asAtomId("k3m9xq") as string).toBe("k3m9xq");
    expect(asAtomId("000000") as string).toBe("000000");
  });

  test("rejects values matching neither shape", () => {
    expect(() => asAtomId("42")).toThrow();
    expect(() => asAtomId("00042")).toThrow(); // 5 digits
    expect(() => asAtomId("abcd")).toThrow(); // 4 letters, not 6
    expect(() => asAtomId("abcdefg")).toThrow(); // 7 chars
    expect(() => asAtomId("K3M9XQ")).toThrow(); // uppercase
  });
});

describe("generateAtomId", () => {
  test("returns a 6-char lowercase Crockford base32 id", () => {
    for (let i = 0; i < 200; i += 1) {
      const id = generateAtomId() as string;
      expect(id).toMatch(/^[0-9a-z]{6}$/);
      // Crockford excludes i, l, o, u.
      expect(id).not.toMatch(/[ilou]/);
      // A generated id is always a valid AtomId.
      expect(asAtomId(id) as string).toBe(id);
    }
  });

  test("varies across calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateAtomId() as string));
    // Collisions in 100 draws over 32^6 are astronomically unlikely.
    expect(ids.size).toBe(100);
  });
});

describe("extractAtomIdFromRef", () => {
  test("accepts a plain atom id", () => {
    expect(extractAtomIdFromRef("0072") as string).toBe("0072");
    expect(extractAtomIdFromRef("k3m9xq") as string).toBe("k3m9xq");
  });
  test("still accepts a legacy wikilink (old corpora)", () => {
    expect(extractAtomIdFromRef("[[Decisions/0072-taxonomy-as-sibling]]") as string).toBe("0072");
  });
  test("returns null for garbage", () => {
    expect(extractAtomIdFromRef("not-an-id")).toBeNull();
  });
});
