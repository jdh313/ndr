---
id: "kvamt6"
title: Capture persist/review ordering branches on supersession
status: current
decision_date: 2026-07-10
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - process
  - meta-chain
binds:
  - plugins/ndr/skills/capture-decision/**
  - src/cli/index.ts
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - 8gh40e
---

# kvamt6 — Capture persist/review ordering branches on supersession

## Decision

The capture flow branches its persist/review ordering on `supersedes`. A fresh
atom (empty `supersedes`) is persist-then-audit: `ndr capture` writes the real
atom and the reviewer then grades the minted artifact. A revising atom is
review-then-persist: the reviewer must pass before `ndr capture` runs the
supersession two-write.

## Commitments

- The capture skill routes fresh vs revising candidates to different orderings; `ndr capture` remains the only path that writes the ledger, mints ids, and runs the two-write.
- Fresh-atom rejection recovery lives outside the CLI: fix the persisted file in place (shape/field), or trash it and re-capture (atomicity split).

## Revisit if

- Fresh-atom rejection recovery (edit-in-place, or trash and re-capture) proves error-prone enough to warrant an `ndr retract` primitive or a pre-persist gate for fresh atoms too.

## Context

- A fresh atom patches no predecessor and has zero incoming back-pointers, so removing it leaves the corpus coherent.
- The supersession transaction is a two-write atomic primitive (ndr:8gh40e) that is expensive to unwind once committed.
- The prior skill rule mandated the same ordering for every atom, which blocked the reviewer from ever grading the real on-disk artifact.

## Why

The only irreversible step in capture is the supersession two-write; gating it
with a pre-persist review is precisely what the blanket "review-then-persist"
rule was protecting. A fresh write carries no such hazard, so it can be audited
as the real atom and undone trivially when wrong. Branching the ordering places
the guard exactly where the irreversibility lives and lets the common case grade
the real artifact instead of an in-memory placeholder.

## Alternatives

- **Blanket review-then-persist (the prior rule)** — verdict: rejected: forces every atom through a placeholder pre-persist review even though a fresh write is safe to audit-then-fix, and the reviewer never sees the real atom.
- **Blanket persist-then-review** — verdict: rejected: would fire the supersession two-write before review, leaving an expensive-to-unwind committed supersession whenever a revising atom is rejected.
