# Atom Format Redesign — Design Spec

**Date:** 2026-07-08
**Status:** approved design, pending implementation plan
**Supersedes (informally):** `plugins/ndr/references/frontmatter-schema.md`, `plugins/ndr/references/decision-single.md` (both rewritten by this change)

## Motivation

The atom format was designed for an Obsidian vault: collapsed `> [!info]-`
callouts for altitude, wikilink field values (`project: "[[ndr]]"`,
`supersedes: "[[Decisions/0072-…]]"`), vault-page `impacts:`, and
vault-wide-unique `aliases:`. Every ledger is now repo-resident and the
readers are (1) agents via `ndr` CLI briefs and (2) a human in an
editor/GitHub/PR diff. None of the Obsidian affordances have a consumer left.

Three concrete problems drive the redesign:

1. **Substrate mismatch.** Callouts render as plain blockquotes outside
   Obsidian; wikilinks resolve nowhere; slug uniqueness has no vault to be
   unique in.
2. **Noise.** Every body section states its content twice — a gist line plus
   a collapsed callout restating it longer. Corpus audit confirms sections
   restating the Decision (e.g. `0153`'s Consequences).
3. **Gaps.** Atoms record the choice and rationale but not the *problem
   context* (what forced a decision) or *scope/applicability* (what it binds,
   when it does not apply).

Corpus data backing the field-level calls (52 atoms in this ledger at design
time): `aliases:` used by 2 atoms, `ndr:#slug` referenced nowhere outside
ndr's own code; `reversibility:` validated and displayed but consumed by no
behavior; `area: tooling` covers 31/52 atoms (filter matches 60% of corpus —
filters nothing) while `topic:` carries 18 distinct working values; `tags:`
holds one real classification (`meta-chain`, 12 atoms) that the taxonomy
could not express.

## Design principles

- **Agent-first, human-second.** Plain markdown, no renderer-specific syntax.
- **One altitude per section.** Content is written once, at the length it
  deserves. No gist+detail duplication.
- **Most important information first.** All terse operational sections sit
  above the one unbounded prose section; the operational surface fits in the
  first screenful.
- **Bullets for inventories, prose for arguments.** Everything is bullets
  except `## Decision` and `## Why` — the claim and the weighing.
- **No manual-discipline fields** (`ndr:0004`). Every new field is either
  auto-filled (`author`) or captures a judgment made once at capture time
  (`conviction`). No field requires someone to remember to update it later.

## Frontmatter

```yaml
---
id: "0155"                 # CLI-minted on persist; quoted. Unchanged.
title: "Short imperative phrase"          # Unchanged.
status: current            # current | superseded | retracted. Unchanged.
decision_date: 2026-07-08  # Unchanged.
author: Jacob Hoehler      # NEW. Auto-filled from `git config user.name`.
conviction: tentative      # NEW. strong | tentative | arbitrary. Required.
project: ndr               # CHANGED: plain string, was wikilink.
labels: [write-side, taxonomy]   # NEW: replaces area + topic + tags.
binds: ["src/adapters/**"] # NEW: optional; replaces impacts.
supersedes: []             # CHANGED: plain atom ids. Presence-required.
superseded_by: []          # CHANGED: plain atom ids.
derived_from: []           # CHANGED: free-form refs (PR URL, transcript path).
informed_by: []            # CHANGED: plain atom ids.
---
```

### Field reference

| Field | Required | Spec |
| --- | --- | --- |
| `id` | on disk | CLI-minted, quoted. Omit from drafts (unchanged). |
| `title` | yes | Short imperative phrase (unchanged). |
| `status` | yes | `current` \| `superseded` \| `retracted`. All three kept: current/superseded are the chain; retracted is the only way to withdraw a decision without a fake successor. Doctor guards: retracted + non-empty `superseded_by` = conflict (existing check). |
| `decision_date` | yes | ISO date, when decided (unchanged). |
| `author` | yes | Human on whose behalf the capture ran — never "Claude"; the agent is a pen, not an author. Auto-filled by `ndr capture` from `git config user.name`; zero manual discipline. |
| `conviction` | yes | `strong` — deliberately chosen, would defend; superseding needs new evidence. `tentative` — best call with what we knew; open to revision on moderate evidence. `arbitrary` — a fork needed *an* answer; supersede freely. Required with no default: a default invites never thinking about it (same rationale as `supersedes:` presence). Consumers: `/interrogate-decision` and `/ground` set the supersession bar; weak-conviction heads are first-look candidates when revisits fire. |
| `project` | yes | Plain string naming the project (was wikilink). |
| `labels` | yes | 1–4 values from `<ledger>/.taxonomy/labels.yaml`. Replaces `area` + `topic` + `tags`. Gate semantics unchanged from `ndr:0153`: hard gate at capture, advisory at doctor, hand-edited list, adding a value is a data edit not a deploy. |
| `binds` | no | Flat list of glob patterns, repo-relative to the repo whose `.ndr.toml` pins the ledger. `Bun.Glob` syntax. Semantics: "the code this decision governs." Consumers: `drift-check` (diff → candidate atoms), `/ground` (rank heads by overlap). Advisory routing signal, never an exclusive filter. Convention: bind directories/layers, not files. Capture validates glob syntax only — no must-match-a-file gate (an atom may bind code that lands in a later PR). |
| `supersedes` | presence | Plain atom ids (`["0072"]`). Presence-required even when empty — structural signal the author considered supersession (unchanged rule). |
| `superseded_by` | no | Back-pointer, patched by capture in the same operation (unchanged). Supersession is **two writes** again — the alias-handover third write dies with `aliases:`. |
| `derived_from` | no | Free-form refs to the rich source: PR URL, transcript path, mull note path. |
| `informed_by` | no | Plain atom ids. No supersession semantics (unchanged). |

### Removed fields

| Field | Why removed |
| --- | --- |
| `aliases` | 2/52 usage; `ndr:#slug` grain never adopted outside ndr's own code. Removal simplifies supersession from three writes to two and deletes the slug-uniqueness sweep. |
| `reversibility` | Validated, displayed, consumed by nothing. Its useful content ("hard to undo") is a `## Commitments` bullet when it matters. `conviction` is what this field was trying to be. |
| `impacts` | Vault wikilinks with no vault. Replaced by `binds:`. |
| `revisit_triggers` | Nearly always `[]` while real triggers hid in assumption callouts. Becomes body section `## Revisit if` — one home instead of two. |
| `tags` | `decision` tag was an Obsidian query hook. Real overflow classifications (e.g. `meta-chain`) become `labels`. |
| `area`, `topic` | Merged into `labels`. Two rigid single-valued axes forced misclassification (area lumpy to uselessness) and overflow into `tags`. |

### Reference scheme change

`ndr:` references drop from three grains (`ndr:0049`) to two:

- `ndr:0042` — frozen atom id, historical anchor; resolve walks to head on demand (unchanged).
- `ndr:<label>` — all current heads carrying that label (replaces `ndr:area/topic`).
- `ndr:#slug` — **removed** with `aliases:`. The "stable concept handle that
  follows supersession" job is served by resolving a frozen id and walking to
  head.

### Taxonomy files

`<ledger>/.taxonomy/areas.yaml` + `topics.yaml` merge into a single
`labels.yaml`. Same format, same hand-edited friction-is-the-feature
semantics, same enforcement altitudes (`ndr:0153`).

## Body

Section order is by operational importance, not narrative order. Two
principles: (1) what a reader needs *while working* outranks
how-we-got-here; (2) `## Why` is the only unbounded section, so every terse
section sits above it — nothing pays Why's scroll cost.

```markdown
# 0155 — Short imperative phrase

## Decision

## Scope

## Commitments

## Revisit if

## Context

## Why

## Alternatives
```

The H1 contract is unchanged: drafts emit `# PLACEHOLDER — <title>`;
`ndr capture` patches in the minted id.

| Section | Required | Shape | Content rule |
| --- | --- | --- | --- |
| `## Decision` | yes | Prose, one paragraph, 1–3 sentences, ≤ ~60 words | States what is now true. No rationale (Why), no situation (Context). Prose, never bullets — a bullet list under Decision is usually several atoms in a trenchcoat; the flowing-sentence constraint is structural pressure toward atomicity (`ndr:0008`). First paragraph remains the machine-extracted gist (`extractGist`). |
| `## Scope` | no | Bullets (`Binds:` / `Does not bind:`) | The semantic boundary a glob can't express: negative scope, conditional applicability, layer-shaped boundaries. Omit when scope is fully implied by labels. Scope says *where it applies*; Commitments says *what follows*. |
| `## Commitments` | no | Bullets | One bullet per obligation the decision **creates**: an invariant to maintain, a coupling introduced, a recurring cost, an option foreclosed. Never restates what the decision does — only what it demands. (Renamed and narrowed from Consequences, whose corpus content was mostly Decision restatement.) |
| `## Revisit if` | no | Bullets | Pure flip conditions, one per bullet. No restated beliefs (those live in Context/Why), no rationale. Replaces both the body Assumptions section and the `revisit_triggers:` field. The author marks load-bearing bets once at capture time instead of every reader inferring them. |
| `## Context` | yes | Bullets | The pre-decision world: what was true, broken, or newly constrained. **May not name the chosen option.** Fact inventory, one bullet each — gives drift-audit a per-fact staleness check. Thin atoms may carry a single bullet, but the section is required: "the context is obvious" at capture time is exactly the assumption that is false three months later. |
| `## Why` | yes | Prose, roomy | The weighing — not just the reasons but what tipped the call. Prose because subordination is the content; a bulleted Why degrades into a pros list with the connective tissue deleted. Ordered most-load-bearing-first. A paragraph arguing against a specific alternative belongs in Alternatives. **May not introduce new facts about the situation** (those are Context). |
| `## Alternatives` | no | Bullets | One bullet per alternative: `**name** — verdict: fatal reason`. Verdict ∈ rejected / deferred / preserved-elsewhere. A bullet may take a follow-on paragraph when genuinely needed; default is the one-liner. Deepest archaeology — consulted when a revisit fires or an interrogation runs — hence last. |

Omit-if-empty applies to all optional sections (unchanged rule). Callouts,
gist lines, and slug lists are gone entirely.

## Machinery changes

### `ndr capture`

- Auto-fill `author:` from `git config user.name`.
- Gate `labels:` against `.taxonomy/labels.yaml` (replaces area/topic gate;
  semantics of `ndr:0153` unchanged).
- Validate `binds:` glob syntax only.
- Supersession returns to two writes (successor + predecessor patch); the
  alias-handover write and slug-uniqueness check are deleted.
- **New advisory (not gate): binds narrowing.** When `supersedes:` is
  non-empty and the predecessor's `binds:` is not a subset of the
  successor's, warn: "successor narrows predecessor's binding: [uncovered
  globs] — intentional?" Legitimate outcomes: scope genuinely shrank (say so
  in Context/Scope); partial revision mis-modeled as supersession (split the
  predecessor or use `informed_by:` instead); drafter forgot to carry binds.
