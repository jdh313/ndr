import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  AtomNotFoundError,
  AtomValidationError,
  DraftValidationError,
  HalfStateError,
  MarkdownLedgerAdapter,
  SupersessionConflictError,
} from "./adapter.ts";
import { asAtomId } from "../../domain/atom.ts";
import type { AtomDraft } from "../../domain/atom.ts";

const FIXTURES_DIR = path.resolve(import.meta.dir, "../../../test/fixtures/ledger");

describe("MarkdownLedgerAdapter against fixture ledger", () => {
  const adapter = new MarkdownLedgerAdapter(FIXTURES_DIR);

  test("getAtom returns typed Atom for a known id", async () => {
    const atom = await adapter.getAtom(asAtomId("0049"));
    expect(atom.frontmatter.id).toBe("0049");
    expect(atom.frontmatter.area).toBe("tooling");
    expect(atom.frontmatter.status).toBe("current");
    expect(atom.body.length).toBeGreaterThan(0);
  });

  test("getAtom throws AtomNotFoundError for missing id", async () => {
    await expect(adapter.getAtom(asAtomId("9999"))).rejects.toBeInstanceOf(AtomNotFoundError);
  });

  test("listCurrent with area+topic filter returns only matching current atoms", async () => {
    const hits = await adapter.listCurrent({ area: "tooling", topic: "referencing" });
    expect(hits.length).toBeGreaterThanOrEqual(1);
    for (const a of hits) {
      expect(a.frontmatter.area).toBe("tooling");
      expect(a.frontmatter.topic).toBe("referencing");
      expect(a.frontmatter.status).toBe("current");
    }
  });

  test("listCurrent with area-only filter spans topics within the area", async () => {
    const hits = await adapter.listCurrent({ area: "tooling" });
    const topics = new Set(hits.map((a) => a.frontmatter.topic));
    expect(topics.size).toBeGreaterThan(1);
    for (const a of hits) {
      expect(a.frontmatter.area).toBe("tooling");
      expect(a.frontmatter.status).toBe("current");
    }
  });

  test("listCurrent with no filter excludes superseded atoms and sorts by id", async () => {
    const hits = await adapter.listCurrent();
    expect(hits.every((a) => a.frontmatter.status === "current")).toBe(true);
    // 0070 is superseded by 0102 in the fixture ledger.
    expect(hits.map((a) => a.frontmatter.id)).not.toContain("0070");
    const ids = hits.map((a) => a.frontmatter.id);
    expect([...ids].sort()).toEqual(ids);
  });

  test("listCurrent with an unknown area returns empty", async () => {
    const hits = await adapter.listCurrent({ area: "nonexistent" });
    expect(hits).toEqual([]);
  });

  test("findBySlug resolves a minted alias to its atom (prefix-tolerant)", async () => {
    const bare = await adapter.findBySlug("oxc-stack");
    expect(bare?.frontmatter.id).toBe("0132");
    expect(bare?.frontmatter.status).toBe("current");
    // The stored `ndr-` prefix form resolves to the same atom.
    const prefixed = await adapter.findBySlug("ndr-oxc-stack");
    expect(prefixed?.frontmatter.id).toBe("0132");
  });

  test("findBySlug returns null for an unminted slug", async () => {
    expect(await adapter.findBySlug("no-such-slug")).toBeNull();
  });

  test("searchFreeText finds matches in body/title", async () => {
    const hits = await adapter.searchFreeText("supersession");
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });

  test("searchFreeText returns empty for a query with no matches", async () => {
    const hits = await adapter.searchFreeText("zzz-no-match-zzz");
    expect(hits).toEqual([]);
  });
});

// Ported from scripts/test_persist.py, adapted for single-atom capture + base32
// ids (ndr:0144). Every test builds a throwaway ledger with its own taxonomy —
// the real vault is never touched.
const BASE32_ID = /^[0-9a-z]{6}$/;

async function makeLedger(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-ledger-"));
  const taxonomy = path.join(dir, ".taxonomy");
  await fs.mkdir(taxonomy);
  await fs.writeFile(
    path.join(taxonomy, "areas.yaml"),
    "- process\n- tooling\n- scope\n- substrate\n- architecture\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(taxonomy, "topics.yaml"),
    "- substrate\n- framework\n- referencing\n- supersession\n",
    "utf8",
  );
  return dir;
}

