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

// Ported from scripts/test_persist.py, adapted for single-atom capture, base32
// ids (ndr:0144), and the new-format frontmatter schema (Task 1). Every test
// builds a throwaway ledger with its own taxonomy — the real vault ledger
// (test/fixtures/ledger, still pre-migration format) is never touched here.
const BASE32_ID = /^[0-9a-z]{6}$/;

async function makeLedger(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-ledger-"));
  const taxonomy = path.join(dir, ".taxonomy");
  await fs.mkdir(taxonomy);
  await fs.writeFile(
    path.join(taxonomy, "labels.yaml"),
    "- write-side\n- taxonomy\n- meta-chain\n",
    "utf8",
  );
  return dir;
}

function draftFor(overrides: Record<string, unknown> = {}): AtomDraft {
  const title = (overrides.title as string) ?? "t";
  return {
    frontmatter: {
      title,
      status: "current",
      decision_date: "2026-07-08",
      author: "Jacob Hoehler",
      conviction: "tentative",
      project: "ndr",
      labels: ["write-side"],
      supersedes: [],
      ...overrides,
    },
    body: `\n# PLACEHOLDER — ${title}\n\n## Decision\n\nOne sentence.\n\n## Context\n\n- A fact.\n\n## Why\n\nBecause.\n`,
  } as unknown as AtomDraft;
}

async function captureRaw(adapter: MarkdownLedgerAdapter, overrides: Record<string, unknown> = {}) {
  return await adapter.captureAtom(draftFor(overrides));
}

async function capture(adapter: MarkdownLedgerAdapter, overrides: Record<string, unknown> = {}) {
  const r = await captureRaw(adapter, overrides);
  return { id: r.id };
}

async function seedAtom(
  dir: string,
  opts: {
    id: string;
    title: string;
    status?: string;
    labels?: string[];
    binds?: string[];
    author?: string;
    supersededBy?: string[];
  },
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
    author: opts.author ?? "test-author",
    conviction: "tentative",
    project: "ndr",
    labels: opts.labels ?? ["write-side"],
    binds: opts.binds ?? [],
    supersedes: [],
    superseded_by: opts.supersededBy ?? [],
  };
  const yaml = Object.entries(fm)
    .map(([k, v]) =>
      Array.isArray(v) ? `${k}: [${v.map((x) => `"${x}"`).join(", ")}]` : `${k}: "${v}"`,
    )
    .join("\n");
  await fs.writeFile(
    path.join(dir, filename),
    `---\n${yaml}\n---\n\n# ${opts.id} — ${opts.title}\n\n## Decision\n\n${opts.title}.\n`,
    "utf8",
  );
  return filename;
}

