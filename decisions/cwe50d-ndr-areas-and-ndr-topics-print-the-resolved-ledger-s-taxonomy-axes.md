---
id: "cwe50d"
title: ndr areas and ndr topics print the resolved ledger's taxonomy axes
status: current
decision_date: 2026-06-07
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - read-side
binds: []
supersedes: []
superseded_by: []
derived_from:
  - ndr CLI session 2026-06-07
informed_by: []
---

# cwe50d — ndr areas and ndr topics print the resolved ledger's taxonomy axes

## Decision

`ndr areas` and `ndr topics` print the resolved ledger's taxonomy axis values — one per line, or a JSON array under `--json` — reusing the adapter's `readTaxonomy()`.

## Why

Drafting a decision requires knowing the valid area/topic values; the prior path was reading `.taxonomy/*.yaml` by hand.

The capture flow hard-gates on taxonomy values, so a drafter needs to know what's allowed before composing. Exposing the lists as first-class verbs removes the cat-the-YAML step and keeps the read surface consistent — both verbs accept `--json` for parity with the other read verbs and reuse the same `readTaxonomy()` the doctor sweep uses, so there is no second taxonomy reader to keep in sync. A missing taxonomy exits 1, since printing the list is the verb's entire job.

## Consequences

Reuse `readTaxonomy()` (no second reader) · `--json` parity · missing taxonomy exits 1

- Sharing `readTaxonomy()` with the doctor path means one parse implementation, one place for taxonomy-format changes.
- Read-only with no ledger side effects, so reversibility is easy.
