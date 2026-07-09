import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { MarkdownLedgerAdapter } from "../adapters/markdown/adapter.ts";
import { asAtomId } from "../domain/index.ts";
import { draftFor } from "../test/helpers.ts";
import {
  captureCommand,
  currentCommand,
  doctorCommand,
  initCommand,
  labelsCommand,
  lineageCommand,
  resolveCommand,
  searchCommand,
  showCommand,
  statusCommand,
} from "./index.ts";

const FIXTURES = path.resolve(import.meta.dir, "../../test/fixtures/ledger");
const execFileAsync = promisify(execFile);

async function makeLedger(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-cli-"));
  const taxonomy = path.join(dir, ".taxonomy");
  await fs.mkdir(taxonomy);
  // labels.yaml is the single taxonomy axis the new-format schema (Task 1)
  // validates against and `ndr labels` (Task 8) reads.
  await fs.writeFile(
    path.join(taxonomy, "labels.yaml"),
    "- framework\n- substrate\n- write-side\n",
    "utf8",
  );
  return dir;
}

// New-format (Task 1 schema) capture fixtures.
function draftJson(fm: Record<string, unknown> = {}): string {
  return JSON.stringify({
    frontmatter: {
      title: "Use FastAPI",
      status: "current",
      decision_date: "2026-05-15",
      author: "Jacob Hoehler",
      conviction: "tentative",
      project: "[[Auth]]",
      labels: ["substrate"],
      supersedes: [],
      ...fm,
    },
    body: "\n# PLACEHOLDER — Use FastAPI\n\n## Decision\n\nUse FastAPI.\n",
  });
}

function newFormatDraft(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return draftFor(overrides).frontmatter as Record<string, unknown>;
}

function newFormatDraftWithout(field: string): Record<string, unknown> {
  const fm = { ...newFormatDraft() };
  delete fm[field];
  return fm;
}

const MINIMAL_BODY =
  "\n# PLACEHOLDER — Capture\n\n## Decision\n\nDo it.\n\n## Context\n\n- A fact.\n\n## Why\n\nBecause.\n";

