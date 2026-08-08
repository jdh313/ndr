import { describe, expect, test } from "bun:test";

import { diagnose, type LedgerScan, type ScannedAtom, type Taxonomy } from "./doctor.ts";
import type { Frontmatter } from "./schema.ts";

const TAXONOMY: Taxonomy = {
  labels: ["tooling", "substrate", "framework"],
};

const REPO_FILES = ["src/adapters/markdown/adapter.ts", "src/cli/index.ts"];

function atom(id: string, fm: Partial<Frontmatter> = {}, body?: string): ScannedAtom {
  const title = fm.title ?? `Atom ${id}`;
  return {
    path: `${id}-atom-${id}.md`,
    frontmatter: {
      id,
      title,
      status: "current",
      decision_date: "2026-06-01",
      author: "Jacob Hoehler",
      conviction: "strong",
      project: "X",
      labels: ["tooling"],
      binds: [],
      derived_from: [],
      informed_by: [],
      supersedes: [],
      superseded_by: [],
      ...fm,
    },
    body: body ?? `\n# ${id} — ${title}\n\n## Decision\n\nBody.\n\n## Context\n\nSome context.\n`,
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
      superseded_by: ["0002"],
    });
    const succ = atom("0002", { supersedes: ["0001"] });
    const report = diagnose(scanOf([pred, succ]), TAXONOMY, null);
    expect(report.findings).toEqual([]);
    expect(report.repairCandidates).toEqual([]);
    expect(report.scanned).toBe(2);
    expect(report.taxonomyChecked).toBe(true);
  });

  test("base32 ids participate like legacy ids", () => {
    const a = atom("k3m9xq");
    const report = diagnose(scanOf([a]), TAXONOMY, null);
    expect(report.findings).toEqual([]);
  });
});

describe("diagnose — chain integrity", () => {
  test("successor claiming an atom without a back-link yields a repair candidate", () => {
    const pred = atom("0001", { status: "superseded" }); // superseded_by: [] — back-link lost
    const succ = atom("0002", { supersedes: ["0001"] });
    const report = diagnose(scanOf([pred, succ]), TAXONOMY, null);

    expect(kinds(report)).toContain("missing_back_pointer");
    expect(kinds(report)).toContain("dangling_superseded"); // status coherence fires too
    expect(report.repairCandidates).toEqual([
      {
        predecessorPath: "0001-atom-0001.md",
        successorPath: "0002-atom-0002.md",
        successorId: "0002",
      },
    ]);
    const finding = report.findings.find((f) => f.kind === "missing_back_pointer")!;
    expect(finding.path).toBe("0001-atom-0001.md");
    expect(finding.check).toBe("chain_integrity");
  });

  test("supersedes pointing at a nonexistent atom is a dangling ref", () => {
    const a = atom("0001", { supersedes: ["9999"] });
    const report = diagnose(scanOf([a]), TAXONOMY, null);
    expect(kinds(report)).toContain("dangling_supersedes_ref");
    expect(report.repairCandidates).toEqual([]);
  });

  test("superseded_by pointing at a nonexistent atom is a dangling ref", () => {
    const a = atom("0001", {
      status: "superseded",
      superseded_by: ["8888"],
    });
    const report = diagnose(scanOf([a]), TAXONOMY, null);
    expect(kinds(report)).toContain("dangling_superseded_by_ref");
  });

  test("superseded_by naming an atom that does not claim it is unclaimed supersession", () => {
    const a = atom("0001", {
      status: "superseded",
      superseded_by: ["0002"],
    });
    const b = atom("0002"); // supersedes: [] — does not claim 0001
    const report = diagnose(scanOf([a, b]), TAXONOMY, null);
    expect(kinds(report)).toContain("unclaimed_supersession");
    expect(report.repairCandidates).toEqual([]); // not auto-fixable
  });

  test("a ref into a malformed file is not reported as dangling", () => {
    const a = atom("0001", { supersedes: ["0002"] });
    const report = diagnose(
      scanOf(
        [a],
        [{ path: "0002-broken.md", kind: "parse_error", reason: "bad yaml", data: null }],
      ),
      TAXONOMY,
      null,
    );
    expect(kinds(report)).not.toContain("dangling_supersedes_ref");
    expect(kinds(report)).toContain("parse_error");
  });
});

describe("diagnose — status coherence", () => {
  test("current atom with a superseded_by entry is status drift", () => {
    const succ = atom("0002", { supersedes: ["0001"] });
    const drifted = atom("0001", { superseded_by: ["0002"] }); // status: current
    const report = diagnose(scanOf([drifted, succ]), TAXONOMY, null);
    expect(kinds(report)).toContain("status_drift");
  });

  test("retracted atom with a successor is a retraction conflict", () => {
    const succ = atom("0002", { supersedes: ["0001"] });
    const retracted = atom("0001", {
      status: "retracted",
      superseded_by: ["0002"],
    });
    const report = diagnose(scanOf([retracted, succ]), TAXONOMY, null);
    expect(kinds(report)).toContain("retraction_conflict");
  });
});