describe("MarkdownLedgerAdapter reads", () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await makeLedger();
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("getAtom returns typed Atom for a known id", async () => {
    await seedAtom(tmp, { id: "0049", title: "Some decision", labels: ["taxonomy"] });
    const adapter = new MarkdownLedgerAdapter(tmp);
    const atom = await adapter.getAtom(asAtomId("0049"));
    expect(atom.frontmatter.id).toBe("0049");
    expect(atom.frontmatter.labels).toEqual(["taxonomy"]);
    expect(atom.frontmatter.status).toBe("current");
    expect(atom.body.length).toBeGreaterThan(0);
  });

  test("getAtom throws AtomNotFoundError for missing id", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    await expect(adapter.getAtom(asAtomId("9999"))).rejects.toBeInstanceOf(AtomNotFoundError);
  });

  test("listCurrent with a label filter returns only matching current atoms", async () => {
    await seedAtom(tmp, { id: "0001", title: "A write-side call", labels: ["write-side"] });
    await seedAtom(tmp, { id: "0002", title: "A taxonomy call", labels: ["taxonomy"] });
    const adapter = new MarkdownLedgerAdapter(tmp);
    const hits = await adapter.listCurrent({ label: "write-side" });
    expect(hits.map((a) => a.frontmatter.id)).toEqual(["0001"]);
  });

  test("listCurrent with no filter excludes superseded atoms and sorts by id", async () => {
    await seedAtom(tmp, { id: "0002", title: "B" });
    await seedAtom(tmp, { id: "0001", title: "A" });
    await seedAtom(tmp, { id: "0003", title: "C", status: "superseded", supersededBy: ["0002"] });
    const adapter = new MarkdownLedgerAdapter(tmp);
    const hits = await adapter.listCurrent();
    expect(hits.every((a) => a.frontmatter.status === "current")).toBe(true);
    expect(hits.map((a) => a.frontmatter.id)).not.toContain("0003");
    const ids = hits.map((a) => a.frontmatter.id);
    expect([...ids].sort()).toEqual(ids);
  });

  test("listCurrent with an unknown label returns empty", async () => {
    await seedAtom(tmp, { id: "0001", title: "A" });
    const adapter = new MarkdownLedgerAdapter(tmp);
    expect(await adapter.listCurrent({ label: "nonexistent" })).toEqual([]);
  });

  test("searchFreeText finds matches in body/title", async () => {
    await seedAtom(tmp, { id: "0001", title: "Supersession chain" });
    const adapter = new MarkdownLedgerAdapter(tmp);
    const hits = await adapter.searchFreeText("supersession");
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });

  test("searchFreeText returns empty for a query with no matches", async () => {
    await seedAtom(tmp, { id: "0001", title: "A" });
    const adapter = new MarkdownLedgerAdapter(tmp);
    const hits = await adapter.searchFreeText("zzz-no-match-zzz");
    expect(hits).toEqual([]);
  });
});

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
    const result = await captureRaw(adapter, { title: "Use FastAPI for auth" });

    expect(result.id as string).toMatch(BASE32_ID);
    expect(result.path).toBe(`${result.id}-use-fastapi-for-auth.md`);
    expect(result.superseded).toEqual([]);
    expect(result.advisories).toEqual([]);

    const roundTrip = await adapter.getAtom(asAtomId(result.id));
    expect(roundTrip.frontmatter.title).toBe("Use FastAPI for auth");
    expect(roundTrip.body).toContain(`# ${result.id} — Use FastAPI for auth`);
    expect(roundTrip.body).not.toContain("PLACEHOLDER");
  });

  test("mints a distinct base32 id alongside existing atoms", async () => {
    await seedAtom(tmp, { id: "0007", title: "Existing" });
    await seedAtom(tmp, { id: "k3m9xq", title: "Also existing" });
    const adapter = new MarkdownLedgerAdapter(tmp);
    const result = await captureRaw(adapter, { title: "Next" });
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

  test("supersession patches predecessor with plain-id back-link", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    const pred = await capture(adapter, { title: "old call", labels: ["write-side"] });
    const succ = await capture(adapter, {
      title: "new call",
      labels: ["write-side"],
      supersedes: [pred.id],
    });
    const patched = await adapter.getAtom(pred.id);
    expect(patched.frontmatter.status).toBe("superseded");
    expect(patched.frontmatter.superseded_by).toEqual([succ.id]);
  });

  test("binds narrowing emits an advisory, not an error", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    const pred = await capture(adapter, { title: "wide", binds: ["src/**", "plugins/**"] });
    const result = await captureRaw(adapter, {
      title: "narrow",
      binds: ["src/**"],
      supersedes: [pred.id],
    });
    expect(result.advisories.some((a) => a.includes("plugins/**"))).toBe(true);
  });

  test("cross-author supersession emits an advisory", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    const pred = await capture(adapter, { title: "theirs", author: "Nadia Petrova" });
    const result = await captureRaw(adapter, {
      title: "mine",
      author: "Jacob Hoehler",
      supersedes: [pred.id],
    });
    expect(result.advisories.some((a) => a.includes("Nadia Petrova"))).toBe(true);
  });

  test("same-author, superset-binds supersession emits no advisories", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    const pred = await capture(adapter, { title: "a", binds: ["src/**"] });
    const result = await captureRaw(adapter, {
      title: "b",
      binds: ["src/**", "test/**"],
      supersedes: [pred.id],
    });
    expect(result.advisories).toEqual([]);
  });

  test("refuses cleanly when a predecessor is already superseded by another atom", async () => {
    const predFile = await seedAtom(tmp, {
      id: "0001",
      title: "Use Flask for auth",
      status: "superseded",
      supersededBy: ["0050"],
    });
    const adapter = new MarkdownLedgerAdapter(tmp);
    await expect(captureRaw(adapter, { supersedes: ["0001"] })).rejects.toBeInstanceOf(
      SupersessionConflictError,
    );

    // Clean refusal — no orphan successor written (only the seeded predecessor remains).
    const mdFiles = (await fs.readdir(tmp)).filter((n) => n.endsWith(".md"));
    expect(mdFiles).toEqual([predFile]);
  });

  test("a dangling supersedes reference is a validation error, nothing written", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    await expect(captureRaw(adapter, { supersedes: ["9999"] })).rejects.toBeInstanceOf(
      DraftValidationError,
    );
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
      await captureRaw(adapter, { supersedes: ["0001"] });
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
    await expect(captureRaw(adapter, { labels: ["not-a-real-label"] })).rejects.toBeInstanceOf(
      DraftValidationError,
    );
    expect((await fs.readdir(tmp)).filter((n) => n.endsWith(".md"))).toEqual([]);
  });

  test("a missing required field blocks", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    await expect(captureRaw(adapter, { project: undefined })).rejects.toBeInstanceOf(
      DraftValidationError,
    );
  });

  test("a missing supersedes field defaults to [] (capture-intent default)", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    const draft = draftFor();
    delete (draft.frontmatter as Record<string, unknown>).supersedes;
    const result = await adapter.captureAtom(draft);
    expect(result.superseded).toEqual([]);
    const written = await fs.readFile(path.join(tmp, result.path), "utf8");
    expect(written).toContain("supersedes: []");
  });

  test("an invalid status blocks", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    await expect(captureRaw(adapter, { status: "draft" })).rejects.toBeInstanceOf(
      DraftValidationError,
    );
  });

  test("a taxonomy file missing entirely blocks the write", async () => {
    const bare = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-bare-"));
    try {
      const adapter = new MarkdownLedgerAdapter(bare);
      await expect(captureRaw(adapter)).rejects.toBeInstanceOf(DraftValidationError);
    } finally {
      await fs.rm(bare, { recursive: true, force: true });
    }
  });
});

