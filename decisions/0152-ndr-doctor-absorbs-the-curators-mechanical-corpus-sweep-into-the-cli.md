---
id: "0152"
title: ndr doctor absorbs the curator's mechanical corpus sweep into the CLI
status: current
decision_date: 2026-06-04
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - tool-routing
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - "0060"
  - "0129"
---

# 0152 — ndr doctor absorbs the curator's mechanical corpus sweep into the CLI

## Decision

Corpus health checks move from the ndr-curator agent into a deterministic `ndr doctor [--ledger] [--fix] [--json]` command.

## Scope

- Binds: check classes covered by the sweep — bidirectional supersession integrity, dangling refs, status coherence, alias drift, taxonomy violations, missing required fields, id/title drift, and malformed-file findings.
- Does not bind: the existing `ReadPort`/`WritePort` code paths, which stay unchanged behind the new `DoctorPort`.

## Commitments

- Exit code contract: 0 for healthy or repaired, 1 when findings are present, 3 on repair write failure; `--json` enables machine consumers, with a grouped human report as the default.
- `--fix` mutates only the `superseded_by` node of the parsed YAML doc, deriving repair candidates from an existing schema-valid successor naming the predecessor (no status requirement on the successor); the rest of the file stays byte-stable.
- Malformed atoms surface as findings, never as silent skips — a health checker must not hide sick atoms (deliberate contrast with the bulk-verb skip behavior in the bulk-read atom).
- Until JUN-181 rewires `/drift-check`, `@ndr-drift-auditor`, and `@ndr-curator` onto `ndr doctor`, the agent keeps running as before.

## Revisit if

- The findings schema changes after JUN-181 lands and any consumer diverges from it.

## Context

- The curator agent re-derived check logic on every run, producing inconsistent findings and burning tokens on mechanical work.
- Agent-run checks were slow, non-deterministic, and had no stable output contract for downstream skills.

## Why

A deterministic CLI sweep runs in milliseconds, pipes cleanly to jq, and can be called from CI — none of which the agent-run checks could offer. Separating the check logic from its host also makes the surface testable in isolation: pure cross-atom checks live in `src/domain/doctor.ts` with no I/O, and a `DoctorPort` (`scanLedger` / `readTaxonomy` / `repairBackPointer`) keeps that surface apart from the existing `ReadPort`/`WritePort`. The agent becomes a thin wrapper once JUN-181 rewires `/drift-check`, `@ndr-drift-auditor`, and `@ndr-curator` onto the command's output contract.

## Alternatives

- **Keeping checks agent-side** — rejected: no stable output contract for downstream skills, can't run in CI, and re-implements the same logic on every invocation. The only upside (natural-language reporting) is preserved by routing agent output through `--json` findings.
