import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  captureCommand,
  currentCommand,
  doctorCommand,
  initCommand,
  lineageCommand,
  resolveCommand,
  searchCommand,
  statusCommand,
  taxonomyCommand,
} from "./index.ts";

const FIXTURES = path.resolve(import.meta.dir, "../../test/fixtures/ledger");
const DOCTOR_FIXTURES = path.resolve(import.meta.dir, "../../test/fixtures/doctor-ledger");

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

  test("the fallback ledger (.ndr.toml walk-up) is used when neither flag nor vault_decisions is set", async () => {
    const result = await captureCommand(draftJson(), undefined, tmp);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(await fs.readdir(tmp)).toContain(parsed.path);
  });

  test("the draft's vault_decisions wins over the fallback ledger", async () => {
    const other = await makeLedger();
    try {
      const payload = JSON.stringify({
        vault_decisions: tmp,
        ...JSON.parse(draftJson()),
      });
      const result = await captureCommand(payload, undefined, other);
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(await fs.readdir(tmp)).toContain(parsed.path);
      expect(await fs.readdir(other)).not.toContain(parsed.path);
    } finally {
      await fs.rm(other, { recursive: true, force: true });
    }
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

  test("a minimal draft omitting status/supersedes/tags captures with capture-intent defaults", async () => {
    const minimal = JSON.stringify({
      frontmatter: {
        title: "Minimal",
        decision_date: "2026-06-07",
        project: "[[t]]",
        area: "tooling",
        topic: "framework",
        reversibility: "easy",
      },
      body: "\n# PLACEHOLDER — Minimal\n\n## Decision\n\nMinimal.\n",
    });
    const result = await captureCommand(minimal, tmp);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    const written = await fs.readFile(path.join(tmp, parsed.path), "utf8");
    expect(written).toContain("status: current");
    expect(written).toContain("supersedes: []");
    expect(written).toMatch(/tags:[\s\S]*decision/);
  });
});