describe("MarkdownLedgerAdapter bulk-read tolerance", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-ledger-"));
    // A valid current atom...
    await fs.writeFile(
      path.join(tmp, "0001-good.md"),
      '---\nid: "0001"\ntitle: Good\nstatus: current\ndecision_date: 2026-01-01\nauthor: "Jacob Hoehler"\nconviction: tentative\nproject: "ndr"\nlabels: ["write-side"]\nsupersedes: []\n---\nbody mentions widgets\n',
      "utf8",
    );
    // ...alongside a genuinely-malformed one (invalid status enum).
    await fs.writeFile(
      path.join(tmp, "0002-bad.md"),
      '---\nid: "0002"\ntitle: Bad\nstatus: bogus\ndecision_date: 2026-01-01\nauthor: "Jacob Hoehler"\nconviction: tentative\nproject: "ndr"\nlabels: ["write-side"]\nsupersedes: []\n---\nbody\n',
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

describe("MarkdownLedgerAdapter taxonomy", () => {
  let tmp: string;
  let emptyLedgerDir: string;

  beforeEach(async () => {
    tmp = await makeLedger();
    emptyLedgerDir = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-empty-"));
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
    await fs.rm(emptyLedgerDir, { recursive: true, force: true });
  });

  test("readTaxonomy returns the labels list", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    const tax = await adapter.readTaxonomy();
    expect(tax).toEqual({ labels: ["write-side", "taxonomy", "meta-chain"] });
  });

  test("readTaxonomy returns null when labels.yaml is missing", async () => {
    const bare = new MarkdownLedgerAdapter(emptyLedgerDir);
    expect(await bare.readTaxonomy()).toBeNull();
  });
});
