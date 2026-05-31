import { expect, test, describe } from "bun:test";
import { asAtomId, asSlug } from "./atom.ts";

describe("asAtomId", () => {
  test("accepts 4-digit zero-padded string", () => {
    expect(asAtomId("0042") as string).toBe("0042");
  });

  test("rejects non-4-digit values", () => {
    expect(() => asAtomId("42")).toThrow();
    expect(() => asAtomId("00042")).toThrow();
    expect(() => asAtomId("abcd")).toThrow();
  });
});

describe("asSlug", () => {
  test("accepts kebab-case", () => {
    expect(asSlug("monorepo-shape") as string).toBe("monorepo-shape");
    expect(asSlug("substrate") as string).toBe("substrate");
  });

  test("rejects non-kebab values", () => {
    expect(() => asSlug("Monorepo")).toThrow();
    expect(() => asSlug("mono_repo")).toThrow();
    expect(() => asSlug("-leading")).toThrow();
  });
});