describe("ndr doctor", () => {
  // Every finding kind the seeded fixture corpus must fire, by check class.
  const EXPECTED_KINDS = [
    "missing_back_pointer",
    "dangling_supersedes_ref",
    "dangling_superseded_by_ref",
    "unclaimed_supersession",
    "dangling_superseded",
    "status_drift",
    "retraction_conflict",
    "duplicate_among_current",
    "stale_alias_on_superseded",
    "unknown_area",
    "unknown_topic",
    "missing_required_fields",
    "id_mismatch_heading",
    "title_drift_heading",
    "parse_error",
    "schema_invalid",
  ];

  async function snapshotLedger(dir: string): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    for (const name of await fs.readdir(dir)) {
      if (!name.endsWith(".md")) continue;
      out.set(name, await fs.readFile(path.join(dir, name), "utf8"));
    }
    return out;
  }

  async function copyDoctorLedger(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-doctor-"));
    await fs.cp(DOCTOR_FIXTURES, dir, { recursive: true });
    return dir;
  }

  test("flags every check class against the fault-seeded fixture corpus", async () => {
    const result = await doctorCommand(DOCTOR_FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("");
    for (const kind of EXPECTED_KINDS) {
      expect(result.stdout).toContain(kind);
    }
    // Each finding line carries a ledger-relative path next to its kind.
    expect(result.stdout).toContain("0002-fixable-predecessor.md  missing_back_pointer");
    expect(result.stdout).toContain("0012-taxonomy-violation-atom.md  unknown_area");
    // Healthy controls appear nowhere in the report.
    expect(result.stdout).not.toContain("0001-healthy-control-atom.md  ");
    expect(result.stdout).not.toContain("k3m9xq-base32-healthy-atom.md  ");
    expect(result.stdout).toContain("19 files scanned; 16 finding(s); 1 repairable with --fix.");
  });

  test("without --fix the ledger is byte-identical after a run", async () => {
    const before = await snapshotLedger(DOCTOR_FIXTURES);
    await doctorCommand(DOCTOR_FIXTURES);
    const after = await snapshotLedger(DOCTOR_FIXTURES);
    expect(after).toEqual(before);
  });

  test("--json emits a parseable report mirroring the human findings", async () => {
    const result = await doctorCommand(DOCTOR_FIXTURES, { json: true });
    expect(result.exitCode).toBe(1);

    const report = JSON.parse(result.stdout);
    expect(report.scanned_atoms).toBe(19);
    expect(report.taxonomy_checked).toBe(true);
    expect(report.repair_candidates).toHaveLength(1);
    expect(report.repairs_applied).toEqual([]);
    expect(report.summary).toContain("16 finding(s)");

    const jsonKinds = Object.values(report.issues)
      .flat()
      .map((f) => (f as { kind: string }).kind);
    expect(new Set(jsonKinds)).toEqual(new Set(EXPECTED_KINDS));
    for (const f of Object.values(report.issues).flat() as {
      path: string;
      kind: string;
      detail: string;
    }[]) {
      expect(f.path.endsWith(".md")).toBe(true);
      expect(f.detail.length).toBeGreaterThan(0);
    }
  });

  test("--fix repairs the missing back-link and is idempotent", async () => {
    const tmp = await copyDoctorLedger();
    try {
      const first = await doctorCommand(tmp, { fix: true });
      expect(first.exitCode).toBe(1); // unrepairable findings remain
      expect(first.stdout).toContain("repairs applied:");
      expect(first.stdout).toContain(
        "0002-fixable-predecessor.md  appended_back_pointer  [[Decisions/0003-claiming-successor]]",
      );
      // The repaired findings are gone from the post-fix report.
      expect(first.stdout).not.toContain("missing_back_pointer");
      expect(first.stdout).not.toContain("dangling_superseded ");
      expect(first.stdout).toContain("14 finding(s)");

      const patched = await fs.readFile(path.join(tmp, "0002-fixable-predecessor.md"), "utf8");
      expect(patched).toContain("[[Decisions/0003-claiming-successor]]");
      // Untouched frontmatter keeps its original formatting (ndr:0134).
      expect(patched).toContain("decision_date: '2026-06-01'");
      expect(patched).toContain("project: '[[Doctor Fixture]]'");

      // Second --fix run: nothing left to repair, ledger untouched.
      const before = await snapshotLedger(tmp);
      const second = await doctorCommand(tmp, { fix: true });
      expect(second.exitCode).toBe(1);
      expect(second.stdout).not.toContain("repairs applied:");
      expect(second.stdout).toContain("14 finding(s)");
      expect(await snapshotLedger(tmp)).toEqual(before);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  test("--fix touches only the repaired file", async () => {
    const tmp = await copyDoctorLedger();
    try {
      const before = await snapshotLedger(tmp);
      await doctorCommand(tmp, { fix: true });
      const after = await snapshotLedger(tmp);
      for (const [name, content] of after) {
        if (name === "0002-fixable-predecessor.md") {
          expect(content).not.toBe(before.get(name));
        } else {
          expect(content).toBe(before.get(name)!);
        }
      }
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  test("a healthy ledger reports clean and exits 0", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-doctor-healthy-"));
    try {
      await fs.mkdir(path.join(tmp, ".taxonomy"));
      await fs.cp(path.join(DOCTOR_FIXTURES, ".taxonomy"), path.join(tmp, ".taxonomy"), {
        recursive: true,
      });
      for (const name of ["0001-healthy-control-atom.md", "k3m9xq-base32-healthy-atom.md"]) {
        await fs.copyFile(path.join(DOCTOR_FIXTURES, name), path.join(tmp, name));
      }
      const result = await doctorCommand(tmp);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("2 files scanned; corpus healthy.");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  test("a ledger without .taxonomy/ skips taxonomy checks with a stderr note", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-doctor-notax-"));
    try {
      await fs.copyFile(
        path.join(DOCTOR_FIXTURES, "0001-healthy-control-atom.md"),
        path.join(tmp, "0001-healthy-control-atom.md"),
      );
      const result = await doctorCommand(tmp);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("taxonomy checks skipped");
      expect(result.stdout).toContain("corpus healthy");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
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

describe("ndr capture without any ledger", () => {
  test("no flag, no vault_decisions, no fallback exits 1 naming ndr init", async () => {
    const result = await captureCommand(draftJson());
    expect(result.exitCode).toBe(1);
    const err = JSON.parse(result.stderr).error;
    expect(err.kind).toBe("no_ledger");
    expect(err.messages[0]).toContain("ndr init");
  });
});

describe("ndr init", () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-init-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("fresh init scaffolds .ndr.toml, ledger, taxonomy, and the grounding rule", async () => {
    const result = await initCommand(tmp);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");

    const toml = await fs.readFile(path.join(tmp, ".ndr.toml"), "utf8");
    expect(toml).toContain('ledger = "./decisions"');
    expect(toml).toContain(`project = "[[${path.basename(tmp)}]]"`);

    const areas = await fs.readFile(path.join(tmp, "decisions", ".taxonomy", "areas.yaml"), "utf8");
    expect(areas).toContain("- architecture");
    const topics = await fs.readFile(
      path.join(tmp, "decisions", ".taxonomy", "topics.yaml"),
      "utf8",
    );
    expect(topics).toContain("- framework");

    const rule = await fs.readFile(path.join(tmp, ".claude", "rules", "ndr.md"), "utf8");
    expect(rule).toContain("# NDR coverage");
    expect(rule).toContain("description:");
    expect(rule).not.toContain("Loose Ends");
  });

  test("capture works immediately after init via the .ndr.toml fallback", async () => {
    await initCommand(tmp);
    const fallback = path.join(tmp, "decisions");
    const capture = await captureCommand(
      draftJson({ area: "tooling", topic: "framework" }),
      undefined,
      fallback,
    );
    expect(capture.exitCode).toBe(0);
    const parsed = JSON.parse(capture.stdout);
    const current = await currentCommand(fallback);
    expect(current.stdout).toContain(parsed.id);
  });

  test("re-run skips every artifact", async () => {
    await initCommand(tmp);
    const result = await initCommand(tmp);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain("created");
    const skips = result.stdout.split("\n").filter((l) => l.startsWith("skipped"));
    expect(skips.length).toBe(5); // .ndr.toml, decisions/, areas, topics, rules/ndr.md
  });

  test("--force rewrites .ndr.toml but never the taxonomy", async () => {
    await initCommand(tmp);
    await fs.writeFile(
      path.join(tmp, "decisions", ".taxonomy", "areas.yaml"),
      "- custom-area\n",
      "utf8",
    );
    const result = await initCommand(tmp, { project: "renamed", force: true });
    expect(result.stdout).toContain("created  .ndr.toml");
    const toml = await fs.readFile(path.join(tmp, ".ndr.toml"), "utf8");
    expect(toml).toContain('project = "[[renamed]]"');
    const areas = await fs.readFile(path.join(tmp, "decisions", ".taxonomy", "areas.yaml"), "utf8");
    expect(areas).toBe("- custom-area\n");
  });

  test("--ledger and --project overrides land in .ndr.toml", async () => {
    const result = await initCommand(tmp, { ledger: "./docs/decisions", project: "[[custom]]" });
    expect(result.exitCode).toBe(0);
    const toml = await fs.readFile(path.join(tmp, ".ndr.toml"), "utf8");
    expect(toml).toContain('ledger = "./docs/decisions"');
    expect(toml).toContain('project = "[[custom]]"');
    expect(await fs.exists(path.join(tmp, "docs", "decisions", ".taxonomy", "areas.yaml"))).toBe(
      true,
    );
  });

  test("the grounding rule is created alongside an existing CLAUDE.md without touching it", async () => {
    await fs.mkdir(path.join(tmp, ".claude"));
    await fs.writeFile(path.join(tmp, ".claude", "CLAUDE.md"), "# Existing content\n", "utf8");
    const result = await initCommand(tmp);
    expect(result.stdout).toContain("created  .claude/rules/ndr.md");
    expect(await fs.readFile(path.join(tmp, ".claude", "CLAUDE.md"), "utf8")).toBe(
      "# Existing content\n",
    );
    expect(await fs.exists(path.join(tmp, ".claude", "rules", "ndr.md"))).toBe(true);
  });

  test("an existing rule file is left untouched on re-run", async () => {
    await initCommand(tmp);
    const rulePath = path.join(tmp, ".claude", "rules", "ndr.md");
    const before = await fs.readFile(rulePath, "utf8");
    const result = await initCommand(tmp);
    expect(result.stdout).toContain("skipped  .claude/rules/ndr.md");
    expect(await fs.readFile(rulePath, "utf8")).toBe(before);
  });
});

describe("read verbs --json", () => {
  test("resolve atom-id emits a brief object with drift + lineage", async () => {
    const result = await resolveCommand("0070", FIXTURES, { json: true });
    expect(result.exitCode).toBe(0);
    const brief = JSON.parse(result.stdout);
    expect(brief.kind).toBe("brief");
    expect(brief.drift).toBe(true);
    expect(brief.seed_id).toBe("0070");
    expect(brief.head_id).toBe("0102");
    expect(brief.lineage).toEqual(["0070", "0102"]);
    expect(brief.head.area).toBe("substrate");
    expect(brief.references).toContain("ndr:0102");
  });

  test("resolve head atom-id has drift:false", async () => {
    const brief = JSON.parse((await resolveCommand("0102", FIXTURES, { json: true })).stdout);
    expect(brief.drift).toBe(false);
    expect(brief.seed_id).toBe("0102");
  });

  test("resolve #slug follows to the head with drift:false", async () => {
    const brief = JSON.parse((await resolveCommand("#oxc-stack", FIXTURES, { json: true })).stdout);
    expect(brief.kind).toBe("brief");
    expect(brief.drift).toBe(false);
    expect(brief.head.id).toBe("0132");
  });

  test("resolve area/topic emits a list", async () => {
    const list = JSON.parse(
      (await resolveCommand("tooling/framework", FIXTURES, { json: true })).stdout,
    );
    expect(list.kind).toBe("list");
    expect(list.count).toBe(list.atoms.length);
    expect(list.count).toBeGreaterThan(0);
    expect(list.atoms[0]).toHaveProperty("gist");
  });

  test("current --json count matches atoms length and excludes superseded", async () => {
    const list = JSON.parse((await currentCommand(FIXTURES, { json: true })).stdout);
    expect(list.kind).toBe("list");
    expect(list.count).toBe(list.atoms.length);
    expect(list.atoms.some((a: { id: string }) => a.id === "0070")).toBe(false);
  });

  test("search --json returns an empty list (count 0) when nothing matches", async () => {
    const list = JSON.parse(
      (await searchCommand("zzz-no-match-zzz", FIXTURES, { json: true })).stdout,
    );
    expect(list).toEqual({ kind: "list", count: 0, atoms: [] });
  });

  test("lineage --json emits the chain with statuses", async () => {
    const out = JSON.parse((await lineageCommand("0070", FIXTURES, { json: true })).stdout);
    expect(out.kind).toBe("lineage");
    expect(out.head_id).toBe("0102");
    expect(out.chain).toEqual([
      { id: "0070", title: expect.any(String), status: "superseded" },
      { id: "0102", title: expect.any(String), status: "current" },
    ]);
  });
});

describe("current summary on stderr", () => {
  test("count goes to stderr, stdout stays a clean head list", async () => {
    const result = await currentCommand(FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toMatch(/^\d+ current atoms\n$/);
    expect(result.stdout).not.toContain("current atoms");
  });
});

describe("ndr areas / topics", () => {
  let ledger: string;
  let tmp: string;
  beforeEach(async () => {
    // makeLedger seeds .taxonomy/{areas,topics}.yaml directly on the ledger dir.
    ledger = await makeLedger();
    tmp = ledger;
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("areas lists one per line", async () => {
    const result = await taxonomyCommand(ledger, "areas");
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim().split("\n")).toContain("tooling");
  });

  test("topics --json emits a topics array", async () => {
    const out = JSON.parse((await taxonomyCommand(ledger, "topics", { json: true })).stdout);
    expect(Array.isArray(out.topics)).toBe(true);
    expect(out.topics).toContain("framework");
  });

  test("missing taxonomy exits 1", async () => {
    const bare = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-tax-"));
    try {
      const result = await taxonomyCommand(bare, "areas");
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(".taxonomy/areas.yaml");
    } finally {
      await fs.rm(bare, { recursive: true, force: true });
    }
  });
});

describe("ndr status", () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-status-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("a fresh init reports the configured ledger, counts, taxonomy, and grounding", async () => {
    await initCommand(tmp);
    const out = JSON.parse((await statusCommand(tmp, { json: true })).stdout);
    expect(out.version).toBeString();
    expect(out.ledger.source).toContain(".ndr.toml");
    expect(out.project).toBe(`[[${path.basename(tmp)}]]`);
    expect(out.atoms).toEqual({ current: 0, total: 0 });
    expect(out.taxonomy.areas).toBeGreaterThan(0);
    expect(out.grounding.rule).toBe(true);
  });

  test("an unconfigured directory reports source none without throwing", async () => {
    const out = JSON.parse((await statusCommand(tmp, { json: true })).stdout);
    expect(out.ledger.source).toBe("none");
    expect(out.ledger.path).toBeNull();
    expect(out.atoms).toBeNull();
    expect(out.grounding.rule).toBe(false);
  });

  test("human output names `ndr init` when unconfigured", async () => {
    const result = await statusCommand(tmp);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("(none)");
    expect(result.stdout).toContain("ndr init");
  });

  test("an explicit --ledger is reported as source flag", async () => {
    const out = JSON.parse((await statusCommand(tmp, { ledger: FIXTURES, json: true })).stdout);
    expect(out.ledger.source).toBe("flag");
    expect(out.atoms.total).toBeGreaterThan(0);
  });
});
