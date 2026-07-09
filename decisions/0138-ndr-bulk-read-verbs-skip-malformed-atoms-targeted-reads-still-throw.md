---
id: "0138"
title: ndr bulk-read verbs skip malformed atoms; targeted reads still throw
status: superseded
decision_date: 2026-06-02
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - read-side
binds: []
supersedes: []
superseded_by:
  - "0154"
derived_from: []
informed_by:
  - "0133"
  - "0136"
---

# 0138 — ndr bulk-read verbs skip malformed atoms; targeted reads still throw

## Decision

Corpus-wide read verbs (search, current, slug resolution, topic-grain resolve) skip schema-invalid atoms with a stderr warning and continue; targeted reads (getAtom / resolve by id) throw AtomValidationError and fail loudly.

## Commitments

- Corpus commands return partial results when atoms are malformed — the caller gets everything the vault can serve, plus a named warning to fix what it cannot.
- Malformed-atom warnings follow a fixed, machine-parseable format: `ndr: skipping malformed atom <file> (<reason>)`.
- Targeted id resolution keeps strict failure semantics — a zero-exit from `getAtom` or `resolve <id>` guarantees a valid atom was returned.
- This lives entirely in `MarkdownLedgerAdapter.readAllAtoms`; the port interface is unchanged.

## Context

- `ndr search` crashed on encountering the first schema-invalid atom in `~/Loose Ends/Decisions/`.
- The vault can hold potentially hundreds of atoms; one bad record aborting an entire corpus-wide command makes the tool unusable against a live vault.
- Corpus-wide verbs (search, current, slug/topic resolution) are inherently best-effort scans over the whole ledger.
- Targeted reads (getAtom, resolve by id) are a different contract — the caller names a specific atom and expects either that atom or an error.

## Why

A single malformed atom in a large vault should not abort a corpus-wide command; a direct lookup of a known-bad atom should never silently succeed. Skipping with a named warning preserves the useful output while surfacing the problem actionably. Swallowing `AtomValidationError` on a targeted read would mask data corruption instead.

## Alternatives

- **Abort all corpus verbs on first bad atom** — rejected: the original behavior; crashed `ndr search` against the real vault; treats a corpus scan with the same contract as a targeted lookup, the wrong model.
- **Silently skip with no warning** — rejected: degrades gracefully but gives no signal the atom is broken; the warning is the whole point — it names the file and reason so the author can fix the source data.