- **New advisory: cross-author supersession.** When a supersession target's
  `author:` differs from the current git user, warn: "superseding a decision
  authored by <name> — flag them before merging." Same warning surfaces in
  `/interrogate-decision`.

Supersession semantics are untouched: binary and whole-atom. `binds:` never
affects status — no partial supersession by scope; the chain walk stays the
simple canonical primitive (`ndr:0071`).

### `ndr doctor`

- **New advisory check `binds_stale`:** on current heads only (consistent
  with `ndr:0060`), any `binds:` glob matching zero files is a finding.
  Doctor reports, never rewrites — where the code went requires judgment.
  Known blind spot, accepted: a glob that still matches *something* while the
  governed code moved is semantic drift, owned by `drift-check`.
- Labels checks replace area/topic checks (advisory, missing
  `.taxonomy/labels.yaml` skips the class with a stderr note — unchanged
  degradation semantics).
- Delete alias-related checks (slug uniqueness, alias handover integrity).
- Drop `reversibility` from required fields; add `author`, `conviction`,
  `labels`.
- Context required-section check: a missing `## Context` section is a
  finding on any atom; a Context containing only the
  `- (not reconstructed at migration)` placeholder is advisory (see
  grandfathering). No date cutoff needed — the placeholder marker is the
  grandfathering signal.

