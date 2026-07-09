# Atom Format Core (CLI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the ndr atom format to the repo-native spec — new frontmatter (author, conviction, labels, binds; plain-value refs), new single-altitude body contract, doctor/capture/resolve support, and a mechanical `ndr migrate` command.

**Architecture:** Ports-and-adapters TypeScript CLI (ndr:0133). Zod schema gates per-record shape; corpus invariants live in `diagnose()` (ndr:0073). The format change flows outward: domain schema → markdown adapter → CLI commands → templates. Migration pass 1 is a new CLI command that rewrites old-format atoms in place; pass 2 (body reshaping) is a separate plan.

**Tech Stack:** Bun + TypeScript, Zod, commander, `eemeli/yaml`, `bun test`, oxlint/oxfmt.

**Spec:** `docs/superpowers/specs/2026-07-08-atom-format-redesign.md` — the authority for every format rule referenced below.

## Global Constraints

- All work on a feature branch off `dev` (repo default branch for PRs is `main`, working branch is `dev`).
- Conventional commits enforced by commitlint via git hooks — `feat:` / `refactor:` / `test:` / `docs:`, lowercase, no trailing period.
- After every task: `bun test && bun run typecheck && bun run lint && bun run format:check` must pass before commit. `bun run format` fixes formatting.
- Comments/code ASCII except where surrounding file already uses em-dashes in comments (it does — match it).
- Atom id shapes are unchanged: legacy `^\d{4}$` and 6-char Crockford base32 (`ndr:0144`).
- Exit-code contract unchanged: 0 ok, 1 validation/findings, 2 supersession conflict, 3 half-state/repair failure.
- The existing corpus in `decisions/` is OLD-format and will fail the new schema until `ndr migrate` runs (Task 10) — this is expected. Tests use fixture atoms, not the live ledger, so the suite stays green throughout. Do not run non-test `ndr` read commands against `decisions/` mid-plan and expect success.

---

### Task 1: New frontmatter schema

**Files:**
- Modify: `src/domain/schema.ts`
- Test: `src/domain/schema.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `FrontmatterSchema`, `ConvictionSchema = z.enum(["strong","tentative","arbitrary"])`, type `Frontmatter` with fields `id, title, status, decision_date, author, conviction, project, labels, binds, supersedes, superseded_by, derived_from, informed_by`. `ReversibilitySchema` is deleted — later tasks must not import it.

- [ ] **Step 1: Rewrite the test file for the new schema**

Replace `src/domain/schema.test.ts` content. Keep the existing test for id quoting; the valid fixture becomes:

```ts
import { describe, expect, test } from "bun:test";

import { FrontmatterSchema } from "./schema.ts";

const valid = {
  id: "0042",
  title: "Use FastAPI for the auth service",
  status: "current",
  decision_date: "2026-05-14",
  author: "Jacob Hoehler",
  conviction: "tentative",
  project: "ndr",
  labels: ["write-side", "taxonomy"],
  binds: ["src/adapters/**"],
  supersedes: [],
  superseded_by: [],
  derived_from: [],
  informed_by: [],
};

