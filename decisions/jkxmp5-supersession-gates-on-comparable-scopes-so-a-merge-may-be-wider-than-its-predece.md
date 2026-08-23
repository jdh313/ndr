---
id: "jkxmp5"
title: Supersession gates on comparable scopes, so a merge may be wider than its
  predecessors
status: current
decision_date: 2026-08-23
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
  - 2g38t4
superseded_by: []
derived_from:
  - .docs/2026-08-23-supersession-dag-design.md
informed_by:
  - 8f414s
---

# jkxmp5 — Supersession gates on comparable scopes, so a merge may be wider than its predecessors

## Decision

Supersession lineage is a directed acyclic graph. A predecessor admits several
successors when their scopes are pairwise disjoint, and admits any successor
whose scope is comparable to its own — narrower, equal, or wider. Scopes that
overlap without one containing the other are refused at capture.

## Scope

- Binds: the capture-time supersession guard, every lineage walk, and what
  live-ness means for an atom.
- Binds: many-to-one merge, which the guard now tests per predecessor pair.
- Does not bind: which head a given scope selects, which stays `8f414s`'s.
- Does not bind: how a split or carve-out is authored — successors are still
  captured one at a time.

## Commitments

- The guard must test each candidate successor against all existing successors
  for pairwise disjointness, and against the predecessor for containment in
  either direction.
- A merge must be tested once per predecessor rather than once per capture, or a
  successor carrying the union of its predecessors' scopes fails against the
  first predecessor it is compared to.
- A successor whose scope equals its predecessor's is an ordinary total
  supersession, not a carve-out; a carve-out is a strict subset.
- Live-ness stops being a property of an atom and becomes a property of an atom
  at a scope point; every reader of it must be revisited, not only lineage walks.
- Lineage walks must return a branching structure and keep the cycle guard; the
  graph is acyclic by enforcement, not by assumption.
- A predecessor may be patched repeatedly, appending to `superseded_by` rather
  than flipping once.
- Patching a predecessor that lives in another ledger must resolve its path in
  that ledger, and may leave the same recoverable half-state a same-ledger
  capture already can.

## Revisit if

- A legitimate successor appears whose scope overlaps its predecessor's without
  either containing the other.
- Scope-relative live-ness proves unreadable in practice, showing up as operators
  unable to say whether an atom stands without naming a scope.

## Context

- The prior guard admitted a successor disjoint from its siblings, equal to its
  predecessor, or a strict subset of it, and refused everything else.
- A many-to-one merge typically carries the union of its predecessors' scopes,
  which is wider than any one of them.
- The prior atom's own scope section declared merge unbound and unchanged.
- Each supersession edge records which atom is the predecessor and which the
  successor, so any pair joined by one carries a local ordering between them
  without appeal to a ranking over scopes in general.
- A successor governing everything its predecessor governed, and more, leaves no
  scope point with two live answers.
- Capturing one cross-project decision per project is the duplication scope was
  introduced to remove.

## Why

The refusal being narrowed was protecting one guarantee: that a scope point never
has two answers. A successor wider than its predecessor does not threaten it. The
predecessor steps down completely, and the successor answers everywhere the
predecessor stood, plus elsewhere. Testing containment in either direction keeps
the guarantee while admitting the case.

Read literally, the prior wording left merge uncapturable while the same atom
claimed merge was unchanged. That is not a case the guard was designed to
exclude; it is one the wording excluded by accident, and the prior atom's own
revisit condition anticipated exactly this shape.

What stays refused is narrow and deliberate. Two scopes that overlap without
either containing the other have a region where both would govern, and nothing
in a supersession edge orders them there. That is the genuine ambiguity, and
admitting it would put an unanswerable question in front of callers that act
without adjudicating.

## Alternatives

- **Refuse a wider successor, per the prior literal wording** — rejected: a
  cross-project merge would have to be captured once per project.
- **Admit any overlap and let resolution report ambiguity** — rejected: pushes an
  unanswerable question onto callers least equipped to answer it.
- **Rank all scopes by specificity and let the narrowest win** — rejected: needs a
  total ordering over scopes that does not exist, and breaks down where two
  scopes are incomparable.
