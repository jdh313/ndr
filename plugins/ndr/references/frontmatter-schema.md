# Frontmatter schema

Canonical YAML spec for decision atoms. Required fields are starred. The capture skill refuses to write if any required field is missing.

## Example

```yaml
---
# Identity
id: "0042"                            # *zero-padded sequence; auto-assigned. Quoted to preserve leading zeros.
title: "Use FastAPI for the auth service"  # *short imperative phrase
status: current                       # *enum: current | superseded | retracted
decision_date: 2026-05-14             # *ISO date
aliases: []                           # optional; atom-grain slugs for external reference. Use `ndr-` prefix. Minted lazily; moved to successor on supersession

# Membership
project: "[[Auth Rewrite]]"   # *single wikilink; what project / initiative this decision belongs to

# Lineage (all wikilinks to vault paths)
derived_from:                         # the rich source — chat, mull, prior decision
  - "[[Mulling/2026-05-14_decision-capture-pipeline]]"
informed_by:                          # other decisions that shaped this one (no supersession semantics)
  - "[[Decisions/0017-postgres-only]]"
supersedes: []                        # *REQUIRED present (may be empty); non-empty if this revises
superseded_by: []                     # back-pointer; filled when a successor lands

# Impact
area: tooling                         # *single value from taxonomy/areas.yaml
topic: substrate                      # *single value from taxonomy/topics.yaml
impacts:                              # wikilinks to architecture pages, repo notes, code refs, design docs
  - "[[Reference/Developer/FastAPI Decision]]"
  - "[[Auth Rewrite]]"

# Revisit
revisit_triggers: []                  # free-text triggers ("quarterly perf review")

# Classification
reversibility: medium                 # *enum: easy | medium | hard
tags:
  - decision
---
```

## Field reference

### Identity

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string (4-digit zero-padded, quoted) | yes | Auto-assigned. Quote it so `"0042"` doesn't get coerced to int `42` |
| `title` | string | yes | Short imperative phrase |
| `status` | enum | yes | `current`, `superseded`, `retracted` |
| `decision_date` | ISO date | yes | When the decision was made, not when the atom was written |
| `aliases` | list[string] | no | Lazy-minted slugs for atom-grain external reference. Use `ndr-` namespace prefix (e.g., `ndr-monorepo-shape`). Each slug must be unique vault-wide. Slug is **moved to the successor** on supersession — see Hard rule 3. Most atoms never carry a slug |

### Membership

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `project` | wikilink string | yes | A single wikilink to the project page this decision belongs to. Bases filters by this. If a decision genuinely spans projects, pick the primary one — cross-project decisions can be linked via the project pages themselves |

### Lineage

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `derived_from` | list[wikilink] | no | The rich source (chat, mull, prior decision). Multiple allowed |
| `informed_by` | list[wikilink] | no | Other decisions that shaped this one. No supersession semantics |
| `supersedes` | list[wikilink] | **yes (presence)** | Must be present in frontmatter. May be empty `[]`. If non-empty, this decision revises the named one(s) |
| `superseded_by` | list[wikilink] | no | Back-pointer, filled when a successor lands. Capture skill patches this in the same operation that writes the successor |

`supersedes:` is required to be **present** even when empty — it's the structural signal that the author thought about supersession.

### Impact

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `area` | string | yes | Single value from `taxonomy/areas.yaml`. Unknown values are rejected |
| `topic` | string | yes | Single value from `taxonomy/topics.yaml`. Unknown values are rejected |
| `impacts` | list[wikilink] | no | Architecture pages, repo notes, code refs, design docs this decision touches. Use wikilinks so Obsidian's backlinks pane surfaces "decisions touching this" automatically on the target page |

### Revisit

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `revisit_triggers` | list[string] | no | Free-text triggers ("quarterly perf review") |

Assumptions live in the **body**, not frontmatter. See `## Assumptions` body convention below — nested objects in frontmatter don't surface in Obsidian's Properties UI or Bases.

