---
id: "zap0yr"
title: Inheritance is implicit — every declared ledger is read and scope does
  the selecting
status: current
decision_date: 2026-08-22
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - scope
  - read-side
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - 15qzf2
  - 8f414s
  - rr134s
---

# zap0yr — Inheritance is implicit — every declared ledger is read and scope does the selecting

## Decision

Every ledger in the declared read set is read on every query, and an atom's scope
alone decides whether it governs the caller. No repository declares which
standing ledgers it inherits; inheritance is the default and narrowing is the
only authored act.

## Scope

- Binds: how read verbs decide which atoms are candidates before resolution runs.
- Does not bind: which of several candidate heads wins, which stays `8f414s`'s.
- Does not bind: the write path, which still targets one ledger.

## Commitments

- Scope filtering becomes the only thing standing between a caller and atoms from
  every other project, so a scope bug is a correctness bug rather than a
  cosmetic one.
- An atom whose project dimension wildcards while sitting in a repo ledger must
  be reported by the corpus health sweep, since it would leak into every project.
- Migrating an existing `project:` string to a scope dimension must never widen
  it by accident; a migration that produces a wildcard is a defect.
- Read verbs must tolerate a declared ledger being absent rather than failing the
  whole query.

## Revisit if

- A project genuinely needs to opt out of a standing position it cannot narrow
  or supersede.
- Reading every declared ledger surfaces atoms a caller must not see for reasons
  scope cannot express.

## Context

- A decision must be found before it can be reused, and the positions being
  re-derived were ones their author had forgotten existed.
- Scope already has to filter correctly within one ledger or resolution returns
  wrong heads.
- The declared read set spans twelve ledgers and 404 distinct atoms.
- All 445 atom files currently carry a single `project:` string that has to
  migrate into a scope dimension.
- The vault ledger's 28 atoms carry that field in a wikilink form rather than a
  plain project name.

## Why

Explicit inheritance defeats the purpose it would serve. Opting in requires
already knowing the standing atom exists, and the whole reason the tier exists is
that positions get forgotten and re-derived. A default that only applies once you
remember it is not a default.

Reading everything also adds no new correctness burden, which is what makes it
affordable. Scope must already be right for resolution to work inside a single
ledger; widening the candidate set leans harder on machinery that has to be
sound anyway rather than introducing a second thing to keep correct. The
alternative would have meant maintaining a registry and an inherit list that
describe overlapping facts and would drift apart.

Cross-ledger reading falls out of the same mechanism rather than needing one of
its own: asking what governs a topic everywhere is the same query with the
project dimension left off.

## Alternatives

- **Each repo declares which standing ledgers it inherits** — rejected: requires
  knowing a standing atom exists before it can govern, which is the failure the
  tier exists to fix.
- **Curate a separate inherit list alongside the registry** — rejected: two lists
  describing overlapping facts, guaranteed to diverge.
- **Read only the repo ledger and query others explicitly** — rejected: makes
  every inherited decision an act of recall.
