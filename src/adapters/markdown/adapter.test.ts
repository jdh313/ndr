import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  AtomNotFoundError,
  AtomValidationError,
  MarkdownLedgerAdapter,
} from "./adapter.ts";
import { asAtomId } from "../../domain/atom.ts";

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
    await expect(adapter.getAtom(asAtomId("9999"))).rejects.toBeInstanceOf(
      AtomNotFoundError,
    );
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

describe("MarkdownLedgerAdapter captureAtom", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-ledger-"));
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("captureAtom writes a fresh atom file with auto-minted id", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    const id = await adapter.captureAtom({
      frontmatter: {
        title: "Test atom",
        status: "current",
        decision_date: "2026-06-01",
        aliases: [],
        project: "[[Test Project]]",
        derived_from: [],
        informed_by: [],
        supersedes: [],
        superseded_by: [],
        area: "tooling",
        topic: "framework",
        impacts: [],
        revisit_triggers: [],
        reversibility: "easy",
        tags: ["decision"],
      },
      body: "\n# 0001 — Test atom\n\n## Decision\n\nFoo.\n",
    });
    expect(id as string).toBe("0001");

    const written = await fs.readdir(tmp);
    expect(written).toContain("0001-test-atom.md");

    const roundTrip = await adapter.getAtom(asAtomId("0001"));
    expect(roundTrip.frontmatter.title).toBe("Test atom");
    expect(roundTrip.frontmatter.supersedes).toEqual([]);
  });

  test("captureAtom mints sequentially against existing ids", async () => {
    await fs.writeFile(
      path.join(tmp, "0005-old.md"),
      '---\nid: "0005"\ntitle: old\nstatus: current\ndecision_date: 2026-01-01\nproject: "[[X]]"\nsupersedes: []\narea: tooling\ntopic: framework\nreversibility: easy\n---\nbody\n',
      "utf8",
    );
    const adapter = new MarkdownLedgerAdapter(tmp);
    const id = await adapter.captureAtom({
      frontmatter: {
        title: "Next",
        status: "current",
        decision_date: "2026-06-01",
        project: "[[X]]",
        supersedes: [],
        area: "tooling",
        topic: "framework",
        reversibility: "easy",
      } as unknown as Parameters<typeof adapter.captureAtom>[0]["frontmatter"],
      body: "\nbody\n",
    });
    expect(id as string).toBe("0006");
  });

  test("captureAtom rejects an invalid draft via Zod", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    await expect(
      adapter.captureAtom({
        frontmatter: {
          title: "Bad",
          status: "current",
          decision_date: "2026-06-01",
          project: "[[X]]",
          // missing supersedes
          area: "tooling",
          topic: "framework",
          reversibility: "easy",
        } as unknown as Parameters<typeof adapter.captureAtom>[0]["frontmatter"],
        body: "\nbody\n",
      }),
    ).rejects.toThrow();
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
      "---\nid: \"0002\"\ntitle: Bad\nstatus: bogus\ndecision_date: 2026-01-01\nproject: \"[[X]]\"\nsupersedes: []\narea: tooling\ntopic: framework\nreversibility: easy\n---\nbody\n",
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
      '---\nid: 1\ntitle: Bad\n---\nbody\n',
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
