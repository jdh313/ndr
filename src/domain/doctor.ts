import { ATOM_ID_PATTERN, extractAtomIdFromRef } from "./atom.ts";
import type { Frontmatter } from "./schema.ts";

// ── Scan input shapes ────────────────────────────────────────────────────────
// Produced by a DoctorPort scan (src/ports/doctor.ts). Unlike the bulk read
// verbs (ndr:0138), a doctor scan keeps malformed files instead of skipping
// them — a health checker must not silently skip sick atoms.

export interface ScannedAtom {
  // Ledger-relative basename, e.g. `0042-use-fastapi-for-auth.md` (ndr:0136).
  readonly path: string;
  readonly frontmatter: Frontmatter;
  readonly body: string;
}

export type MalformedKind = "parse_error" | "schema_invalid";

export interface MalformedFile {
  readonly path: string;
  readonly kind: MalformedKind;
  readonly reason: string;
  // Raw frontmatter mapping when the YAML parsed but the schema rejected it;
  // null when the file never made it past the fence/YAML layer. Lets diagnose()
  // tell "missing required fields" apart from other schema violations.
  readonly data: Record<string, unknown> | null;
}

export interface LedgerScan {
  readonly atoms: readonly ScannedAtom[];
  readonly malformed: readonly MalformedFile[];
}

export interface Taxonomy {
  readonly labels: readonly string[];
}

// ── Findings ─────────────────────────────────────────────────────────────────

export type CheckClass =
  | "chain_integrity"
  | "status_coherence"
  | "taxonomy"
  | "binds_stale"
  | "context_section"
  | "missing_fields"
  | "frontmatter_body_drift"
  | "malformed";

// Fixed render order for grouped reports.
export const CHECK_CLASSES: readonly CheckClass[] = [
  "chain_integrity",
  "status_coherence",
  "taxonomy",
  "binds_stale",
  "context_section",
  "missing_fields",
  "frontmatter_body_drift",
  "malformed",
];

export interface Finding {
  readonly check: CheckClass;
  readonly kind: string;
  readonly path: string;
  readonly detail: string;
}

// The one auto-fixable finding class (per the curator contract): a predecessor
// whose successor names it in `supersedes:` but whose own `superseded_by:`
// lacks the back-link. The candidate carries everything the repair write needs.
export interface RepairCandidate {
  readonly predecessorPath: string;
  readonly successorPath: string;
  readonly successorId: string;
}

export interface DoctorReport {
  // Total markdown files examined: valid atoms + malformed files.
  readonly scanned: number;
  readonly taxonomyChecked: boolean;
  readonly findings: readonly Finding[];
  readonly repairCandidates: readonly RepairCandidate[];
}

// Required frontmatter fields per the curator contract. `supersedes` is listed
// because its absence (even as `[]`) means the supersession marker is missing.
const REQUIRED_FIELDS = [
  "id",
  "title",
  "status",
  "decision_date",
  "author",
  "conviction",
  "project",
  "labels",
  "supersedes",
] as const;

// ── Diagnose ─────────────────────────────────────────────────────────────────
// Pure: cross-atom invariants over an already-loaded scan (ndr:0073 — the
// schema gates per-record shape; corpus invariants live here). No I/O.

export function diagnose(
  scan: LedgerScan,
  taxonomy: Taxonomy | null,
  repoFiles: readonly string[] | null,
): DoctorReport {
  const findings: Finding[] = [];
  const repairCandidates: RepairCandidate[] = [];

  const byId = new Map<string, ScannedAtom>();
  for (const atom of scan.atoms) {
    byId.set(atom.frontmatter.id, atom);
  }
  // An id "exists" if any file — valid or malformed — carries it. A reference
  // into a malformed file is that file's problem, not a dangling link.
  const presentIds = new Set<string>(byId.keys());
  for (const m of scan.malformed) {
    const fromName = /^(\d{4}|[0-9a-z]{6})-/.exec(m.path);
    if (fromName) presentIds.add(fromName[1]!);
  }

  for (const atom of scan.atoms) {
    checkChainIntegrity(atom, byId, presentIds, findings, repairCandidates);
    checkStatusCoherence(atom, findings);
    if (taxonomy !== null) checkTaxonomy(atom, taxonomy, findings);
    if (repoFiles !== null) checkBindsStale(atom, repoFiles, findings);
    checkContextSection(atom, findings);
    checkFrontmatterBodyDrift(atom, findings);
  }

  for (const m of scan.malformed) {
    classifyMalformed(m, findings);
  }

  sortFindings(findings);
  return {
    scanned: scan.atoms.length + scan.malformed.length,
    taxonomyChecked: taxonomy !== null,
    findings,
    repairCandidates,
  };
}

// ── Chain integrity (bidirectional, plus dangling refs) ─────────────────────