function makeDraft(fm: Record<string, unknown> = {}, body?: string): AtomDraft {
  const title = (fm.title as string) ?? "Use FastAPI for auth";
  return {
    frontmatter: {
      title,
      status: "current",
      decision_date: "2026-05-15",
      aliases: [],
      project: "[[Auth Rewrite]]",
      derived_from: [],
      informed_by: [],
      supersedes: [],
      superseded_by: [],
      area: "tooling",
      topic: "framework",
      impacts: [],
      revisit_triggers: [],
      reversibility: "medium",
      tags: ["decision"],
      ...fm,
    },
    body:
      body ??
      `\n# PLACEHOLDER — ${title}\n\n## Decision\n\n${title}.\n\n## Why\n\nAsync without rewriting the ORM.\n`,
  } as unknown as AtomDraft;
}

async function seedAtom(
  dir: string,
  opts: { id: string; title: string; status?: string; aliases?: string[]; supersededBy?: string[] },
): Promise<string> {
  const slug = opts.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const filename = `${opts.id}-${slug}.md`;
  const fm = {
    id: opts.id,
    title: opts.title,
    status: opts.status ?? "current",
    decision_date: "2026-04-01",
    aliases: opts.aliases ?? [],
    project: "[[Auth Rewrite]]",
    derived_from: [],
    informed_by: [],
    supersedes: [],
    superseded_by: opts.supersededBy ?? [],
    area: "tooling",
    topic: "framework",
    impacts: [],
    revisit_triggers: [],
    reversibility: "medium",
    tags: ["decision"],
  };
  const yaml = Object.entries(fm)
    .map(([k, v]) =>
      Array.isArray(v)
        ? `${k}: [${v.map((x) => `"${x}"`).join(", ")}]`
        : typeof v === "string" && (k === "id" || v.startsWith("[["))
          ? `${k}: "${v}"`
          : `${k}: ${v}`,
    )
    .join("\n");
  await fs.writeFile(
    path.join(dir, filename),
    `---\n${yaml}\n---\n\n# ${opts.id} — ${opts.title}\n\n## Decision\n\n${opts.title}.\n`,
    "utf8",
  );
  return filename;
}

describe("MarkdownLedgerAdapter captureAtom — clean writes", () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await makeLedger();
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("writes a fresh atom with a base32 id and patches the body placeholder", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    const result = await adapter.captureAtom(makeDraft());

    expect(result.id as string).toMatch(BASE32_ID);
    expect(result.path).toBe(`${result.id}-use-fastapi-for-auth.md`);
    expect(result.superseded).toEqual([]);
    expect(result.aliases_moved).toEqual([]);

    const roundTrip = await adapter.getAtom(asAtomId(result.id));
    expect(roundTrip.frontmatter.title).toBe("Use FastAPI for auth");
    expect(roundTrip.body).toContain(`# ${result.id} — Use FastAPI for auth`);
    expect(roundTrip.body).not.toContain("PLACEHOLDER");
  });

  test("mints a distinct base32 id alongside existing atoms", async () => {
    await seedAtom(tmp, { id: "0007", title: "Existing" });
    await seedAtom(tmp, { id: "k3m9xq", title: "Also existing" });
    const adapter = new MarkdownLedgerAdapter(tmp);
    const result = await adapter.captureAtom(makeDraft({ title: "Next" }));
    expect(result.id as string).toMatch(BASE32_ID);
    expect(result.id as string).not.toBe("k3m9xq");
  });
});

