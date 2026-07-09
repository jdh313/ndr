---
id: "0060"
title: Drift-check in ndr audits current heads only; amend semantics land as a
  successor atom
status: current
decision_date: 2026-05-17
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - supersession
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - "0059"
---

# 0060 — Drift-check in ndr audits current heads only; amend semantics land as a successor atom

## Decision

Drift-check audits only atoms at the head of the supersession chain; both amend and supersede resolutions land as a new successor atom with `supersedes: [<original>]`, not as an in-place edit.

## Commitments

- Superseded atoms never appear in drift-check output, so operators never chase a false alarm on a deliberately replaced decision.
- Ratifying an amend recommendation must go through `/capture-decision` with a `supersedes:` pointer — there is no shortcut that edits the original atom.
- Mechanical corpus issues (orphaned supersession chains, atoms whose `superseded_by:` points to a non-existent successor) stay ndr-curator's responsibility, not drift-check's — drift-check output carries only actionable code-alignment findings.

## Context

- A non-head atom (non-empty `superseded_by:`) is no longer the current corpus state — it was consciously revised, and the supersession already recorded the change.
- `persist.py` writes atoms atomically under an append-only model; atoms are immutable once written.
- The v0.1 ADR spec carried a "stalled Proposed" signal (decisions stuck in ratification); ndr has no `Proposed` state, so it has no structural analog.
- ndr-curator already owns mechanical corpus health.

## Why

Auditing non-heads generates false positives against decisions the corpus has already deliberately replaced: flagging a superseded atom as drifted is a false alarm, and the operator action is nothing. Filtering to heads only (`superseded_by: []`, `status: current`) keeps drift evidence always against what the team currently believes.

The amend-vs-supersede distinction is a *scope* signal, not a write-model distinction. Both resolutions follow the same append-only primitive — write a new atom, set `supersedes: [<original>]`, let `persist.py` patch the predecessor's `superseded_by:`. Treating amend as an in-place edit would require a separate mutation path and break the immutability invariant.

Stale supersession chains — the closest ndr equivalent to the dropped "stalled Proposed" signal — are a corpus health concern, not a code-vs-decision alignment concern, so they belong in ndr-curator rather than drift-check.

## Alternatives

- **Audit all atoms regardless of status** — rejected: generates false drift signals against atoms the corpus already acknowledged as superseded; the operator action for a non-head is nothing, so including them adds noise with no actionable signal.
- **Treat amend as an in-place edit** — rejected: breaks the append-only primitive; a parallel edit path introduces a race with `persist.py`'s atomic write and skips the `superseded_by:` back-pointer patch. The write model is identical to supersede.
- **Surface stale supersession chains inside drift-check** — rejected (scope violation): tangles semantic alignment (code vs. decision) with mechanical corpus health (atom vs. atom); drift-check answers "is this code still consistent with this decision?", ndr-curator answers "is this corpus internally consistent?".