### Classification

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `reversibility` | enum | yes | `easy`, `medium`, `hard` |
| `tags` | list[string] | no | Always include `decision` |

## Body convention — hybrid altitude

Each section has a **heading + one-line gist** (always visible) plus an optional **collapsible callout** for deeper texture. The reader scanning the atom sees only headings + gist lines. Drilling deeper is one click per altitude.

```markdown
# 0042 — Use FastAPI for the auth service

## Decision

One sentence — what was decided. The gist altitude; never put it in a callout.

## Why

Brief gist line — the load-bearing reason, in one sentence.

> [!info]- Full reasoning
> Longer prose. Why this path over alternatives, what tipped the call, nuance the gist glosses.

## Alternatives

One-line list of alternatives considered + verdict (rejected / deferred / preserved-elsewhere). Omit this section if there were no meaningful alternatives.

> [!info]- Why they lost
> Per-alternative paragraph or bullet on why each lost.

## Assumptions

Backtick-separated list of assumption slugs, one per assumption. Omit if no load-bearing assumptions.

> [!warning]- <slug>
> One-sentence description.
>
> - **Current state:** verified-date | "active" | "needs check"
> - **Revisit if:** condition that would flip the decision

## Consequences

One-line list of consequences, `·`-separated.

> [!info]- Detail
> Bulleted detail on each consequence.
```

### How the altitudes work

| Altitude | Reader question | Where it lives |
| --- | --- | --- |
| **Gist** | What was decided? | `## Decision` paragraph (always visible) |
| **Why this** | Rationale for the chosen path | `## Why` gist line + `[!info]- Full reasoning` callout |
| **Why not that** | Rejected alternatives | `## Alternatives` gist line + `[!info]- Why they lost` callout |
| **What flips it** | Load-bearing assumptions | `## Assumptions` slug list + one `[!warning]-` callout per assumption |
| **Consequences** | Ripple effects | `## Consequences` gist line + `[!info]- Detail` callout |

The trailing `-` on `[!info]-` / `[!warning]-` makes each callout **default-collapsed** in Obsidian. The artifact itself declares "this is supplementary" — the reader doesn't curate altitude every read.

### Why assumptions are in body, not frontmatter

Each assumption is a small structured record (`description`, `current_state`, `revisit_if`). Obsidian's Properties UI is flat — nested objects don't render and Bases can't filter on inner fields. The body callout form keeps assumptions human-readable AND skill-parseable, without pretending to be a frontmatter query target. The slug list at the top of `## Assumptions` carries enough surface for "which assumptions does this decision rest on?" without expanding any of them.

### When to omit a section

If a section has no content (no alternatives considered, no load-bearing assumptions), omit the section entirely — don't render an empty heading. The gist altitude must always be present (`## Decision`); other altitudes are optional per atom.

## Hard rules

1. **Required fields are non-negotiable.** Capture skill refuses to write if any starred field is missing.
2. **`supersedes:` must be present.** May be empty. Its presence is the structural signal that the author considered supersession.
3. **Two-write supersession (three-write with alias handover).** If `supersedes:` is non-empty, the predecessor's `superseded_by:` must be patched in the same operation. Skill writes successor first, then patches predecessor. **If the predecessor carries `aliases:`, the patch also clears the predecessor's `aliases:` and appends those slugs to the successor's `aliases:` — the slug moves atomically with the supersession.** On patch failure (including alias handover), skill reports the half-state and exits.
4. **Multi-supersession is manual.** If a predecessor is already `superseded` by a different successor, the skill refuses the patch — almost certainly a sign two competing successors were drafted in parallel.
5. **`project:` is required.** A decision without a project hides from the project filter view. If you don't know the project yet, create a stub project page first.
6. **Body prose is substantive.** Don't restate frontmatter fields in prose ("`derived_from: F`. `revises: A.scope`" is YAML, not English).
7. **Slug uniqueness.** Any slug in `aliases:` must be unique vault-wide. Capture skill refuses to write a duplicate. A slug being moved during supersession is exempt from this check against its predecessor (it's vacating that home in the same operation).
