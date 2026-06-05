---
id: '0145'
title: ndr capture pre-flights supersession conflicts before writing the successor
status: current
decision_date: '2026-06-02'
aliases: []
project: '[[ndr]]'
derived_from: []
informed_by:
- '[[Decisions/0051-supersession-with-slug-is-three-writes]]'
supersedes: []
superseded_by: []
area: tooling
topic: supersession
impacts: []
revisit_triggers: []
reversibility: medium
tags:
- decision
---
# 0145 — ndr capture pre-flights supersession conflicts before writing the successor

## Decision

The `ndr capture` write path validates every predecessor in `supersedes:` before issuing any write — a dangling ref or an already-superseded predecessor exits cleanly with nothing on disk, not an orphan successor.

## Why

Conflicts detected before the first write leave the vault in a clean state; conflicts detected mid-write can only leave it dirtier.

> [!info]- Full reasoning
> The `persist.py` reference wrote the successor first, then patched each predecessor. Any conflict (dangling ref, predecessor already carrying a `superseded_by`) surfaced only after the successor file had landed, leaving an orphan atom that had to be manually removed.
>
> Moving the conflict checks into a pre-flight phase makes deliberate refusals atomic: either the entire operation proceeds or nothing is written. The actual three-write ordering from 0051 (successor file → predecessor `superseded_by` patch → alias handover) is unchanged for the happy path — the pre-flight only governs the deliberate-refusal cases, not the crash-safety ordering.

## Alternatives

Keep the persist.py write-then-detect order and add a compensating delete on conflict detection — rejected.

> [!info]- Why they lost
> A compensating delete on conflict adds a fourth write path and a new failure mode (delete fails, now the orphan and the error both need cleanup). Pre-flight validation is simpler and has no failure mode that leaves state on disk.

## Assumptions

`pre-flight-is-complete` · `exit-3-is-reserved`

> [!warning]- pre-flight-is-complete
> Pre-flight can enumerate all conflict conditions (dangling ref, double-successor) before the first write — no conflict condition is discoverable only during the write itself.
>
> - **Current state:** active
> - **Revisit if:** a new conflict type is identified that requires I/O to detect and cannot be checked against the in-memory atom graph before writing

> [!warning]- exit-3-is-reserved
> Exit code 3 (half-state) is reachable only via genuine mid-write I/O failure after the successor file lands — not via any deliberate refusal path.
>
> - **Current state:** active
> - **Revisit if:** a deliberate refusal needs to distinguish partial-write scenarios from clean pre-flight failures

## Consequences

Conflict refusals are atomic · Orphan successors on conflict are eliminated · Exit-code semantics tighten: 1 = validation, 2 = supersession conflict, 3 = mid-write I/O only

> [!info]- Detail
> - Exit 1 (validation failure) and exit 2 (supersession conflict) are now guaranteed to leave the vault unchanged — the exit code itself communicates clean-refusal vs. partial-write without the caller needing to inspect the file system.
> - Exit 3 remains reserved for the narrow case where the successor file has already been written when an I/O failure occurs on a subsequent patch. Callers that see exit 3 should inspect the vault before retrying.
> - The three-write ordering from 0051 (crash safety = overcount, never undercount) is unaffected — pre-flight runs before write phase 1.
