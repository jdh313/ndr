---
id: "15qzf2"
title: Scope replaces project as the atom binding primitive
status: current
decision_date: 2026-08-22
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - substrate
  - architecture
binds:
  - src/domain/schema.ts
  - src/cli/config.ts
supersedes:
  - "0130"
superseded_by: []
derived_from:
  - https://claude.ai/code/artifact/4b17e014-3dd9-428a-b3e3-efc8390ef48d
informed_by:
  - c5jpyv
---

# 15qzf2 — Scope replaces project as the atom binding primitive

## Decision

An atom binds through a `scope` map from named dimension to value set, replacing
the single `project` string. `project` becomes one dimension among others, so one
atom can govern several projects at once. A dimension omitted from a scope is a
wildcard matching every value.

## Scope

- Binds: atom frontmatter, and every read path that filters or resolves by project.
- Does not bind: which dimensions a ledger declares — that is a separate decision.
- Does not bind: where an atom scoped to several projects physically lives, which
  remains open.

## Commitments

- Dimension values stay enumerable sets, never freeform predicates, so overlap
  between two scopes remains decidable by set intersection.
- Every read path that assumed one project per atom must accept a scope argument.
- `.ndr.toml` must supply the invoking repo's default scope, or ordinary
  invocations become ambiguous.

## Revisit if

- A scope distinction the corpus needs cannot be expressed as enumerable
  dimension values.
- Scope containment checks become a measurable cost in `resolve` or `current`.

## Context

- Every atom carried exactly one `project` string and the schema rejected any
  other shape.
- Eleven tracked ledgers hold 437 atoms, with no query that spans them.
- `homelab` and `homelab-actual-budget` both declare `project = "homelab"` yet
  keep separate 70- and 69-atom ledgers.
- A decision governing several repos had to be captured once per repo, and the
  copies then superseded independently.
- Lineage was pinned to one successor per atom, blocking a decision that
  differentiates into two.

## Why

The single string pinned cardinality at one where the work is N, and the same pin
blocked a supersession split — one project, one successor. Naming the missing
concept once, as scope, resolves both rather than patching each separately.

Modelling scope as dimension-to-value-set rather than a predicate string is the
load-bearing half of the call. Decidable overlap is what allows capture to keep
refusing genuinely ambiguous atoms; without it the atomicity gate has nothing to
compute, and the model would admit contradictions it could not detect.

## Alternatives

- **Keep `project`, add a parallel `projects` list** — rejected: two fields
  expressing one binding, and it leaves the supersession split untouched.
- **Freeform scope predicate string** — rejected: expressive but undecidable, so
  the capture-time disjointness gate could not exist.
- **Continue duplicating cross-cutting atoms per ledger** — rejected: the status
  quo, where copies drift and supersede independently with nothing linking them.
