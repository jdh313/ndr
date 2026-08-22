---
id: "6jvehv"
title: Retiring the sequential atom-ids waits for federation and lands as a
  tool-driven sweep
status: current
decision_date: 2026-08-22
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - referencing
  - process
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - "0144"
  - 97s529
  - rr134s
---

# 6jvehv — Retiring the sequential atom-ids waits for federation and lands as a tool-driven sweep

## Decision

The surviving sequential atom-ids are not renamed now. Retiring them waits until
the federated read set exists, and lands as a verb the CLI owns rather than a
hand sweep, so every reference is rewritten from a known list of ledgers.

## Scope

- Binds: when and how the pre-base32 ids are retired.
- Does not bind: reconciling atoms that exist in two ledgers under one id, which
  is a data repair and can happen sooner.
- Does not bind: id minting, which already produces base32 only.

## Commitments

- Until the sweep runs, both id shapes are valid on disk and every reader must
  accept either.
- The sweep must rewrite references outside the ledgers too, including compiled
  marketplace output, or it will silently strand them.
- Renaming an id is a distinct class of in-place edit from a vocabulary rename,
  because it breaks stale references instead of preserving them, so it needs its
  own decision before it runs.

## Revisit if

- Carrying two id shapes starts costing more in reader and tooling complexity
  than the sweep would cost.
- A sequential id collides with a freshly minted one despite the minting change.

## Context

- Fifty-eight atoms still carry sequential ids, confined to two ledgers; every
  other ledger is already base32.
- Id minting already generates base32 only, so the sequential set is closed and
  cannot grow.
- Eleven of those ids appear in two ledgers at once, all of them forks of the
  same atom rather than distinct decisions; reconciling those leaves the rest
  unique across the whole read set.
- Three hundred and one references to sequential ids exist across 92 files in
  this repo, plus 19 more in two other repos.
- The existing in-place-edit carve-out explicitly preserves the atom id so that
  references keep resolving.
- A single-ledger migration was already chosen as the way to prove the model
  before touching every corpus.

## Why

The rename buys consistency, not correctness. Nothing in the federated model
needs it: the collisions that matter are forks of one atom, and repairing those
leaves every remaining sequential id unique across all twelve ledgers, with
minting unable to produce another.

Sequencing it second also makes it cheaper rather than merely later. Once the
read set is declared, the tool knows every ledger and every place a reference can
hide, so the sweep becomes mechanical and checkable. Doing it by hand first means
three hundred edits with no way to verify completeness, and the likeliest
casualty is a reference in generated output that nobody thinks to grep.

Bundling it into the model migration would also spend the one thing the
prove-it-on-one-ledger approach was protecting: the chance to learn from the
first pass before committing every corpus.

## Alternatives

- **Rename every sequential id now, by hand** — rejected: three hundred edits
  with no completeness check, before the tooling that could verify them exists.
- **Qualify references by ledger instead of renaming** — rejected: breaks every
  existing reference to solve a problem that reconciling eleven forks removes.
- **Keep both id shapes permanently** — deferred: acceptable today, but the
  ongoing reader complexity is what this decision expects to trade away later.
