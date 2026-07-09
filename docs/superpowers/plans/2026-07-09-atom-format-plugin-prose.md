# Atom Format Plugin Prose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite every `plugins/ndr/` prose surface (references, agents, skills, seed assets) to speak the new atom format the CLI already enforces, delete dead Obsidian affordances, add the retirable migration tooling, and regenerate this repo's stale grounding rule — so the shipped plugin stops contradicting the merged CLI.

**Architecture:** Pure prose/asset rework on top of the already-merged CLI (Plan 1). No `src/` TypeScript logic changes except one string constant in `src/cli/templates.ts` (the `NDR_RULE` template carries a stale phrase). The drafter's reference templates (`references/frontmatter-schema.md`, `references/decision-single.md`) are the **source of truth** for atom shape — fix templates, not just agent prose (memory: `drafter-templates-are-source-of-truth`). Seed atoms are migrated to new format using the real `ndr migrate` CLI (pass 1) plus the new `ndr-migrator` agent (pass 2), dogfooding the tooling this plan packages.

**Tech Stack:** Markdown prose, YAML frontmatter, one Bun/TypeScript string constant, `dist/ndr` binary (built from Plan 1), `bun test`/`typecheck`/`lint`/`format:check` for the one code touch.

**Spec:** `docs/superpowers/specs/2026-07-08-atom-format-redesign.md` — the authority for every format rule. The "Packaging" subsection (lines 252-278) plus Plan 1's "Deferred to Plan 2" list (`docs/superpowers/plans/2026-07-08-atom-format-core.md`, lines 1514-1520) define this plan's scope.

## Global Constraints

- **Branch:** all work on a feature branch off `dev` (create `atom-format-plugin` from `dev`). Never commit or push directly to `main` (`.claude/rules/branch-workflow.md`); `dev` stays strictly ahead of `main`.
- **Commits:** conventional commits enforced by commitlint git hooks — `feat:` / `refactor:` / `docs:` / `chore:`, lowercase, no trailing period. Commits require 1Password `op-ssh-sign`; run `git commit`/`git push` with `dangerouslyDisableSandbox=true`. Never commit the untracked root `CLAUDE.md`.
- **ASCII-only** in prose you author, except: em-dashes (`—`) and the `·` separator are allowed where the surrounding file already uses them (most files do). Curly quotes only inside quoted source material.
- **New format — the target shape** (from the spec; every task assumes it):
  - Frontmatter fields: `id` (minted, quoted), `title`, `status` (`current`|`superseded`|`retracted`, unchanged), `decision_date`, `author` (auto-filled by `ndr capture` from `git config user.name`; omit from drafts), `conviction` (`strong`|`tentative`|`arbitrary`, required, no default), `project` (plain string), `labels` (1-4 from `<ledger>/.taxonomy/labels.yaml`), `binds` (optional repo-relative globs), `supersedes` (plain atom ids, presence-required), `superseded_by`, `derived_from` (free-form refs), `informed_by` (plain atom ids).
  - **Removed fields:** `aliases`, `reversibility`, `impacts`, `revisit_triggers`, `tags`, `area`, `topic`.
  - Body section order (single altitude, plain markdown, **no Obsidian callouts**): `## Decision` (prose), `## Scope` (opt), `## Commitments` (opt), `## Revisit if` (opt), `## Context` (required), `## Why` (prose), `## Alternatives` (opt).
  - **Reference grains:** two only — `ndr:<atom-id>` and `ndr:<label>`. `ndr:#slug` and `ndr:area/topic` are gone.
  - **Taxonomy:** single `labels.yaml`; `ndr labels` command (was `ndr areas`/`ndr topics`); supersession is two writes (was three with alias handover).
- **Old-format token sweep** (the acceptance test for every prose task). After editing a file, this ripgrep must return **no hits inside the edited file** (matches inside fenced "before/example of what we removed" blocks are the only allowed exceptions, and this plan authors none):

  ```bash
  rg -n -e '\[!info\]|\[!warning\]' -e '## Assumptions|## Consequences' \
     -e '\breversibility\b' -e '\baliases\b' -e 'revisit_triggers' -e '^\s*impacts:' \
     -e 'hybrid.?altitude' -e 'ndr:#|#<slug>|#slug' -e 'area/topic|suggested_area|suggested_topic' \
     -e '^\s*area:|^\s*topic:' -e '\[\[Decisions/' -e 'ndr areas|ndr topics' \
     <file>
  ```

- Seed atoms `0049/0050/0051` are migrated to new **format** but stay `status: current` (user decision 2026-07-09) — Plan 3 captures the superseding atoms.

---

### Task 1: Reference contracts — frontmatter-schema, decision-single, taxonomy

**Files:**
- Modify (full rewrite): `plugins/ndr/references/frontmatter-schema.md`
- Modify (full rewrite): `plugins/ndr/references/decision-single.md`
- Modify (full rewrite): `plugins/ndr/references/taxonomy.md`

**Interfaces:**
- Produces: the canonical new-format field reference and body template that every downstream agent/skill points at. `decision-single.md` is the body template the drafter and migrator emit against; `frontmatter-schema.md` is the field authority.

- [ ] **Step 1: Rewrite `plugins/ndr/references/decision-single.md`**

Replace the ENTIRE file with:

````markdown
---
# No `id:` field. `ndr capture` mints the atom-id on persist; a draft that emits
# an `id` (even a placeholder string) is rejected at validation. Omit it.
title: "Short imperative phrase"
status: current             # current | superseded | retracted
decision_date: YYYY-MM-DD
# author: omit — `ndr capture` auto-fills from `git config user.name`.
conviction: tentative       # strong | tentative | arbitrary. Required, no default.

project: ndr                # plain string naming the project

labels:                     # 1-4 values from <ledger>/.taxonomy/labels.yaml
  - TODO
binds: []                   # optional; repo-relative glob patterns this decision governs

supersedes: []              # plain atom ids, e.g. ["0072"]. Present even when empty.
superseded_by: []
derived_from: []            # free-form refs: PR URL, transcript path, mull note
informed_by: []             # plain atom ids; no supersession semantics
---

# PLACEHOLDER — Short imperative phrase

<!-- The H1 stays literally `# PLACEHOLDER — <title>`. `ndr capture` patches the
     `# PLACEHOLDER —` sentinel into `# <minted-id> — <title>` on persist. Do not
     inline the title or an id into the heading yourself. -->

## Decision

One paragraph, 1-3 sentences (<= ~60 words), prose. States what is now true.
No rationale (that is Why), no situation (that is Context). Never a bullet list —
a bulleted Decision is usually several atoms in a trenchcoat.

## Scope

Optional. Bullets. The semantic boundary a glob can't express — negative scope,
conditional applicability, layer-shaped boundaries. Omit when scope is fully
implied by labels.

- Binds: <where it applies>
- Does not bind: <explicit exclusion>

## Commitments

Optional. Bullets. One bullet per obligation the decision creates — an invariant
to maintain, a coupling introduced, a recurring cost, an option foreclosed.
Never restates what the decision does — only what it demands.

## Revisit if

Optional. Bullets. Pure flip conditions, one per bullet. No restated beliefs, no
rationale. Replaces the old Assumptions section and the `revisit_triggers:` field.

## Context

Required. Bullets. The pre-decision world: what was true, broken, or newly
constrained. May NOT name the chosen option. One fact per bullet — gives
drift-audit a per-fact staleness check. A thin atom may carry a single bullet,
but the section is required.

## Why

Required. Prose, roomy. The weighing — not just the reasons but what tipped the
call. Ordered most-load-bearing-first. May NOT introduce new facts about the
situation (those are Context). An argument against a specific alternative belongs
in Alternatives.

## Alternatives

Optional. Bullets, one per alternative: `**name** — verdict: fatal reason`.
Verdict is one of rejected / deferred / preserved-elsewhere. A bullet may take a
follow-on paragraph when genuinely needed; default is the one-liner. Omit if
there were no meaningful alternatives.
````

- [ ] **Step 2: Rewrite `plugins/ndr/references/frontmatter-schema.md`**

Replace the ENTIRE file with:

````markdown
# Frontmatter schema

Canonical YAML spec for decision atoms. The `ndr capture` CLI validates every
write against a strict Zod schema and refuses to persist if any required field is
missing or an unknown field is present.

## Example

```yaml
---
id: "0042"                 # auto-minted by `ndr capture`; OMIT from drafts. Quoted to preserve leading zeros.
title: "Use FastAPI for the auth service"   # short imperative phrase
status: current            # current | superseded | retracted
decision_date: 2026-05-14  # ISO date the decision was made
author: Jacob Hoehler      # auto-filled from `git config user.name`; OMIT from drafts
conviction: tentative      # strong | tentative | arbitrary. Required, no default.

project: ndr               # plain string naming the project

labels:                    # 1-4 values from <ledger>/.taxonomy/labels.yaml
  - write-side
  - taxonomy
binds:                     # optional; repo-relative glob patterns (Bun.Glob syntax)
  - "src/adapters/**"

supersedes: []             # plain atom ids; present even when empty
superseded_by: []          # back-pointer, patched by capture on the predecessor
derived_from: []           # free-form refs: PR URL, transcript path, mull note
informed_by: []            # plain atom ids; no supersession semantics
---
```

## Field reference

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string (4-digit legacy, or 6-char base32) | yes (on disk) | Auto-minted by `ndr capture`. **Omit from drafts** — a draft that emits an `id` fails validation. Quote it so `"0042"` isn't coerced to int `42`. |
| `title` | string | yes | Short imperative phrase. |
| `status` | enum | yes | `current` \| `superseded` \| `retracted`. current/superseded are the supersession chain; retracted withdraws a decision without a fake successor. |
| `decision_date` | ISO date | yes | When decided, not when the atom was written. |
| `author` | string | yes | The human on whose behalf capture ran — never "Claude"; the agent is a pen, not an author. **Auto-filled** by `ndr capture` from `git config user.name`; omit from drafts. |
| `conviction` | enum | yes | `strong` (would defend; superseding needs new evidence) \| `tentative` (best call with what we knew) \| `arbitrary` (a fork needed an answer; supersede freely). Required with no default — a default invites never thinking about it. |
| `project` | string | yes | Plain string naming the project (was a wikilink). |
| `labels` | list[string], 1-4 | yes | Values from `<ledger>/.taxonomy/labels.yaml`. Hard-gated at capture, advisory at doctor. Replaces `area` + `topic` + `tags`. Adding a value is a data edit (edit the file), not a deploy. |
| `binds` | list[string] | no | Repo-relative glob patterns (`Bun.Glob` syntax) naming the code this decision governs. Consumed by `drift-check` (diff -> candidate atoms) and `/ground` (rank heads by overlap). Advisory routing signal, never an exclusive filter. Convention: bind directories/layers, not files. Capture validates glob syntax only. |
| `supersedes` | list[atom-id] | **yes (presence)** | Plain atom ids (`["0072"]`). Must be present even when empty — the structural signal the author considered supersession. If non-empty, this decision revises the named one(s). |
| `superseded_by` | list[atom-id] | no | Back-pointer, patched onto the predecessor by capture in the same operation. |
| `derived_from` | list[string] | no | Free-form refs to the rich source: PR URL, transcript path, mull note path. |
| `informed_by` | list[atom-id] | no | Plain atom ids of decisions that shaped this one. No supersession semantics. |