### `ndr resolve` / briefs

- `extractGist` untouched (`## Decision` first paragraph).
- Reference parsing: drop `ndr:#slug`; `ndr:area/topic` becomes `ndr:<label>`.
- Brief output: print `conviction` (it sets the reader's supersession bar);
  stop printing `reversibility`.

### `drift-check` / `ndr-drift-auditor`

- Use `binds:` overlap to rank candidate atoms for a diff.
- Report **absence vs contradiction** as distinct categories: contradicting
  code is drift; absent code is "decided, not yet built" — a normal state,
  not a finding. No ledger field tracks build state; work tracking belongs in
  the ticket system.

### Plugin prose

`frontmatter-schema.md`, `decision-single.md`, drafter/reviewer/reader agent
instructions, and the skills that describe the format all update to the new
spec. The drafter's reference templates are the source of truth for its
output contract — fix templates, not just agent prose.

## Migration

Per-ledger, two passes. Frontmatter is mechanical; bodies need judgment.

### Pass 1 — `ndr migrate` (mechanical)

- Wikilinks → plain values (`project`, `supersedes`, `superseded_by`,
  `informed_by`, `derived_from`).
- `labels` = `[area, topic]` + (`tags` − `decision`), deduped.
  Auto-seed `labels.yaml` as the union of `areas.yaml` + `topics.yaml` +
  stray corpus tags (e.g. `meta-chain`).
- Drop killed fields (`aliases`, `reversibility`, `impacts`,
  `revisit_triggers`, `tags`, `area`, `topic`).
- Backfill `author:` from git history (first-commit author of each atom file).
- Backfill `conviction: tentative` — the explicit "not yet judged" default,
  upgradeable in pass 2.
- Strip callout markers (`> [!info]- …`, `> [!warning]- …`) and unindent
  their content in place.

### Pass 2 — Claude (judgment, one-time, reviewed as a PR)

- Extract `## Context` from old `Full reasoning` callout content.
- Filter old Consequences into real `## Commitments` (drop Decision
  restatements).
- Convert old Assumptions into `## Revisit if` conditions.
- Merge gist+callout duplication into single prose; reorder sections.
- Upgrade `conviction:` from the default where the Why makes strength
  obvious.

### Packaging

Pass 2 ships in the ndr plugin as a thin skill plus one agent, both
**retirable** — delete them from the plugin once every ledger is converted:

- **`ndr:migrate-ledger` skill** — orchestrates the full sequence: run
  `ndr migrate` (pass 1), dispatch pass-2 body reshaping in batches, run
  `ndr doctor` as the acceptance sweep, assemble one reviewable PR. Runs once
  per ledger across the tracked repos.
- **`ndr-migrator` agent** — per-atom body reshaping in isolated context
  (a full corpus of old-format prose would swamp the orchestrator). Carries
  the new-format template plus the pass-2 reshaping rules. Batches of ~8–10
  atoms per dispatch.
- **`ndr-reviewer` (existing, audit mode)** — per-atom quality gate on
  migrator output; its checklist updates to the new template as part of the
  plugin-prose work anyway.

Reshaping rules deliberately stay out of `ndr-drafter`: its contract is
conversation-candidates → new atom, and it should not carry dead migration
instructions afterward.

### Grandfathering

A migrated atom whose Context genuinely can't be reconstructed keeps
`## Context` with a single bullet `- (not reconstructed at migration)`.
The placeholder marker is the grandfathering signal: doctor treats a
placeholder-only Context as advisory, a missing Context section as a
finding. New captures always require a real Context.

## Out of scope

- Build-state tracking (`status: proposed`, `implemented:` flags) — rejected:
  fuses independent axes into `status`, and a manual boolean rots
  (`ndr:0004`). Drift-check's absence-vs-contradiction reporting covers the
  real consumer.
- Rename-tracking machinery for `binds:` (git-hook path following) —
  disproportionate to the failure mode; coarse globs + `binds_stale` +
  drift-check cover it.
- Any Obsidian compatibility layer. All ledgers are repo-resident; no dual
  format.

## Decisions to capture as NDR atoms at implementation time

This design itself lands several NDR-grade decisions (body format, labels
consolidation, slug removal, conviction/author fields, binds semantics,
migration grandfathering). Capture them via `/capture-decision` when
implementation starts, with `supersedes:` pointing at the format atoms they
revise (`0049`, `0050`, `0051` among them).
