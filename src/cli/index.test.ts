import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  captureCommand,
  currentCommand,
  lineageCommand,
  resolveCommand,
  searchCommand,
} from "./index.ts";

const FIXTURES = path.resolve(import.meta.dir, "../../test/fixtures/ledger");

async function makeLedger(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-cli-"));
  const taxonomy = path.join(dir, ".taxonomy");
  await fs.mkdir(taxonomy);
  await fs.writeFile(path.join(taxonomy, "areas.yaml"), "- tooling\n- substrate\n", "utf8");
  await fs.writeFile(path.join(taxonomy, "topics.yaml"), "- framework\n- substrate\n", "utf8");
  return dir;
}

function draftJson(fm: Record<string, unknown> = {}): string {
  return JSON.stringify({
    frontmatter: {
      title: "Use FastAPI",
      status: "current",
      decision_date: "2026-05-15",
      aliases: [],
      project: "[[Auth]]",
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
    body: "\n# PLACEHOLDER — Use FastAPI\n\n## Decision\n\nUse FastAPI.\n",
  });
}

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

  test("unrecognized grain is rejected with a clear stderr message", async () => {
    const result = await resolveCommand("abc", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("unrecognized reference");
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

describe("ndr resolve #<slug>", () => {
  test("minted slug resolves to its current head with no drift warning", async () => {
    const result = await resolveCommand("#oxc-stack", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Oxc stack");
    expect(result.stdout).toContain("(0132-ndr-uses-the-oxc-stack-for-lint-and-format)");
    expect(result.stdout).not.toContain("Drift");
  });

  test("ndr- prefixed slug form resolves to the same atom", async () => {
    const result = await resolveCommand("#ndr-oxc-stack", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("(0132-ndr-uses-the-oxc-stack-for-lint-and-format)");
  });

  test("unminted slug exits 1 with a not-found message", async () => {
    const result = await resolveCommand("#no-such-slug", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("no atom with slug #no-such-slug");
  });
});

describe("ndr resolve <area>/<topic>", () => {
  test("topic grain lists only current heads in scope", async () => {
    const result = await resolveCommand("substrate/substrate", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    // 0102 is the current head; 0070 is superseded and must not appear.
    expect(result.stdout).toContain("0102");
    expect(result.stdout).toContain("[substrate/substrate]");
    expect(result.stdout).not.toContain("0070");
  });

  test("--verbose expands the topic listing to full briefs", async () => {
    const result = await resolveCommand("tooling/referencing", FIXTURES, { verbose: true });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("0049");
    expect(result.stdout).toContain("0050");
    expect(result.stdout).toContain("References:");
  });

  test("topic grain with no current atoms exits 1", async () => {
    const result = await resolveCommand("tooling/nonexistent", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("no current atoms for tooling/nonexistent");
  });
});

describe("ndr search <query>", () => {
  test("matching query returns compact lines", async () => {
    const result = await searchCommand("supersession", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim().length).toBeGreaterThan(0);
    expect(result.stdout).toContain("0051");
  });

  test("no-match query reports cleanly on stdout and exits 0", async () => {
    const result = await searchCommand("zzz-no-match-zzz", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("no atoms match");
  });
});

describe("ndr lineage <id>", () => {
  test("walks the full chain with statuses and arrow form", async () => {
    const result = await lineageCommand("0070", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("0070");
    expect(result.stdout).toContain("(superseded)");
    expect(result.stdout).toContain("(current)");
    expect(result.stdout).toContain("0070 → 0102");
  });

  test("missing atom exits 1", async () => {
    const result = await lineageCommand("9999", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("no atom with id 9999");
  });

  test("non-atom-id argument is rejected", async () => {
    const result = await lineageCommand("abc", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("lineage takes an atom-id");
  });
});

describe("ndr capture", () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await makeLedger();
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("a valid draft writes a base32 atom and prints its result on stdout", async () => {
    const result = await captureCommand(draftJson(), tmp);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");

    const parsed = JSON.parse(result.stdout);
    expect(parsed.id).toMatch(/^[0-9a-z]{6}$/);
    expect(parsed.path).toBe(`${parsed.id}-use-fastapi.md`);

    // The written atom resolves back through the (widened) atom-id resolver.
    const round = await resolveCommand(parsed.id, tmp);
    expect(round.exitCode).toBe(0);
    expect(round.stdout).toContain("Use FastAPI");
    expect(round.stdout).toContain(`Lineage: ${parsed.id}`);
  });

  test("malformed JSON exits 1 with a bad_json error", async () => {
    const result = await captureCommand("{not json", tmp);
    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stderr).error.kind).toBe("bad_json");
  });

  test("a taxonomy violation exits 1 with a validation error", async () => {
    const result = await captureCommand(draftJson({ area: "nope" }), tmp);
    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stderr).error.kind).toBe("validation");
  });

  test("an already-superseded predecessor exits 2", async () => {
    await fs.writeFile(
      path.join(tmp, "0001-old.md"),
      '---\nid: "0001"\ntitle: Old\nstatus: superseded\ndecision_date: 2026-01-01\naliases: []\nproject: "[[X]]"\nsupersedes: []\nsuperseded_by: ["[[Decisions/0050-other]]"]\narea: tooling\ntopic: framework\nreversibility: easy\ntags: ["decision"]\n---\nbody\n',
      "utf8",
    );
    const result = await captureCommand(draftJson({ supersedes: ["[[Decisions/0001-old]]"] }), tmp);
    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stderr).error.kind).toBe("supersession_conflict");
  });

  test("the --ledger flag wins over the draft's vault_decisions", async () => {
    const other = await makeLedger();
    try {
      const payload = JSON.stringify({
        vault_decisions: other,
        ...JSON.parse(draftJson()),
      });
      const result = await captureCommand(payload, tmp);
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      // Atom landed in the flag ledger (tmp), not the payload one (other).
      expect(await fs.readdir(tmp)).toContain(parsed.path);
      expect(await fs.readdir(other)).not.toContain(parsed.path);
    } finally {
      await fs.rm(other, { recursive: true, force: true });
    }
  });
});

describe("ndr current", () => {
  test("lists all current atoms and excludes superseded", async () => {
    const result = await currentCommand(FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("0049");
    expect(result.stdout).toContain("0132");
    expect(result.stdout).not.toContain("0070");
  });

  test("--area filter narrows the scope", async () => {
    const result = await currentCommand(FIXTURES, { area: "substrate" });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("0102");
    expect(result.stdout).not.toContain("0131");
  });

  test("empty scope reports cleanly on stdout and exits 0", async () => {
    const result = await currentCommand(FIXTURES, { area: "nonexistent" });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("no current atoms in area nonexistent");
  });
});
