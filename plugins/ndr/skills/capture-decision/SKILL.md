---
name: capture-decision
description: Capture engineering decisions from the current conversation as atomic markdown artifacts in the decision ledger. Use when the user invokes `/capture-decision`, says "capture this decision", "record this", "let's write this up as a decision", or signals at end of a chat that decisions landed and should be persisted. Materializes one file per atomic decision with required frontmatter, enforces taxonomy, and structurally protects the supersession primitive (refuses to write a revising decision without `supersedes:`). The write itself goes through `ndr capture` — the CLI owns id assignment, validation, and the two-write supersession transaction.
argument-hint: "[optional hint about what to capture]"
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - Agent
---

# capture-decision

## Overview

Orchestrator for the NDR capture pipeline. The skill owns scope detection, user
interaction, and — for in-conversation captures — composing the atom itself. The
path **branches on `supersedes`**, because only a revising atom fires the
irreversible two-write:

```
FRESH (supersedes: [])       scan ─► confirm ─► compose draft.md ─► ndr capture ─► reviewer AUDITS the real atom ─► summary
REVISING (supersedes: [...])  scan ─► confirm ─► resolve head ─► compose draft.md ─► reviewer PRE-PERSIST gate ─► ndr capture ─► summary
```

- A **fresh** atom patches no predecessor and has zero incoming back-pointers, so
  it is safe to write first and audit the real, minted atom. If the reviewer
  rejects it, fix the ledger file in place (shape/field nits) or trash it and
  re-capture (atomicity split) — nothing to unwind.
- A **revising** atom keeps **review-then-persist**: the reviewer gates the draft
  *before* `ndr capture` runs the supersession two-write (ndr:8gh40e).
- **`ndr capture` is the only writer of the ledger** and owns id assignment,
  validation, and the two-write. The main agent authors the body as a markdown
  draft in the scratchpad; the CLI ingests it (`ndr capture <draft.md>`).
- The **`ndr-drafter` subagent is dispatched only on the extractor / long-source
  path** (a big transcript/PR to isolate) — not for in-conversation composition,
  where the orchestrator already holds the context.

## Prerequisite

`ndr` must be on PATH. Check once with `command -v ndr`; if missing, stop:

> "The `ndr` CLI isn't installed — run `bun run install:bin` in `~/Projects/ndr`, then retry."

There is no fallback path.

## Hard rules

These constraints are upstream of any subagent — the skill enforces them at the orchestration layer.

1. **Atomic only.** One chosen path, one set of consequences. Bundled candidates get split before composition. Never let a bundle through.
2. **Supersession refusal is structural, not advisory.** If revising intent appears in the conversation ("revises", "supersedes", "instead of", "we changed our mind on") OR `informed_by:` points at a `current` decision being contradicted, AND the user has not named what's being superseded — refuse to proceed. Print:
   > "This looks like a revising decision but `supersedes:` is empty. Name the decision(s) being revised, or confirm this is a fresh decision."
3. **Persist ordering branches on `supersedes`.** A **revising** atom is
   review-then-persist: the reviewer must pass *before* `ndr capture` runs the
   irreversible two-write. A **fresh** atom (`supersedes: []`) is
   persist-then-audit: write it with `ndr capture`, then have the reviewer audit
   the real minted atom; a rejected fresh atom is fixed in place (shape/field
   nits) or trashed and re-captured (atomicity split) — it patched no predecessor,
   so there is nothing to unwind. Either way, `ndr capture` is the only path that
   writes the ledger, mints ids, and runs the two-write.
4. **Labels enforcement.** `labels:` (1-4 values) must come from `<ledger>/.taxonomy/labels.yaml`. Unknown values trigger "use existing or add new?" before drafting. `ndr capture` re-checks; the orchestrator's check is the friendly-prompt layer.
5. **Single-file atoms.** `<id>-<kebab-title>.md`. No directory form, no descent files. Length is managed by the fixed section shape in the body template (single altitude, plain markdown, no callouts).
6. **The CLI assigns ids.** Atoms get 6-char base32 ids generated inside `ndr capture` (ndr:0144). Never assign or guess an id in a draft; the body's `# PLACEHOLDER —` heading is patched by the CLI.

## Inputs

- `$ARGUMENTS` — optional free-text hint about what to capture. If absent, scan the whole conversation.

## Reference paths