describe("diagnose — taxonomy", () => {
  test("unknown label is flagged", () => {
    const a = atom("0001", { labels: ["bogus-label"] });
    const report = diagnose(scanOf([a]), TAXONOMY, null);
    expect(kinds(report)).toContain("unknown_label");
  });

  test("null taxonomy skips the check and marks the report", () => {
    const a = atom("0001", { labels: ["bogus-label"] });
    const report = diagnose(scanOf([a]), null, null);
    expect(kinds(report)).not.toContain("unknown_label");
    expect(report.taxonomyChecked).toBe(false);
  });
});

describe("diagnose — binds stale", () => {
  test("binds glob matching zero repo files is a binds_stale finding on current heads", () => {
    const a = atom("0001", { status: "current", binds: ["src/vanished/**"] });
    const report = diagnose(scanOf([a]), TAXONOMY, REPO_FILES);
    expect(report.findings.some((f) => f.check === "binds_stale")).toBe(true);
  });

  test("binds check skips superseded atoms and skips entirely when repoFiles is null", () => {
    const dead = atom("0001", {
      status: "superseded",
      superseded_by: ["0002"],
      binds: ["gone/**"],
    });
    const live = atom("0002", { status: "current", supersedes: ["0001"], binds: ["gone/**"] });
    expect(
      diagnose(scanOf([dead, live]), TAXONOMY, REPO_FILES).findings.filter(
        (f) => f.check === "binds_stale",
      ),
    ).toHaveLength(1);
    expect(
      diagnose(scanOf([dead, live]), TAXONOMY, null).findings.filter(
        (f) => f.check === "binds_stale",
      ),
    ).toHaveLength(0);
  });

  test("binds glob matching a repo file is not a finding", () => {
    const a = atom("0001", { status: "current", binds: ["src/cli/**"] });
    const report = diagnose(scanOf([a]), TAXONOMY, REPO_FILES);
    expect(report.findings.filter((f) => f.check === "binds_stale")).toHaveLength(0);
  });
});

describe("diagnose — context section", () => {
  test("missing Context section is a finding; placeholder-only Context is advisory kind", () => {
    const missing = atom("0001", {}, "# 0001 — t\n\n## Decision\n\nx.\n\n## Why\n\ny.\n");
    const placeholder = atom(
      "0002",
      {},
      "# 0002 — t\n\n## Decision\n\nx.\n\n## Context\n\n- (not reconstructed at migration)\n\n## Why\n\ny.\n",
    );
    const report = diagnose(scanOf([missing, placeholder]), TAXONOMY, null);
    const contextKinds = report.findings
      .filter((f) => f.check === "context_section")
      .map((f) => f.kind);
    expect(contextKinds).toContain("missing_context");
    expect(contextKinds).toContain("placeholder_context");
  });
});

describe("diagnose — frontmatter/body drift", () => {
  test("H1 id differing from frontmatter id is flagged", () => {
    const a = atom("0014", {}, "\n# 0099 — Atom 0014\n\nBody.\n\n## Context\n\nx.\n");
    const report = diagnose(scanOf([a]), TAXONOMY, null);
    expect(kinds(report)).toContain("id_mismatch_heading");
  });

  test("H1 title differing substantively from frontmatter title is flagged", () => {
    const a = atom(
      "0015",
      { title: "Use Postgres for sessions" },
      "\n# 0015 — Use Redis for sessions\n\nBody.\n\n## Context\n\nx.\n",
    );
    const report = diagnose(scanOf([a]), TAXONOMY, null);
    expect(kinds(report)).toContain("title_drift_heading");
  });

  test("punctuation and dash-style differences are not drift", () => {
    const a = atom(
      "0016",
      { title: "Ports & adapters: the layout" },
      "\n# 0016 - Ports adapters the layout\n\nBody.\n\n## Context\n\nx.\n",
    );
    const report = diagnose(scanOf([a]), TAXONOMY, null);
    expect(kinds(report)).not.toContain("title_drift_heading");
  });

  test("a body with no id-style H1 is skipped", () => {
    const a = atom("0017", {}, "\nNo heading here.\n\n## Context\n\nx.\n");
    const report = diagnose(scanOf([a]), TAXONOMY, null);
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
      null,
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
            reason: "conviction: Required; supersedes: Required",
            data: { id: "0021", title: "Thin", status: "current", author: "Jacob Hoehler" },
          },
        ],
      ),
      TAXONOMY,
      null,
    );
    const missing = report.findings.find((f) => f.kind === "missing_required_fields")!;
    expect(missing.check).toBe("missing_fields");
    expect(missing.detail).toContain("decision_date");
    expect(missing.detail).toContain("conviction");
    expect(missing.detail).toContain("labels");
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
              author: "Jacob Hoehler",
              conviction: "strong",
              project: "X",
              labels: ["tooling"],
              supersedes: [],
            },
          },
        ],
      ),
      TAXONOMY,
      null,
    );
    expect(kinds(report)).toEqual(["schema_invalid"]);
  });
});

describe("diagnose — report shape", () => {
  test("findings are grouped by check class in fixed order", () => {
    const a = atom("0001", { labels: ["bogus-label"], supersedes: ["9999"] });
    const report = diagnose(scanOf([a]), TAXONOMY, null);
    const classes = report.findings.map((f) => f.check);
    expect(classes).toEqual(["chain_integrity", "taxonomy"]);
  });
});