### Removed fields

`aliases`, `reversibility`, `impacts`, `revisit_triggers`, `tags`, `area`, `topic`
are all gone. The schema is `.strict()` — an atom carrying any of them is rejected
as `schema_invalid` rather than silently passing with baggage. Their replacements:
`area`+`topic`+`tags` -> `labels`; `impacts` -> `binds`; `revisit_triggers` ->
body `## Revisit if`; `reversibility` -> `conviction` (+ a `## Commitments` bullet
when "hard to undo" matters); `aliases` -> resolve a frozen id and walk to head.

## Body convention — single altitude

Content is written once, at the length it deserves. No gist+callout duplication,
no Obsidian callouts, no slug lists. Section order is by operational importance:
everything terse sits above the one unbounded prose section (`## Why`).

```markdown
# 0042 — Use FastAPI for the auth service

## Decision

## Scope

## Commitments

## Revisit if

## Context

## Why

## Alternatives
```

The full section-by-section content rules live in `decision-single.md` (the body
template). Summary:

| Section | Required | Shape |
| --- | --- | --- |
| `## Decision` | yes | Prose, 1-3 sentences, <= ~60 words. What is now true. First paragraph is the machine-extracted gist. |
| `## Scope` | no | Bullets. Semantic boundary a glob can't express (negative/conditional/layer scope). |
| `## Commitments` | no | Bullets. One obligation the decision creates per bullet. Never restates the decision. |
| `## Revisit if` | no | Bullets. Pure flip conditions. |
| `## Context` | yes | Bullets. Pre-decision facts, one per bullet. May not name the chosen option. |
| `## Why` | yes | Prose, roomy. The weighing, most-load-bearing-first. May not introduce new facts. |
| `## Alternatives` | no | Bullets: `**name** — verdict: reason`. |

Omit-if-empty applies to every optional section — don't render an empty heading.

## Reference grains

`ndr:` references have two grains:

- `ndr:0042` — frozen atom id; resolve walks the supersession chain to the head.
- `ndr:<label>` — all current heads carrying that taxonomy label.

The `#slug` and `area/topic` grains were removed with `aliases` and the
area/topic split.

## Hard rules

1. **Required fields are non-negotiable.** Capture refuses to write if `title`,
   `status`, `decision_date`, `author`, `conviction`, `project`, `labels`, or
   `supersedes` is missing. `author` is auto-filled from git when the draft omits
   it; if git has no `user.name` and the draft carries none, that is a validation
   error.
2. **`supersedes:` must be present.** May be empty. Its presence is the structural
   signal that the author considered supersession.
3. **Two-write supersession.** If `supersedes:` is non-empty, capture patches each
   predecessor's `status: superseded` and appends the successor's plain id to its
   `superseded_by:` in the same operation. On patch failure it reports the
   half-state and exits.
4. **Multi-supersession is guarded.** If a predecessor is already `superseded` by a
   different successor, capture refuses the patch (competing successors drafted in
   parallel).
5. **`project:` is required** — a plain string naming the repo/project.
6. **Body prose is substantive.** Don't restate frontmatter fields in prose.
7. **`labels` is gated.** Every label must appear in `<ledger>/.taxonomy/labels.yaml`;
   capture refuses unknown values. 1-4 labels per atom.
8. **`binds` is syntax-checked only.** Capture validates glob parseability; there is
   no must-match-a-file gate (an atom may bind code that lands in a later PR).
````

- [ ] **Step 3: Rewrite `plugins/ndr/references/taxonomy.md`**

Replace the ENTIRE file with:

````markdown
# Taxonomy

`labels:` is a finite, hand-edited list. Each atom carries 1-4 labels. The capture
skill validates every write against the list and refuses unknown values.

## Why finite

At ~50-200 decisions/year (personal scale), enforced taxonomy is more reliable
than embedding-distance matching. The cost of mis-grouping later is real — finding
a decision by `label:` six months later only works if the label was the same value
six months earlier.

Labels replace the old two-axis `area` + `topic` split (plus the `tags` overflow).
Two rigid single-valued axes forced misclassification — `area` went lumpy to
uselessness (one value covered most of the corpus) while real overflow
classifications leaked into `tags`. One flat multi-valued axis fixes both.

## Files

- `<ledger>/.taxonomy/labels.yaml` — the single label list.

A flat YAML list of strings. 1-4 values per decision.

## Where the live values live

**Current truth:** `<ledger>/.taxonomy/labels.yaml` — sibling to the atoms in
whichever ledger is resolved. Mutable; grows over time.

**Install-time seeds:** `ndr init` writes a starter `labels.yaml` embedded in the
binary; `/ndr-bootstrap` copies `plugins/ndr/assets/taxonomy/labels.yaml` into the
ledger. Both are frozen seeds — drift between seed and live taxonomy is expected
and correct.

This reference doc deliberately does NOT list current values. A static table here
would drift the moment a real `/capture-decision` invocation grows the taxonomy,
and any agent reading the snapshot would silently second-guess valid values.
Always read the ledger's `labels.yaml` for current truth. Read it with
`ndr labels` (never `ndr areas` / `ndr topics` — those commands are gone).

## Growth rule

Adding a value is explicit. The capture skill prompts:

> "`<value>` is not in `labels.yaml`. Use existing (`a`, `b`, `c`, …) or add new?"

Choosing "add new" appends the value to `labels.yaml` and commits the change.
**Friction is the feature** — silent acceptance is how taxonomies drift.

## Drift-prevention rules

- **Don't rename existing values.** A rename invalidates every prior decision that
  used the old name. If a value name turns out wrong, write a decision about it,
  then do the rename as a deliberate corpus-wide migration.
- **Don't add overlapping values.** If `tooling` and `substrate` start blurring,
  write a decision about whether to merge them, don't quietly add a third
  overlapping value.
- **Don't add catch-alls.** "other" or "misc" defeat the point.

## When the bootstrap is wrong

The bootstrap was chosen at install time to fit a generic starter set. It will be
wrong for some real decisions. The expected pattern: discover the gap during a real
`/capture-decision` invocation, decide on the new value, add it, and capture the
new value as a (small, low-altitude) decision so the choice survives.
````

- [ ] **Step 4: Verify no old-format tokens remain**

Run the Global-Constraints sweep against all three files:

```bash
rg -n -e '\[!info\]|\[!warning\]' -e '## Assumptions|## Consequences' \
   -e '\breversibility\b' -e '\baliases\b' -e 'revisit_triggers' -e '^\s*impacts:' \
   -e 'hybrid.?altitude' -e 'ndr:#|#<slug>|#slug' -e 'area/topic|suggested_area|suggested_topic' \
   -e '^\s*area:|^\s*topic:' -e '\[\[Decisions/' -e 'ndr areas|ndr topics' \
   plugins/ndr/references/frontmatter-schema.md plugins/ndr/references/decision-single.md plugins/ndr/references/taxonomy.md
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add plugins/ndr/references/frontmatter-schema.md plugins/ndr/references/decision-single.md plugins/ndr/references/taxonomy.md
git commit -m "docs: rewrite ndr reference contracts to the new atom format"
```

---

### Task 2: Remaining references — workflow, worthiness, interrogation

**Files:**
- Modify: `plugins/ndr/references/workflow.md`
- Modify: `plugins/ndr/references/worthiness.md`
- Modify: `plugins/ndr/references/interrogation.md`

**Interfaces:**
- Consumes: the field/grain/section vocabulary from Task 1.

- [ ] **Step 1: Edit `plugins/ndr/references/workflow.md`**

Apply each edit (verify surrounding context before replacing; line numbers are approximate):

- CLI verb table (~line 19): `ndr areas` / `ndr topics` row → single `ndr labels` verb ("List the resolved ledger's taxonomy labels").
- `.ndr.toml` example (~lines 33-38): `project = "[[my-repo]]"    # optional; the project wikilink...` → `project = "my-repo"    # optional; plain-string project name for atoms in this repo`.
- Brief-content line (~line 44): `reversibility, body gist, `Lineage:` chain` → `conviction, body gist, `Lineage:` chain`; and "Assumption callouts are deliberately omitted from CLI output... readers pull them from the **head** file" → "The `## Revisit if` section is included in the head file readers pull; briefs stay terse".
- Capture pipeline (~line 61): "Skill suggests `area:` / `topic:` per candidate from the on-disk taxonomy (`<ledger>/.taxonomy/{areas,topics}.yaml`)" → "Skill suggests 1-4 `labels:` per candidate from `<ledger>/.taxonomy/labels.yaml`"; step-4 heading "Taxonomy preflight" → "Labels preflight".
- Draft JSON schema (~lines 67-71): replace old frontmatter keys (`aliases`, `area`, `topic`, `impacts`, `revisit_triggers`, `reversibility`, `tags`) with the new set (`conviction`, `project` plain string, `labels: []`, `binds: []`; omit `id`/`author`). Body placeholder string → new section order (`## Decision`/`## Scope`/`## Commitments`/`## Revisit if`/`## Context`/`## Why`/`## Alternatives`).
- Validation line (~line 74): "Validates required fields, enums, and `area:`/`topic:` against the on-disk taxonomy (hard gate)." → "...and `labels:` against `labels.yaml` (hard gate)."
- **Supersession subsection (~lines 79-84):** retitle "Three-write supersession (with alias handover, ndr:0051)" → "Two-write supersession"; delete the alias-handover bullet ("If the predecessor carries `aliases:`, the patch also moves each slug..."); the two writes are successor + predecessor `superseded_by:` patch.
- Grain descriptions (~lines 111-113): keep atom-id bullet; **delete** the slug bullet (`#monorepo-shape`); `topic` bullet (`area/topic`) → **label** bullet (`<label>` — lists all `status: current` heads carrying that label).
- "### Assumptions" subsection (~lines 115-117): retitle to "### Revisit conditions"; "CLI briefs omit `## Assumptions` callouts... surfaces the callouts" → "CLI briefs stay terse; the `## Revisit if` section lives in the head file as plain bullets — no callouts".
- "## Reference convention" table + prose (~lines 191-201): three-grain table (atom-id/slug/topic) → two-grain table (atom-id/label). Delete "Slugs are minted **lazily**... Most atoms never carry one."
- "### Inside the vault" subsection (~lines 203-205): **delete entirely** (Obsidian alias resolution — no consumer).
- "### Why three grains" (~lines 207-209) → "### Why two grains" (drop slug-specific reasoning; keep the bi-temporal argument).

- [ ] **Step 2: Edit `plugins/ndr/references/worthiness.md`**

- (~line 14): "The required `reversibility:` field and the `supersedes:` primitive imply the capture target is something the system might re-decide." → "The required `conviction:` field and the `supersedes:` primitive imply the capture target is something the system might re-decide — and where the recovery cost is asymmetric, a `## Commitments` bullet records it."
- (~line 60): "`revisit_triggers:` explicitly include..." → "the `## Revisit if` section explicitly includes..."; "Reversibility `easy`." → "Conviction `arbitrary`." (worked-example wording only).
- (~line 68): "`revisit_triggers:` cover publishing-as-template..." → "the `## Revisit if` section covers publishing-as-template...".
- (~line 74): "load-bearing `## Assumptions`" → "load-bearing `## Revisit if` conditions".
- (~line 82): "`revisit_triggers:` cover per-movie merge upgrades..." → "the `## Revisit if` section covers per-movie merge upgrades...".