describe("ndr resolve <atom-id>", () => {
  test("head atom returns brief with no drift warning", async () => {
    const result = await resolveCommand("0102", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Markdown remains canonical");
    expect(result.stdout).toContain(
      "(0102-markdown-remains-canonical-for-ndrs-swamp-migration-paused)",
    );
    expect(result.stdout).toContain("labels: substrate");
    expect(result.stdout).toContain("conviction: strong  author: Jacob Hoehler");
    expect(result.stdout).not.toContain("reversibility");
    expect(result.stdout).toContain("Lineage: 0102");
    expect(result.stdout).toContain("- ndr:0102");
    expect(result.stdout).toContain("- ndr:substrate");
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

  test("a ref matching neither #slug, area/topic, nor atom-id falls through to a label lookup", async () => {
    const result = await resolveCommand("abc", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("no current atoms with label abc");
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

  test("--full emits the head's complete body (sections the gist omits) plus the brief frame", async () => {
    const brief = await resolveCommand("0102", FIXTURES);
    const full = await resolveCommand("0102", FIXTURES, { full: true });
    expect(full.exitCode).toBe(0);
    expect(full.stderr).toBe("");
    // The brief is gist-only; --full carries the sections ndr:0136 withheld.
    expect(brief.stdout).not.toContain("## Consequences");
    expect(full.stdout).toContain("## Why");
    expect(full.stdout).toContain("## Assumptions");
    expect(full.stdout).toContain("## Consequences");
    // Still the resolve frame: header, lineage, references.
    expect(full.stdout).toContain("labels: substrate");
    expect(full.stdout).toContain("Lineage: 0102");
    expect(full.stdout).toContain("- ndr:substrate");
  });

  test("--full on a superseded seed walks to the head and dumps the head's body with a drift warning", async () => {
    const result = await resolveCommand("0070", FIXTURES, { full: true });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("⚠ Drift: seed 0070 superseded → head 0102");
    expect(result.stdout).toContain("## Consequences");
    expect(result.stdout).toContain("Lineage: 0070 → 0102");
  });

  test("--full --json adds a body field carrying the complete head body", async () => {
    const json = JSON.parse(
      (await resolveCommand("0102", FIXTURES, { full: true, json: true })).stdout,
    );
    expect(json.head.body).toContain("## Consequences");
    expect(typeof json.head.gist).toBe("string");
    // Plain --json (no --full) stays body-free.
    const plain = JSON.parse((await resolveCommand("0102", FIXTURES, { json: true })).stdout);
    expect(plain.head.body).toBeUndefined();
  });

  test("--verbose on a single atom is rejected and redirects to --full", async () => {
    const result = await resolveCommand("0102", FIXTURES, { verbose: true });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("--verbose has no effect on single-atom resolve");
    expect(result.stderr).toContain("use --full");
  });
});

describe("ndr resolve — removed grains are hard errors", () => {
  test("resolve #slug is a hard error pointing at the two live grains", async () => {
    const result = await resolveCommand("#oxc-stack", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("slug references were removed");
  });

  test("resolve area/topic form is a hard error pointing at labels", async () => {
    const result = await resolveCommand("tooling/framework", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("label");
  });
});

describe("ndr resolve <label>", () => {
  test("resolve <label> lists all current heads carrying the label", async () => {
    const result = await resolveCommand("framework", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    // 0131 and 0132 both carry the `framework` label and are current.
    expect(result.stdout).toContain("0131");
    expect(result.stdout).toContain("0132");
  });

  test("--verbose expands the label listing to full briefs", async () => {
    const result = await resolveCommand("referencing", FIXTURES, { verbose: true });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("0049");
    expect(result.stdout).toContain("0050");
    expect(result.stdout).toContain("References:");
  });

  test("--full expands each head in the label to its complete body", async () => {
    const result = await resolveCommand("referencing", FIXTURES, { full: true });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("0049");
    expect(result.stdout).toContain("0050");
    // Full bodies, not just gist — at least one head carries a Consequences section.
    expect(result.stdout).toContain("## Consequences");
  });

  test("label with no current atoms exits 1", async () => {
    const result = await resolveCommand("nonexistent", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("no current atoms with label nonexistent");
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

describe("ndr show <id>", () => {
  test("prints the atom's raw file verbatim (frontmatter + body)", async () => {
    const result = await showCommand("0102", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    // Frontmatter fence and body sections both present — byte-equivalent to a Read.
    expect(result.stdout.startsWith("---\n")).toBe(true);
    expect(result.stdout).toContain("id: '0102'");
    expect(result.stdout).toContain("## Consequences");
  });

  test("is frozen — a superseded atom returns its OWN body, no walk to the head", async () => {
    const result = await showCommand("0070", FIXTURES);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("status: superseded");
    expect(result.stdout).toContain("# 0070 — NDR adopts hybrid architecture");
    // Must NOT have walked to the 0102 head.
    expect(result.stdout).not.toContain("Markdown remains canonical");
    expect(result.stdout).not.toContain("Drift");
  });

  test("--json returns the frontmatter fields plus a body field", async () => {
    const json = JSON.parse((await showCommand("0070", FIXTURES, { json: true })).stdout);
    expect(json.kind).toBe("atom");
    expect(json.id).toBe("0070");
    expect(json.status).toBe("superseded");
    expect(json.body).toContain("## Decision");
  });

  test("rejects non-atom-id grains (slug, area/topic) and points at resolve", async () => {
    const slug = await showCommand("#oxc-stack", FIXTURES);
    expect(slug.exitCode).toBe(1);
    expect(slug.stderr).toContain("show takes an atom-id");
    expect(slug.stderr).toContain("use resolve");

    const topic = await showCommand("substrate/substrate", FIXTURES);
    expect(topic.exitCode).toBe(1);
    expect(topic.stderr).toContain("show takes an atom-id");
  });

  test("missing atom exits 1 with a not-found message", async () => {
    const result = await showCommand("9999", FIXTURES);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("no atom with id 9999");
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
    const result = await captureCommand(draftJson({ labels: ["nope"] }), tmp);
    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stderr).error.kind).toBe("validation");
  });

  test("an already-superseded predecessor exits 2", async () => {
    await fs.writeFile(
      path.join(tmp, "0001-old.md"),
      '---\nid: "0001"\ntitle: Old\nstatus: superseded\ndecision_date: 2026-01-01\nauthor: "Jacob Hoehler"\nconviction: tentative\nproject: "[[X]]"\nlabels: ["framework"]\nsupersedes: []\nsuperseded_by: ["0050"]\n---\nbody\n',
      "utf8",
    );
    const result = await captureCommand(draftJson({ supersedes: ["0001"] }), tmp);
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

  // Defect 1 (ndr capture pipeline bug): the drafter must OMIT `id`. A draft that
  // emits a placeholder string for `id` is kept (not stripped) and rejected by the
  // schema — this is why the drafter contract and the orchestrator's Step 7 strip it.
  test("a draft carrying a placeholder `id` string is rejected with a validation error", async () => {
    const result = await captureCommand(draftJson({ id: "TBD — assigned by ndr capture" }), tmp);
    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stderr).error.kind).toBe("validation");
  });

  // Defect 2 (ndr capture pipeline bug): the body H1 must be the `# PLACEHOLDER —`
  // sentinel, not the title inline. The canonical drafter contract — no `id`, a
  // PLACEHOLDER heading — must round-trip to exit 0 with the heading patched to the
  // minted id.
  test("the canonical drafter contract (no id, PLACEHOLDER heading) round-trips and patches the H1", async () => {
    const result = await captureCommand(draftJson(), tmp);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);

    const written = await fs.readFile(path.join(tmp, parsed.path), "utf8");
    // The sentinel is gone; the minted id now prefixes the title in the H1.
    expect(written).not.toContain("# PLACEHOLDER —");
    expect(written).toContain(`# ${parsed.id} — Use FastAPI`);
    // And no leftover `id:` placeholder leaked into the frontmatter.
    expect(written).toContain(`id: "${parsed.id}"`);
  });

  test("a minimal draft omitting status/supersedes captures with capture-intent defaults", async () => {
    const minimal = JSON.stringify({
      frontmatter: {
        title: "Minimal",
        decision_date: "2026-06-07",
        author: "Jacob Hoehler",
        conviction: "tentative",
        project: "[[t]]",
        labels: ["framework"],
      },
      body: "\n# PLACEHOLDER — Minimal\n\n## Decision\n\nMinimal.\n",
    });
    const result = await captureCommand(minimal, tmp);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    const written = await fs.readFile(path.join(tmp, parsed.path), "utf8");
    expect(written).toContain("status: current");
    expect(written).toContain("supersedes: []");
  });

  test("capture auto-fills author from git identity when draft omits it", async () => {
    const draft = { frontmatter: newFormatDraftWithout("author"), body: MINIMAL_BODY };
    const result = await captureCommand(JSON.stringify(draft), tmp, undefined, "Jacob Hoehler");
    expect(result.exitCode).toBe(0);
    const written = JSON.parse(result.stdout);
    const atom = await new MarkdownLedgerAdapter(tmp).getAtom(asAtomId(written.id));
    expect(atom.frontmatter.author).toBe("Jacob Hoehler");
  });

  test("capture without author and without git identity is a validation error", async () => {
    const draft = { frontmatter: newFormatDraftWithout("author"), body: MINIMAL_BODY };
    const result = await captureCommand(JSON.stringify(draft), tmp, undefined, null);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("author");
  });

  test("capture prints advisories to stderr with exit 0", async () => {
    const adapter = new MarkdownLedgerAdapter(tmp);
    const pred = await adapter.captureAtom(draftFor({ title: "theirs", author: "Nadia Petrova" }));
    const draft = {
      frontmatter: { ...newFormatDraft(), supersedes: [pred.id] },
      body: MINIMAL_BODY,
    };
    const result = await captureCommand(JSON.stringify(draft), tmp, undefined, "Jacob Hoehler");
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("flag them before merging");
  });
});

describe("ndr doctor", () => {
  // Minimal new-format (Task 1 schema) atom writer for doctor fixtures. Unlike
  // `draftFor`/`captureAtom`, this writes raw frontmatter directly so tests can
  // seed the specific cross-atom faults diagnose() checks for (a missing
  // back-link, a stale binds glob, a missing Context section) — faults
  // `captureAtom` would never produce on its own since it keeps the corpus
  // coherent by construction.
  function atomYaml(fm: {
    id: string;
    title: string;
    status?: string;
    author?: string;
    conviction?: string;
    project?: string;
    labels?: string[];
    binds?: string[];
    supersedes?: string[];
    superseded_by?: string[];
  }): string {
    const f = {
      status: "current",
      decision_date: "2026-06-01",
      author: "Jacob Hoehler",
      conviction: "strong",
      project: "[[Doctor Fixture]]",
      labels: ["tooling"],
      binds: [] as string[],
      supersedes: [] as string[],
      superseded_by: [] as string[],
      ...fm,
    };
    return [
      `id: "${f.id}"`,
      `title: ${f.title}`,
      `status: ${f.status}`,
      `decision_date: ${f.decision_date}`,
      `author: "${f.author}"`,
      `conviction: ${f.conviction}`,
      `project: '${f.project}'`,
      `labels: ${JSON.stringify(f.labels)}`,
      `binds: ${JSON.stringify(f.binds)}`,
      `supersedes: ${JSON.stringify(f.supersedes)}`,
      `superseded_by: ${JSON.stringify(f.superseded_by)}`,
    ].join("\n");
  }

  async function writeAtom(
    dir: string,
    filename: string,
    fm: Parameters<typeof atomYaml>[0],
    body?: string,
  ): Promise<void> {
    const content =
      body ?? `\n# ${fm.id} — ${fm.title}\n\n## Decision\n\nBody.\n\n## Context\n\nSome context.\n`;
    await fs.writeFile(path.join(dir, filename), `---\n${atomYaml(fm)}\n---\n${content}`, "utf8");
  }

  async function mkLedger(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-doctor-"));
    await fs.mkdir(path.join(dir, ".taxonomy"));
    await fs.writeFile(
      path.join(dir, ".taxonomy", "labels.yaml"),
      "- tooling\n- substrate\n",
      "utf8",
    );
    return dir;
  }

  // A repo root doctor can run `git ls-files` against — used by the binds_stale
  // tests. `git add` (no commit needed) is enough for a file to show in ls-files.
  async function mkGitRepo(...files: string[]): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-doctor-repo-"));
    await execFileAsync("git", ["init", "-q"], { cwd: dir });
    for (const name of files) {
      await fs.writeFile(path.join(dir, name), "export {};\n", "utf8");
    }
    await execFileAsync("git", ["-C", dir, "add", ...files]);
    return dir;
  }

  async function snapshotLedger(dir: string): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    for (const name of await fs.readdir(dir)) {
      if (!name.endsWith(".md")) continue;
      out.set(name, await fs.readFile(path.join(dir, name), "utf8"));
    }
    return out;
  }

  let tmp: string;
  beforeEach(async () => {
    tmp = await mkLedger();
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("a healthy ledger reports clean and exits 0", async () => {
    await writeAtom(tmp, "0001-healthy.md", { id: "0001", title: "Healthy atom" });
    const result = await doctorCommand(tmp, { repoRoot: null });
    expect(result.exitCode).toBe(0);
    // repoRoot: null is the test's deliberate choice for isolation — it still
    // produces the "binds checks skipped" note, not empty stderr.
    expect(result.stderr).toBe("ndr: no repo root — binds checks skipped\n");
    expect(result.stdout).toContain("1 files scanned; corpus healthy.");
  });

  test("a missing back-pointer is a repairable chain_integrity finding", async () => {
    await writeAtom(tmp, "0001-pred.md", {
      id: "0001",
      title: "Predecessor",
      status: "superseded",
    });
    await writeAtom(tmp, "0002-succ.md", { id: "0002", title: "Successor", supersedes: ["0001"] });
    const result = await doctorCommand(tmp, { repoRoot: null });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("chain integrity:");
    expect(result.stdout).toContain("0001-pred.md  missing_back_pointer");
    expect(result.stdout).toContain("run with --fix to repair 1 missing back-link(s)");
  });

  test("without --fix the ledger is byte-identical after a run", async () => {
    await writeAtom(tmp, "0001-pred.md", {
      id: "0001",
      title: "Predecessor",
      status: "superseded",
    });
    await writeAtom(tmp, "0002-succ.md", { id: "0002", title: "Successor", supersedes: ["0001"] });
    const before = await snapshotLedger(tmp);
    await doctorCommand(tmp, { repoRoot: null });
    expect(await snapshotLedger(tmp)).toEqual(before);
  });

  test("--fix repairs the missing back-link with the plain successor id and is idempotent", async () => {
    await writeAtom(tmp, "0001-pred.md", {
      id: "0001",
      title: "Predecessor",
      status: "superseded",
    });
    await writeAtom(tmp, "0002-succ.md", { id: "0002", title: "Successor", supersedes: ["0001"] });

    const first = await doctorCommand(tmp, { fix: true, repoRoot: null });
    expect(first.stdout).toContain("repairs applied:");
    expect(first.stdout).toContain("0001-pred.md  appended_back_pointer  0002");
    expect(first.exitCode).toBe(0); // the repair clears the only findings present

    const adapter = new MarkdownLedgerAdapter(tmp);
    const patched = await adapter.getAtom(asAtomId("0001"));
    expect(patched.frontmatter.superseded_by).toEqual(["0002"]);
    // Untouched frontmatter keeps its original values (ndr:0134).
    expect(patched.frontmatter.project).toBe("[[Doctor Fixture]]");

    // Second --fix run: nothing left to repair, ledger untouched.
    const before = await snapshotLedger(tmp);
    const second = await doctorCommand(tmp, { fix: true, repoRoot: null });
    expect(second.exitCode).toBe(0);
    expect(second.stdout).not.toContain("repairs applied:");
    expect(await snapshotLedger(tmp)).toEqual(before);
  });

  test("--fix touches only the repaired file", async () => {
    await writeAtom(tmp, "0001-pred.md", {
      id: "0001",
      title: "Predecessor",
      status: "superseded",
    });
    await writeAtom(tmp, "0002-succ.md", { id: "0002", title: "Successor", supersedes: ["0001"] });
    await writeAtom(tmp, "0003-bystander.md", { id: "0003", title: "Bystander" });

    const before = await snapshotLedger(tmp);
    await doctorCommand(tmp, { fix: true, repoRoot: null });
    const after = await snapshotLedger(tmp);
    for (const [name, content] of after) {
      if (name === "0001-pred.md") {
        expect(content).not.toBe(before.get(name));
      } else {
        expect(content).toBe(before.get(name)!);
      }
    }
  });

  test("a ledger without .taxonomy/ skips taxonomy checks with a stderr note", async () => {
    const bare = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-doctor-notax-"));
    try {
      await writeAtom(bare, "0001-healthy.md", { id: "0001", title: "Healthy atom" });
      const result = await doctorCommand(bare, { repoRoot: null });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("taxonomy checks skipped");
      expect(result.stdout).toContain("corpus healthy");
    } finally {
      await fs.rm(bare, { recursive: true, force: true });
    }
  });

  test("--json emits a parseable report using the current CheckClass set", async () => {
    await writeAtom(tmp, "0001-pred.md", {
      id: "0001",
      title: "Predecessor",
      status: "superseded",
    });
    await writeAtom(tmp, "0002-succ.md", { id: "0002", title: "Successor", supersedes: ["0001"] });
    const result = await doctorCommand(tmp, { json: true, repoRoot: null });
    expect(result.exitCode).toBe(1);

    const report = JSON.parse(result.stdout);
    expect(report.scanned_atoms).toBe(2);
    expect(report.taxonomy_checked).toBe(true);
    expect(report.repair_candidates).toEqual([
      { path: "0001-pred.md", successor: "0002-succ.md", value: "0002" },
    ]);
    expect(report.repairs_applied).toEqual([]);
    // alias_drift is gone (ndr:0144 dropped aliases); binds_stale/context_section
    // are the two classes Task 6 added.
    expect(Object.keys(report.issues)).not.toContain("alias_drift");
    expect(Object.keys(report.issues)).toEqual(
      expect.arrayContaining(["binds_stale", "context_section"]),
    );
  });

  test("doctor flags a stale binds glob when repo root is provided", async () => {
    const repoRoot = await mkGitRepo("kept.ts");
    try {
      await writeAtom(tmp, "0001-binds.md", {
        id: "0001",
        title: "Binds atom",
        binds: ["nowhere/**"],
      });
      const result = await doctorCommand(tmp, { json: true, repoRoot });
      const report = JSON.parse(result.stdout);
      expect(report.issues.binds_stale.length).toBeGreaterThan(0);
    } finally {
      await fs.rm(repoRoot, { recursive: true, force: true });
    }
  });

  test("doctor skips binds checks without repo root and notes it on stderr", async () => {
    await writeAtom(tmp, "0001-binds.md", {
      id: "0001",
      title: "Binds atom",
      binds: ["nowhere/**"],
    });
    const result = await doctorCommand(tmp, { json: true, repoRoot: null });
    const report = JSON.parse(result.stdout);
    expect(report.issues.binds_stale).toEqual([]);
    expect(result.stderr).toContain("binds checks skipped");
  });

  test("human report groups findings under the new check-class labels", async () => {
    const repoRoot = await mkGitRepo("kept.ts");
    try {
      await writeAtom(
        tmp,
        "0001-nocontext.md",
        { id: "0001", title: "No context", binds: ["nowhere/**"] },
        "\n# 0001 — No context\n\n## Decision\n\nx.\n",
      );
      const result = await doctorCommand(tmp, { repoRoot });
      expect(result.stdout).toContain("stale binds:");
      expect(result.stdout).toContain("context section:");
      expect(result.stdout).not.toContain("alias drift:");
    } finally {
      await fs.rm(repoRoot, { recursive: true, force: true });
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

  test("--label filters by label membership", async () => {
    const result = await currentCommand(FIXTURES, { label: "substrate" });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("0102");
    expect(result.stdout).not.toContain("0131");
  });

  test("empty scope reports cleanly on stdout and exits 0", async () => {
    const result = await currentCommand(FIXTURES, { label: "nonexistent" });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("no current atoms with label nonexistent");
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

  test("init scaffolds labels.yaml and a plain project name", async () => {
    const result = await initCommand(tmp, { project: "myrepo" });
    expect(result.exitCode).toBe(0);
    const toml = await fs.readFile(path.join(tmp, ".ndr.toml"), "utf8");
    expect(toml).toContain('project = "myrepo"');
    expect(toml).not.toContain("[[");
    expect(await fs.exists(path.join(tmp, "decisions", ".taxonomy", "labels.yaml"))).toBe(true);
    expect(await fs.exists(path.join(tmp, "decisions", ".taxonomy", "areas.yaml"))).toBe(false);
  });

  test("fresh init scaffolds .ndr.toml, ledger, taxonomy, and the grounding rule", async () => {
    const result = await initCommand(tmp);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");

    const toml = await fs.readFile(path.join(tmp, ".ndr.toml"), "utf8");
    expect(toml).toContain('ledger = "./decisions"');
    expect(toml).toContain(`project = "${path.basename(tmp)}"`);
    expect(toml).not.toContain("[[");

    const labels = await fs.readFile(
      path.join(tmp, "decisions", ".taxonomy", "labels.yaml"),
      "utf8",
    );
    expect(labels).toContain("- architecture");
    expect(labels).toContain("- write-side");

    const rule = await fs.readFile(path.join(tmp, ".claude", "rules", "ndr.md"), "utf8");
    expect(rule).toContain("# NDR coverage");
    expect(rule).toContain("description:");
    expect(rule).not.toContain("Loose Ends");
  });

  test("capture works immediately after init via the .ndr.toml fallback", async () => {
    await initCommand(tmp);
    const fallback = path.join(tmp, "decisions");
    const capture = await captureCommand(draftJson(), undefined, fallback);
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
    expect(skips.length).toBe(4); // .ndr.toml, decisions/, labels, rules/ndr.md
  });

  test("--force rewrites .ndr.toml but never the taxonomy", async () => {
    await initCommand(tmp);
    await fs.writeFile(
      path.join(tmp, "decisions", ".taxonomy", "labels.yaml"),
      "- custom-label\n",
      "utf8",
    );
    const result = await initCommand(tmp, { project: "renamed", force: true });
    expect(result.stdout).toContain("created  .ndr.toml");
    const toml = await fs.readFile(path.join(tmp, ".ndr.toml"), "utf8");
    expect(toml).toContain('project = "renamed"');
    expect(toml).not.toContain("[[");
    const labels = await fs.readFile(
      path.join(tmp, "decisions", ".taxonomy", "labels.yaml"),
      "utf8",
    );
    expect(labels).toBe("- custom-label\n");
  });

  test("--ledger and --project overrides land in .ndr.toml", async () => {
    const result = await initCommand(tmp, { ledger: "./docs/decisions", project: "custom" });
    expect(result.exitCode).toBe(0);
    const toml = await fs.readFile(path.join(tmp, ".ndr.toml"), "utf8");
    expect(toml).toContain('ledger = "./docs/decisions"');
    expect(toml).toContain('project = "custom"');
    expect(await fs.exists(path.join(tmp, "docs", "decisions", ".taxonomy", "labels.yaml"))).toBe(
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
    expect(brief.head.labels).toEqual(["substrate"]);
    expect(brief.references).toContain("ndr:0102");
  });

  test("resolve head atom-id has drift:false", async () => {
    const brief = JSON.parse((await resolveCommand("0102", FIXTURES, { json: true })).stdout);
    expect(brief.drift).toBe(false);
    expect(brief.seed_id).toBe("0102");
  });

  test("resolve <label> emits a list", async () => {
    const list = JSON.parse((await resolveCommand("framework", FIXTURES, { json: true })).stdout);
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

describe("ndr labels", () => {
  let ledger: string;
  let tmp: string;
  beforeEach(async () => {
    // makeLedger seeds .taxonomy/labels.yaml directly on the ledger dir.
    ledger = await makeLedger();
    tmp = ledger;
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("labels command prints the taxonomy list", async () => {
    const result = await labelsCommand(ledger, {});
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("write-side");
  });

  test("--json emits a labels array", async () => {
    const out = JSON.parse((await labelsCommand(ledger, { json: true })).stdout);
    expect(Array.isArray(out.labels)).toBe(true);
    expect(out.labels).toContain("framework");
  });

  test("missing taxonomy exits 1", async () => {
    const bare = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-tax-"));
    try {
      const result = await labelsCommand(bare);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(".taxonomy/labels.yaml");
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
    expect(out.project).toBe(path.basename(tmp));
    expect(out.atoms).toEqual({ current: 0, total: 0 });
    expect(out.taxonomy.labels).toBeGreaterThan(0);
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
