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