- [ ] **Step 3: Edit `plugins/ndr/references/interrogation.md`**

- Move 5 (~lines 58-59 / ~79): "This maps directly onto the atom's required `reversibility:` field — the asymmetry analysis *is* the justification for `easy` / `medium` / `hard`... An escape valve turns a `hard` into a `medium`." → "Where the recovery cost is asymmetric enough to bind future work, capture it as a `## Commitments` bullet noting the escape valve; the overall confidence in the call is the atom's `conviction:` rating."
- Move 6 (~line 67 / ~81): "These become the atom's `## Assumptions` revisit triggers" → "These become the atom's `## Revisit if` conditions".
- Step 10 handoff (~line 99): "the `reversibility:` justification (Step 5)" → "the `conviction:` rating and any `## Commitments` bullet (Step 5)"; "the revisit triggers (Step 6)" → "the `## Revisit if` conditions (Step 6)".
- Output example (~line 117): "→ favors split. reversibility: easy." → "→ favors split. conviction: strong.".

- [ ] **Step 4: Verify + commit**

```bash
rg -n -e '\[!info\]|\[!warning\]' -e '## Assumptions|## Consequences' \
   -e '\breversibility\b' -e '\baliases\b' -e 'revisit_triggers' -e '^\s*impacts:' \
   -e 'hybrid.?altitude' -e 'ndr:#|#<slug>|#slug' -e 'area/topic|suggested_area|suggested_topic' \
   -e '^\s*area:|^\s*topic:' -e '\[\[Decisions/' -e 'ndr areas|ndr topics' \
   plugins/ndr/references/workflow.md plugins/ndr/references/worthiness.md plugins/ndr/references/interrogation.md
git add plugins/ndr/references/workflow.md plugins/ndr/references/worthiness.md plugins/ndr/references/interrogation.md
git commit -m "docs: workflow/worthiness/interrogation references speak the new format"
```

Expected: sweep returns no output. (`three grains` prose may still describe history in workflow.md's "Why two grains" — acceptable; the sweep patterns don't match that phrase.)

---

### Task 3: ndr-drafter agent (source of truth)

**Files:**
- Modify: `plugins/ndr/agents/ndr-drafter.md`

**Interfaces:**
- Consumes: `references/frontmatter-schema.md`, `references/decision-single.md` (Task 1).
- Produces: the drafter output contract — `{frontmatter, body}` JSON with new-format fields (no `id`, no `author`, plus `conviction`/`labels`/`binds`), new body section order. This contract is consumed by `/capture-decision` (Task 7) and graded by `ndr-reviewer` (Task 4).

- [ ] **Step 1: Edit the Tool usage + Role sections**

- Tool usage (~lines 13-15): replace the slug-probe sentence. New text: "NDR atom lookups go through the `ndr` CLI (ndr:0129): `ndr resolve '<atom-id>'` to load predecessor context when `supersedes:` is non-empty. Never read atom files directly and never use `obsidian-cli` / MCP search against the ledger. The `Read` tool is for plugin references only. (There is no slug probe any more — `#slug` references were removed with `aliases:`.)"
- Role (~line 19): "suggested area/topic, project" → "suggested labels, project".

- [ ] **Step 2: Replace the Inputs section (~lines 27-44)**

```markdown
For each candidate the orchestrator passes:

- `title` — short imperative phrase
- `gist` — one-sentence summary
- `quotes` — 1-3 supporting quotes from the source
- `suggested_labels` — 1-4 label guesses from the extractor
- `suggested_project` — best guess from the extractor
- `conviction` — strong | tentative | arbitrary (caller-confirmed judgment)
- `binds` — optional list of repo-relative glob patterns. May be `[]`.
- `supersedes` — list of plain atom ids. May be `[]`. If non-empty, the caller has
  already confirmed the supersession; you simply set the field.
- `derived_from` — free-form refs to the rich source (PR URL, transcript path, mull note)
- `informed_by` — optional list of plain atom ids
- `decision_date` — ISO date the decision was made (default today)
- `project` — confirmed plain project name (overrides `suggested_project`)

(Author is NOT a drafter input — `ndr capture` auto-fills it from git. Omit the
`author` field from frontmatter entirely, same as `id`.)

Reference files (read on first iteration, cache for the session):

- `${CLAUDE_PLUGIN_ROOT}/references/frontmatter-schema.md` — canonical field list and types.
- `${CLAUDE_PLUGIN_ROOT}/references/decision-single.md` — body template.

Do NOT read `references/taxonomy.md` or the ledger's `labels.yaml`. Label
validation is the orchestrator's job (see the hard rules below).
```

- [ ] **Step 3: Replace the Hard rules (~lines 47-56)**

```markdown
1. **No filesystem writes.** Return drafts only.
2. **No ID assignment.** Omit the `id` field entirely — `ndr capture` mints it. The
   body's `# PLACEHOLDER — <title>` heading stays literal; the CLI patches it.
3. **No author.** Omit the `author` field — `ndr capture` auto-fills from git.
4. **`supersedes:` is set from input, not inferred.** Plain atom ids. Empty stays empty.
5. **`status:` is always `current`** for newly drafted atoms.
6. **`conviction:` is set from input.** Never default it silently — if the caller
   passed no conviction, list it in `missing_fields`.
7. **Body shape is single-altitude plain markdown** (per `decision-single.md`).
   Sections in order: `## Decision` (prose), `## Scope` (omit if none),
   `## Commitments` (omit if none), `## Revisit if` (omit if none), `## Context`
   (required), `## Why` (prose), `## Alternatives` (omit if none). NO Obsidian
   callouts, NO gist+detail duplication, NO slug lists. Each section is written once
   at the length it deserves.
8. **`## Context` is required and may not name the chosen option** — pre-decision
   facts only, one bullet each.
9. **Body prose is substantive.** Do not restate frontmatter fields in prose.
10. **Surface gaps, don't guess.** If a required field can't be filled (no project,
    no labels, no conviction), set it to `null`/`[]` and add a `missing_fields` entry.
11. **ASCII-only in field values.**
```

- [ ] **Step 4: Replace the Output format JSON example (~lines 62-89)**

```json
{
  "drafts": [
    {
      "title": "Use FastAPI for the auth service",
      "frontmatter": {
        "title": "Use FastAPI for the auth service",
        "status": "current",
        "decision_date": "2026-05-15",
        "conviction": "tentative",
        "project": "ndr",
        "labels": ["tooling", "substrate"],
        "binds": [],
        "supersedes": [],
        "superseded_by": [],
        "derived_from": ["https://github.com/org/repo/pull/214"],
        "informed_by": []
      },
      "body": "# PLACEHOLDER — Use FastAPI for the auth service\n\n## Decision\n\nUse FastAPI for the auth service.\n\n## Commitments\n\n- Adds Pydantic v2 as a transitive dependency.\n- Pins uvicorn as the runtime.\n\n## Context\n\n- The service already runs Postgres via async SQLAlchemy.\n- The prior sync framework required an executor shim for async handlers.\n\n## Why\n\nFastAPI's first-class async support keeps handlers declarative without bolting an executor onto a sync framework. That was the deciding factor given the existing async ORM layer.\n\n## Alternatives\n\n- **Flask + async shim** — verdict: rejected: executor bolt-on defeats the async ORM.\n",
      "missing_fields": []
    }
  ]
}
```

Then replace the Notes below the JSON with:

```markdown
- No `id` and no `author` field — `ndr capture` supplies both.
- Use real newlines in the body string. The CLI writes them as-is.
- `conviction` comes from the caller; never invent it.
- If a label is `NEW:<value>`, drop the `NEW:` prefix — the orchestrator handles
  label prompts before calling you. Trust caller-passed labels without consulting
  any taxonomy snapshot (the bootstrap asset, the reference doc, or any in-context
  list) — those lag the live `labels.yaml` and the orchestrator validated against it.
```

- [ ] **Step 5: Replace the Body composition guide table (~lines 100-110)**

```markdown
| Section | Required | Shape |
| --- | --- | --- |
| `## Decision` | always | Prose, 1-3 sentences (<= ~60 words). What is now true. No bullets. |
| `## Scope` | only if scope needs stating | Bullets (`Binds:` / `Does not bind:`). Omit if labels imply it. |
| `## Commitments` | only if the decision creates obligations | Bullets, one obligation each. Never restates the decision. |
| `## Revisit if` | only if load-bearing bets exist | Bullets, pure flip conditions. |
| `## Context` | always | Bullets, pre-decision facts. May not name the chosen option. |
| `## Why` | always | Prose, roomy. The weighing, most-load-bearing-first. |
| `## Alternatives` | only if alternatives were considered | Bullets: `**name** — verdict: reason`. |
```

- [ ] **Step 6: Update Missing-fields example + Style**

- Missing-fields example (~lines 116-121):

```json
"missing_fields": [
  {"field": "project", "prompt": "What project does this decision belong to? (plain name, e.g. ndr)"},
  {"field": "labels", "prompt": "Pick 1-4 labels from labels.yaml"},
  {"field": "conviction", "prompt": "How firmly is this held? strong | tentative | arbitrary"}
]
```

- Style (~line 132): "Match the seed corpus (`assets/decisions/0001-0008`, `0049-0051`)." stays valid after Task 10 migrates them; leave the reference. Remove any mention of "hybrid altitude" if present.

- [ ] **Step 7: Verify + commit**

```bash
rg -n -e '\[!info\]|\[!warning\]' -e '## Assumptions|## Consequences' \
   -e '\breversibility\b' -e '\baliases\b' -e 'revisit_triggers' -e '^\s*impacts:' \
   -e 'hybrid.?altitude' -e 'ndr:#|#<slug>|#slug' -e 'area/topic|suggested_area|suggested_topic' \
   -e 'mint_slug|\bslug\b' -e '\[\[Decisions/' \
   plugins/ndr/agents/ndr-drafter.md
git add plugins/ndr/agents/ndr-drafter.md
git commit -m "docs: ndr-drafter emits new-format drafts (labels, conviction, binds; no slug/author)"
```

Expected: no output.

---

### Task 4: ndr-reviewer agent (heavy — invert body checks)

**Files:**
- Modify: `plugins/ndr/agents/ndr-reviewer.md`

**Interfaces:**
- Consumes: the new body template and field set (Tasks 1, 3).
- Produces: the pre-persist / audit-mode quality gate. Its load-bearing checks become: atomicity (unchanged) + **new** body shape (fixed section order, single-altitude plain prose, no callouts, required `## Decision`/`## Context`/`## Why`).

- [ ] **Step 1: Edit the description + mechanical-check list**