describe("FrontmatterSchema", () => {
  test("accepts a fully-populated new-format atom", () => {
    const r = FrontmatterSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  test("defaults binds, derived_from, informed_by, superseded_by to []", () => {
    const { binds, derived_from, informed_by, superseded_by, ...rest } = valid;
    const r = FrontmatterSchema.parse(rest);
    expect(r.binds).toEqual([]);
    expect(r.derived_from).toEqual([]);
    expect(r.informed_by).toEqual([]);
    expect(r.superseded_by).toEqual([]);
  });

  test("rejects missing author", () => {
    const { author, ...rest } = valid;
    expect(FrontmatterSchema.safeParse(rest).success).toBe(false);
  });

  test("rejects unknown conviction value", () => {
    expect(FrontmatterSchema.safeParse({ ...valid, conviction: "medium" }).success).toBe(false);
  });

  test("rejects empty labels list", () => {
    expect(FrontmatterSchema.safeParse({ ...valid, labels: [] }).success).toBe(false);
  });

  test("rejects more than 4 labels", () => {
    const labels = ["a", "b", "c", "d", "e"];
    expect(FrontmatterSchema.safeParse({ ...valid, labels }).success).toBe(false);
  });

  test("supersedes entries must be atom ids, not wikilinks", () => {
    const bad = { ...valid, supersedes: ["[[Decisions/0072-old-atom]]"] };
    expect(FrontmatterSchema.safeParse(bad).success).toBe(false);
    const good = { ...valid, supersedes: ["0072"] };
    expect(FrontmatterSchema.safeParse(good).success).toBe(true);
  });

  test("rejects unquoted numeric id (ndr:0139)", () => {
    expect(FrontmatterSchema.safeParse({ ...valid, id: 42 }).success).toBe(false);
  });

  test("rejects removed legacy fields via strict mode", () => {
    expect(FrontmatterSchema.safeParse({ ...valid, reversibility: "easy" }).success).toBe(false);
    expect(FrontmatterSchema.safeParse({ ...valid, area: "tooling" }).success).toBe(false);
    expect(FrontmatterSchema.safeParse({ ...valid, aliases: [] }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/domain/schema.test.ts`
Expected: FAIL (schema lacks author/conviction/labels; strict mode not set).

- [ ] **Step 3: Rewrite the schema**

Replace `src/domain/schema.ts`:

```ts
import { z } from "zod";

// Atom ids are either legacy 4-digit zero-padded strings or 6-char lowercase
// base32 (ndr:0144) — both must be quoted. An unquoted `id: 0128` parses as the
// number 128 and is rejected. Keep in lockstep with ATOM_ID_PATTERN in atom.ts.
const AtomIdString = z
  .string()
  .regex(
    /^(?:\d{4}|[0-9a-z]{6})$/,
    "id must be a 4-digit zero-padded string (legacy) or 6-char lowercase base32",
  );

const IsoDate = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "decision_date must be ISO YYYY-MM-DD"),
  z.date(),
]);

export const StatusSchema = z.enum(["current", "superseded", "retracted"]);

// How strongly the decision is held — sets the bar a supersession proposal
// must clear. Required with no default: a default invites never thinking
// about it (same rationale as supersedes-presence).
export const ConvictionSchema = z.enum(["strong", "tentative", "arbitrary"]);

// `.strict()` so removed legacy fields (area, topic, tags, aliases, impacts,
// reversibility, revisit_triggers) are rejected rather than silently carried —
// an un-migrated atom must surface as schema_invalid, not pass with baggage.
export const FrontmatterSchema = z
  .object({
    id: AtomIdString,
    title: z.string().min(1),
    status: StatusSchema,
    decision_date: IsoDate,
    author: z.string().min(1),
    conviction: ConvictionSchema,

    project: z.string().min(1),

    labels: z.array(z.string().min(1)).min(1).max(4),
    binds: z.array(z.string().min(1)).default([]),

    supersedes: z.array(AtomIdString),
    superseded_by: z.array(AtomIdString).default([]),
    derived_from: z.array(z.string()).default([]),
    informed_by: z.array(AtomIdString).default([]),
  })
  .strict();

export type Frontmatter = z.infer<typeof FrontmatterSchema>;
```

- [ ] **Step 4: Run tests to verify schema tests pass**

Run: `bun test src/domain/schema.test.ts`
Expected: PASS. (The rest of the suite is now broken — that is Tasks 2–8's job; do NOT run the full suite as a gate yet.)

- [ ] **Step 5: Commit**

```bash
git add src/domain/schema.ts src/domain/schema.test.ts
git commit -m "feat!: new-format frontmatter schema (author, conviction, labels, binds)"
```

---

### Task 2: Domain reference types and atom-id parsing

**Files:**
- Modify: `src/domain/atom.ts`
- Test: `src/domain/atom.test.ts`

**Interfaces:**
- Produces: `extractAtomIdFromRef(ref: string): AtomId | null` (renamed from `extractAtomIdFromWikilink`; accepts plain ids AND legacy wikilinks — migration and doctor read old corpora). `Reference` becomes `{ grain: "atom-id"; id: AtomId } | { grain: "label"; label: string }`. `normalizeSlug`, `asSlug`, `Slug` are DELETED.

- [ ] **Step 1: Update tests**

In `src/domain/atom.test.ts`: delete any tests for `normalizeSlug`/`asSlug`; rename `extractAtomIdFromWikilink` references; add:

```ts
import { extractAtomIdFromRef } from "./atom.ts";

describe("extractAtomIdFromRef", () => {
  test("accepts a plain atom id", () => {
    expect(extractAtomIdFromRef("0072")).toBe("0072");
    expect(extractAtomIdFromRef("k3m9xq")).toBe("k3m9xq");
  });
  test("still accepts a legacy wikilink (old corpora)", () => {
    expect(extractAtomIdFromRef("[[Decisions/0072-taxonomy-as-sibling]]")).toBe("0072");
  });
  test("returns null for garbage", () => {
    expect(extractAtomIdFromRef("not-an-id")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `bun test src/domain/atom.test.ts`
Expected: FAIL with "extractAtomIdFromRef is not exported".

- [ ] **Step 3: Implement**

In `src/domain/atom.ts`: rename the function (body unchanged — it already handles both forms), delete `normalizeSlug`, `asSlug`, `Slug`, `SlugBrand`, and replace the `Reference` type:

```ts
export type Reference = { grain: "atom-id"; id: AtomId } | { grain: "label"; label: string };

// Pull the atom-id out of a reference. Accepts the new plain-id form ("0072")
// and the legacy wikilink form ("[[Decisions/0042-some-title]]") — migration
// and doctor still read pre-migration corpora. Returns null when no
// recognizable id is present.
export function extractAtomIdFromRef(ref: string): AtomId | null {
  const cleaned = ref.replace(/^\[\[|\]\]$/g, "");
  const tail = cleaned.split("/").pop() ?? cleaned;
  const m = /^(\d{4}|[0-9a-z]{6})(?:-|$)/.exec(tail);
  return m ? asAtomId(m[1]!) : null;
}
```

Fix the two other importers to compile (`src/domain/doctor.ts`, `src/adapters/markdown/adapter.ts`): update the import name only — their logic is reworked in Tasks 3–5. Delete `SlugString` usages if any import remains.

- [ ] **Step 4: Run tests**

Run: `bun test src/domain/atom.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/atom.ts src/domain/atom.test.ts src/domain/doctor.ts src/adapters/markdown/adapter.ts
git commit -m "refactor!: two-grain reference type, extractAtomIdFromRef accepts plain ids"
```

---

### Task 3: Taxonomy becomes a single labels axis

**Files:**
- Modify: `src/domain/doctor.ts` (the `Taxonomy` interface only), `src/adapters/markdown/adapter.ts` (`readTaxonomy`, `assertTaxonomy`, `readTaxonomyList` callers)
- Test: `src/adapters/markdown/adapter.test.ts` (taxonomy-related tests)

**Interfaces:**
- Produces: `interface Taxonomy { readonly labels: readonly string[] }`. Adapter `readTaxonomy()` reads `<ledger>/.taxonomy/labels.yaml` (single file). `assertTaxonomy(labels: readonly string[])` validates every label.

- [ ] **Step 1: Update adapter taxonomy tests**

In `src/adapters/markdown/adapter.test.ts`, find the taxonomy fixture setup (writes `areas.yaml`/`topics.yaml` into a temp ledger `.taxonomy/`). Replace with a single `labels.yaml`:

```ts
await fs.writeFile(
  path.join(ledgerDir, ".taxonomy", "labels.yaml"),
  "- write-side\n- taxonomy\n- meta-chain\n",
  "utf8",
);
```

Add/replace tests:

```ts
test("readTaxonomy returns the labels list", async () => {
  const tax = await adapter.readTaxonomy();
  expect(tax).toEqual({ labels: ["write-side", "taxonomy", "meta-chain"] });
});

test("readTaxonomy returns null when labels.yaml is missing", async () => {
  // point adapter at a ledger without .taxonomy/labels.yaml
  const bare = new MarkdownLedgerAdapter(emptyLedgerDir);
  expect(await bare.readTaxonomy()).toBeNull();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test src/adapters/markdown/adapter.test.ts -t taxonomy`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `src/domain/doctor.ts`:

```ts
export interface Taxonomy {
  readonly labels: readonly string[];
}
```

In `src/adapters/markdown/adapter.ts`:

```ts
private async assertTaxonomy(labels: readonly string[]): Promise<void> {
  const known = await this.readTaxonomyList(path.join(this.ledger, ".taxonomy", "labels.yaml"));
  const errors = labels
    .filter((l) => !known.includes(l))
    .map((l) => `label \`${l}\` not in taxonomy labels [${known.join(", ")}]`);
  if (errors.length > 0) throw new DraftValidationError(errors);
}

async readTaxonomy(): Promise<Taxonomy | null> {
  try {
    return {
      labels: await this.readTaxonomyList(path.join(this.ledger, ".taxonomy", "labels.yaml")),
    };
  } catch (err) {
    if (err instanceof DraftValidationError) return null;
    throw err;
  }
}
```

Update the `captureAtom` call site to `await this.assertTaxonomy(parsed.labels);`.

- [ ] **Step 4: Run taxonomy tests**

Run: `bun test src/adapters/markdown/adapter.test.ts -t taxonomy`
Expected: PASS (other adapter tests still red until Task 4).

- [ ] **Step 5: Commit**

```bash
git add src/domain/doctor.ts src/adapters/markdown/adapter.ts src/adapters/markdown/adapter.test.ts
git commit -m "feat!: single labels.yaml taxonomy axis replaces areas/topics"
```

---

### Task 4: Adapter — capture, supersession, reads on the new format

**Files:**
- Modify: `src/adapters/markdown/adapter.ts`, `src/ports/write.ts`, `src/ports/read.ts`
- Test: `src/adapters/markdown/adapter.test.ts`

**Interfaces:**
- Produces (ports/write.ts): `CaptureResult { id: AtomId; path: string; superseded: SupersededRecord[]; advisories: string[] }`. `AliasMove` DELETED.
- Produces (ports/read.ts): `CurrentFilter { label?: string }`.
- Adapter: `findBySlug` DELETED. `walkLineage` follows plain-id `superseded_by`. `patchPredecessor` writes plain-id back-links. Advisories composed in `captureAtom` for (a) binds narrowing, (b) cross-author supersession.

- [ ] **Step 1: Rewrite adapter capture tests for the new format**

Update all draft fixtures in `src/adapters/markdown/adapter.test.ts` to new-format frontmatter (see Task 1's `valid` object; drafts omit `id`). Delete tests for: alias handover, slug uniqueness, `findBySlug`, `ndr-` prefix enforcement. Update supersession tests to plain ids. Add:

```ts
test("supersession patches predecessor with plain-id back-link", async () => {
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
  const pred = await capture(adapter, { title: "wide", binds: ["src/**", "plugins/**"] });
  const result = await captureRaw(adapter, {
    title: "narrow",
    binds: ["src/**"],
    supersedes: [pred.id],
  });
  expect(result.advisories.some((a) => a.includes("plugins/**"))).toBe(true);
});

test("cross-author supersession emits an advisory", async () => {
  const pred = await capture(adapter, { title: "theirs", author: "Nadia Petrova" });
  const result = await captureRaw(adapter, {
    title: "mine",
    author: "Jacob Hoehler",
    supersedes: [pred.id],
  });
  expect(result.advisories.some((a) => a.includes("Nadia Petrova"))).toBe(true);
});

test("same-author, superset-binds supersession emits no advisories", async () => {
  const pred = await capture(adapter, { title: "a", binds: ["src/**"] });
  const result = await captureRaw(adapter, {
    title: "b",
    binds: ["src/**", "test/**"],
    supersedes: [pred.id],
  });
  expect(result.advisories).toEqual([]);
});
```

Where `capture`/`captureRaw` are small local helpers building a full valid draft (author/conviction/labels defaults) and returning `CaptureResult`; write them at the top of the test file:

```ts
function draftFor(overrides: Record<string, unknown>): AtomDraft {
  return {
    frontmatter: {
      title: "t",
      status: "current",
      decision_date: "2026-07-08",
      author: "Jacob Hoehler",
      conviction: "tentative",
      project: "ndr",
      labels: ["write-side"],
      supersedes: [],
      ...overrides,
    },
    body: "\n# PLACEHOLDER — t\n\n## Decision\n\nOne sentence.\n\n## Context\n\n- A fact.\n\n## Why\n\nBecause.\n",
  } as unknown as AtomDraft;
}
async function captureRaw(adapter: MarkdownLedgerAdapter, overrides: Record<string, unknown>) {
  return await adapter.captureAtom(draftFor(overrides));
}
async function capture(adapter: MarkdownLedgerAdapter, overrides: Record<string, unknown>) {
  const r = await captureRaw(adapter, overrides);
  return { id: r.id };
}
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test src/adapters/markdown/adapter.test.ts`
Expected: FAIL (advisories missing, wikilink back-links, alias code paths).

- [ ] **Step 3: Update ports**

`src/ports/write.ts` — replace `AliasMove` and `CaptureResult`:

```ts
export interface SupersededRecord {
  readonly id: string;
  readonly path: string;
}

export interface CaptureResult {
  readonly id: AtomId;
  readonly path: string;
  readonly superseded: readonly SupersededRecord[];
  // Non-blocking warnings surfaced to the caller (binds narrowing,
  // cross-author supersession). Exit code stays 0.
  readonly advisories: readonly string[];
}
```

`src/ports/read.ts` — `CurrentFilter`:

```ts
export interface CurrentFilter {
  readonly label?: string;
}
```

- [ ] **Step 4: Rework the adapter**

In `src/adapters/markdown/adapter.ts`:

1. Delete: `findBySlug`, `assertSlugsUnique`, `dedupeAliases`, `hasAlias`, the alias merge in `captureAtom` (steps 4–5 of the old flow), the `ndr-` prefix check in `validateDraft`, `AliasMove` import.
2. `walkLineage`: `const next = atom.frontmatter.superseded_by[0]; cursor = next ? extractAtomIdFromRef(next) : null;` (works for both forms).
3. `listCurrent`: filter `filter.label === undefined || a.frontmatter.labels.includes(filter.label)`.
4. `preflightSupersession(ids: readonly string[])`: parse each entry with `extractAtomIdFromRef`; drop alias collection from `PredecessorState` (keep `data`, `body`, `id`, `filename`).
5. `patchPredecessor`: back-link is the plain successor id:

```ts
private async patchPredecessor(pred: PredecessorState, successorId: string): Promise<void> {
  const data: Record<string, unknown> = { ...pred.data };
  data.status = "superseded";
  const backlinks = Array.isArray(data.superseded_by) ? [...data.superseded_by] : [];
  if (!backlinks.includes(successorId)) backlinks.push(successorId);
  data.superseded_by = backlinks;
  const yaml = stringifyFrontmatter(data);
  const bodyBlock = pred.body.startsWith("\n") ? pred.body : `\n${pred.body}`;
  await fs.writeFile(
    path.join(this.ledger, pred.filename),
    joinFrontmatter(yaml, bodyBlock),
    "utf8",
  );
}
```

6. `captureAtom` advisory composition, after pre-flight and before writing:

```ts
const advisories: string[] = [];
for (const pred of predecessors) {
  const predBinds = Array.isArray(pred.data.binds)
    ? pred.data.binds.filter((b): b is string => typeof b === "string")
    : [];
  const uncovered = predBinds.filter((b) => !parsed.binds.includes(b));
  if (uncovered.length > 0) {
    advisories.push(
      `successor narrows predecessor ${pred.id}'s binding: [${uncovered.join(", ")}] — intentional?`,
    );
  }
  const predAuthor = typeof pred.data.author === "string" ? pred.data.author : null;
  if (predAuthor !== null && predAuthor !== parsed.author) {
    advisories.push(
      `superseding a decision authored by ${predAuthor} — flag them before merging`,
    );
  }
}
```

Return `{ id: asAtomId(id), path: filename, superseded, advisories }`. The predecessor patch loop now calls `this.patchPredecessor(pred, id)` (the minted successor id, not the filename).

7. `withCaptureDefaults`: drop the `tags` default — keep `status: "current"`, `supersedes: []`.
8. `HalfState`: drop `aliases_moved_so_far`.
9. Binds glob syntax gate (spec: syntax-checked only, no must-match-a-file rule), after schema validation in `validateDraft`:

```ts
const badGlobs = result.data.binds.filter((p) => {
  try {
    new Bun.Glob(p).match("probe");
    return false;
  } catch {
    return true;
  }
});
if (badGlobs.length > 0) {
  throw new DraftValidationError(badGlobs.map((p) => `binds glob \`${p}\` is not parseable`));
}
```

- [ ] **Step 5: Run the adapter suite**

Run: `bun test src/adapters/markdown/adapter.test.ts && bun run typecheck`
Expected: PASS / clean. (`src/cli` may still fail typecheck — if so, note it and gate on the adapter test only; CLI compiles again after Tasks 5–8.)

- [ ] **Step 6: Commit**

```bash
git add src/ports src/adapters/markdown
git commit -m "feat!: new-format capture with plain-id supersession and advisories"
```

---

### Task 5: CLI capture — author auto-fill and advisory printing

**Files:**
- Modify: `src/cli/index.ts` (`captureCommand`)
- Test: `src/cli/index.test.ts`

**Interfaces:**
- Consumes: `CaptureResult.advisories` (Task 4).
- Produces: `captureCommand(rawJson, ledgerFlag?, fallbackLedger?, gitUserName?)` — the 4th param injects the git identity for tests; production caller resolves it via `git config user.name`.

- [ ] **Step 1: Write failing tests**

In `src/cli/index.test.ts`, update capture fixtures to new-format frontmatter, then add:

```ts
test("capture auto-fills author from git identity when draft omits it", async () => {
  const draft = { frontmatter: newFormatDraftWithout("author"), body: MINIMAL_BODY };
  const result = await captureCommand(JSON.stringify(draft), ledgerDir, undefined, "Jacob Hoehler");
  expect(result.exitCode).toBe(0);
  const written = JSON.parse(result.stdout);
  const atom = await new MarkdownLedgerAdapter(ledgerDir).getAtom(asAtomId(written.id));
  expect(atom.frontmatter.author).toBe("Jacob Hoehler");
});

test("capture without author and without git identity is a validation error", async () => {
  const draft = { frontmatter: newFormatDraftWithout("author"), body: MINIMAL_BODY };
  const result = await captureCommand(JSON.stringify(draft), ledgerDir, undefined, null);
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("author");
});

test("capture prints advisories to stderr with exit 0", async () => {
  const adapter = new MarkdownLedgerAdapter(ledgerDir);
  const pred = await adapter.captureAtom(draftFor({ title: "theirs", author: "Nadia Petrova" }));
  const draft = {
    frontmatter: { ...newFormatDraft(), supersedes: [pred.id] },
    body: MINIMAL_BODY,
  };
  const result = await captureCommand(JSON.stringify(draft), ledgerDir, undefined, "Jacob Hoehler");
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toContain("flag them before merging");
});
```

(Reuse the `draftFor` helper from Task 4's test file — export it from a shared `test/helpers.ts` if importing across test files is awkward, and update both call sites.)

- [ ] **Step 2: Run to verify failure**

Run: `bun test src/cli/index.test.ts -t capture`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `src/cli/index.ts`:

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);

// Resolve the capturing human's identity. Null (not "") when git has no
// user.name — the caller turns that into a validation error only if the
// draft itself carries no author.
async function gitUserName(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["config", "user.name"]);
    const name = stdout.trim();
    return name.length > 0 ? name : null;
  } catch {
    return null;
  }
}
```

`captureCommand` gains the 4th parameter `gitIdentity?: string | null` (default: `undefined` = resolve via `gitUserName()`). After parsing the payload:

```ts
const frontmatter = { ...(p.frontmatter as Record<string, unknown>) };
if (Array.isArray(p.supersedes)) frontmatter.supersedes = p.supersedes;
if (frontmatter.author === undefined) {
  const identity = gitIdentity === undefined ? await gitUserName() : gitIdentity;
  if (identity === null) {
    return errorResult(
      "validation",
      ["author is required — set `git config user.name` or pass author in the draft"],
      1,
    );
  }
  frontmatter.author = identity;
}
```

On success, print advisories to stderr:

```ts
const result = await adapter.captureAtom(draft);
const stderr = result.advisories.map((a) => `ndr: advisory: ${a}\n`).join("");
return { stdout: JSON.stringify(result, null, 2) + "\n", stderr, exitCode: 0 };
```

- [ ] **Step 4: Run tests**

Run: `bun test src/cli/index.test.ts -t capture`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/index.ts src/cli/index.test.ts
git commit -m "feat: capture auto-fills author from git and prints advisories"
```

---

### Task 6: Doctor domain — labels, binds_stale, context checks; alias checks removed

**Files:**
- Modify: `src/domain/doctor.ts`
- Test: `src/domain/doctor.test.ts`

**Interfaces:**
- Produces: `diagnose(scan: LedgerScan, taxonomy: Taxonomy | null, repoFiles: readonly string[] | null): DoctorReport`. `CheckClass` = `"chain_integrity" | "status_coherence" | "taxonomy" | "binds_stale" | "context_section" | "missing_fields" | "frontmatter_body_drift" | "malformed"`. `RepairCandidate { predecessorPath; successorPath; successorId: string }`.

- [ ] **Step 1: Rewrite doctor tests**

Update the `atom()` fixture helper in `src/domain/doctor.test.ts` to new-format frontmatter (author/conviction/labels/binds; plain-id supersedes). Delete alias-drift tests. Update taxonomy tests to labels. Update all `diagnose(scan, TAXONOMY)` calls to `diagnose(scan, TAXONOMY, null)`. Add:

```ts
const REPO_FILES = ["src/adapters/markdown/adapter.ts", "src/cli/index.ts"];

test("binds glob matching zero repo files is a binds_stale finding on current heads", () => {
  const a = atom("0001", { status: "current", binds: ["src/vanished/**"] });
  const report = diagnose(scanOf([a]), TAXONOMY, REPO_FILES);
  expect(report.findings.some((f) => f.check === "binds_stale")).toBe(true);
});

test("binds check skips superseded atoms and skips entirely when repoFiles is null", () => {
  const dead = atom("0001", { status: "superseded", superseded_by: ["0002"], binds: ["gone/**"] });
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

test("missing Context section is a finding; placeholder-only Context is advisory kind", () => {
  const missing = atom("0001", {}, "# 0001 — t\n\n## Decision\n\nx.\n\n## Why\n\ny.\n");
  const placeholder = atom(
    "0002",
    {},
    "# 0002 — t\n\n## Decision\n\nx.\n\n## Context\n\n- (not reconstructed at migration)\n\n## Why\n\ny.\n",
  );
  const report = diagnose(scanOf([missing, placeholder]), TAXONOMY, null);
  const kinds = report.findings.filter((f) => f.check === "context_section").map((f) => f.kind);
  expect(kinds).toContain("missing_context");
  expect(kinds).toContain("placeholder_context");
});
```

Also update the missing-required-fields test: expected list is now `author, conviction, labels` style (e.g. an atom missing `conviction` and `supersedes` reports both).

- [ ] **Step 2: Run to verify failure**

Run: `bun test src/domain/doctor.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `src/domain/doctor.ts`:

1. `CHECK_CLASSES` / `CheckClass`: remove `alias_drift`; add `binds_stale`, `context_section` (order: chain_integrity, status_coherence, taxonomy, binds_stale, context_section, missing_fields, frontmatter_body_drift, malformed).
2. `REQUIRED_FIELDS = ["id","title","status","decision_date","author","conviction","project","labels","supersedes"]`.
3. Delete `checkAliasDrift` and its call; delete `normalizeSlug` import.
4. `checkTaxonomy`:

```ts
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
```

5. Chain integrity: replace `extractAtomIdFromWikilink(link)` with `extractAtomIdFromRef(link)` (Task 2 name); `RepairCandidate` third field becomes `successorId: atom.frontmatter.id` (used by `repairBackPointer` to append a plain id).
6. New checks:

```ts
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
```

7. `diagnose` signature gains `repoFiles: readonly string[] | null`; inside the atom loop add `if (repoFiles !== null) checkBindsStale(atom, repoFiles, findings);` and `checkContextSection(atom, findings);`.

- [ ] **Step 4: Run tests**

Run: `bun test src/domain/doctor.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/doctor.ts src/domain/doctor.test.ts
git commit -m "feat!: doctor checks labels, stale binds, and context sections; alias checks removed"
```

---

### Task 7: Doctor CLI — repo file listing and label output

**Files:**
- Modify: `src/cli/index.ts` (`doctorCommand`, `CHECK_CLASS_LABELS`), `src/adapters/markdown/adapter.ts` (`repairBackPointer` caller contract)
- Test: `src/cli/index.test.ts`

**Interfaces:**
- Consumes: `diagnose(scan, taxonomy, repoFiles)` (Task 6).
- Produces: `doctorCommand(ledgerPath, opts)` where `opts` gains `repoRoot?: string | null` (test injection; production derives it — see step 3). `repairBackPointer(predecessorPath, successorId)` appends the plain id.

- [ ] **Step 1: Write failing tests**

```ts
test("doctor flags a stale binds glob when repo root is provided", async () => {
  // ledger fixture with a current atom binds: ["nowhere/**"], repoRoot = tmp dir with one file
  const result = await doctorCommand(ledgerDir, { json: true, repoRoot: tmpRepoDir });
  const report = JSON.parse(result.stdout);
  expect(report.issues.binds_stale.length).toBeGreaterThan(0);
});

test("doctor skips binds checks without repo root and notes it on stderr", async () => {
  const result = await doctorCommand(ledgerDir, { json: true, repoRoot: null });
  const report = JSON.parse(result.stdout);
  expect(report.issues.binds_stale).toEqual([]);
  expect(result.stderr).toContain("binds checks skipped");
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test src/cli/index.test.ts -t doctor`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `src/cli/index.ts`:

1. `CHECK_CLASS_LABELS`: remove `alias_drift`; add `binds_stale: "stale binds"`, `context_section: "context section"`.
2. Repo file listing — `git ls-files` at the repo root; fall back to null (skip class) when unavailable:

```ts
// File inventory for binds checks. `git ls-files` respects .gitignore and is
// fast; a non-git root (or no root at all) yields null, which skips the
// binds_stale class rather than failing the sweep.
async function listRepoFiles(repoRoot: string | null): Promise<string[] | null> {
  if (repoRoot === null) return null;
  try {
    const { stdout } = await execFileAsync("git", ["-C", repoRoot, "ls-files"], {
      maxBuffer: 16 * 1024 * 1024,
    });
    return stdout.split("\n").filter((l) => l.length > 0);
  } catch {
    return null;
  }
}
```

3. `DoctorOptions` gains `repoRoot?: string | null`. In `doctorCommand`, when `opts.repoRoot === undefined`, derive it: `findRepoConfigSafe(process.cwd())` → the directory containing `.ndr.toml` (the config already exposes its own path; use `path.dirname(config.configPath)` — check `src/cli/config.ts` for the exact property name and add it to the returned record if absent). Then:

```ts
const repoFiles = await listRepoFiles(repoRoot);
let report = diagnose(await adapter.scanLedger(), taxonomy, repoFiles);
```

Both `diagnose` calls (initial and post-fix re-scan) pass `repoFiles`. stderr gains, when `repoFiles === null`: `ndr: no repo root — binds checks skipped\n` (append alongside the existing taxonomy note).
4. `--fix` path: `adapter.repairBackPointer(candidate.predecessorPath, candidate.successorId)`; update `RepairApplied.value` accordingly. In the adapter, `repairBackPointer` is unchanged except it now receives a plain id instead of a wikilink (parameter rename only).

- [ ] **Step 4: Run tests**

Run: `bun test src/cli/index.test.ts -t doctor`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/index.ts src/cli/index.test.ts src/adapters/markdown/adapter.ts
git commit -m "feat: doctor gathers repo files for binds checks via git ls-files"
```

---

### Task 8: Resolve, briefs, current, labels command

**Files:**
- Modify: `src/cli/index.ts`
- Test: `src/cli/index.test.ts`

**Interfaces:**
- Produces: `resolveCommand` accepts `ndr:<atom-id>` and `<label>` grains only (`#slug` and `area/topic` are errors with pointer messages). `currentCommand` filter is `{ label?: string }`. New `labelsCommand(ledgerPath, opts)` replaces `taxonomyCommand`; CLI registers `ndr labels` and deletes `ndr areas` / `ndr topics`.

- [ ] **Step 1: Rewrite the read-verb tests**

Update fixtures to new format. Key new/changed tests:

```ts
test("resolve <label> lists all current heads carrying the label", async () => {
  const result = await resolveCommand("write-side", ledgerDir, {});
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("0042");
});

test("resolve #slug is a hard error pointing at the two live grains", async () => {
  const result = await resolveCommand("#oxc-stack", ledgerDir, {});
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("slug references were removed");
});

test("resolve area/topic form is a hard error pointing at labels", async () => {
  const result = await resolveCommand("tooling/framework", ledgerDir, {});
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("label");
});

test("brief prints conviction and labels, and label references", async () => {
  const result = await resolveCommand("0042", ledgerDir, {});
  expect(result.stdout).toContain("conviction: tentative");
  expect(result.stdout).toContain("labels: write-side, taxonomy");
  expect(result.stdout).toContain("ndr:write-side");
  expect(result.stdout).not.toContain("reversibility");
});

test("current --label filters by label membership", async () => {
  const result = await currentCommand(ledgerDir, { label: "write-side" });
  expect(result.exitCode).toBe(0);
});

test("labels command prints the taxonomy list", async () => {
  const result = await labelsCommand(ledgerDir, {});
  expect(result.stdout).toContain("write-side");
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test src/cli/index.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `src/cli/index.ts`:

1. `resolveCommand` dispatch:

```ts
if (ref.startsWith("#")) {
  return {
    stdout: "",
    stderr:
      "slug references were removed with the format rework — use an atom-id (ndr:0042) or a label (ndr:write-side)\n",
    exitCode: 1,
  };
}
if (ref.includes("/")) {
  return {
    stdout: "",
    stderr: `area/topic references were replaced by labels — try \`ndr resolve ${ref.split("/").pop()}\` or \`ndr labels\`\n`,
    exitCode: 1,
  };
}
if (ATOM_ID_REF.test(ref)) {
  return await resolveAtomId(adapter, ref, ledgerPath, resolveOpts);
}
return await resolveLabel(adapter, ref, ledgerPath, resolveOpts);
```

Note the ordering: atom-id pattern wins over label lookup (a 6-char base32-shaped label would be shadowed — acceptable; Crockford excludes i/l/o/u so real-word collisions are rare). `resolveLabel` mirrors the old `resolveTopic` with `listCurrent({ label: ref })` and error text `no current atoms with label ${ref}`.

2. Delete `resolveSlug` and `resolveTopic`.
3. `atomReferences`:

```ts
function atomReferences(fm: Atom["frontmatter"]): string[] {
  return [`ndr:${fm.id}`, ...fm.labels.map((l) => `ndr:${l}`)];
}
```

Delete `slugRef`.
4. `atomSummary`: replace `area`/`topic`/`reversibility` keys with `labels: fm.labels`, `conviction: fm.conviction`, `author: fm.author`.
5. `formatBrief` metadata lines:

```ts
lines.push(`${fm.title} (${pathRef})`);
lines.push(`  labels: ${fm.labels.join(", ")}  decision: ${formatDate(fm.decision_date)}`);
lines.push(`  conviction: ${fm.conviction}  author: ${fm.author}`);
```

References block: `ndr:${fm.id}` plus one line per label.
6. `formatCompactLine`: `${fm.id}  ${fm.title}  [${fm.labels.join(",")}]`.
7. `currentCommand` + `CurrentOptions`: replace `area`/`topic` with `label`; `describeScope(label?)` simplifies to `label !== undefined ? \` with label ${label}\` : ""`.
8. Replace the `for (const axis of ["areas","topics"])` command loop with a single `labels` command calling `labelsCommand` (rename of `taxonomyCommand`, reading `taxonomy.labels`).
9. Program command definitions: `current` options become `--label <label>`; `resolve` help text: "Resolve an ndr reference (atom-id or label) and print a brief."
10. `statusCommand`: the taxonomy summary reads the new shape — `taxonomy = { labels: tax.labels.length }` and the human line becomes `` `taxonomy:  ${taxonomy ? `${taxonomy.labels} labels` : "missing"}` `` (JSON shape follows).

- [ ] **Step 4: Run the full suite**

Run: `bun test && bun run typecheck && bun run lint && bun run format:check`
Expected: ALL PASS — this is the first task after which the whole tree must be green.

- [ ] **Step 5: Commit**

```bash
git add src/cli/index.ts src/cli/index.test.ts
git commit -m "feat!: two-grain resolve, label-aware briefs and current, ndr labels command"
```

---

### Task 9: Templates and init — labels seed, updated rule prose

**Files:**
- Modify: `src/cli/templates.ts`, `src/cli/index.ts` (`initCommand`)
- Test: `src/cli/index.test.ts` (init tests)

**Interfaces:**
- Produces: `LABELS_SEED` exported constant; `AREAS_SEED`/`TOPICS_SEED` deleted. `initCommand` writes `.taxonomy/labels.yaml`, and `.ndr.toml` `project` value becomes a plain name (no `[[...]]` wrapping).

- [ ] **Step 1: Write failing tests**

```ts
test("init scaffolds labels.yaml and a plain project name", async () => {
  const result = await initCommand(tmpRepo, { project: "myrepo" });
  expect(result.exitCode).toBe(0);
  const toml = await fs.readFile(path.join(tmpRepo, ".ndr.toml"), "utf8");
  expect(toml).toContain('project = "myrepo"');
  expect(toml).not.toContain("[[");
  expect(await exists(path.join(tmpRepo, "decisions", ".taxonomy", "labels.yaml"))).toBe(true);
  expect(await exists(path.join(tmpRepo, "decisions", ".taxonomy", "areas.yaml"))).toBe(false);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test src/cli/index.test.ts -t init`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/cli/templates.ts` — replace the two seeds with:

```ts
export const LABELS_SEED = `# Labels — what a decision is about. 1–4 per atom.
# Finite list, hand-edited. \`ndr capture\` refuses unknown values.
# To add: edit this file (friction is the feature — prevents drift).
- architecture   # system shape, framework, runtime composition
- process        # how decisions get made / written / read
- scope          # what's in vs out
- substrate      # storage and retrieval medium
- tooling        # what we use to make / store / read things
- ci-strategy    # CI platform, gates, caching
- deployment     # how things ship / run / migrate
- read-side      # context-loading, retrieval, supersession resolution
- repo-shape     # monorepo vs split, package layout
- write-side     # capture, materialization, schema enforcement
`;
```

Update `NDR_RULE`'s reference-grain section to the two live grains:

```
- `ndr:0042` — frozen atom-id; "this code exists because of decision
  0042" (historical anchor). Resolve walks to the current head.
- `ndr:<label>` — taxonomy label; resolves to all current atoms
  carrying that label. Use when the whole area governs the call site.
```

(Delete the `ndr:#slug` bullet and the `area/topic` bullet.)

In `initCommand`: drop the `[[...]]` wrapping (`const project = projectName;`), and replace the areas/topics seed loop with a single `labels.yaml` write using `LABELS_SEED`.

- [ ] **Step 4: Run tests**

Run: `bun test && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/templates.ts src/cli/index.ts src/cli/index.test.ts
git commit -m "feat!: init seeds labels.yaml and plain project names; rule prose on two grains"
```

---

### Task 10: `ndr migrate` — mechanical pass 1

**Files:**
- Create: `src/cli/migrate.ts`
- Modify: `src/cli/index.ts` (register command)
- Test: `src/cli/migrate.test.ts`

**Interfaces:**
- Produces: `migrateCommand(ledgerPath: string, repoRoot: string | null, opts: { dryRun?: boolean; json?: boolean }): Promise<ResolveResult>`. Registered as `ndr migrate [--ledger] [--dry-run] [--json]`.
- Transform contract (old-format atom → new-format frontmatter + callout-flattened body). Idempotent: atoms already lacking `area` in raw frontmatter are skipped as `already_migrated`.

- [ ] **Step 1: Write failing tests**

Create `src/cli/migrate.test.ts` with an old-format fixture written to a temp ledger:

```ts
const OLD_ATOM = `---
id: '0153'
title: 'Taxonomy enforcement: hard gate at capture, advisory at doctor'
status: current
decision_date: '2026-06-04'
aliases: []
project: '[[ndr]]'
derived_from: []
informed_by:
- '[[Decisions/0073-zod-schema-validates-per-record]]'
supersedes:
- '[[Decisions/0072-taxonomy-as-sibling-swamp-model]]'
superseded_by: []
area: architecture
topic: write-side
impacts: []
revisit_triggers: []
reversibility: medium
tags:
- decision
- meta-chain
---
# 0153 — Taxonomy enforcement

## Decision

One sentence.

## Why

Gist line.

> [!info]- Full reasoning
> Longer prose here.
> Second line of prose.

## Consequences

A · B

> [!info]- Detail
> - bullet one
`;

test("migrate converts frontmatter to the new format", async () => {
  await writeAtom(ledgerDir, "0153-taxonomy-enforcement.md", OLD_ATOM);
  await writeOldTaxonomy(ledgerDir); // areas.yaml + topics.yaml
  const result = await migrateCommand(ledgerDir, repoRoot, { json: true });
  expect(result.exitCode).toBe(0);

  const raw = await fs.readFile(path.join(ledgerDir, "0153-taxonomy-enforcement.md"), "utf8");
  expect(raw).toContain("project: ndr");
  expect(raw).toContain("author:");
  expect(raw).toContain("conviction: tentative");
  expect(raw).toMatch(/labels:\n\s*- architecture\n\s*- write-side\n\s*- meta-chain/);
  expect(raw).toMatch(/supersedes:\n\s*- ["']?0072["']?/);
  expect(raw).not.toContain("reversibility");
  expect(raw).not.toContain("[[Decisions/");
  expect(raw).not.toContain("[!info]-");
  expect(raw).toContain("Longer prose here.");
});

test("migrate seeds labels.yaml from areas+topics+stray tags and removes the old files", async () => {
  // after run:
  const labels = await fs.readFile(path.join(ledgerDir, ".taxonomy", "labels.yaml"), "utf8");
  expect(labels).toContain("architecture");
  expect(labels).toContain("write-side");
  expect(labels).toContain("meta-chain");
  expect(await exists(path.join(ledgerDir, ".taxonomy", "areas.yaml"))).toBe(false);
});

test("migrate is idempotent — second run reports already_migrated and changes nothing", async () => {
  const first = await migrateCommand(ledgerDir, repoRoot, { json: true });
  const before = await fs.readFile(path.join(ledgerDir, "0153-taxonomy-enforcement.md"), "utf8");
  const second = await migrateCommand(ledgerDir, repoRoot, { json: true });
  const after = await fs.readFile(path.join(ledgerDir, "0153-taxonomy-enforcement.md"), "utf8");
  expect(after).toBe(before);
  expect(JSON.parse(second.stdout).skipped).toBeGreaterThan(0);
});

test("dry-run reports the plan without writing", async () => {
  const result = await migrateCommand(ledgerDir, repoRoot, { dryRun: true, json: true });
  const raw = await fs.readFile(path.join(ledgerDir, "0153-taxonomy-enforcement.md"), "utf8");
  expect(raw).toContain("area: architecture"); // untouched
  expect(JSON.parse(result.stdout).migrated).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test src/cli/migrate.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/cli/migrate.ts`**

```ts
import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { parse as parseYaml } from "yaml";

import { extractAtomIdFromRef } from "../domain/index.ts";
import { splitFrontmatter, joinFrontmatter } from "../adapters/markdown/fence.ts";
import { parseFrontmatterYaml, stringifyFrontmatter } from "../adapters/markdown/yaml.ts";
import type { ResolveResult } from "./index.ts";

const execFileAsync = promisify(execFile);

interface MigrateOptions {
  readonly dryRun?: boolean;
  readonly json?: boolean;
}

// Pass 1 of the format migration (see docs/superpowers/specs/
// 2026-07-08-atom-format-redesign.md): mechanical frontmatter conversion and
// callout flattening. Pass 2 (body reshaping — Context extraction,
// Commitments filtering) is judgment work owned by the migrate-ledger skill.
export async function migrateCommand(
  ledgerPath: string,
  repoRoot: string | null,
  opts: MigrateOptions = {},
): Promise<ResolveResult> {
  const ledger = path.resolve(ledgerPath);
  let entries: string[];
  try {
    entries = (await fs.readdir(ledger)).filter((n) => n.endsWith(".md") && !n.startsWith("."));
  } catch (err) {
    return {
      stdout: "",
      stderr: `cannot read ledger ${ledger}: ${err instanceof Error ? err.message : String(err)}\n`,
      exitCode: 1,
    };
  }

  const migrated: string[] = [];
  const skipped: string[] = [];
  const failed: { path: string; reason: string }[] = [];
  const strayLabels = new Set<string>();

  for (const name of entries) {
    const file = path.join(ledger, name);
    const raw = await fs.readFile(file, "utf8");
    let data: Record<string, unknown>;
    let body: string;
    try {
      const split = splitFrontmatter(raw);
      data = (parseFrontmatterYaml(split.yaml).data ?? {}) as Record<string, unknown>;
      body = split.body;
    } catch (err) {
      failed.push({ path: name, reason: err instanceof Error ? err.message : String(err) });
      continue;
    }

    // Old-format detection: `area` is the sentinel — the new schema forbids it.
    if (data.area === undefined) {
      skipped.push(name);
      continue;
    }

    const next = convertFrontmatter(data, await firstCommitAuthor(repoRoot, ledger, name));
    for (const l of next.labels as string[]) strayLabels.add(l);
    const nextBody = flattenCallouts(body);

    if (opts.dryRun !== true) {
      await fs.writeFile(
        file,
        joinFrontmatter(
          stringifyFrontmatter(next),
          nextBody.startsWith("\n") ? nextBody : `\n${nextBody}`,
        ),
        "utf8",
      );
    }
    migrated.push(name);
  }

  if (opts.dryRun !== true && migrated.length > 0) {
    await seedLabelsYaml(ledger, strayLabels);
  }

  const summary = {
    ledger,
    migrated: migrated.length,
    skipped: skipped.length,
    failed,
    dry_run: opts.dryRun === true,
  };
  const stdout =
    opts.json === true
      ? JSON.stringify(summary, null, 2) + "\n"
      : `migrated ${migrated.length}, skipped ${skipped.length} (already new-format), failed ${failed.length}${opts.dryRun ? " [dry-run]" : ""}\n`;
  return { stdout, stderr: "", exitCode: failed.length > 0 ? 1 : 0 };
}

// Field-by-field conversion per the spec's migration table. Preserves any
// unknown extra fields by dropping them deliberately: the new schema is
// strict, so carrying baggage would re-break the atom.
function convertFrontmatter(
  data: Record<string, unknown>,
  author: string,
): Record<string, unknown> {
  const asStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const toIds = (v: unknown): string[] =>
    asStringArray(v)
      .map((link) => extractAtomIdFromRef(link))
      .filter((id): id is NonNullable<typeof id> => id !== null);
  const stripWikilink = (v: unknown): string =>
    typeof v === "string" ? v.replace(/^\[\[|\]\]$/g, "") : "";

  const labels = [
    ...(typeof data.area === "string" ? [data.area] : []),
    ...(typeof data.topic === "string" ? [data.topic] : []),
    ...asStringArray(data.tags).filter((t) => t !== "decision"),
  ];

  return {
    id: data.id,
    title: data.title,
    status: data.status,
    decision_date: data.decision_date,
    author,
    conviction: "tentative",
    project: stripWikilink(data.project),
    labels: [...new Set(labels)].slice(0, 4),
    binds: [],
    supersedes: toIds(data.supersedes),
    superseded_by: toIds(data.superseded_by),
    derived_from: asStringArray(data.derived_from).map(stripWikilink),
    informed_by: toIds(data.informed_by),
  };
}

// Strip Obsidian callout syntax in place: the `> [!info]- Title` marker line is
// dropped, subsequent `> ` continuation lines are unindented. Content order is
// untouched — reshaping is pass 2.
export function flattenCallouts(body: string): string {
  const out: string[] = [];
  for (const line of body.split("\n")) {
    if (/^>\s*\[!\w+\]-?\s*/.test(line)) {
      const title = line.replace(/^>\s*\[!\w+\]-?\s*/, "").trim();
      // Callout titles like "Full reasoning" / "Detail" are structural noise;
      // drop them. (Assumption-slug titles get rebuilt in pass 2.)
      void title;
      continue;
    }
    if (/^>\s?/.test(line)) {
      out.push(line.replace(/^>\s?/, ""));
      continue;
    }
    out.push(line);
  }
  // Collapse runs of 3+ blank lines left by dropped markers.
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

// Author backfill: first-commit author of the atom file, falling back to the
// current git user, then "unknown".
async function firstCommitAuthor(
  repoRoot: string | null,
  ledger: string,
  filename: string,
): Promise<string> {
  const root = repoRoot ?? ledger;
  try {
    const { stdout } = await execFileAsync("git", [
      "-C",
      root,
      "log",
      "--follow",
      "--diff-filter=A",
      "--format=%aN",
      "--",
      path.join(ledger, filename),
    ]);
    const lines = stdout.trim().split("\n").filter(Boolean);
    const first = lines[lines.length - 1];
    if (first) return first;
  } catch {
    // fall through
  }
  try {
    const { stdout } = await execFileAsync("git", ["config", "user.name"]);
    if (stdout.trim()) return stdout.trim();
  } catch {
    // fall through
  }
  return "unknown";
}

// labels.yaml = union of old areas.yaml + topics.yaml + labels seen on atoms.
// The old axis files are removed — one axis, one file.
async function seedLabelsYaml(ledger: string, fromAtoms: ReadonlySet<string>): Promise<void> {
  const dir = path.join(ledger, ".taxonomy");
  const union = new Set<string>(fromAtoms);
  for (const old of ["areas.yaml", "topics.yaml"]) {
    try {
      const parsed: unknown = parseYaml(await fs.readFile(path.join(dir, old), "utf8"));
      if (Array.isArray(parsed)) {
        for (const v of parsed) if (typeof v === "string") union.add(v);
      }
    } catch {
      continue;
    }
  }
  await fs.mkdir(dir, { recursive: true });
  const list = [...union].sort();
  await fs.writeFile(
    path.join(dir, "labels.yaml"),
    "# Labels — merged from areas.yaml + topics.yaml + corpus tags by `ndr migrate`.\n" +
      list.map((l) => `- ${l}`).join("\n") +
      "\n",
    "utf8",
  );
  for (const old of ["areas.yaml", "topics.yaml"]) {
    await fs.rm(path.join(dir, old), { force: true });
  }
}
```

Register in `src/cli/index.ts`:

```ts
program
  .command("migrate")
  .description("Mechanically migrate old-format atoms to the new format (pass 1; idempotent).")
  .option("--ledger <path>", "Ledger directory to migrate (default: .ndr.toml walk-up).")
  .option("--dry-run", "Report what would change without writing.", false)
  .option("--json", "Emit a structured JSON summary.", false)
  .action(async (options: { ledger?: string; dryRun: boolean; json: boolean }) => {
    const ledger = resolveLedger(options.ledger);
    if (ledger === null) return;
    const config = findRepoConfigSafe(process.cwd());
    const repoRoot = config ? path.dirname(config.configPath) : null;
    emit(await migrateCommand(ledger, repoRoot, { dryRun: options.dryRun, json: options.json }));
  });
```

(`configPath` property: same note as Task 7 — expose it from `findRepoConfig` if not already present.)

- [ ] **Step 4: Run tests**

Run: `bun test src/cli/migrate.test.ts && bun test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/migrate.ts src/cli/migrate.test.ts src/cli/index.ts src/cli/config.ts
git commit -m "feat: ndr migrate — mechanical pass-1 format migration"
```

---

### Task 11: Full verification, docs, and CONTEXT.md

**Files:**
- Modify: `README.md` (format examples, command list), `CONTEXT.md` (reference-grain glossary entry, any area/topic vocabulary)
- No new tests.

- [ ] **Step 1: Full gate**

Run: `bun test && bun run typecheck && bun run lint && bun run format:check && bun run build`
Expected: all PASS; `dist/ndr` builds.

- [ ] **Step 2: Smoke the binary against a scratch ledger**

```bash
mkdir -p /tmp/ndr-smoke/decisions/.taxonomy
printf -- "- write-side\n" > /tmp/ndr-smoke/decisions/.taxonomy/labels.yaml
cd /tmp/ndr-smoke && printf 'ledger = "./decisions"\nproject = "smoke"\n' > .ndr.toml
echo '{"frontmatter":{"title":"smoke test","decision_date":"2026-07-08","conviction":"arbitrary","project":"smoke","labels":["write-side"]},"body":"# PLACEHOLDER — smoke test\n\n## Decision\n\nSmoke.\n\n## Context\n\n- Smoke.\n\n## Why\n\nSmoke.\n"}' | <repo>/dist/ndr capture
<repo>/dist/ndr current
<repo>/dist/ndr doctor
```

Expected: capture exits 0 with author auto-filled; `current` lists the atom; `doctor` reports healthy.

- [ ] **Step 3: Update README.md and CONTEXT.md**

- README: replace any frontmatter example with the new format; command list gains `labels` and `migrate`, drops `areas`/`topics`; reference grains section shows the two live grains.
- CONTEXT.md: the "three grains" glossary entry (line ~40) becomes two grains; add `labels`, `binds`, `conviction` vocabulary entries.

- [ ] **Step 4: Commit**

```bash
git add README.md CONTEXT.md
git commit -m "docs: new atom format in README and CONTEXT glossary"
```

---

## Deferred to Plan 2 (plugin prose + migration packaging)

- `plugins/ndr/references/*` rewrite (frontmatter-schema.md, decision-single.md, taxonomy.md)
- Agent updates: ndr-drafter templates, ndr-reviewer checklist, ndr-reader, ndr-curator, ndr-drift-auditor (absence-vs-contradiction reporting)
- Skill updates: capture-decision, decisions, ground, drift-check, interrogate-decision, ndr-bootstrap
- New: `ndr:migrate-ledger` skill + `ndr-migrator` agent (retirable)
- Plugin asset decisions (`plugins/ndr/assets/decisions/*`) migration

## Deferred to Plan 3 (execution)

- Run `ndr migrate` + pass 2 on this repo's `decisions/` ledger (PR)
- Capture the redesign's own NDR atoms (supersedes 0049/0050/0051/0153-adjacent, ...)
- Migrate any other tracked repos' ledgers
