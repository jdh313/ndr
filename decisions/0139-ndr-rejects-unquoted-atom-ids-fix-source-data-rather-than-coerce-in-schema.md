---
id: "0139"
title: ndr rejects unquoted atom ids; fix source data rather than coerce in schema
status: current
decision_date: 2026-06-02
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - write-side
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - "0134"
  - "0133"
---

# 0139 — ndr rejects unquoted atom ids; fix source data rather than coerce in schema

## Decision

FrontmatterSchema keeps a strict quoted-string id (`^\d{4}$`); an unquoted `id: 0128` that YAML parses as integer 128 is rejected — the fix is to quote ids in source atom files, not to add number-coercion logic to the schema.

## Why

Coercion in the schema would silently mask malformed source data and entrench the YAML-number-parsing footgun; quoting at the source keeps the schema honest and the data correct.

YAML parses an unquoted `id: 0128` as the integer `128`, which then fails the `^\d{4}$` regex. The schema could preprocess the value — cast number to zero-padded string — before validation. That was considered and rejected: it makes the schema a silent repair layer, hides the fact that 32 existing atoms had malformed ids, and trains authors to treat quoting as optional. The right fix is one-time source migration (quote the 32 offending atoms) plus a strict schema that rejects the pattern going forward. Any future unquoted id surfaces immediately as a validation error rather than passing silently through a coercion shim.

## Alternatives

Schema coercion (number -> zero-padded string before Zod parse) — rejected.

- **Schema coercion:** silently accepts malformed source data, masks the footgun, and produces a schema whose behavior diverges from its declared type. The 32-atom migration is a one-time cost; the coercion shim would be permanent complexity with no upside once the vault is clean.

## Assumptions

`vault-ids-are-quoted`

All atom files in the vault have quoted id fields after the 32-atom migration.

- **Current state:** migrated 2026-06-02
- **Revisit if:** a new atom-creation path (external script, manual authoring) produces unquoted ids and the validation error rate rises

## Consequences

32 existing vault atoms migrated to quoted ids · Schema rejects unquoted ids at parse time · No coercion logic in FrontmatterSchema

- The 32-atom migration is a one-time historical fix; new atoms authored through `persist.py` emit quoted ids by construction.
- Strict rejection means a misconfigured authoring path surfaces immediately — no silent data drift.
- FrontmatterSchema stays a pure validator with no repair behavior, which keeps its contract clear for downstream consumers.
