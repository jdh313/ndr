---
id: '0060'
title: Drift-check in ndr audits current heads only; amend semantics land as a successor
  atom
status: current
decision_date: '2026-05-17'
aliases: []
project: '[[ndr]]'
derived_from: []
informed_by:
- '[[Decisions/0059-drift-detection-lives-in-the-ndr-plugin-not-spec-flow]]'
supersedes: []
superseded_by: []
area: tooling
topic: supersession
impacts: []
revisit_triggers: []
reversibility: medium
tags:
- decision
---
# 0060 — Drift-check in ndr audits current heads only; amend semantics land as a successor atom

## Decision

Drift-check audits only atoms at the head of the supersession chain; both amend and supersede resolutions land as a new successor atom with `supersedes: [<original>]`, not as an in-place edit.

## Why

Auditing non-heads generates false positives against decisions the corpus has already deliberately replaced, and in-place edits compete with `persist.py`'s atomic write model.

> [!info]- Full reasoning
> A non-head atom (one with a non-empty `superseded_by:`) is no longer the current state of the corpus — it was consciously revised. Flagging it as drifted against current code is a false alarm: the corpus already recorded the supersession. Filtering to heads only (`superseded_by: []`, `status: current`) ensures drift evidence is always against what the team currently believes.
>
> The amend-vs-supersede distinction is a *scope* signal, not a write-model distinction. Both resolutions follow the same append-only primitive: write a new atom, set `supersedes: [<original>]`, let `persist.py` patch the predecessor's `superseded_by:`. Treating amend as an in-place edit would require a separate mutation path and would break the invariant that atoms are immutable once written.
>
> The v0.1 ADR spec carried a "stalled Proposed" signal (decisions stuck in ratification). ndr has no `Proposed` state, so this signal has no structural analog. Stale supersession chains — the closest ndr equivalent — are a corpus health concern, not a code-vs-decision alignment concern, and belong in ndr-curator.

## Alternatives

Audit all atoms regardless of head status (rejected) · Treat amend as in-place edit of the existing atom (rejected) · Surface stale supersession chains inside drift-check output (rejected — scope violation).

> [!info]- Why they lost
> **Audit all atoms regardless of status.** Generates false drift signals against atoms the corpus has already acknowledged as superseded. The operator action for a non-head atom is nothing — the supersession already recorded the change. Including them adds noise with no actionable signal.
>
> **Treat amend as in-place edit.** Breaks the append-only supersession primitive. `persist.py` writes atoms atomically; a parallel in-place edit path introduces a race condition and would skip the `superseded_by:` back-pointer patch on the predecessor. The recommendation output for amend already says "write a narrower successor" — the write model is the same as supersede.
>
> **Surface stale supersession chains inside drift-check.** Keeps two distinct concerns — semantic alignment (code vs. decision) and mechanical corpus health (atom vs. atom) — tangled in one tool. drift-check should answer "is this code still consistent with this decision?"; ndr-curator answers "is this corpus internally consistent?". Mixing them makes drift-check output harder to act on.

## Consequences

Drift evidence is always against the live corpus state · Amend recommendations require `/capture-decision` with a `supersedes:` pointer, not a direct atom edit · Drift-check output is a pure code-vs-decision signal.

> [!info]- Detail
> - Superseded atoms never appear in drift-check output, so operators never chase a false alarm on a deliberately replaced decision.
> - Operators ratifying an amend recommendation must use `/capture-decision` with a `supersedes:` pointer. There is no shortcut that edits the original atom — the capture flow is the only write path.
> - Mechanical corpus issues (orphaned supersession chains, atoms with `superseded_by:` pointing to non-existent successors) are ndr-curator's responsibility. Keeping the boundary clean means drift-check output contains only actionable code-alignment findings.
