---
id: "97s529"
title: Drift-check audits current heads only; semantic amendments land as
  successor atoms, vocabulary-only edits land in place
status: current
decision_date: 2026-08-01
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - supersession
  - process
  - tooling
binds: []
supersedes:
  - "0060"
superseded_by: []
derived_from:
  - agentforge commit 161d0e1
  - JUN-359
informed_by:
  - "0059"
---

# 97s529 — Drift-check audits current heads only; semantic amendments land as successor atoms, vocabulary-only edits land in place

## Decision

Drift-check audits only atoms at the head of the supersession chain. A resolution
that changes what a decision means lands as a new successor atom with
`supersedes: [<original>]`. An edit that changes no decision's substance —
renaming a term the ledger itself uses — is applied in place to every affected
atom instead.

## Scope

- Binds: how drift-check resolutions and ledger-wide terminology changes are written.
- Does not bind: the atom id, which is preserved across an in-place vocabulary
  edit so existing `ndr:<id>` references keep resolving.
- Does not bind: mechanical corpus health (orphaned chains, dangling
  `superseded_by:`) — that stays ndr-curator's.

## Commitments

- Superseded atoms never appear in drift-check output, so operators never chase a
  false alarm on a deliberately replaced decision.
- Ratifying a semantic amend recommendation must go through `/capture-decision`
  with a `supersedes:` pointer — there is no shortcut that edits the original atom.
- An in-place vocabulary edit must leave every touched atom's Decision, Scope,
  Commitments, and Alternatives semantically identical; if any of them shifts, the
  change was semantic and needs a successor.
- The immutability invariant now carries a documented exception, so any tooling
  that assumes atom bodies are byte-stable after write must be checked against it.

## Revisit if

- An in-place vocabulary edit is found to have silently changed a decision's substance.
- Tooling gains a content hash or signature over atom bodies that an in-place edit
  would invalidate.

## Context

- `ndr:0060` treated every amendment as a successor-atom write, on the grounds
  that atoms are immutable once written.
- A terminology rename in agentforge (`disposition` to declared loss) touched 8
  atoms' titles and Decision sentences without changing any decision's substance.
- That rename was applied in place as agentforge commit `161d0e1`, preserving
  atom ids while changing 4 filenames.
- Writing 8 successor atoms for that rename would have doubled the corpus for
  those decisions with no change in what any of them decided.
- `persist.py` writes atoms atomically under an append-only model.

## Why

The load-bearing distinction is whether a reader's understanding of the decision
changes, not whether bytes on disk change. Supersession exists so a reader can see
that the project once believed X and now believes Y. A rename produces no such
pair, so a successor atom would record a change that never happened and leave the
chain claiming a reversal for every future reader.

The cost asymmetry settles it. Eight successors for one rename inflate the corpus
permanently, and every future supersession walk pays for it — while the risk the
in-place edit introduces is bounded and checkable, because the Commitments above
name exactly what must stay identical.

`0060`'s immutability argument was really an argument about the *write path*: a
parallel mutation path racing `persist.py`. That concern holds for a
successor-generating flow, but a vocabulary sweep is a deliberate, reviewed,
one-shot edit under version control, not a concurrent writer. Git history retains
the pre-rename text, so the record is not lost.

## Alternatives

- **Keep `0060` unchanged and write successors for renames** — rejected:
  permanently inflates the corpus and makes every superseded/current pair claim a
  substantive reversal that never occurred.
- **Capture the carve-out as a fresh atom alongside `0060`** — rejected: leaves
  two current heads whose boundary is only implied, so the next reader has to
  infer which one governs a given edit.
- **Revert `161d0e1` and redo the rename as successor atoms** — rejected:
  strictest reading of `0060`, but pays the corpus-inflation cost above to correct
  a change that altered no decision's substance.
