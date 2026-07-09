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

## Why

The enforcement principle survives from the swamp era; only the mechanism changes — the markdown adapter now reads ledger-resident YAML files instead of a swamp-resident artifact.

The superseded atom established that taxonomy is a live runtime gate at persist time, not a Zod enum baked into the schema — adding a taxonomy value is a data mutation, not a code deploy. That principle is unchanged. What changed: the swamp migration pause killed the old mechanism (a live lookup against a swamp-resident taxonomy artifact). The markdown adapter now reads `<ledger>/.taxonomy/` YAML files at enforcement time, maintaining the same runtime-gate semantics. Doctor treats `.taxonomy/` as optional to avoid a hard failure when the directory is absent or unreadable: a health sweep should degrade gracefully and still report the other check classes.

## Alternatives

Hard-failing doctor when `.taxonomy/` is absent — rejected.

A missing taxonomy directory is not necessarily a corpus error; it may mean the operator hasn't seeded `.taxonomy/` yet. Hard-failing would block all doctor output on a setup gap unrelated to atom health. Advisory skip with a stderr note preserves the useful six remaining check classes.

## Consequences

Capture is a hard gate (exit 1, vault unchanged) on unknown area/topic · Doctor is advisory (violation = finding, missing `.taxonomy/` = skipped check class with stderr note) · Two enforcement sites plus the taxonomy file format must stay in sync

- Unlike `ndr capture` (which refuses the write), a missing or unreadable `.taxonomy/` causes `ndr doctor` to return `null` from `readTaxonomy` so the sweep proceeds with taxonomy checks skipped.
- The `.taxonomy/` files live inside the ledger directory, not the code repo — adding a new area or topic is a vault data change, not a CLI release.
- Supersedes 0072, whose mechanism (swamp-resident artifact + swamp-side lookup) is gone.