- Frontmatter description (~line 3): "body altitude (heading + one-line gist + collapsed callouts, not free prose)" → "body shape (fixed section order Decision/Scope/Commitments/Revisit-if/Context/Why/Alternatives, single-altitude plain prose, no callouts)"; "taxonomy, supersession state, slug uniqueness" → "labels, supersession state" (drop slug uniqueness).
- (~line 17): delete the alias-uniqueness probe line ("For alias-uniqueness checks, probe with `ndr resolve '#<slug>'`..."). No slug grain exists.
- (~line 58): "`<ledger>/.taxonomy/areas.yaml` and `topics.yaml`" → "`<ledger>/.taxonomy/labels.yaml` — single file".

- [ ] **Step 2: Replace the "Body altitude" check block (~lines 79-87 and body-shape line 99)**

Retitle the check "Body altitude" → "Body shape" and replace its content with:

```markdown
- **No Obsidian callouts.** Fail if the body contains any `> [!info]` / `> [!warning]`
  callout — the new format is single-altitude plain markdown. Callouts are gone.
- **Section order.** Present sections must appear in the canonical order:
  `## Decision`, `## Scope`, `## Commitments`, `## Revisit if`, `## Context`,
  `## Why`, `## Alternatives`.
- **Required sections.** `## Decision`, `## Context`, and `## Why` must be present
  with non-empty content. `## Scope`, `## Commitments`, `## Revisit if`,
  `## Alternatives` are optional (omit-if-empty, never an empty heading).
- **Section discipline.** `## Decision` is prose, 1-3 sentences, not a bullet list.
  `## Context` bullets may not name the chosen option. `## Revisit if` is bullets
  of pure flip conditions (no slug lists, no callouts).
```

- [ ] **Step 3: Update the frontmatter-field checks (~lines 93-98)**

- (~line 93): required set → "Required frontmatter fields present and non-null: `title`, `status`, `decision_date`, `author`, `conviction`, `project`, `labels` (plus `id` in audit mode; plus `supersedes:` presence)."
- (~line 94): status enum unchanged — keep "`status:` value is one of: current, superseded, retracted."
- (~line 95): "`reversibility:` value is one of: easy, medium, hard." → "`conviction:` value is one of: strong, tentative, arbitrary."
- (~line 96): "`area:` and `topic:` ... present in the on-disk taxonomy YAML" → "`labels:` is a 1-4 value array, each present in `labels.yaml` (audit mode); non-empty in pre-persist mode."
- (~line 97): delete "`tags:` contains decision." (field removed).
- (~line 98): delete the `aliases:` slug-prefix / uniqueness check (field removed).

- [ ] **Step 4: Update remaining prose**

- (~line 99, "Body shape:" mechanical line): replace with "`## Decision`, `## Context`, `## Why` exist with non-empty prose/bullets; no callouts; sections in canonical order (see Body shape check above)."
- (~line 107, audit-mode "Alias uniqueness" check): delete entirely.
- (~line 142, recommendation): "Set `project:` to the wikilink of the owning project." → "Set `project:` to the plain-string name of the owning project."

- [ ] **Step 5: Verify + commit**

```bash
rg -n -e '\[!info\]|\[!warning\]' -e '## Assumptions|## Consequences' \
   -e '\breversibility\b' -e '\baliases\b' -e 'revisit_triggers' \
   -e 'hybrid.?altitude' -e 'ndr:#|#<slug>|#slug' -e 'area/topic' \
   -e '^\s*area:|^\s*topic:' -e '\bslug\b' -e '\[\[Decisions/' -e 'ndr areas|ndr topics' \
   plugins/ndr/agents/ndr-reviewer.md
git add plugins/ndr/agents/ndr-reviewer.md
git commit -m "docs: ndr-reviewer grades new-format body shape, labels, and conviction"
```

Expected: no output. (The word "altitude" may remain only if you retitled cleanly — prefer removing it; the sweep does not match bare "altitude".)

---

### Task 5: ndr-drift-auditor agent (heavy — binds ranking + absence-vs-contradiction)

**Files:**
- Modify: `plugins/ndr/agents/ndr-drift-auditor.md`

