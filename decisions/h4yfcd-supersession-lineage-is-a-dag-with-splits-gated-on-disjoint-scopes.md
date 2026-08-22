---
id: "h4yfcd"
title: Supersession lineage is a DAG, with splits gated on disjoint scopes
status: superseded
decision_date: 2026-08-22
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - supersession
  - architecture
binds:
  - src/adapters/markdown/adapter.ts
  - src/ports/read.ts
supersedes:
  - "0145"
superseded_by:
  - 2g38t4
derived_from:
  - https://claude.ai/code/artifact/4b17e014-3dd9-428a-b3e3-efc8390ef48d
informed_by:
  - 15qzf2
  - 8gh40e
---

# h4yfcd — Supersession lineage is a DAG, with splits gated on disjoint scopes

## Decision

Supersession lineage is a directed acyclic graph rather than a linear chain. One
atom may be superseded by several successors when their scopes are pairwise
disjoint. Successors whose scopes overlap are refused at capture.

## Scope

- Binds: the capture-time supersession guard and every lineage walk.
- Does not bind: many-to-one merge, which already worked and is unchanged.
- Does not bind: how a split is authored — successors are still captured one at
  a time.

## Commitments

- `walkLineage` must return a branching structure and keep its cycle guard; the
  graph is acyclic by enforcement, not by assumption.
- Capture must test pairwise disjointness across all of a predecessor's existing
  successors, not only the one being added.
- A predecessor may be patched more than once, appending to `superseded_by`
  rather than flipping a single time.
- Every consumer that treated lineage as a list must be revisited.

## Revisit if

- A legitimate split appears whose successors cannot be made disjoint on any
  declared dimension.
- Pairwise disjointness across a wide fan-out becomes a measurable capture cost.

## Context

- The write path refused every second successor to an atom with a clean exit 2.
- `walkLineage` followed `superseded_by[0]` with a hardcoded index and returned a
  flat list.
- `supersedes:` was already an array, so many-to-one merge worked.
- The write path validated predecessors up front and exited cleanly, writing
  nothing, when one was already superseded.
- A decision that was genuinely atomic when written can differentiate later, as
  its domain grows a distinction it did not have.

## Why

The old refusal was protecting against a question having two answers, not
against branching itself. Scope lets that protection be stated precisely:
successors that overlap would leave a question with two answers and stay refused,
while successors that are disjoint answer different questions and are admitted.
The gate moves rather than disappearing, so the atomicity guarantee survives.

Capture-time review cannot substitute for this. A reviewer can catch a
predecessor that bundled two decisions on the day it was written, but not a
predecessor that was atomic then and differentiated two years later. That case
has no upstream fix, which is what makes the branching structure necessary rather
than merely convenient.

## Alternatives

- **Keep lineage linear; retract the predecessor and capture both branches fresh**
  — rejected: severs the causal link to the predecessor, which is the thing that
  makes drift visible.
- **Admit any second successor with no disjointness test** — rejected:
  legitimizes non-atomic atoms and hands resolution two contradictory heads.
- **A splitter atom that records the fan-out and preserves one-to-one lineage** —
  rejected: an atom whose only content is bookkeeping about other atoms decides
  nothing.
