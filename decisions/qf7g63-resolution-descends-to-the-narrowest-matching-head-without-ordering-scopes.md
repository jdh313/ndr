---
id: "qf7g63"
title: Resolution descends to the narrowest matching head without ordering scopes
status: current
decision_date: 2026-08-23
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - read-side
  - supersession
binds:
  - src/domain/**
supersedes: []
superseded_by: []
derived_from:
  - .docs/2026-08-23-supersession-dag-design.md
informed_by:
  - 8f414s
  - jkxmp5
---

# qf7g63 — Resolution descends to the narrowest matching head without ordering scopes

## Decision

Resolution starts at the atom asked about and descends into the unique successor
whose scope contains the query point, stopping when no successor does. It never
compares two scopes for specificity. Listing every head of a split stays
available behind an opt-in flag.

## Scope

- Binds: how `resolve` selects a head, and what `current` lists.
- Does not bind: the single-answer contract itself, which stays `8f414s`'s.
- Does not bind: atoms not joined by a supersession edge, which this cannot order.

## Commitments

- The descent is sound only while the capture guard holds, so atoms captured
  before it must be swept for overlaps the guard would now refuse.
- Two atoms matching one point with no supersession edge between them stay
  unordered, and both surface.
- Plural listing must be opt-in, so no caller receives several heads without
  having asked for them.

## Revisit if

- Unrelated atoms matching the same point become common enough that leaving them
  unordered costs more than ranking them would.

## Context

- A general ordering by scope specificity was judged unavailable, on the grounds
  that no such ordering over scopes exists.
- The capture guard makes sibling successors pairwise disjoint, and a carve-out
  strictly narrower than its predecessor.
- A dimension omitted from a scope matches every value, so a general atom already
  matches a narrower query point.
- Consumers include agents that act on a returned decision without adjudicating
  between candidates.
- Asking what became of an atom and asking what governs here had one answer only
  because lineage was a straight line.

## Why

The ordering that was unavailable turns out not to be needed. Within one lineage
the capture guard has already made the candidates non-overlapping, so at any
query point exactly one node governs and selection is a descent rather than a
comparison. The ordering arrives locally, per edge, which is the same reason
carve-outs were affordable in the first place.

Wildcard semantics make the fallback fall out instead of needing a rule of its
own: a general atom omits the dimension, so it matches the query point until a
narrower successor takes that point away from it. Nothing has to be written to
prefer the specific over the general.

The opt-in plural listing is a separate question from the contract it appears to
weaken. A human surveying a split can adjudicate between branches; an agent
mid-task cannot. Making plurality something a caller asks for keeps the default
loud and the survey reachable.

## Alternatives

- **Rank all heads by scope specificity** — rejected: needs a total ordering over
  scopes that does not exist, and breaks where two scopes are incomparable.
- **Return every matching head by default** — rejected: hands adjudication to the
  caller least equipped to do it.
- **Leave surveying a split to the lineage verb alone** — deferred: it will show
  the same branches, so the flag may prove redundant once the branching shape
  lands.