**Interfaces:**
- Consumes: `binds:` frontmatter (new), the new body sections.
- Produces: drift findings that (a) rank candidate atoms for a diff by `binds:` overlap, and (b) classify each hit as **contradiction** (code conflicts with a Decision/Commitment — a finding) vs **absence** (decided-but-not-yet-built code that simply doesn't exist — NOT a finding, excluded from `divergences`).

- [ ] **Step 1: Terminology swaps**

- (~line 19): "Decision/Consequences sections and `## Assumptions` callouts are withheld from the brief by design" → "Decision/Commitments sections and `## Revisit if` bullets are withheld from the brief by design".
- (~line 64): "title + ledger-relative basename ... `area:`/`topic:`/`decision:` line, reversibility, body gist" → "...`labels:`/`decision:` line, conviction, body gist".
- (~lines 68-70): "Consequences section body (the deliberately accepted constraints; usually under `## Consequences`)" → "Commitments section body (obligations the decision creates; usually under `## Commitments`)"; "Assumptions callouts in the body — `> [!warning]- <slug>` blocks contain **Revisit if:** lines" → "`## Revisit if` bullets in the body, each a flip condition".
- (~lines 72-75, audit criteria): "invalidate a Consequence the atom relied on?" → "invalidate a Commitment the atom relied on?".
- (~lines 122-127, "What you do NOT do"): drop "alias conflicts"; "taxonomy violations" → "label violations".

- [ ] **Step 2: Add binds-overlap ranking (rewrite the full_repo candidate-selection, ~line 60)**

Replace the undefined "named files/modules" heuristic with:

```markdown
Rank candidate atoms for the diff by `binds:` overlap. For each current head, test
its `binds:` glob patterns against the changed file set (working tree, branch range,
or full repo). An atom whose globs match one or more changed files is a candidate,
ranked by match count. Atoms with empty `binds:` are lower-priority candidates,
included only when the diff touches an area their Decision/Commitments text names.
```

- [ ] **Step 3: Add absence-vs-contradiction classification (in the per-atom audit criteria, ~lines 72-75)**

Add this criterion and filtering rule:

```markdown
Classify each candidate hit before recording it:

- **contradiction** — the current code actively conflicts with the atom's Decision
  or a Commitment (the code does X; the decision says not-X). This is drift; record
  it in `divergences`.
- **absence** — the atom decided something not yet built; the governed code simply
  does not exist yet. This is a normal state ("decided, not yet built"), NOT drift.
  Do NOT record absence in `divergences`. No ledger field tracks build state; work
  tracking belongs in the ticket system.

Method step 5 filters absence out before assembling `divergences` — an absent-code
atom produces no finding at all, not a low-severity one.
```

Optionally add a `"kind": "contradiction"` field to each `divergences` entry in the output JSON example (~lines 90-118) to make the classification explicit; `absence` never appears there.

- [ ] **Step 4: Verify + commit**

```bash
rg -n -e '\[!info\]|\[!warning\]' -e '## Assumptions|## Consequences' \
   -e '\breversibility\b' -e '\baliases\b' -e 'revisit_triggers' \
   -e 'hybrid.?altitude' -e 'ndr:#|#slug' -e 'area/topic' \
   -e '^\s*area:|^\s*topic:' -e '\[\[Decisions/' \
   plugins/ndr/agents/ndr-drift-auditor.md
git add plugins/ndr/agents/ndr-drift-auditor.md
git commit -m "docs: drift-auditor ranks by binds overlap and splits absence from contradiction"
```

Expected: no output.

---

### Task 6: ndr-reader, ndr-curator, ndr-extractor agents (moderate)

**Files:**
- Modify: `plugins/ndr/agents/ndr-reader.md`
- Modify: `plugins/ndr/agents/ndr-curator.md`
- Modify: `plugins/ndr/agents/ndr-extractor.md`

**Interfaces:**
- Produces: `ndr-reader` briefs (two grains, new sections); `ndr-curator` health report (drop `alias_drift`, rename `taxonomy`->`labels`); `ndr-extractor` candidates (`suggested_labels` array, plain-string project, atom-shape self-detection).

- [ ] **Step 1: Edit `plugins/ndr/agents/ndr-reader.md`**

- (~lines 4-11 description): "structured reference (atom-id, #slug, area/topic)" → "structured reference (atom-id, label)".
- (~lines 42-43): "the caller's scope makes a head's full body relevant — `## Assumptions`, Consequences, reasoning" → "...`## Revisit if`, Commitments, reasoning".
- (~line 51): `ndr resolve '<id|#slug|area/topic>'` → `ndr resolve '<id|label>'`.
- (~line 52): "(Decision/Consequences/Assumptions)" → "(Decision/Commitments/Revisit if)".
- (~line 55): `ndr current [--area <a>] [--topic <t>] [--verbose]` → `ndr current [--label <l>] [--verbose]`.
- (~line 74): "<bullets — any of: scope/project, area, topic, ref, file path, cwd>" → "<bullets — any of: scope/project, label, ref, file path, cwd>".
- (~lines 113-114): "terms or an area/topic pair. A file path hints area words (`src/auth/` → `auth`)." → "terms or a label. A file path hints candidate labels via `binds:` glob overlap.".
- (~lines 116-117): `ndr current --area X --topic Y` / `ndr resolve 'area/topic'` → `ndr current --label X` / `ndr resolve '<label>'`.
- (~line 122 heading): "Surface assumptions when relevant." → "Surface revisit conditions when relevant."
- (~line 125): "lift its `## Assumptions` callouts into the brief:" → "lift its `## Revisit if` bullets into the brief:".
- (~lines 128-130 template block): replace the `⚠ Assumption to revisit: <slug> — <description> / Revisit if: / Current state:` triad with a single line: `⚠ Revisit if: <condition>`.

- [ ] **Step 2: Edit `plugins/ndr/agents/ndr-curator.md`**

**CLI ground truth (verified against merged `src/`):** `ndr doctor --json` emits `issues` keyed by `CheckClass`, which is still literally named `taxonomy` (it validates labels now). The removed class is `alias_drift`; the ADDED classes are `binds_stale` and `context_section`. So the curator must KEEP the `taxonomy` key, DELETE `alias_drift`, and ADD `binds_stale` + `context_section`. Do NOT rename `taxonomy` to `labels` — the curator mirrors the doctor JSON, and the doctor emits `taxonomy`.

- (~line 3 sweep list): drop "alias drift"; add "stale binds" and "context section"; "taxonomy violations" → "taxonomy (label) violations".
- (~lines 51-58 JSON `issues` shape): delete the `"alias_drift": []` key; ADD `"binds_stale": []` and `"context_section": []`; KEEP `"taxonomy": []` unchanged.
- (~line 66): delete "(alias-drift entries carry slug / holders instead of a single path)".
- (~line 69): delete the "alias_drift — high; slug resolution becomes ambiguous..." bullet; ADD severity bullets: "binds_stale — low; a glob matched nothing, code likely moved/deleted (owned by drift-check for semantic drift)." and "context_section — low-medium; a migrated atom missing real `## Context` (placeholder-only is advisory)."
- (~line 72): "taxonomy — low-medium; usually a vocabulary decision (add to taxonomy vs. fix the atom)" → "taxonomy — low-medium; a label not in `labels.yaml`; usually a vocabulary decision (add to `labels.yaml` vs. fix the atom)".

- [ ] **Step 3: Edit `plugins/ndr/agents/ndr-extractor.md`**

- (~line 32): "Taxonomy snapshot (optional). Current `area:` / `topic:` values from `<ledger>/.taxonomy/{areas,topics}.yaml`." → "Labels snapshot (optional). Current labels from `<ledger>/.taxonomy/labels.yaml`."
- (~lines 63-64 example JSON): `"suggested_area": "tooling", "suggested_topic": "substrate"` → `"suggested_labels": ["tooling", "substrate"]`; `"suggested_project": "[[Auth Rewrite]]"` → `"suggested_project": "Auth Rewrite"`.
- (~line 84): "`suggested_area`, `suggested_topic` — your best guess... prefix with `NEW:`" → "`suggested_labels` — array of 1-4 best guesses from the labels snapshot. If you'd want a value not in the snapshot, prefix that entry with `NEW:` (e.g. `\"NEW: alerting\"`)."
- (~line 85): "`suggested_project` — wikilink form if obvious from context; otherwise null." → "`suggested_project` — plain-string name if obvious from context; otherwise null."
- (~line 95, the "already an atom" guard): replace "The source is itself an existing decision atom (frontmatter starts with `tags: [decision]`)" with "The source is itself an existing decision atom — detect by its frontmatter shape: a `status:` field alongside `decision_date:` (and, on disk, a minted `id:`). No tag is needed; an atom is identified by its frontmatter signature." Keep the `skipped: [{"reason": "source is already a decision atom"}]` return.

- [ ] **Step 4: Verify + commit**

```bash
rg -n -e '\[!info\]|\[!warning\]' -e '## Assumptions|## Consequences' \
   -e '\breversibility\b' -e '\baliases\b|alias_drift' -e 'revisit_triggers' \
   -e 'hybrid.?altitude' -e 'ndr:#|#slug' -e 'area/topic|suggested_area|suggested_topic' \
   -e 'tags: \[decision\]|--area|--topic' -e '\[\[Decisions/' -e 'ndr areas|ndr topics' \
   plugins/ndr/agents/ndr-reader.md plugins/ndr/agents/ndr-curator.md plugins/ndr/agents/ndr-extractor.md
git add plugins/ndr/agents/ndr-reader.md plugins/ndr/agents/ndr-curator.md plugins/ndr/agents/ndr-extractor.md
git commit -m "docs: reader/curator/extractor speak two grains, labels, and new sections"
```

Expected: no output.

---

### Task 7: capture-decision skill (heavy)

**Files:**
- Modify: `plugins/ndr/skills/capture-decision/SKILL.md`

**Interfaces:**
- Consumes: the drafter contract (Task 3), the labels taxonomy.
- Produces: the write pipeline — labels preflight (was area+topic), two-write supersession (was three with alias handover), no slug-minting.

- [ ] **Step 1: Description + hard rules**

- (~line 3 description): "the three-write supersession transaction" → "the two-write supersession transaction".
- (~line 41): "**Taxonomy enforcement.** `area:` and `topic:` must come from `<ledger>/.taxonomy/{areas,topics}.yaml`. Unknown values trigger \"use existing or add new?\" before drafting." → "**Labels enforcement.** `labels:` (1-4 values) must come from `<ledger>/.taxonomy/labels.yaml`. Unknown values trigger \"use existing or add new?\" before drafting."
- (~line 42): "Length is managed by hybrid altitude callouts inside the file." → "Length is managed by the fixed section shape in the body template (single altitude, plain markdown, no callouts)."
- (~lines 44-45): **delete** hard rules for lazy slug minting and slug uniqueness (the `ndr-` prefix rule and the `ndr resolve '#<slug>'` uniqueness probe). Renumber remaining rules; verify the supersession-refusal rule that line ~129 references by number still resolves (adjust the cross-reference if the number shifted).
- (~line 54): "`<ledger>/.taxonomy/{areas,topics}.yaml`" → "`<ledger>/.taxonomy/labels.yaml`".

- [ ] **Step 2: Step 3 + Step 4 (preflight)**

- (~line 114): "revises a prior decision; which one? (id, slug, or wikilink)" → "revises a prior decision; which one? (atom id)".
- (~line 126): "`supersedes:` list (wikilinks like `[[Decisions/0042-...]]`)" → "`supersedes:` list (plain atom ids like `[\"0042\"]`)".
- (~line 127): delete "Whether to mint a slug (default no).".
- Step 4 (~lines 131-141): retitle "Taxonomy preflight" → "Labels preflight"; "suggest an `area:` and `topic:`... Read `<ledger>/.taxonomy/{areas,topics}.yaml`" → "suggest 1-4 `labels:`... Read `<ledger>/.taxonomy/labels.yaml`"; the prompt example `"<value>" is not in <areas.yaml | topics.yaml>.` → `"<value>" is not in labels.yaml.`; "Edit the relevant YAML file" → "Edit `labels.yaml`".

- [ ] **Step 3: Step 5 payload**

- (~lines 148-166 JSON): `"suggested_area": "tooling", "suggested_topic": "substrate",` → `"suggested_labels": ["tooling", "substrate"],`; `"suggested_project": "[[Auth Rewrite]]",` → `"suggested_project": "Auth Rewrite",`; `"derived_from": ["[[<chat / mull source>]]"],` → `"derived_from": ["<chat / mull source path or ref>"],`; `"project": "[[Auth Rewrite]]",` → `"project": "Auth Rewrite",`; **delete** `"mint_slug"` and `"slug"` keys; **add** `"conviction": "tentative"` and `"binds": []` (the drafter needs conviction; binds is optional).

- [ ] **Step 4: Output + supersession examples**

- (~line 231): "area: tooling, topic: substrate" → "labels: [tooling, substrate]".
- (~lines 235-250, "Revising decision with alias handover" example): retitle "### Revising decision"; `area: architecture, topic: repo-shape` → `labels: [architecture, repo-shape]`; `supersedes: ["[[Decisions/0011-monorepo-symmetric-apps-layout]]"]` → `supersedes: ["0011"]`; **delete** the `aliases: [ndr-monorepo-shape] (moved from 0011)` line; `superseded_by: [] → ["[[Decisions/v8t2ne-...]]"]` → `superseded_by: [] → ["v8t2ne"]`; **delete** the `aliases: [ndr-monorepo-shape] → []` line.
- (~lines 262-275, "Half-state" example): delete the `Aliases moved: [...]` line; `Patch failed on: [[Decisions/0011-...]]` → `Patch failed on: 0011-monorepo-symmetric-apps-layout.md`; `append "[[Decisions/v8t2ne-...]]" to superseded_by, clear aliases: [].` → `append "v8t2ne" to superseded_by.`.

- [ ] **Step 5: Verify + commit**

```bash
rg -n -e '\[!info\]|\[!warning\]' -e '## Assumptions|## Consequences' \
   -e '\breversibility\b' -e '\baliases\b|mint_slug|\bslug\b' -e 'revisit_triggers' \
   -e 'hybrid.?altitude' -e 'ndr:#|#slug' -e 'area/topic|suggested_area|suggested_topic' \
   -e '^\s*area:|^\s*topic:|three-write' -e '\[\[Decisions/' -e 'ndr areas|ndr topics' \
   plugins/ndr/skills/capture-decision/SKILL.md
git add plugins/ndr/skills/capture-decision/SKILL.md
git commit -m "docs: capture-decision runs labels preflight and two-write supersession"
```

Expected: no output.

---

### Task 8: decisions + ground skills (grain/section renames)

**Files:**
- Modify: `plugins/ndr/skills/decisions/SKILL.md`
- Modify: `plugins/ndr/skills/ground/SKILL.md`

**Interfaces:**
- Consumes: two-grain resolution (`ndr resolve <atom-id|label>`, `ndr current --label`), new body sections.

- [ ] **Step 1: Edit `plugins/ndr/skills/decisions/SKILL.md`**

- (~line 3): "Parses the argument (atom-id, slug, area/topic, or free-text)" → "(atom-id, label, or free-text)".
- (~line 33): "Why / Alternatives / Consequences / `## Assumptions` are withheld" → "`## Scope` / `## Commitments` / `## Revisit if` / `## Context` / `## Why` / `## Alternatives` are withheld".
- (~lines 62-66 Inputs): delete the **slug** (`#monorepo-shape`) and **area/topic** bullets; add one **label** bullet (a value from `labels.yaml`); update the empty-prompt example `` `0011`, `#monorepo-shape`, `architecture/repo-shape`, `auth substrate` `` → `` `0011`, `auth-substrate`, `auth substrate` ``.
- (~line 69): "`ndr:0011`, `ndr:#monorepo-shape`, and `ndr:architecture/repo-shape` are all valid." → "`ndr:0011` and `ndr:auth-substrate` are all valid.".
- (~lines 78-82 Stage 0 table): delete the slug row (`starts with #`) and the area/topic row; add one label row: `matches a value in labels.yaml, no whitespace | label | ndr resolve '<label>' (add --verbose for full briefs)`.
- (~lines 141-142 output example): "area: substrate, topic: substrate, decision: 2026-05-28 / reversibility: easy" → "labels: [substrate], decision: 2026-05-28 / conviction: strong".
- (~line 150): "- ndr:substrate/substrate" → "- ndr:substrate".
- (~lines 153-156): "Why, Alternatives, Consequences, `## Assumptions`" → "Scope, Commitments, Revisit if, Context, Why, Alternatives".
- (~lines 159-165 "Topic resolution" example): retitle "Label resolution"; "**Current decisions on \"architecture/repo-shape\":**" → "**Current decisions labeled \"repo-shape\":**".

- [ ] **Step 2: Edit `plugins/ndr/skills/ground/SKILL.md`**

- (~lines 97-99): "`area` / `topic` words — from `$ARGUMENTS`..." → "`label` words — from `$ARGUMENTS`...".
- (~line 110 query table): "`ndr:` ref (atom-id, `#slug`, `area/topic`)" → "`ndr:` ref (atom-id, `label`)".
- (~line 111): "area (± topic) word matching taxonomy | `ndr current --area <area> [--topic <topic>] --verbose`" → "label word matching taxonomy | `ndr current --label <label> --verbose`". (Flag `--label` is confirmed from Plan 1 Task 8.)
- (~line 175 output example): "**NDR grounding** (`auth` in `[[Apex]]`):" → "**NDR grounding** (`auth` in `Apex`):".
- (~line 178): "area: auth, topic: substrate, decision: 2026-04-18" → "labels: [auth, substrate], decision: 2026-04-18".
- (~line 179): "reversibility: hard" → "conviction: strong".
- (~lines 185-188 References block): "- ndr:0042 / - ndr:#auth-substrate / - ndr:auth/substrate" → "- ndr:0042 / - ndr:auth / - ndr:substrate".
- (~lines 190-194 Assumption callout example): replace with a single `## Revisit if` line: `⚠ Revisit if: this product surface moves to a tenant outside the company.` (drop the assumption-name / current-state framing).
- (~lines 201-205 batch table Ref column): `ndr:#monorepo-shape` / `ndr:#ci-strategy` → `ndr:0011` / `ndr:0021` (atom-id or label refs; no slug grain).
- (~line 221 hard rule): "a head's full body (assumptions, consequences, reasoning)" → "a head's full body (commitments, revisit conditions, reasoning)".

- [ ] **Step 3: Verify + commit**

```bash
rg -n -e '\[!info\]|\[!warning\]' -e '## Assumptions|## Consequences' \
   -e '\breversibility\b' -e '\baliases\b|#slug|ndr:#' -e 'revisit_triggers' \
   -e 'hybrid.?altitude' -e 'area/topic|--area|--topic' \
   -e '^\s*area:|^\s*topic:' -e '\[\[Decisions/|\[\[Apex\]\]' -e 'ndr areas|ndr topics' \
   plugins/ndr/skills/decisions/SKILL.md plugins/ndr/skills/ground/SKILL.md
git add plugins/ndr/skills/decisions/SKILL.md plugins/ndr/skills/ground/SKILL.md
git commit -m "docs: decisions/ground skills resolve two grains and read new sections"
```

Expected: no output.

---

### Task 9: drift-check + interrogate-decision skills

**Files:**
- Modify: `plugins/ndr/skills/drift-check/SKILL.md`
- Modify: `plugins/ndr/skills/interrogate-decision/SKILL.md`

**Interfaces:**
- Produces: `drift-check` gains a `binds:`-overlap signal alongside the label hint; `interrogate-decision` routes reversibility content to `## Commitments` + `conviction`.

- [ ] **Step 1: Edit `plugins/ndr/skills/drift-check/SKILL.md`**

- (~line 54 section title): "### 3. Detect repo area hint (optional)" → "### 3. Detect repo label hint (optional)".
- (~lines 55-56): "which `area:` values are relevant (e.g. \"this repo's decisions live under `area: tooling`\"). If found, pass as `area_filter`" → "which `labels:` values are relevant (e.g. \"this repo's decisions live under label `tooling`\"). If found, pass as `label_filter`".
- (~line 70 JSON payload): `"area_filter": "<optional area>"` → `"label_filter": "<optional label>"`.
- **New content** — add a binds step after the label-hint step:

```markdown
### 3b. Pass the changed-file set for binds ranking

The `ndr-drift-auditor` ranks candidate atoms by `binds:` glob overlap against the
diff (ndr:binds semantics). Include the changed-file list in the dispatch payload
as `"changed_files"` so the auditor can select and rank candidates by which atoms'
`binds:` globs match the diff, rather than by label filter alone. The auditor also
splits **contradiction** (code conflicts with a decision — a finding) from
**absence** (decided-but-not-yet-built code — not a finding); expect absence hits
to be excluded from the returned `divergences`.
```

- [ ] **Step 2: Edit `plugins/ndr/skills/interrogate-decision/SKILL.md`**

- (~line 79 Move 5): "This *is* the justification for the atom's `reversibility:` field — capture it so the field isn't a guess." → "This *is* the source material for a `## Commitments` bullet when the recovery cost is asymmetric enough to bind future work, and it informs the atom's `conviction:` rating.".
- (~line 81 Move 6): "the early-warning sign (→ future `## Assumptions` revisit triggers)" → "the early-warning sign (→ future `## Revisit if` conditions)".
- (~line 99 Step 10 handoff): "the `reversibility:` justification (Step 5)" → "the `conviction:` rating and any `## Commitments` bullet (Step 5)"; "the revisit triggers (Step 6)" → "the `## Revisit if` conditions (Step 6)".
- (~line 117 output example): "→ favors split. reversibility: easy." → "→ favors split. conviction: strong.".

- [ ] **Step 3: Verify + commit**

```bash
rg -n -e '\[!info\]|\[!warning\]' -e '## Assumptions|## Consequences' \
   -e '\breversibility\b' -e '\baliases\b|#slug' -e 'revisit_triggers' \
   -e 'hybrid.?altitude' -e 'area_filter|area/topic' -e '^\s*area:|^\s*topic:' \
   plugins/ndr/skills/drift-check/SKILL.md plugins/ndr/skills/interrogate-decision/SKILL.md
git add plugins/ndr/skills/drift-check/SKILL.md plugins/ndr/skills/interrogate-decision/SKILL.md
git commit -m "docs: drift-check ranks by binds; interrogate-decision routes to commitments/conviction"
```

Expected: no output.

---

### Task 10: Migrate seed decision atoms + produce labels.yaml

**Files:**
- Modify (in place, migrated): `plugins/ndr/assets/decisions/0001-0008*.md`, `0049-0051*.md` (11 files)
- Create: `plugins/ndr/assets/taxonomy/labels.yaml`
- Delete: `plugins/ndr/assets/taxonomy/areas.yaml`, `plugins/ndr/assets/taxonomy/topics.yaml`

**Interfaces:**
- Consumes: the real `ndr migrate` CLI (Plan 1, Task 10) and the `ndr-migrator` agent (Task 13 — **this task depends on Task 13 shipping the agent first**; reorder if executing strictly in-session, or hand-reshape bodies against `decision-single.md` if the agent isn't available yet).
- Produces: 11 new-format seed atoms (all `status: current`) and the seed `labels.yaml`.

> The seed taxonomy in this plugin lives at `assets/taxonomy/` (a packaging convention), NOT at `assets/decisions/.taxonomy/`. `ndr migrate` seeds `labels.yaml` into the ledger's own `.taxonomy/`, so we point it at a copy, then move the generated file to the packaging location.

- [ ] **Step 1: Build the binary and stage a migratable ledger**

```bash
bun run build   # produces dist/ndr
mkdir -p plugins/ndr/assets/decisions/.taxonomy
cp plugins/ndr/assets/taxonomy/areas.yaml plugins/ndr/assets/taxonomy/topics.yaml \
   plugins/ndr/assets/decisions/.taxonomy/
```

- [ ] **Step 2: Dry-run pass 1 to confirm all 11 are detected**

```bash
dist/ndr migrate --ledger plugins/ndr/assets/decisions --dry-run --json
```

Expected: JSON `migrated: 11, skipped: 0, failed: []`.

- [ ] **Step 3: Run pass 1 (mechanical frontmatter + callout flattening)**

```bash
dist/ndr migrate --ledger plugins/ndr/assets/decisions --json
```

Expected: `migrated: 11`. Each atom now has new-format frontmatter (plain-value refs, `labels` from area+topic+non-`decision` tags, `author` backfilled from git first-commit, `conviction: tentative`, killed fields removed) and callout-flattened bodies. `author` should resolve to `Jacob Hoehler` (first-commit author of each seed file in this repo).

- [ ] **Step 4: Relocate the generated labels.yaml to the packaging location**

```bash
mv plugins/ndr/assets/decisions/.taxonomy/labels.yaml plugins/ndr/assets/taxonomy/labels.yaml
rm -rf plugins/ndr/assets/decisions/.taxonomy
git rm plugins/ndr/assets/taxonomy/areas.yaml plugins/ndr/assets/taxonomy/topics.yaml
```

Read `plugins/ndr/assets/taxonomy/labels.yaml` and confirm it contains the deduped union of the old axes plus the `meta-chain` stray tag: `process, tooling, scope, substrate, read-side, write-side, granularity, mvp-scope, test-method, discipline, referencing, supersession, meta-chain` (exact set depends on what the 11 atoms carried; `meta-chain` MUST be present — every seed atom used it). If `meta-chain` is missing, add it by hand (it was a `tags` value, not an area/topic, so the union only picks it up from atom `labels` after migration).

- [ ] **Step 5: Pass 2 — reshape bodies via `ndr-migrator`**

Dispatch the `ndr-migrator` agent (Task 13) with the absolute paths of all 11 migrated files (one batch is fine — 11 is within the ~8-10 guidance, or split 6+5). Apply each returned body with the Edit tool. The agent extracts `## Context`, filters old Consequences into `## Commitments`, converts Assumptions into `## Revisit if`, merges gist+callout duplication into single `## Why` prose, and reorders sections. Atoms `0049/0050/0051` keep `status: current` — do not add `superseded_by` (Plan 3 owns that).

For `0005` specifically (it carried a non-standard `## Status` section noting its own supersession): fold that content into `## Context` or drop it — `status:`/`superseded_by:` frontmatter already carries supersession state.

- [ ] **Step 6: Grade each atom with `ndr-reviewer` (audit mode)**

Dispatch `ndr-reviewer` (Task 4) in audit mode against each of the 11 file paths. Fix any blocking findings (section order, missing `## Context`, callout residue). A `placeholder_context` advisory is acceptable only if an atom's pre-decision context genuinely can't be reconstructed (it then carries `- (not reconstructed at migration)`); the A-H seed atoms have real context and should not need the placeholder.

- [ ] **Step 7: Validate against the strict schema via a scratch ledger**

```bash
SMOKE=/tmp/ndr-seed-smoke
rm -rf "$SMOKE"; mkdir -p "$SMOKE/decisions/.taxonomy"
cp plugins/ndr/assets/decisions/*.md "$SMOKE/decisions/"
cp plugins/ndr/assets/taxonomy/labels.yaml "$SMOKE/decisions/.taxonomy/labels.yaml"
printf 'ledger = "./decisions"\nproject = "ndr"\n' > "$SMOKE/.ndr.toml"
(cd "$SMOKE" && /Users/jacob/Projects/ndr/dist/ndr doctor --json)
```

Expected: exit 0; no `malformed`, `missing_fields`, `missing_context`, or `taxonomy` findings. `binds_stale` may fire (seed atoms have empty `binds:`, so none) — empty binds produce no finding. Chain-integrity for `0005`<->`0007` supersession should be intact.

- [ ] **Step 8: Commit**

```bash
git add plugins/ndr/assets/decisions plugins/ndr/assets/taxonomy/labels.yaml
git commit -m "refactor: migrate seed decision atoms and taxonomy to the new format"
```

---

### Task 11: Bootstrap, plugin README, project-snippet — remove base, adopt labels

**Files:**
- Delete: `plugins/ndr/assets/bases/current-decisions.base`
- Modify: `plugins/ndr/skills/ndr-bootstrap/SKILL.md`
- Modify: `plugins/ndr/README.md`
- Modify: `plugins/ndr/assets/project-snippet/project-claude-md.md`

**Interfaces:**
- Consumes: `labels.yaml` (Task 10).
- Produces: a bootstrap that copies `labels.yaml` (not areas/topics), never copies the deleted base, and describes the new body shape; a README and project-snippet that speak two grains and the new field set.

- [ ] **Step 1: Delete the base asset**

```bash
git rm plugins/ndr/assets/bases/current-decisions.base
```

(The base is pure Obsidian rendering with no consumer — user decision 2026-07-09. If `plugins/ndr/assets/bases/` is now empty, `git rm` leaves no directory; nothing else to do.)

- [ ] **Step 2: Edit `plugins/ndr/skills/ndr-bootstrap/SKILL.md`**

- (~line 3 description): "the \"Current Decisions\" Obsidian Base, and the initial taxonomy YAML files" → "and the initial `labels.yaml` taxonomy file" (drop the base mention entirely).
- (~line 13 "Four things land"): retitle to "Three things land" and remove item 2 (the Current Decisions Base).
- (~line 17): "**Taxonomy YAML** (`assets/taxonomy/areas.yaml`, `topics.yaml`)" → "**Taxonomy YAML** (`assets/taxonomy/labels.yaml`)".
- (~lines 67-76): **delete** the entire "# base" copy block (`base_dst=...` through its `fi`).
- (~line 79): `for yaml in areas.yaml topics.yaml; do ... done` → a single inline copy of `labels.yaml` (mirror the `snippet_dst` block's shape):

```bash
# taxonomy
labels_src="$PLUGIN_ASSETS/taxonomy/labels.yaml"
labels_dst="$VAULT_TAXONOMY/labels.yaml"
if [ -e "$labels_dst" ]; then
  echo "skipped (exists): Decisions/.taxonomy/labels.yaml"
  skipped=$((skipped+1))
else
  cp "$labels_src" "$labels_dst"
  echo "copied: Decisions/.taxonomy/labels.yaml"
  copied=$((copied+1))
fi
```

- (~lines 115-127 fresh-machine output example): drop the `copied: Bases/Current Decisions.base` line; replace the two `areas.yaml`/`topics.yaml` lines with one `copied: Decisions/.taxonomy/labels.yaml`; the atom list should show all 11 (0001-0008, 0049-0051) if you want it accurate, or keep it illustrative.
- (~line 129): "bootstrap complete: 12 copied, 0 skipped" → recompute: 11 atoms + 1 labels.yaml + 1 project template = **13 copied** (base removed). Set to "13 copied, 0 skipped".
- (~line 140): "bootstrap complete: 0 copied, 12 skipped" → "0 copied, 13 skipped".
- (~line 146): "as examples of the hybrid altitude body shape" → "as examples of the new atom body shape".
- Remove any remaining "Base" mention in the Notes section (the suggestion to open the base in Obsidian, ~line 109 / ~124).

- [ ] **Step 3: Edit `plugins/ndr/README.md`**

- (~lines 42-44 Install bullets): "Each atom uses a **hybrid-altitude body**: a heading + one-line gist for every section, with deeper texture in default-collapsed `[!info]-` / `[!warning]-` callouts..." → "Each atom uses a **single-altitude body**: fixed sections (Decision, Scope, Commitments, Revisit if, Context, Why, Alternatives) in plain markdown, each written once at the length it deserves — no callouts.".
- (~lines 47-48): "Taxonomy (`area:`, `topic:`) lives at `<ledger>/.taxonomy/{areas,topics}.yaml`." → "Taxonomy (`labels:`) lives at `<ledger>/.taxonomy/labels.yaml`.".
- (~lines 89-90 plugin layout tree): the `areas.yaml` / `topics.yaml` lines → single `labels.yaml`; **delete** the `bases/current-decisions.base` line.
- (~lines 103-120 Conventions):
  - "**Hybrid-altitude body.** Each section: heading + one-sentence gist + (optional) default-collapsed callout." → "**Single-altitude body.** Fixed sections in plain markdown; content written once per section; no callouts.".
  - "**Required frontmatter.** ... (`title`, `status`, `decision_date`, `project`, `area`, `topic`, `reversibility`)." → "...(`title`, `status`, `decision_date`, `author`, `conviction`, `project`, `labels`; `supersedes:` presence-required).".
  - "**Finite taxonomy.** `area:` and `topic:` are validated against `<ledger>/.taxonomy/*.yaml`." → "**Finite taxonomy.** `labels:` are validated against `<ledger>/.taxonomy/labels.yaml`.".
  - "**Reference convention.** ... atom-id (...), slug (`ndr:#monorepo-shape`, follows supersession via the atom's `aliases:` field), or topic (`ndr:architecture/repo-shape`, area-grain)." → "**Reference convention.** Two grains: atom-id (`ndr:0042`, historical anchor; resolve walks to head) and label (`ndr:<label>`, all current heads carrying that label).".

- [ ] **Step 4: Edit `plugins/ndr/assets/project-snippet/project-claude-md.md`**

- (~lines 37-50 "### Pointing at decisions from code"): replace the three-grain list (`ndr:0042` atom-id / `ndr:#auth-substrate` slug / `ndr:auth/substrate` area-topic) with the two-grain version — mirror the `NDR_RULE` template's "Pointing at decisions from code" block (`src/cli/templates.ts` lines 60-70): `ndr:0042` (frozen atom-id, walks to head) and `ndr:<label>` (all current atoms carrying that label). (The top HTML comment already points at `NDR_RULE` as the sync source — keep it.)

- [ ] **Step 5: Verify + commit**

```bash
rg -n -e '\[!info\]|\[!warning\]' -e '## Assumptions|## Consequences' \
   -e '\breversibility\b' -e '\baliases\b|#slug|ndr:#' -e 'revisit_triggers' \
   -e 'hybrid.?altitude' -e 'area/topic' -e '^\s*area:|^\s*topic:' \
   -e 'current-decisions\.base|Current Decisions.base|areas\.yaml|topics\.yaml' \
   plugins/ndr/skills/ndr-bootstrap/SKILL.md plugins/ndr/README.md plugins/ndr/assets/project-snippet/project-claude-md.md
git add -A plugins/ndr/skills/ndr-bootstrap plugins/ndr/README.md plugins/ndr/assets/project-snippet
git commit -m "docs: bootstrap/README/snippet drop the base and adopt labels + new body shape"
```

Expected: no output.

---

### Task 12: Regenerate this repo's grounding rule + fix NDR_RULE leftover

**Files:**
- Modify: `src/cli/templates.ts` (the `NDR_RULE` constant, ~line 78)
- Modify: `.claude/rules/ndr.md` (this repo's stale rule)

**Interfaces:**
- Consumes: the `NDR_RULE` template (already new-format except one phrase).
- Produces: a `.claude/rules/ndr.md` byte-identical to what `ndr init` would write today.

- [ ] **Step 1: Fix the stale phrase in the template**

In `src/cli/templates.ts`, the `NDR_RULE` constant's closing line (~line 78) reads "...writes the file with valid frontmatter and a hybrid-altitude body." Change "a hybrid-altitude body" → "a new-format body (single altitude, plain markdown)".

- [ ] **Step 2: Check for a snapshot test on NDR_RULE**

```bash
rg -n 'NDR_RULE|hybrid-altitude' src/
```

If any test asserts on `NDR_RULE` content containing "hybrid-altitude", update that expectation to match the new phrase. (Plan 1's templates work did not snapshot the full string, but confirm.)

- [ ] **Step 3: Regenerate `.claude/rules/ndr.md` from the template**

Rewrite `/Users/jacob/Projects/ndr/.claude/rules/ndr.md` to match the `NDR_RULE` constant body (everything between the backtick-delimited template, with `\`` unescaped to `` ` ``). Concretely, the file must become — frontmatter description line, `# NDR coverage` heading, the plain-`project:` intro (not `project: [[<this-repo>]]`), the two-grain "Pointing at decisions from code" block, and the closing "new-format body" phrasing. The current file's old markers to replace: `project: [[<this-repo>]]` intro (~line 9), the "Three resolvable grains" block with `ndr:#auth-substrate` and `ndr:auth/substrate` (~lines 30-45), and "hybrid-altitude body" (~line 78-equivalent).

The fastest correct method: build the binary and let `ndr init` write it into a scratch dir, then copy:

```bash
bun run build
SMOKE=/tmp/ndr-rule-smoke; rm -rf "$SMOKE"; mkdir -p "$SMOKE"
(cd "$SMOKE" && /Users/jacob/Projects/ndr/dist/ndr init --project ndr >/dev/null 2>&1 || true)
cp "$SMOKE/.claude/rules/ndr.md" /Users/jacob/Projects/ndr/.claude/rules/ndr.md
```

Then read the copied file and confirm it carries the two-grain block and no `[[<this-repo>]]` / `#slug` / `area/topic` / `hybrid-altitude`. (If `ndr init` refuses because `$SMOKE` isn't a git repo or already has config, generate the file by hand-transcribing the `NDR_RULE` constant body instead.)

- [ ] **Step 4: Run the code gate**

```bash
bun test && bun run typecheck && bun run lint && bun run format:check
```

Expected: all pass (only the `NDR_RULE` string changed; if a test snapshots it, Step 2 already fixed the expectation).

- [ ] **Step 5: Verify + commit**

```bash
rg -n -e 'hybrid.?altitude' -e 'ndr:#|#slug' -e 'area/topic' -e '\[\[<this-repo>\]\]|\[\[' \
   .claude/rules/ndr.md src/cli/templates.ts
git add src/cli/templates.ts .claude/rules/ndr.md
git commit -m "docs: regenerate ndr grounding rule to two grains; fix NDR_RULE body phrasing"
```

Expected: no output.

---

### Task 13: New retirable tooling — migrate-ledger skill + ndr-migrator agent

**Files:**
- Create: `plugins/ndr/skills/migrate-ledger/SKILL.md`
- Create: `plugins/ndr/agents/ndr-migrator.md`

**Interfaces:**
- Consumes: `ndr migrate` (pass 1), `ndr-reviewer` (Task 4), `ndr doctor`, the new body template (Task 1).
- Produces: the orchestration + per-atom body-reshaping tooling used by Task 10 and by Plan 3's live-ledger migrations. Both are **retirable** — deleted once every ledger is converted.

> Task 10 depends on the `ndr-migrator` agent from this task. When executing subagent-driven, run Task 13 BEFORE Task 10 (or, if Task 10 runs first, hand-reshape the 11 seed bodies against `decision-single.md`). The plan lists Task 10 earlier for narrative grouping with the other assets; reorder execution as needed.

- [ ] **Step 1: Create `plugins/ndr/skills/migrate-ledger/SKILL.md`**

```markdown
---
name: migrate-ledger
description: One-time, retirable migration of an NDR ledger from the old atom format (Obsidian callouts, area/topic, aliases, wikilinks) to the new repo-native format (labels, conviction, author, binds, single-altitude body). Use when the user says "migrate the ledger", "run the ndr migration", "convert this ledger to the new format", or points at a repo whose `decisions/` are still old-format. Orchestrates the full two-pass sequence: mechanical `ndr migrate` (pass 1), Claude-driven body reshaping in batches (pass 2), a `ndr doctor` acceptance sweep, and one reviewable PR. Runs once per ledger, then this skill and the `ndr-migrator` agent are deleted from the plugin.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Edit
  - Task
---

# migrate-ledger

## Overview

Convert one NDR ledger to the new atom format. Two passes:

1. **Pass 1 — mechanical (`ndr migrate`).** Frontmatter conversion (wikilinks ->
   plain values; area+topic+tags -> labels; backfill author from git history and
   conviction: tentative; drop killed fields) and callout flattening. Idempotent.
2. **Pass 2 — judgment (`@ndr-migrator`).** Per-atom body reshaping: extract
   `## Context`, filter old Consequences into real `## Commitments`, convert
   Assumptions into `## Revisit if`, merge gist+callout duplication into single
   prose, reorder sections, upgrade conviction where the Why makes strength obvious.

This skill is **retirable**: once every tracked ledger is migrated, delete this
skill and `agents/ndr-migrator.md` from the plugin. The `ndr migrate` CLI command
stays (it is idempotent and harmless); the pass-2 tooling does not.

This skill is `disable-model-invocation: true` — it fires only on explicit
`/migrate-ledger`.

## When to invoke

- A repo's `decisions/` ledger is still old-format (callouts, `area:`/`topic:`,
  `aliases:`, wikilink refs) and needs converting to the new format.
- Run once per ledger across the tracked repos.

## When NOT to invoke

- The ledger is already new-format (`ndr doctor` is clean, atoms carry
  `conviction:`/`labels:`). Re-running pass 1 is safe (idempotent) but pass 2 is
  wasted work.
- You only want the mechanical pass — call `ndr migrate` directly.

## Method

### Step 0 — Locate the ledger and confirm it is old-format

    ndr migrate --dry-run --json

The summary's `migrated` count is the number of old-format atoms pass 1 would
touch; `skipped` are already-new-format. If `migrated` is 0, stop — nothing to do.

### Step 1 — Pass 1 (mechanical)

    ndr migrate --json

This rewrites frontmatter in place, flattens callouts, seeds
`.taxonomy/labels.yaml` from the old areas+topics+stray tags, and removes the old
axis files. Commit as a discrete mechanical commit:

    git add -A && git commit -m "refactor: ndr migrate pass 1 (mechanical frontmatter + callout flattening)"

### Step 2 — Pass 2 (body reshaping, batched)

List the migrated atoms and dispatch `@ndr-migrator` in batches of ~8-10 files,
passing the absolute paths. The agent returns, per atom, the reshaped body
(frontmatter untouched). Apply each returned body with Edit.

### Step 3 — Quality gate per atom

For each reshaped atom, dispatch `@ndr-reviewer` in audit mode (pass the file path)
to grade atomicity and body shape against the new template. Fix blocking findings.

### Step 4 — Acceptance sweep

    ndr doctor --json

Expected: no `missing_context` findings; a `placeholder_context` advisory is
acceptable for atoms whose context genuinely couldn't be reconstructed. Resolve any
`taxonomy`, `missing_fields`, or `frontmatter_body_drift` findings.

### Step 5 — Assemble one reviewable PR

Commit pass 2 as a separate commit, push the branch, open a PR linking the redesign
spec. Keep pass 1 and pass 2 as distinct commits.

## Grandfathering

An atom whose Context genuinely can't be reconstructed keeps `## Context` with a
single bullet `- (not reconstructed at migration)`. Doctor treats a
placeholder-only Context as advisory, a missing Context as a finding. New captures
always require real Context.

## Notes

- Pass 1 is idempotent — safe to re-run. Pass 2 is one-time judgment work.
- Delete this skill and `ndr-migrator` once all ledgers are converted.
```

- [ ] **Step 2: Create `plugins/ndr/agents/ndr-migrator.md`**

```markdown
---
name: ndr-migrator
description: Retirable per-atom body reshaper for the one-time NDR format migration (pass 2). Given a batch of already-frontmatter-migrated atom files (pass 1 done by `ndr migrate`), rewrites each body from the old hybrid-altitude callout shape to the new single-altitude format — extracting Context, filtering Commitments, converting Revisit-if, reordering sections. Runs in isolated context so a full corpus of old prose doesn't swamp the orchestrator. Dispatched by the `migrate-ledger` skill in batches of ~8-10 atoms. Delete this agent once every ledger is migrated.
model: sonnet
color: orange
tools:
  - Read
---

# ndr-migrator

## Role

You reshape the **body** of migrated NDR atoms from the old format to the new one.
Pass 1 (`ndr migrate`) already converted frontmatter and flattened Obsidian callout
markers. Your job is pass 2: judgment-driven body restructuring. You are retirable —
this agent exists only until every ledger is migrated.

## Hard rules

1. **Never touch frontmatter.** Pass 1 owns it. Read it for context (labels,
   conviction, supersedes) but return only the reshaped body.
2. **Read each file with `Read`.** Do not call the `ndr` CLI or edit files — you
   return reshaped body text; the orchestrator applies it.
3. **Preserve substance, restructure form.** Every fact, reason, consequence, and
   assumption in the old body must land in the right new-format section — nothing
   invented, nothing silently dropped.
4. **ASCII-only** in prose you author (source quotes may keep their characters).

## New body format (target)

Section order, single altitude, plain markdown, no callouts:

    # <id> — <title>
    ## Decision
    ## Scope
    ## Commitments
    ## Revisit if
    ## Context
    ## Why
    ## Alternatives

| Section | Required | Shape |
| --- | --- | --- |
| `## Decision` | yes | Prose, 1-3 sentences (<= ~60 words). What is now true. No bullets. |
| `## Scope` | no | Bullets (`Binds:` / `Does not bind:`). Omit if implied by labels. |
| `## Commitments` | no | Bullets, one obligation the decision creates each. Never restates the decision. |
| `## Revisit if` | no | Bullets, pure flip conditions. |
| `## Context` | yes | Bullets, pre-decision facts. May NOT name the chosen option. |
| `## Why` | yes | Prose, roomy. The weighing, most-load-bearing-first. May not introduce new facts. |
| `## Alternatives` | no | Bullets: `**name** — verdict: reason`. |

## Reshaping rules (old -> new)

- **Merge gist + `Full reasoning`** (the old `## Why` gist line plus the flattened
  callout content that restated it) into a single `## Why` prose passage. Delete the
  duplication.
- **Extract `## Context`** from the old `Full reasoning` content: the pre-decision
  facts (what was true/broken/constrained). Move them to `## Context` as bullets.
  Context may not name the chosen option — a sentence that names the choice belongs
  in Decision or Why.
- **Filter old `## Consequences` into `## Commitments`.** Keep only bullets that
  state an obligation the decision *creates* (invariant, coupling, recurring cost,
  foreclosed option). Drop bullets that merely restate what the decision does.
- **Convert old `## Assumptions`** (slug list + per-slug warning blocks, now
  flattened) into `## Revisit if` — one bullet per flip condition (the `Revisit if:`
  line of each old assumption). Drop the restated-belief prose.
- **Reorder** to the target section order above.
- **Suggest a conviction upgrade** in `notes` when the Why makes the strength obvious
  (you cannot edit frontmatter, so surface it for the orchestrator).

## Grandfathering

If the old body carries no reconstructable pre-decision context, emit `## Context`
with a single bullet `- (not reconstructed at migration)`. This placeholder marker
is the grandfathering signal — doctor treats it as advisory. Do not fabricate
context to avoid the placeholder.

## Output format

Return strict JSON, one object per input file:

    {
      "atoms": [
        {
          "path": "/abs/path/to/0153-taxonomy-enforcement.md",
          "body": "# 0153 — Taxonomy enforcement\n\n## Decision\n\n...\n",
          "notes": "suggested conviction: strong — Why states it would be defended"
        }
      ]
    }

Use real newlines in the `body` string. `notes` is optional per atom.
```

- [ ] **Step 3: Verify + commit**

```bash
rg -n -e '\[!info\]|\[!warning\]' -e '## Assumptions|## Consequences' \
   -e '\breversibility\b' -e '\baliases\b|#slug' -e 'revisit_triggers' \
   -e 'area/topic' -e '^\s*area:|^\s*topic:' \
   plugins/ndr/skills/migrate-ledger/SKILL.md plugins/ndr/agents/ndr-migrator.md
git add plugins/ndr/skills/migrate-ledger plugins/ndr/agents/ndr-migrator.md
git commit -m "feat: retirable migrate-ledger skill and ndr-migrator agent for pass-2 reshaping"
```

Expected: no output. (The agent's `description` intentionally contains "hybrid-altitude callout shape" describing what it converts FROM — if the sweep flags it, exempt that one description line; it is not a format claim about output.)

---

### Task 14: Final verification — whole-plugin sweep and coherence

**Files:**
- No new files. Whole-tree acceptance.

- [ ] **Step 1: Whole-plugin old-format sweep**

```bash
rg -n -e '\[!info\]|\[!warning\]' -e '## Assumptions|## Consequences' \
   -e '\breversibility\b' -e '\baliases\b|alias_drift|mint_slug' -e 'revisit_triggers' \
   -e 'hybrid.?altitude' -e 'ndr:#|#<slug>' -e 'area/topic|suggested_area|suggested_topic' \
   -e '\[\[Decisions/|\[\[Auth Rewrite\]\]' -e 'ndr areas|ndr topics' \
   -e 'areas\.yaml|topics\.yaml|current-decisions\.base' \
   plugins/ndr .claude/rules/ndr.md src/cli/templates.ts
```

Expected: **no output.** Every hit is a missed migration — fix it and re-run. Allowed exceptions (review each by hand): `ndr-migrator.md`'s description line describing what it converts FROM; any `## Revisit if` / `## Commitments` prose that legitimately mentions the words "assumption"/"consequence" in running text (the sweep matches `## Assumptions` / `## Consequences` as headings, not the words).

- [ ] **Step 2: Confirm the taxonomy asset shape**

```bash
ls plugins/ndr/assets/taxonomy/            # expect: labels.yaml only
ls plugins/ndr/assets/bases/ 2>/dev/null   # expect: no such directory / empty
rg -n 'labels\.yaml' plugins/ndr/skills/ndr-bootstrap/SKILL.md plugins/ndr/README.md
```

Expected: `labels.yaml` present; `areas.yaml`/`topics.yaml`/`current-decisions.base` gone; bootstrap and README reference `labels.yaml`.

- [ ] **Step 3: Re-validate the migrated seed corpus against the strict schema**

Re-run Task 10 Step 7's scratch-ledger `ndr doctor` to confirm the corpus is still clean after all edits.

Expected: exit 0; no `malformed`/`missing_fields`/`missing_context`/`taxonomy` findings.

- [ ] **Step 4: Read-back coherence check**

Read `plugins/ndr/references/frontmatter-schema.md`, `plugins/ndr/references/decision-single.md`, and one migrated seed atom (`plugins/ndr/assets/decisions/0001-*.md`) side by side. Confirm the seed atom's frontmatter fields and body sections match the template exactly (field names, section order, no callouts). Any mismatch is a template-or-atom bug — fix before proceeding.

- [ ] **Step 5: Final code gate (the one code touch)**

```bash
bun test && bun run typecheck && bun run lint && bun run format:check && bun run build
```

Expected: all pass; `dist/ndr` builds. (Only `src/cli/templates.ts` changed in `src/`, so this is a regression guard, not new coverage.)

- [ ] **Step 6: Commit any final fixes**

```bash
git add -A
git commit -m "docs: final coherence fixes for the plugin-prose format migration"
```

(Skip if Steps 1-5 found nothing to fix.)

---

## Self-review notes

- **Spec coverage:** references (Task 1-2), all six agents (Tasks 3-6), all six skills (Tasks 6-9 + 3), seed assets + taxonomy merge (Task 10), base removal + bootstrap + README + snippet (Task 11), stale rule regen (Task 12), retirable migrate-ledger + ndr-migrator (Task 13), final sweep (Task 14). Every item in Plan 1's "Deferred to Plan 2" list maps to a task.
- **Execution ordering caveat:** Task 10 (seed-atom migration) uses the `ndr-migrator` agent created in Task 13. Run Task 13 before Task 10 in execution, or hand-reshape the 11 bodies against `decision-single.md`. Flagged in both tasks.
- **Not in scope (Plan 3):** running `ndr migrate` + pass 2 on this repo's live `decisions/` ledger; capturing the redesign's own atoms (superseding 0049/0050/0051); migrating other tracked repos.