describe("MarkdownLedgerAdapter captureAtom — supersession", () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await makeLedger();
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("supersession without aliases flips the predecessor and adds a back-link", async () => {
    const predFile = await seedAtom(tmp, { id: "0001", title: "Use Flask for auth" });
    const adapter = new MarkdownLedgerAdapter(tmp);
    const result = await adapter.captureAtom(
      makeDraft({ supersedes: [`[[Decisions/${predFile.replace(/\.md$/, "")}]]`] }),
    );

    expect(result.aliases_moved).toEqual([]);
    expect(result.superseded.map((s) => s.id)).toEqual(["0001"]);

    const pred = await adapter.getAtom(asAtomId("0001"));
    expect(pred.frontmatter.status).toBe("superseded");
    expect(pred.frontmatter.superseded_by).toContain(
      `[[Decisions/${result.path.replace(/\.md$/, "")}]]`,
    );
    expect(pred.frontmatter.aliases).toEqual([]);
  });

  test("supersession with alias handover moves the slug to the successor", async () => {
    const predFile = await seedAtom(tmp, {
      id: "0011",
      title: "Monorepo symmetric apps",
      aliases: ["ndr-monorepo-shape"],
    });
    const adapter = new MarkdownLedgerAdapter(tmp);
    const result = await adapter.captureAtom(
      makeDraft({
        title: "Split apps into services",
        supersedes: [`[[Decisions/${predFile.replace(/\.md$/, "")}]]`],
      }),
    );

    expect(result.aliases_moved).toEqual([
      { slug: "ndr-monorepo-shape", from: "0011", to: result.id },
    ]);

    const pred = await adapter.getAtom(asAtomId("0011"));
    expect(pred.frontmatter.aliases).toEqual([]);
    expect(pred.frontmatter.status).toBe("superseded");

    const successor = await adapter.getAtom(asAtomId(result.id));
    expect(successor.frontmatter.aliases).toContain("ndr-monorepo-shape");
  });

  test("refuses cleanly when a predecessor is already superseded by another atom", async () => {
    const predFile = await seedAtom(tmp, {
      id: "0001",
      title: "Use Flask for auth",
      status: "superseded",
      supersededBy: ["[[Decisions/0050-some-other-successor]]"],
    });
    const adapter = new MarkdownLedgerAdapter(tmp);
    await expect(
      adapter.captureAtom(
        makeDraft({ supersedes: [`[[Decisions/${predFile.replace(/\.md$/, "")}]]`] }),
      ),
    ).rejects.toBeInstanceOf(SupersessionConflictError);

    // Clean refusal — no orphan successor written (only the seeded predecessor remains).
    const mdFiles = (await fs.readdir(tmp)).filter((n) => n.endsWith(".md"));
    expect(mdFiles).toEqual([predFile]);
  });

  test("a dangling supersedes reference is a validation error, nothing written", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    await expect(
      adapter.captureAtom(makeDraft({ supersedes: ["[[Decisions/9999-does-not-exist]]"] })),
    ).rejects.toBeInstanceOf(DraftValidationError);
    const mdFiles = (await fs.readdir(tmp)).filter((n) => n.endsWith(".md"));
    expect(mdFiles).toEqual([]);
  });

  test("a mid-transaction patch failure reports a half-state and leaves the successor", async () => {
    const predFile = await seedAtom(tmp, { id: "0001", title: "Use Flask for auth" });
    // Make the predecessor read-only so pre-flight reads it but the patch write fails.
    await fs.chmod(path.join(tmp, predFile), 0o444);

    const adapter = new MarkdownLedgerAdapter(tmp);
    let caught: unknown;
    try {
      await adapter.captureAtom(
        makeDraft({ supersedes: [`[[Decisions/${predFile.replace(/\.md$/, "")}]]`] }),
      );
    } catch (err) {
      caught = err;
    } finally {
      await fs.chmod(path.join(tmp, predFile), 0o644);
    }

    expect(caught).toBeInstanceOf(HalfStateError);
    const half = (caught as HalfStateError).halfState;
    expect(half.successor_written).toMatch(/^[0-9a-z]{6}-.*\.md$/);
    expect(half.failed_predecessor).toBe(predFile);
    // The successor landed before the patch failed (overcount, not undercount).
    const written = await fs.readdir(tmp);
    expect(written).toContain(half.successor_written);
  });
});

describe("MarkdownLedgerAdapter captureAtom — validation", () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await makeLedger();
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("a taxonomy violation blocks the write", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    await expect(
      adapter.captureAtom(makeDraft({ area: "not-a-real-area" })),
    ).rejects.toBeInstanceOf(DraftValidationError);
    expect((await fs.readdir(tmp)).filter((n) => n.endsWith(".md"))).toEqual([]);
  });

  test("a missing required field blocks", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    await expect(adapter.captureAtom(makeDraft({ project: undefined }))).rejects.toBeInstanceOf(
      DraftValidationError,
    );
  });

  test("a missing supersedes field defaults to [] (capture-intent default)", async () => {
    const draft = makeDraft();
    delete (draft.frontmatter as Record<string, unknown>).supersedes;
    const adapter = new MarkdownLedgerAdapter(tmp);
    const result = await adapter.captureAtom(draft);
    expect(result.superseded).toEqual([]);
    const written = await fs.readFile(path.join(tmp, result.path), "utf8");
    expect(written).toContain("supersedes: []");
  });

  test("an alias without the ndr- prefix blocks", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    await expect(
      adapter.captureAtom(makeDraft({ aliases: ["monorepo-shape"] })),
    ).rejects.toBeInstanceOf(DraftValidationError);
  });

  test("an invalid status blocks", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    await expect(adapter.captureAtom(makeDraft({ status: "draft" }))).rejects.toBeInstanceOf(
      DraftValidationError,
    );
  });

  test("a taxonomy file missing entirely blocks the write", async () => {
    const bare = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-bare-"));
    try {
      const adapter = new MarkdownLedgerAdapter(bare);
      await expect(adapter.captureAtom(makeDraft())).rejects.toBeInstanceOf(DraftValidationError);
    } finally {
      await fs.rm(bare, { recursive: true, force: true });
    }
  });
});

