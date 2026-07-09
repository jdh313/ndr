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

## Why

A single malformed atom in a large vault should not abort a corpus-wide command; a direct lookup of a known-bad atom should never silently succeed.

Discovered when `ndr search` crashed on the first malformed atom in `~/Loose Ends/Decisions/`. With potentially hundreds of atoms, one bad record aborting the entire command makes the tool unusable against a live vault. Corpus verbs are inherently best-effort scans — skipping with a named warning (`ndr: skipping malformed atom <file> (<reason>)`) preserves the useful output while surfacing the problem actionably. Targeted reads are a different contract: the caller named a specific atom and expects either the atom or an error. Swallowing AtomValidationError there would mask data corruption.

## Alternatives

Abort all corpus verbs on first bad atom (rejected) · Silently skip with no warning (rejected).

- **Abort on first bad atom:** the original behavior; crashed `ndr search` against the real vault. Treats a corpus scan with the same contract as a targeted lookup — wrong model.
- **Silent skip:** degrades gracefully but gives no signal that the atom is broken. The warning is the whole point — it names the file and reason so the author can fix the source data.

## Consequences

Corpus commands return partial results when atoms are malformed · Malformed atoms produce actionable stderr lines naming file and reason · Targeted id resolution retains strict failure semantics

- Partial results on corpus verbs are safe: the caller gets everything the vault can serve, plus the signal to fix what it cannot.
- The warning format (`ndr: skipping malformed atom <file> (<reason>)`) is machine-parseable enough for a lint pass to harvest.
- Strict targeted-read behavior means `getAtom` and `resolve <id>` are reliable for scripting — a zero-exit from those verbs guarantees a valid atom was returned.
- Implemented in `MarkdownLedgerAdapter.readAllAtoms`; no change to the port interface.
