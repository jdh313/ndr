---
id: "rr134s"
title: The read set is declared per machine, and trust boundaries are enforced
  by absence
status: current
decision_date: 2026-08-22
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - substrate
  - file-organization
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - q618cy
  - 9e4r29
---

# rr134s — The read set is declared per machine, and trust boundaries are enforced by absence

## Decision

The set of ledgers a query reads is declared once per machine rather than per
repository. A machine's declaration names only ledgers inside its own trust
boundary, so a boundary is enforced by a ledger being unreachable rather than by
any rule that hides it.

## Scope

- Binds: how read verbs assemble the corpus they search and resolve against.
- Does not bind: which ledger a capture writes to — `q618cy`'s resolution order
  still selects the single write target.
- Does not bind: the substrate a ledger uses, only which ledgers are in scope.

## Commitments

- The declaration is machine-local state and is never synchronised between
  machines, so no boundary can be crossed by a sync going wrong.
- A declared ledger that is missing on disk must degrade to a warning, not an
  error, or cloning a repo onto a machine that lacks its standing ledger breaks
  every read.
- Write-side id minting must check the whole read set, not one ledger, or
  federation reintroduces collisions on every capture.

## Revisit if

- The same machine has to serve two trust boundaries at once.
- Declaring the read set per machine proves too coarse because one boundary needs
  different ledger sets in different working contexts.

## Context

- `.ndr.toml` resolution stops at the first config found walking up from the
  working directory, so exactly one ledger is ever reachable from a repo.
- A home-level `.ndr.toml` already exists and points at a vault ledger, but only
  directories that no repo ledger claims can reach it.
- Decision records are kept on a work machine whose ledger is unreachable from
  personal machines, and the reverse must also hold.
- Twelve ledgers hold 404 distinct atoms, with 18 atom-ids appearing in more than
  one of them.
- `mintFreshId` checks collisions only against the single configured ledger.

## Why

Making the declaration machine-scoped turns the hardest requirement into a
non-problem. A boundary that is enforced by filtering fails open — a missed rule,
a mis-set flag, and a work decision surfaces at home. A boundary enforced by the
ledger simply not existing on that machine has no failure mode to get wrong,
because there is nothing present to leak.

Per-repo declaration was the alternative worth taking seriously, and it loses on
maintenance rather than on safety: the same list would be repeated in every repo
and would drift, while the property that actually matters — which corpora this
operator may see — is a fact about the machine, not about any repository on it.

## Alternatives

- **Declare the read set in each repo's config** — rejected: repeats one list
  across every repo and lets copies drift, while the boundary it encodes is a
  machine-level fact.
- **One global read set with per-atom or per-ledger visibility rules** —
  rejected: makes a leak a configuration error rather than an impossibility.
- **Keep single-ledger resolution and reach other corpora by changing directory**
  — rejected: the status quo, which cannot answer any cross-ledger question.