describe("MarkdownLedgerAdapter captureAtom — slug uniqueness (ndr:0050)", () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await makeLedger();
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("a slug already held by another atom is refused", async () => {
    await seedAtom(tmp, { id: "0011", title: "Monorepo", aliases: ["ndr-monorepo-shape"] });
    const adapter = new MarkdownLedgerAdapter(tmp);
    await expect(
      adapter.captureAtom(makeDraft({ title: "Unrelated", aliases: ["ndr-monorepo-shape"] })),
    ).rejects.toBeInstanceOf(DraftValidationError);
  });

  test("a slug vacated by a predecessor in the same capture is exempt", async () => {
    const predFile = await seedAtom(tmp, {
      id: "0011",
      title: "Monorepo",
      aliases: ["ndr-monorepo-shape"],
    });
    const adapter = new MarkdownLedgerAdapter(tmp);
    const result = await adapter.captureAtom(
      makeDraft({
        title: "Split into services",
        aliases: ["ndr-monorepo-shape"],
        supersedes: [`[[Decisions/${predFile.replace(/\.md$/, "")}]]`],
      }),
    );
    const successor = await adapter.getAtom(asAtomId(result.id));
    // Slug survives exactly once on the successor after handover + dedupe.
    expect(successor.frontmatter.aliases).toEqual(["ndr-monorepo-shape"]);
  });
});

describe("MarkdownLedgerAdapter bulk-read tolerance", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-ledger-"));
    // A valid current atom...
    await fs.writeFile(
      path.join(tmp, "0001-good.md"),
      '---\nid: "0001"\ntitle: Good\nstatus: current\ndecision_date: 2026-01-01\nproject: "[[X]]"\nsupersedes: []\narea: tooling\ntopic: framework\nreversibility: easy\n---\nbody mentions widgets\n',
      "utf8",
    );
    // ...alongside a genuinely-malformed one (invalid status enum).
    await fs.writeFile(
      path.join(tmp, "0002-bad.md"),
      '---\nid: "0002"\ntitle: Bad\nstatus: bogus\ndecision_date: 2026-01-01\nproject: "[[X]]"\nsupersedes: []\narea: tooling\ntopic: framework\nreversibility: easy\n---\nbody\n',
      "utf8",
    );
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("listCurrent skips the malformed atom and returns the valid one", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    const hits = await adapter.listCurrent();
    expect(hits.map((a) => a.frontmatter.id)).toEqual(["0001"]);
  });

  test("searchFreeText skips the malformed atom", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    const hits = await adapter.searchFreeText("widgets");
    expect(hits.map((a) => a.frontmatter.id)).toEqual(["0001"]);
  });

  test("targeted getAtom on the malformed atom still throws", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    await expect(adapter.getAtom(asAtomId("0002"))).rejects.toBeInstanceOf(AtomValidationError);
  });
});

describe("MarkdownLedgerAdapter error surfacing", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-ledger-"));
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("AtomValidationError carries file path and issues", async () => {
    await fs.writeFile(
      path.join(tmp, "0001-broken.md"),
      "---\nid: 1\ntitle: Bad\n---\nbody\n",
      "utf8",
    );
    const adapter = new MarkdownLedgerAdapter(tmp);
    try {
      await adapter.getAtom(asAtomId("0001"));
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AtomValidationError);
      const e = err as AtomValidationError;
      expect(e.file).toContain("0001-broken.md");
      expect(e.issues.length).toBeGreaterThan(0);
    }
  });
});
