---
id: "8f414s"
title: Resolution returns exactly one head or fails with an ambiguity error
status: current
decision_date: 2026-08-22
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - read-side
  - architecture
binds:
  - src/adapters/markdown/adapter.ts
  - src/cli/index.ts
supersedes: []
superseded_by: []
derived_from:
  - https://claude.ai/code/artifact/4b17e014-3dd9-428a-b3e3-efc8390ef48d
informed_by:
  - 15qzf2
  - h4yfcd
---

# 8f414s — Resolution returns exactly one head or fails with an ambiguity error

## Decision

Resolution takes a scope and returns exactly one head. When the supplied scope
cannot select a single branch, resolution fails with an ambiguity error naming
the dimension it needs. It never returns a list of heads.

## Scope

- Binds: `ndr resolve`, `ndr current`, and the skills and agents that consume
  them.
- Does not bind: listing operations that are plural by contract, such as search.

## Commitments

- Every ambiguity error must name the dimension that would disambiguate, or the
  caller has nothing to act on.
- `.ndr.toml` must supply the invoking repo's dimension values, so ambiguity
  fires only on dimensions a call genuinely has to specify.
- `ndr current` becomes scope-relative rather than global.

## Revisit if

- Ambiguity errors fire often enough in ordinary use that callers start passing
  scope defensively rather than meaningfully.
- A caller appears that can genuinely adjudicate between heads itself.

## Context

- `/ground`, `/decisions`, and the tracked-project rule all treat a returned
  decision as the single current state.
- Branching lineage can present several heads for one starting atom.
- Consumers include coding subagents that act on a returned decision without
  adjudicating between candidates.
- The old refusal of any competing successor meant resolution never had to handle
  plurality at all.

## Why

The single-answer contract is the thing worth protecting. Every consumer was
built on it, and the rule that returned decisions are ground truth depends on
there being one.

Returning several heads and letting the caller choose is worse than the refusal
it replaces, because the caller least equipped to adjudicate — an agent mid-task
— will pick one silently and proceed. Failing loudly turns an unanswerable
question into an answerable one: the caller is told which dimension to supply,
which is an instruction it can follow. An error that names its own remedy costs
one retry; a silently wrong decision costs however long it takes to notice.

## Alternatives

- **Return every matching head** — rejected: pushes adjudication onto the callers
  least equipped to do it.
- **Return the most recent head** — rejected: recency has no relationship to
  which scope governs, so this returns the wrong decision quietly.
- **Rank heads by scope specificity and return the narrowest** — deferred: needs
  a specificity ordering over scopes that does not exist yet.
