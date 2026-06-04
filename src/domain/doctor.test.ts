import { describe, expect, test } from "bun:test";

import { diagnose, type LedgerScan, type ScannedAtom, type Taxonomy } from "./doctor.ts";
import type { Frontmatter } from "./schema.ts";

const TAXONOMY: Taxonomy = {
  areas: ["tooling", "substrate"],
  topics: ["framework", "substrate"],
};

function atom(id: string, fm: Partial<Frontmatter> = {}, body?: string): ScannedAtom {
  const title = fm.title ?? `Atom ${id}`;
  return {
    path: `${id}-atom-${id}.md`,
    frontmatter: {
      id,
      title,
      status: "current",
      decision_date: "2026-06-01",
      aliases: [],
      project: "[[X]]",
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
    body: body ?? `\n# ${id} — ${title}\n\n## Decision\n\nBody.\n`,
  };
}

function scanOf(atoms: ScannedAtom[], malformed: LedgerScan["malformed"] = []): LedgerScan {
  return { atoms, malformed };
}

function kinds(report: ReturnType<typeof diagnose>): string[] {
  return report.findings.map((f) => f.kind);
}

describe("diagnose — healthy corpus", () => {
  test("no findings, no repair candidates", () => {
    const pred = atom("0001", {
      status: "superseded",
      superseded_by: ["[[Decisions/0002-atom-0002]]"],
    });
    const succ = atom("0002", { supersedes: ["[[Decisions/0001-atom-0001]]"] });
    const report = diagnose(scanOf([pred, succ]), TAXONOMY);
    expect(report.findings).toEqual([]);
    expect(report.repairCandidates).toEqual([]);
    expect(report.scanned).toBe(2);
    expect(report.taxonomyChecked).toBe(true);
  });

  test("base32 ids participate like legacy ids", () => {
    const a = atom("k3m9xq");
    const report = diagnose(scanOf([a]), TAXONOMY);
    expect(report.findings).toEqual([]);
  });
});

describe("diagnose — chain integrity", () => {
  test("successor claiming an atom without a back-link yields a repair candidate", () => {
    const pred = atom("0001", { status: "superseded" }); // superseded_by: [] — back-link lost
    const succ = atom("0002", { supersedes: ["[[Decisions/0001-atom-0001]]"] });
    const report = diagnose(scanOf([pred, succ]), TAXONOMY);

    expect(kinds(report)).toContain("missing_back_pointer");
    expect(kinds(report)).toContain("dangling_superseded"); // status coherence fires too
    expect(report.repairCandidates).toEqual([
      {
        predecessorPath: "0001-atom-0001.md",
        successorPath: "0002-atom-0002.md",
        wikilink: "[[Decisions/0002-atom-0002]]",
      },
    ]);
    const finding = report.findings.find((f) => f.kind === "missing_back_pointer")!;
    expect(finding.path).toBe("0001-atom-0001.md");
    expect(finding.check).toBe("chain_integrity");
  });

  test("supersedes pointing at a nonexistent atom is a dangling ref", () => {
    const a = atom("0001", { supersedes: ["[[Decisions/9999-gone]]"] });
    const report = diagnose(scanOf([a]), TAXONOMY);
    expect(kinds(report)).toContain("dangling_supersedes_ref");
    expect(report.repairCandidates).toEqual([]);
  });

  test("superseded_by pointing at a nonexistent atom is a dangling ref", () => {
    const a = atom("0001", {
      status: "superseded",
      superseded_by: ["[[Decisions/8888-gone]]"],
    });
    const report = diagnose(scanOf([a]), TAXONOMY);
    expect(kinds(report)).toContain("dangling_superseded_by_ref");
  });

  test("superseded_by naming an atom that does not claim it is unclaimed supersession", () => {
    const a = atom("0001", {
      status: "superseded",
      superseded_by: ["[[Decisions/0002-atom-0002]]"],
    });
    const b = atom("0002"); // supersedes: [] — does not claim 0001
    const report = diagnose(scanOf([a, b]), TAXONOMY);
    expect(kinds(report)).toContain("unclaimed_supersession");
    expect(report.repairCandidates).toEqual([]); // not auto-fixable
  });

  test("a ref into a malformed file is not reported as dangling", () => {
    const a = atom("0001", { supersedes: ["[[Decisions/0002-broken]]"] });
    const report = diagnose(
      scanOf(
        [a],
        [{ path: "0002-broken.md", kind: "parse_error", reason: "bad yaml", data: null }],
      ),
      TAXONOMY,
    );
    expect(kinds(report)).not.toContain("dangling_supersedes_ref");
    expect(kinds(report)).toContain("parse_error");
  });
});

describe("diagnose — status coherence", () => {
  test("current atom with a superseded_by entry is status drift", () => {
    const succ = atom("0002", { supersedes: ["[[Decisions/0001-atom-0001]]"] });
    const drifted = atom("0001", { superseded_by: ["[[Decisions/0002-atom-0002]]"] }); // status: current
    const report = diagnose(scanOf([drifted, succ]), TAXONOMY);
    expect(kinds(report)).toContain("status_drift");
  });

  test("retracted atom with a successor is a retraction conflict", () => {
    const succ = atom("0002", { supersedes: ["[[Decisions/0001-atom-0001]]"] });
    const retracted = atom("0001", {
      status: "retracted",
      superseded_by: ["[[Decisions/0002-atom-0002]]"],
    });
    const report = diagnose(scanOf([retracted, succ]), TAXONOMY);
    expect(kinds(report)).toContain("retraction_conflict");
  });
});

describe("diagnose — alias drift", () => {
  test("slug held by two current atoms is duplicate_among_current", () => {
    const a = atom("0001", { aliases: ["ndr-dup-slug"] });
    const b = atom("0002", { aliases: ["ndr-dup-slug"] });
    const report = diagnose(scanOf([a, b]), TAXONOMY);
    const finding = report.findings.find((f) => f.kind === "duplicate_among_current")!;
    expect(finding.detail).toContain("dup-slug");
    expect(finding.detail).toContain("0001-atom-0001.md");
    expect(finding.detail).toContain("0002-atom-0002.md");
  });

  test("slug held by a superseded predecessor and its current successor is stale", () => {
    const pred = atom("0001", {
      status: "superseded",
      aliases: ["ndr-stale-slug"],
      superseded_by: ["[[Decisions/0002-atom-0002]]"],
    });
    const succ = atom("0002", {
      aliases: ["ndr-stale-slug"],
      supersedes: ["[[Decisions/0001-atom-0001]]"],
    });
    const report = diagnose(scanOf([pred, succ]), TAXONOMY);
    expect(kinds(report)).toContain("stale_alias_on_superseded");
    expect(kinds(report)).not.toContain("duplicate_among_current");
  });

  test("prefixed and bare slug forms collide", () => {
    const a = atom("0001", { aliases: ["ndr-same"] });
    const b = atom("0002", { aliases: ["same"] });
    const report = diagnose(scanOf([a, b]), TAXONOMY);
    expect(kinds(report)).toContain("duplicate_among_current");
  });
});

describe("diagnose — taxonomy", () => {
  test("unknown area and topic are each flagged", () => {
    const a = atom("0001", { area: "bogus-area", topic: "bogus-topic" });
    const report = diagnose(scanOf([a]), TAXONOMY);
    expect(kinds(report)).toContain("unknown_area");
    expect(kinds(report)).toContain("unknown_topic");
  });

  test("null taxonomy skips the check and marks the report", () => {
    const a = atom("0001", { area: "bogus-area" });
    const report = diagnose(scanOf([a]), null);
    expect(kinds(report)).not.toContain("unknown_area");
    expect(report.taxonomyChecked).toBe(false);
  });
});

describe("diagnose — frontmatter/body drift", () => {
  test("H1 id differing from frontmatter id is flagged", () => {
    const a = atom("0014", {}, "\n# 0099 — Atom 0014\n\nBody.\n");
    const report = diagnose(scanOf([a]), TAXONOMY);
    expect(kinds(report)).toContain("id_mismatch_heading");
  });

  test("H1 title differing substantively from frontmatter title is flagged", () => {
    const a = atom(
      "0015",
      { title: "Use Postgres for sessions" },
      "\n# 0015 — Use Redis for sessions\n\nBody.\n",
    );
    const report = diagnose(scanOf([a]), TAXONOMY);
    expect(kinds(report)).toContain("title_drift_heading");
  });

  test("punctuation and dash-style differences are not drift", () => {
    const a = atom(
      "0016",
      { title: "Ports & adapters: the layout" },
      "\n# 0016 - Ports adapters the layout\n\nBody.\n",
    );
    const report = diagnose(scanOf([a]), TAXONOMY);
    expect(kinds(report)).not.toContain("title_drift_heading");
  });

  test("a body with no id-style H1 is skipped", () => {
    const a = atom("0017", {}, "\nNo heading here.\n");
    const report = diagnose(scanOf([a]), TAXONOMY);
    expect(report.findings.filter((f) => f.check === "frontmatter_body_drift")).toEqual([]);
  });
});

describe("diagnose — malformed and missing fields", () => {
  test("a fence/yaml failure is a parse_error finding", () => {
    const report = diagnose(
      scanOf(
        [],
        [{ path: "0020-broken.md", kind: "parse_error", reason: "missing fence", data: null }],
      ),
      TAXONOMY,
    );
    expect(kinds(report)).toEqual(["parse_error"]);
  });

  test("absent required fields classify as missing_fields, not malformed", () => {
    const report = diagnose(
      scanOf(
        [],
        [
          {
            path: "0021-thin.md",
            kind: "schema_invalid",
            reason: "reversibility: Required; supersedes: Required",
            data: { id: "0021", title: "Thin", status: "current" },
          },
        ],
      ),
      TAXONOMY,
    );
    const missing = report.findings.find((f) => f.kind === "missing_required_fields")!;
    expect(missing.check).toBe("missing_fields");
    expect(missing.detail).toContain("decision_date");
    expect(missing.detail).toContain("reversibility");
    expect(missing.detail).toContain("supersedes");
    expect(kinds(report)).not.toContain("schema_invalid");
  });

  test("a present-but-invalid field is schema_invalid", () => {
    const report = diagnose(
      scanOf(
        [],
        [
          {
            path: "0022-zombie.md",
            kind: "schema_invalid",
            reason: "status: Invalid enum value",
            data: {
              id: "0022",
              title: "Zombie",
              status: "zombie",
              decision_date: "2026-06-01",
              project: "[[X]]",
              area: "tooling",
              topic: "framework",
              reversibility: "easy",
              supersedes: [],
            },
          },
        ],
      ),
      TAXONOMY,
    );
    expect(kinds(report)).toEqual(["schema_invalid"]);
  });
});

describe("diagnose — report shape", () => {
  test("findings are grouped by check class in fixed order", () => {
    const a = atom("0001", { area: "bogus-area", supersedes: ["[[Decisions/9999-gone]]"] });
    const report = diagnose(scanOf([a]), TAXONOMY);
    const classes = report.findings.map((f) => f.check);
    expect(classes).toEqual(["chain_integrity", "taxonomy"]);
  });
});
