---
id: "hk0083"
title: binds folds into scope as a path dimension
status: current
decision_date: 2026-08-22
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - meta-chain
  - tooling
binds:
  - src/domain/schema.ts
supersedes:
  - ysytm9
superseded_by: []
derived_from:
  - https://claude.ai/code/artifact/4b17e014-3dd9-428a-b3e3-efc8390ef48d
informed_by:
  - 15qzf2
---

# hk0083 — binds folds into scope as a path dimension

## Decision

The `binds:` glob field folds into scope as a `path` dimension. A decision names
the code it governs through `scope.path`, leaving one way to express where an
atom applies. Glob syntax is unchanged.

## Scope

- Binds: atom frontmatter, and the routing paths in `drift-check` and `/ground`.
- Does not bind: the glob dialect, which stays as it was.

## Commitments

- `scope.path` becomes load-bearing rather than advisory: it participates in
  disjointness and resolution, so a wrong glob changes which atom governs, not
  just how well routing performs.
- Migration must move every existing `binds:` value into `scope.path`.
- A path that matches nothing is now a correctness problem, not a routing nit.

## Revisit if

- Path scope proves too coarse to discriminate successors in a split, forcing a
  second path-shaped dimension alongside it.

## Context

- `binds:` held repo-relative globs on 19 of 83 atoms in this ledger.
- `binds:` was explicitly advisory — never an exclusive filter, never a status
  input.
- Scope introduces a general dimension-to-value-set binding, and path globs are
  an instance of one.
- Two fields naming where an atom applies means every capture must decide which
  of them a given constraint belongs in.

## Why

The field was already a path dimension under another name, so folding it in
removes a duplicate concept rather than adding one.

The consequential half is the change in status. As `scope.path` it stops being
advisory and becomes a filter, which its predecessor explicitly refused. That
refusal was correct while binds was a routing hint with no gate behind it — an
advisory signal that silently filtered would have hidden atoms from readers.
Scope supplies the gate and the disjointness check, so the condition that made
"advisory only" the safe choice no longer holds.

## Alternatives

- **Keep both fields** — rejected: two overlapping ways to say where an atom
  applies, with no rule for choosing between them.
- **Keep binds advisory alongside scope.path** — rejected: the same information
  in two places, guaranteed to drift.
- **Drop path scoping entirely and rely on labels** — rejected: labels describe
  what a decision is about, not which code it governs.
