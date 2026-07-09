---
id: "0153"
title: "Taxonomy enforcement in the CLI era: hard gate at capture, advisory at doctor"
status: current
decision_date: 2026-06-04
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - architecture
  - write-side
binds: []
supersedes:
  - "0072"
superseded_by: []
derived_from: []
informed_by:
  - "0073"
---

# 0153 — Taxonomy enforcement in the CLI era: hard gate at capture, advisory at doctor

## Decision

Taxonomy is enforced at two altitudes: `ndr capture` refuses unknown area/topic values (exit 1, vault unchanged), while `ndr doctor` checks the same lists advisorily — violations are findings, and a missing or unreadable `.taxonomy/` skips the taxonomy checks with a stderr note rather than failing the sweep.

## Commitments

- Two enforcement sites (`ndr capture` and `ndr doctor`) plus the taxonomy file format must stay in sync going forward.
- Unlike `ndr capture` (which refuses the write on an unknown value), a missing or unreadable `.taxonomy/` causes `ndr doctor` to return `null` from `readTaxonomy` so the sweep proceeds with taxonomy checks skipped.
- `.taxonomy/` files live inside the ledger directory, not the code repo — adding a new area or topic is a vault data change, not a CLI release.

## Context

- The predecessor decision (0072) established taxonomy as a live runtime gate at persist time, not a schema-baked enum — adding a taxonomy value is a data mutation, not a code deploy.
- The swamp migration pause killed 0072's mechanism: a live lookup against a swamp-resident taxonomy artifact.

## Why

The enforcement principle from 0072 survives unchanged; only the mechanism changes. The markdown adapter now reads `<ledger>/.taxonomy/` YAML files at enforcement time, maintaining the same runtime-gate semantics. Doctor treats `.taxonomy/` as optional to avoid a hard failure when the directory is absent or unreadable: a health sweep should degrade gracefully and still report the other check classes.

## Alternatives

- **Hard-failing doctor when `.taxonomy/` is absent** — rejected: a missing taxonomy directory isn't necessarily a corpus error (the operator may not have seeded it yet), and hard-failing would block all doctor output over a setup gap unrelated to atom health. Advisory skip with a stderr note preserves the other six check classes.