- **Ledger:** resolved by the CLI — `--ledger` flag > `NDR_LEDGER` env > `.ndr.toml` walk-up from CWD > error pointing at `ndr init`. One atom per file, `<id>-<kebab-title>.md`.
- **Taxonomy (ledger-resident, mutable):** `<ledger>/.taxonomy/labels.yaml`.
- **Schema spec:** `${CLAUDE_PLUGIN_ROOT}/references/frontmatter-schema.md`.
- **Template:** `${CLAUDE_PLUGIN_ROOT}/references/decision-single.md`.
- **Worthiness rubric:** `${CLAUDE_PLUGIN_ROOT}/references/worthiness.md` — three-question test for "is this NDR-grain or should it route elsewhere?"
- **Subagents:** `ndr-reviewer` (the one common-path agent — independent grading, pinned `sonnet`); `ndr-drafter` and `ndr-extractor` only on the long-source path; `ndr-curator` for periodic audits (out of scope for the routine flow).

## Method

### Step 1 — Scan

Scan the current conversation for atomic decisions. The context is already loaded — no subagent needed here. Atomic = one chosen path with one set of consequences. Common shapes:

- "Use X for Y" (one tool, one purpose)
- "Don't do X" (a rejected path)
- "X over Y because Z" (a chosen path with a named alternative)

Split bundles. "We'll use FastAPI and Postgres" is two atoms. "Use FastAPI because it's async and we already have Postgres" is one atom (Postgres is context).

Discard non-decisions: open questions, observations, tasks, hypotheticals.

**If the source is too long to scan inline** (e.g. the user pastes a full transcript or asks you to capture from a file), invoke the `ndr-extractor` subagent with the source. It returns structured candidates. For routine in-conversation captures, scan inline.

### Step 2 — Detect supersession intent

Before confirming candidates, scan the conversation for revising intent:

- Phrases: "revises", "supersedes", "instead of", "we changed our mind on", "switching from X to Y".
- Substantive: a candidate directly contradicts a decision named in `informed_by:` context, or named in chat by id.

For each candidate with revising signal, you'll need to ask the user: **what is being superseded?** Note this against the candidate; ask in Step 3.

### Step 2.5 — Worthiness pass

Atomicity (Step 1) checks *shape*. This pass checks *grain* — is the candidate actually NDR-worthy, or would it live better as a code comment, CLAUDE.md gotcha, or rule file? Full criteria in `${CLAUDE_PLUGIN_ROOT}/references/worthiness.md`; load and skim if any candidate is borderline.

For a candidate that is **borderline AND consequential** (the routing call is close *and* getting it wrong is expensive), pull the one or two deep moves that resolve the doubt from `${CLAUDE_PLUGIN_ROOT}/references/interrogation.md` — usually the asymmetry check ("is this `hard` enough to matter?") or the forward-bind check ("a decision, or just documentation?"). This is a targeted pull, not the full walk — when a candidate needs the whole eight-move deliberation, that's `/interrogate-decision`'s job, run before capture.

For each candidate, ask:

1. **Named alternative?** Is there a chosen path with an alternative anyone could plausibly have picked?
2. **Future-revisitable?** Could future-you or a future agent want to revisit or override this?
3. **Rationale outlives the code site?** Or does the WHY rot when the function is rewritten?

Tag each candidate:

- **`ndr-worthy`** — all three yes. Pass through silently in Step 3.
- **`borderline`** — one is a maybe, or the candidate is project-wide enough that a CLAUDE.md/rule entry should complement the NDR. Tag with a one-line routing note for Step 3.
- **`not-ndr`** — fails the test, or is a clear fit for one of the routing buckets in `worthiness.md` (single-call-site WHY → code comment; data wart → CLAUDE.md gotcha; still considering → daily note; framework default → don't capture). Tag with the suggested home.

This pass does **not** auto-drop candidates. It surfaces a routing nudge to the user in Step 3; the user always has the final say. This is friction-as-friendly-prompt, not a hard gate — the hard gates are `## Hard rules` and the taxonomy preflight (Step 4).

### Step 3 — Confirm candidates

Present each candidate as a one-line summary. Append routing nudges for `borderline` / `not-ndr` tags and the revising question for candidates with supersession signal:

```
I see N atomic decisions in this conversation:

  1. Use FastAPI for the auth service
  2. Single Postgres instance, no read replicas at MVP
  3. Switch from JWT to PASETO  ← revises a prior decision; which one? (atom id)
  4. Use stacked-files layout for multi-disc Jellyfin rips
       └─ borderline: convention-with-rationale; consider also adding a homelab CLAUDE.md entry referencing this NDR
  5. Use 4-space indentation in tools/audit.py
       └─ not-ndr: single-file style choice → suggest .editorconfig instead. Keep as NDR anyway?

Confirm, edit titles, drop any, route, or answer the revising question.
```

Wait for the user's response. Capture for each confirmed candidate:

- Title (user can edit)
- `supersedes:` list (plain atom ids like `["0042"]`) — required when revising signal triggered; defaults to `[]`.

If revising signal triggered and the user neither named a predecessor nor confirmed "this is fresh", refuse. Print the rule-2 message and stop.

### Step 4 — Labels preflight (optional but friendly)

For each candidate, suggest 1-4 `labels:` based on the conversation. Read `<ledger>/.taxonomy/labels.yaml` once and cache. If a suggested value is not in the taxonomy:

```
"<value>" is not in labels.yaml.
Use existing: <comma-separated list>
Or add new: <value>?
```

If "add new", `Edit` `labels.yaml` to append the value before drafting. `ndr capture` will re-validate — this preflight is friendly UX, not the structural gate.

### Step 5 — Compose the draft

For an **in-conversation capture** the orchestrator already holds the context —
compose the atom yourself; do **not** dispatch the drafter. For each confirmed
candidate:

- If the candidate is **revising**, first resolve the named predecessor to its
  current head: `ndr resolve '<atom-id>'`. Supersede the head, never a stale
  mid-chain id. (This is the one load-bearing regrounding point.)
- Assemble the frontmatter from values already in hand: title, project, labels,
  conviction, decision_date, `supersedes`, binds, derived_from, informed_by.
  **Omit `id` and `author`** — `ndr capture` mints the id and fills author from git.
  Bind directories as a `/**` glob (`src/auth/**`) — a bare directory path matches
  no file and `ndr doctor` flags it `binds_matches_nothing`.
- Write the body per `${CLAUDE_PLUGIN_ROOT}/references/decision-single.md`:
  single-altitude plain markdown, section order Decision / Scope / Commitments /
  Revisit if / Context / Why / Alternatives, with a literal `# PLACEHOLDER — <title>`
  heading.
- Write the complete atom (frontmatter fence + body) to one scratchpad file per
  candidate: `<scratchpad>/<kebab-title>.draft.md`. Authoring markdown (not a JSON
  payload) keeps the body free of escaping.

**Model tiers.** The body is the one quality-sensitive step. Compose it at the
session model when that is Sonnet-or-better (Sonnet holds altitude comfortably;
Opus/Fable more so, at negligible extra cost — bodies are short). If the session
is Haiku *and* the atom is high-stakes, escalate composition to a `sonnet`-pinned
one-shot agent. Either way the independent reviewer (Step 6, pinned `sonnet`) is
the quality floor — it catches altitude/atomicity slips a weaker author misses.

**Long-source captures only:** when the source is a big transcript / PR / doc,
dispatch the `ndr-drafter` subagent (extractor path) to compose in isolated
context. It returns `{drafts: [{frontmatter, body, missing_fields}]}`; fill any
`missing_fields`, then write each returned atom to a scratchpad `.draft.md` and
continue as below.

### Step 6 — Review + persist (branches on `supersedes`)

Dispatch `ndr-reviewer` as a **blocking one-shot** — await its single result
inline; do not name/park it, and do not status-ping. It is pinned to `sonnet`
(the quality floor, independent of the session model). `ndr capture` accepts the
markdown draft file directly and strips any stray `id` before minting.

**Fresh atom (`supersedes: []`) — persist, then audit the real atom:**

1. `ndr capture <scratchpad>/<name>.draft.md` — mints id, patches the H1,
   validates, writes the ledger atom. Branch on the exit code (below).
2. On exit 0, audit the **real** atom: `ndr-reviewer` with
   `{mode: "audit", paths: ["decisions/<id>-<slug>.md"]}`.
   - `verdict: pass` → done.
   - shape / field / mechanical fail → `Edit` the ledger file in place, re-audit.
   - atomicity fail (needs a split) → `trash` the file and re-capture as two
     atoms. A fresh atom patched no predecessor and nothing points at it, so
     removal is clean; confirm with `ndr doctor`.

**Revising atom (`supersedes: [...]`) — review, then persist:**

1. Pre-persist review gates the two-write: `ndr-reviewer` with
   `{mode: "pre-persist", drafts: [{frontmatter, body}]}` (read the draft file for
   the payload).
   - `verdict: fail` → fix the `.draft.md` and re-review. For a `load-bearing`
     flag (atomicity, altitude) prefer fixing; the user may override only
     explicitly.
   - `verdict: pass` → proceed.
2. `ndr capture <scratchpad>/<name>.draft.md` — fires the supersession two-write.
   Branch on the exit code (below).

**Exit codes** (ndr:0146 — errors go to stderr as JSON; stdout only on success):

- `0` — success. Parse stdout `{id, path, superseded}` (array even for one
  predecessor). Accumulate for the summary.
- `1` — validation failure (required fields, enums, taxonomy, malformed draft).
  Surface `error.messages`, fix the draft, retry.
- `2` — supersession conflict (predecessor already superseded by a different
  atom). Surface and stop — manual resolution.
- `3` — mid-transaction half-state. Surface the report so the user knows exactly
  what was written vs patched and what to repair by hand.

Remove the scratchpad `.draft.md` files once their atoms have landed.

### Step 7 — Summarize

Report what was written and what was patched. One line per file. See Output examples below.

## When to use the extractor subagent

The default flow scans the conversation inline (Step 1). Invoke `ndr-extractor` instead when:

- The user pastes a long transcript, doc, or PR thread.
- The user asks to capture decisions from a file path or wikilink.
- The conversation has accumulated so much context that an inline scan would be unreliable.

The extractor returns the same `{candidates: [...]}` structure that Step 3 expects.
This is the **long-source path**: after confirmation, composition goes through the
`ndr-drafter` subagent (Step 5's long-source branch), not inline — the drafter and
extractor both earn their isolated context when the source is too big to hold.

## Output examples

### Fresh decision

```
Captured 1 decision:

  k3m9xq-use-fastapi-for-auth.md
    labels: [tooling, substrate]
    supersedes: [] (fresh decision)
```

### Revising decision

```
Captured 1 decision with supersession:

  v8t2ne-split-apps-into-services.md (successor)
    labels: [architecture, repo-shape]
    supersedes: ["0011"]

  Patched:
    0011-monorepo-symmetric-apps-layout.md
      status: current → superseded
      superseded_by: [] → ["v8t2ne"]
```

### Refused (supersession-blind)

```
Refused: "Switch to Litestar for auth" looks like a revising decision
(intent words: "switch to", "instead of FastAPI"),
but `supersedes:` is empty.

Name the decision being revised, or confirm this is fresh.
```

### Half-state (exit 3 from ndr capture)

```
HALF-STATE during supersession:

  Successor written: v8t2ne-split-apps-into-services.md
  Patch failed on: 0011-monorepo-symmetric-apps-layout.md
  Reason: file not found

Manual fix: edit 0011-..., set status: superseded,
append "v8t2ne" to superseded_by.
```

## When NOT to use this skill

- The user is **considering** a decision, not making one. (Capture afterward.)
- The user wants a quick journal entry — use `/note-capture` (daily-note append).
- The user wants to revise a decision's *body* without changing its substance — edit the file directly; don't write a new atom.

## Related

- `/decisions <topic>` — the read-side companion. Use it BEFORE capture to check whether a current decision on the topic already exists (avoid accidental parallel decisions).
- `/interrogate-decision` — the deep pre-capture deliberation. Run it BEFORE this skill when a candidate is consequential enough to stress-test (genuine fork, possible supersession, "is this even a decision?"); it produces a routing verdict and hands the confirmed candidate here.
- `ndr capture` — the deterministic write path (ndr:0129, ndr:0146); owns ids (ndr:0144) and the two-write supersession transaction (ndr:0051).
- `ndr-extractor` — long-source candidate extraction.
- `ndr-drafter` — frontmatter + body composition, **long-source path only** (in-conversation composition is the skill's job).
- `ndr-reviewer` — the atom judge (atomicity, body altitude, soft mechanical checks): pre-persist for revising atoms, audit-the-real-atom for fresh ones.
- `ndr-curator` — corpus-level health audit (run periodically, not per-capture).
- `${CLAUDE_PLUGIN_ROOT}/references/frontmatter-schema.md` — full schema spec.
- `${CLAUDE_PLUGIN_ROOT}/references/taxonomy.md` — taxonomy rules and growth protocol.
- `${CLAUDE_PLUGIN_ROOT}/references/worthiness.md` — three-question rubric for grain/routing (Step 2.5).
- `${CLAUDE_PLUGIN_ROOT}/references/interrogation.md` — deep deliberation heuristics; Step 2.5 pulls individual moves for borderline-and-heavy candidates.
- `${CLAUDE_PLUGIN_ROOT}/references/workflow.md` — capture + read end-to-end.
