---
id: "2y1btc"
title: Scope dimensions are a closed vocabulary declared per ledger
status: current
decision_date: 2026-08-22
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - meta-chain
  - process
binds:
  - src/cli/config.ts
supersedes: []
superseded_by: []
derived_from:
  - https://claude.ai/code/artifact/4b17e014-3dd9-428a-b3e3-efc8390ef48d
informed_by:
  - 15qzf2
---

# 2y1btc — Scope dimensions are a closed vocabulary declared per ledger

## Decision

The set of scope dimensions a ledger may use is closed and declared in that
ledger's `.ndr.toml`. Adding a dimension is a deliberate edit to that
declaration. An atom naming an undeclared dimension is rejected at capture.

## Scope

- Binds: `.ndr.toml` parsing and capture-time scope validation.
- Does not bind: the values inside a dimension, which stay open.
- Does not bind: other ledgers' vocabularies — each declares its own.

## Commitments

- Every ledger needs a dimension declaration before scope can be used in it.
- Capture must reject an undeclared dimension rather than accepting it.
- Adding a dimension is a visible edit, so the cost of a new axis is paid
  deliberately rather than accreting one atom at a time.

## Revisit if

- The cost of adding a dimension pushes authors to overload an existing one
  instead.
- Two ledgers repeatedly declare the same dimension, suggesting a shared tier is
  wanted after all.

## Context

- Disjointness between two scopes is computed per shared dimension, and a
  dimension absent from one side behaves as a wildcard.
- The one existing taxonomy axis, `labels`, is open in practice and has
  concentrated: `tooling` carries 45 of 83 atoms in this ledger.
- `conviction` discriminates almost nothing, with 66 of 83 atoms `tentative`.
- Ledgers govern different domains, so an axis meaningful in one is noise in
  another.

## Why

An undeclared dimension does not fail — it silently becomes a wildcard. A
misspelling or an ad-hoc axis invented at capture time would therefore widen a
scope rather than erroring, and could turn what should be a refused overlap into
an accepted contradiction. Closing the vocabulary converts a silent semantic
failure into a loud validation one, which is the only reason strong enough to
accept the friction.

The junk-drawer risk is the secondary argument and is already demonstrated in
this corpus: an open axis concentrates rather than discriminates. Leaving the
dimension set open would reproduce that, with worse consequences, because
dimensions gate supersession where labels only affect retrieval.

## Alternatives

- **Open vocabulary, dimensions invented at capture time** — rejected: an ad-hoc
  or misspelled dimension becomes a silent wildcard rather than an error.
- **One global vocabulary across all ledgers** — rejected: ledgers govern
  different domains, and a shared axis list would be noise in most of them.
- **Freeform tags with no named axes** — rejected: disjointness has nothing to
  compare on without a named dimension.
