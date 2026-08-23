---
id: "0145"
title: ndr capture pre-flights supersession conflicts before writing the successor
status: superseded
decision_date: 2026-06-02
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - supersession
binds: []
supersedes: []
superseded_by:
  - h4yfcd
derived_from: []
informed_by:
  - "0051"
---

# 0145 — ndr capture pre-flights supersession conflicts before writing the successor

## Decision

The `ndr capture` write path validates every predecessor in `supersedes:` before issuing any write — a dangling ref or an already-superseded predecessor exits cleanly with nothing on disk, not an orphan successor.

## Commitments

- Exit-code semantics tighten: 1 = validation failure, 2 = supersession conflict — both guaranteed to leave the vault unchanged. 3 = mid-write I/O failure, reachable only after the successor file has already landed.
- Callers that see exit 3 must inspect the vault before retrying — it signals a partial write, not a clean refusal.
- The three-write ordering from 0051 (crash safety = overcount, never undercount) is unaffected; pre-flight runs strictly before write phase 1.

## Revisit if

- A new conflict type is identified that requires I/O to detect and cannot be checked against the in-memory atom graph before writing.
- A deliberate refusal needs to distinguish partial-write scenarios from clean pre-flight failures.

## Context

- The `persist.py` reference wrote the successor file first, then patched each predecessor.
- Any conflict (a dangling ref, or a predecessor already carrying a `superseded_by`) surfaced only after the successor file had landed, leaving an orphan atom that had to be removed manually.

## Why

Conflicts detected before the first write leave the vault in a clean state; conflicts detected mid-write can only leave it dirtier. Moving the conflict checks into a pre-flight phase makes deliberate refusals atomic: either the entire operation proceeds or nothing is written. The three-write ordering from 0051 (successor file -> predecessor `superseded_by` patch -> alias handover) is unchanged for the happy path — the pre-flight only governs the deliberate-refusal cases, not the crash-safety ordering.

## Alternatives

- **Keep the persist.py write-then-detect order, adding a compensating delete on conflict detection** — rejected: adds a fourth write path and a new failure mode (delete fails, leaving both the orphan and the error to clean up); pre-flight validation is simpler and has no failure mode that leaves state on disk.
