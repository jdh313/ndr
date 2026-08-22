---
id: "2g38t4"
title: Supersession admits disjoint splits and strict-subset carve-outs, making
  status scope-relative
status: current
decision_date: 2026-08-22
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - supersession
  - scope
binds:
  - src/adapters/markdown/adapter.ts
  - src/ports/read.ts
  - src/domain/doctor.ts
supersedes:
  - h4yfcd
superseded_by: []
derived_from: []
informed_by:
  - 15qzf2
  - 8f414s
  - 9e4r29
---

# 2g38t4 — Supersession admits disjoint splits and strict-subset carve-outs, making status scope-relative

## Decision

Supersession lineage is a directed acyclic graph. A predecessor admits several
successors when their scopes are pairwise disjoint, and admits a successor whose
scope is a strict subset of its own, which carves out that region while the
predecessor stays the head everywhere else. Overlaps that are neither are refused
at capture.

## Scope

- Binds: the capture-time supersession guard, every lineage walk, and what
  `status` means on an atom.
- Does not bind: many-to-one merge, which already worked and is unchanged.
- Does not bind: which head a given scope selects, which stays `8f414s`'s.
- Does not bind: how a split or carve-out is authored — successors are still
  captured one at a time.

## Commitments

- `status` stops being a property of an atom and becomes a property of an atom at
  a scope point; every reader of the field must be revisited, not only lineage
  walks.
- The capture guard must test each candidate successor against all existing ones
  for disjointness, and against the predecessor for strict containment.
- A carve-out must be a strict subset; a successor whose scope equals its
  predecessor's is an ordinary total supersession, not a carve-out.
- Lineage walks must return a branching structure and keep the cycle guard; the
  graph is acyclic by enforcement, not by assumption.
- A predecessor may be patched repeatedly, appending to `superseded_by` rather
  than flipping once.
- Patching a predecessor that lives in another ledger must resolve its path in
  that ledger, and may leave the same recoverable half-state a same-ledger
  capture already can.

## Revisit if

- A legitimate deviation appears whose scope is neither disjoint from nor a
  strict subset of what it deviates from.
- Scope-relative status proves unreadable in practice, showing up as operators
  unable to say whether an atom is current without naming a scope.

## Context

- A standing position and a project that deviates from it both match the
  deviating project, so the two are neither disjoint nor unrelated.
- The prior guard refused every successor whose scope overlapped its
  predecessor's, which covers exactly this pairing.
- Each supersession edge records which atom is the predecessor and which the
  successor, so any pair joined by one already carries a local ordering between
  them without appeal to any ranking over scopes in general.
- A general ordering by scope specificity was previously judged unavailable, on
  the grounds that no such ordering over scopes exists yet.
- Resolution is contracted to return one head or fail naming a dimension, and
  consumers include agents that act without adjudicating.
- The write path already writes a successor before patching predecessors, so a
  crash overcounts rather than drops, and the resulting missing back-link is the
  one class the health sweep repairs automatically.
- A decision that was atomic when written can differentiate later as its domain
  grows a distinction it did not have.

## Why

A supersession edge already says which of its two atoms is the narrower, so
admitting carve-outs needs no ordering over scopes in general — the ordering
arrives locally, per pair, exactly where it is needed. That is what makes this
affordable now, when a global specificity ranking was not.

The guarantee the old refusal protected survives intact. It was never about
branching; it was about a question having two answers. Disjoint successors answer
different questions, and a carve-out answers a question its predecessor no longer
claims, so every scope point still has exactly one head. The gate narrows rather
than disappearing.

Scope-relative status is the price, and it is a real one: a field that was a
simple property becomes a function of where you ask from. It is worth paying
because the alternative is deviation with no causal link — the record would show
a project that decided something, and nothing connecting it to the position it
departed from, which is precisely the drift the tool exists to surface. Recording
a deviation as a supersession also makes "which projects deviate from this
position" a question the corpus can answer.

## Alternatives

- **A separate `overrides` edge with absolute status** — rejected: a fourth
  relation whose semantics are almost entirely supersession's, with the
  difference needing to be taught at every capture.
- **Refuse deviation and let resolution report ambiguity** — rejected: leaves the
  caller to supply a dimension every time and reintroduces re-deciding, since a
  local decision would carry no link to what it departs from.
- **Rank all heads by scope specificity and return the narrowest** — rejected: needs
  a total ordering over scopes that does not exist, and breaks down where two
  scopes are incomparable.
- **Keep lineage linear and retract the predecessor** — rejected: severs the
  causal link that makes drift visible.
