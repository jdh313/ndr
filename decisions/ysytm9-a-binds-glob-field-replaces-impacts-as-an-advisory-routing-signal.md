---
id: "ysytm9"
title: A binds glob field replaces impacts as an advisory routing signal
status: current
decision_date: 2026-07-08
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - meta-chain
  - tooling
binds: []
supersedes: []
superseded_by: []
derived_from:
  - docs/superpowers/specs/2026-07-08-atom-format-redesign.md
informed_by:
  - "0060"
---

# ysytm9 — A binds glob field replaces impacts as an advisory routing signal

## Decision

A `binds:` field of repo-relative glob patterns (`Bun.Glob` syntax) replaces `impacts:`. It marks the code a decision governs and is an advisory routing signal for `drift-check` and `/ground` — never an exclusive filter and never a status input.

## Commitments

- `drift-check` uses `binds:` to surface candidate atoms and `/ground` ranks heads by binds overlap; neither treats it as an exclusive filter.
- Doctor adds an advisory `binds_stale` check (a glob matching zero files on a current head is a finding); `ndr capture` validates glob syntax only.
- Convention: bind directories and layers, not individual files.

## Revisit if

- Coarse globs plus `binds_stale` prove insufficient and the governed-code-moved failure mode needs rename-following machinery.

## Context

- `impacts:` held Obsidian vault wikilinks, but ledgers are repo-resident with no vault for those links to resolve in.
- `drift-check` and `/ground` needed a way to map a code diff to candidate atoms.
- Supersession is whole-atom and binary; nothing should let scope partially supersede an atom.

## Why

Globs over repo-relative paths give drift-check a diff-to-atom mapping and let `/ground` rank heads by overlap with the working set, which vault wikilinks never could. Keeping `binds:` advisory — a routing hint, not an exclusive filter, and never a status input — preserves the simple whole-atom chain walk: scope informs which atoms to look at, never whether an atom is current. Capture validates only glob syntax, not that a glob matches a file, because an atom may legitimately bind code that lands in a later PR.

## Alternatives

- **Keep `impacts:` vault wikilinks** — rejected: nothing resolves them in a repo-resident ledger.
- **Make `binds:` an exclusive filter or a status input** — rejected: would break the binary whole-atom supersession primitive and hide atoms with empty or stale binds.