function checkChainIntegrity(
  atom: ScannedAtom,
  byId: ReadonlyMap<string, ScannedAtom>,
  presentIds: ReadonlySet<string>,
  findings: Finding[],
  repairCandidates: RepairCandidate[],
): void {
  const fm = atom.frontmatter;

  for (const link of fm.supersedes) {
    const targetId = extractAtomIdFromRef(link);
    if (targetId === null) {
      findings.push({
        check: "chain_integrity",
        kind: "unparseable_supersedes_ref",
        path: atom.path,
        detail: `supersedes entry \`${link}\` has no recognizable atom-id`,
      });
      continue;
    }
    if (!presentIds.has(targetId)) {
      findings.push({
        check: "chain_integrity",
        kind: "dangling_supersedes_ref",
        path: atom.path,
        detail: `supersedes names ${targetId} but no atom with that id exists in the ledger`,
      });
      continue;
    }
    const target = byId.get(targetId);
    if (target === undefined) continue; // file exists but is malformed — flagged separately
    const hasBackLink = target.frontmatter.superseded_by.some(
      (l) => extractAtomIdFromRef(l) === fm.id,
    );
    if (!hasBackLink) {
      findings.push({
        check: "chain_integrity",
        kind: "missing_back_pointer",
        path: target.path,
        detail: `${atom.path} claims to supersede this atom but superseded_by lacks the back-link (repairable with --fix)`,
      });
      repairCandidates.push({
        predecessorPath: target.path,
        successorPath: atom.path,
        successorId: atom.frontmatter.id,
      });
    }
  }

  for (const link of fm.superseded_by) {
    const targetId = extractAtomIdFromRef(link);
    if (targetId === null) {
      findings.push({
        check: "chain_integrity",
        kind: "unparseable_superseded_by_ref",
        path: atom.path,
        detail: `superseded_by entry \`${link}\` has no recognizable atom-id`,
      });
      continue;
    }
    if (!presentIds.has(targetId)) {
      findings.push({
        check: "chain_integrity",
        kind: "dangling_superseded_by_ref",
        path: atom.path,
        detail: `superseded_by names ${targetId} but no atom with that id exists in the ledger`,
      });
      continue;
    }
    const target = byId.get(targetId);
    if (target === undefined) continue;
    const claims = target.frontmatter.supersedes.some((l) => extractAtomIdFromRef(l) === fm.id);
    if (!claims) {
      findings.push({
        check: "chain_integrity",
        kind: "unclaimed_supersession",
        path: atom.path,
        detail: `superseded_by names ${targetId} but ${target.path} does not claim to supersede this atom — authoring error in its supersedes, needs human review`,
      });
    }
  }
}

// ── Status coherence ─────────────────────────────────────────────────────────

function checkStatusCoherence(atom: ScannedAtom, findings: Finding[]): void {
  const fm = atom.frontmatter;
  if (fm.status === "superseded" && fm.superseded_by.length === 0) {
    findings.push({
      check: "status_coherence",
      kind: "dangling_superseded",
      path: atom.path,
      detail: "status is `superseded` but superseded_by is empty — the replacement is unnamed",
    });
  }
  if (fm.status === "current" && fm.superseded_by.length > 0) {
    findings.push({
      check: "status_coherence",
      kind: "status_drift",
      path: atom.path,
      detail: `status is \`current\` but superseded_by names ${fm.superseded_by.length} successor(s)`,
    });
  }
  if (fm.status === "retracted" && fm.superseded_by.length > 0) {
    findings.push({
      check: "status_coherence",
      kind: "retraction_conflict",
      path: atom.path,
      detail:
        "status is `retracted` but superseded_by is non-empty — if a successor exists, status should be `superseded`",
    });
  }
}

// ── Taxonomy ─────────────────────────────────────────────────────────────────

function checkTaxonomy(atom: ScannedAtom, taxonomy: Taxonomy, findings: Finding[]): void {
  for (const label of atom.frontmatter.labels) {
    if (!taxonomy.labels.includes(label)) {
      findings.push({
        check: "taxonomy",
        kind: "unknown_label",
        path: atom.path,
        detail: `label \`${label}\` is not in .taxonomy/labels.yaml`,
      });
    }
  }
}

// ── Binds staleness ──────────────────────────────────────────────────────────
// Stale binds: a current head whose glob matches nothing in the repo file
// list. Advisory — doctor reports, never rewrites (spec: rot-detection).
// repoFiles === null means the caller had no repo context (flag/env ledger);
// the class is skipped entirely.
function checkBindsStale(
  atom: ScannedAtom,
  repoFiles: readonly string[],
  findings: Finding[],
): void {
  if (atom.frontmatter.status !== "current") return;
  for (const pattern of atom.frontmatter.binds) {
    const glob = new Bun.Glob(pattern);
    if (!repoFiles.some((f) => glob.match(f))) {
      findings.push({
        check: "binds_stale",
        kind: "binds_matches_nothing",
        path: atom.path,
        detail: `binds glob \`${pattern}\` matches no file in the repo — files moved or deleted?`,
      });
    }
  }
}

// ── Context section ──────────────────────────────────────────────────────────

const CONTEXT_PLACEHOLDER = "(not reconstructed at migration)";

// Context is a required body section; the migration placeholder marker is the
// grandfathering signal (advisory kind rather than missing). Section slicing
// mirrors extractGist: find the heading, cut at the next `##`.
function checkContextSection(atom: ScannedAtom, findings: Finding[]): void {
  const idx = atom.body.search(/^##\s+Context\s*$/m);
  if (idx === -1) {
    findings.push({
      check: "context_section",
      kind: "missing_context",
      path: atom.path,
      detail: "body has no `## Context` section — required in the new format",
    });
    return;
  }
  let section = atom.body.slice(idx).replace(/^##\s+Context\s*\n+/, "");
  const nextHeading = section.search(/^##\s/m);
  if (nextHeading !== -1) section = section.slice(0, nextHeading);
  const content = section.trim();
  if (content.includes(CONTEXT_PLACEHOLDER)) {
    findings.push({
      check: "context_section",
      kind: "placeholder_context",
      path: atom.path,
      detail: "Context is the migration placeholder — reconstruct when the atom is next touched",
    });
  }
}

// ── Frontmatter/body drift heuristic ─────────────────────────────────────────
// Heuristic only — findings here are flags for human review, never repairs.

function checkFrontmatterBodyDrift(atom: ScannedAtom, findings: Finding[]): void {
  const h1 = /^#\s+(\S+)\s*[—–-]\s*(.+)$/m.exec(atom.body);
  if (h1 === null) return; // no `# <id> — <title>` heading to compare against

  const [, headingId, headingTitle] = h1 as unknown as [string, string, string];
  if (ATOM_ID_PATTERN.test(headingId) && headingId !== atom.frontmatter.id) {
    findings.push({
      check: "frontmatter_body_drift",
      kind: "id_mismatch_heading",
      path: atom.path,
      detail: `body H1 says \`# ${headingId} — …\` but frontmatter id is \`${atom.frontmatter.id}\``,
    });
  }
  if (normalizeTitle(headingTitle) !== normalizeTitle(atom.frontmatter.title)) {
    findings.push({
      check: "frontmatter_body_drift",
      kind: "title_drift_heading",
      path: atom.path,
      detail: `body H1 title \`${headingTitle.trim()}\` differs from frontmatter title \`${atom.frontmatter.title}\``,
    });
  }
}

// Collapse whitespace/punctuation so only substantive word changes count as drift.
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// ── Malformed files ──────────────────────────────────────────────────────────
// A schema-invalid file whose only problem is absent/null required fields is a
// `missing_fields` finding (the curator's "missing required fields" class);
// anything else is reported as malformed.

function classifyMalformed(file: MalformedFile, findings: Finding[]): void {
  if (file.kind === "parse_error" || file.data === null) {
    findings.push({
      check: "malformed",
      kind: "parse_error",
      path: file.path,
      detail: file.reason,
    });
    return;
  }

  const missing = REQUIRED_FIELDS.filter(
    (field) => file.data![field] === undefined || file.data![field] === null,
  );
  if (missing.length > 0) {
    findings.push({
      check: "missing_fields",
      kind: "missing_required_fields",
      path: file.path,
      detail: `missing required field(s): ${missing.join(", ")}`,
    });
  }

  // Other schema violations (bad enum, wrong type, …) on fields that are present.
  const missingSet = new Set<string>(missing);
  const otherIssues = parseIssuePaths(file.reason).filter((p) => !missingSet.has(p));
  if (missing.length === 0 || otherIssues.length > 0) {
    findings.push({
      check: "malformed",
      kind: "schema_invalid",
      path: file.path,
      detail: file.reason,
    });
  }
}

// The adapter joins Zod issues as `path: message; path: message`. Recover the
// top-level field names so missing-field issues can be told apart from others.
function parseIssuePaths(reason: string): string[] {
  return reason
    .split("; ")
    .map((part) => part.split(":")[0]?.trim().split(".")[0] ?? "")
    .filter((p) => p.length > 0);
}

function sortFindings(findings: Finding[]): void {
  const order = new Map(CHECK_CLASSES.map((c, i) => [c, i]));
  findings.sort(
    (a, b) =>
      order.get(a.check)! - order.get(b.check)! ||
      a.path.localeCompare(b.path) ||
      a.kind.localeCompare(b.kind),
  );
}
