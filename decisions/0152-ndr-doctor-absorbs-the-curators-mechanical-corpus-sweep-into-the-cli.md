---
id: '0152'
title: ndr doctor absorbs the curator's mechanical corpus sweep into the CLI
status: current
decision_date: '2026-06-04'
aliases: []
project: '[[ndr]]'
derived_from: []
informed_by:
- '[[Decisions/0060-drift-check-in-ndr-audits-current-heads-only-amend-semantics-land-as-a-successor-atom]]'
- '[[Decisions/0129-ndr-is-cli-primary-with-a-library-underneath-skills-rewire-to-call-ndr-resolve]]'
supersedes: []
superseded_by: []
area: tooling
topic: tool-routing
impacts: []
revisit_triggers: []
reversibility: medium
tags:
- decision
---
# 0152 — ndr doctor absorbs the curator's mechanical corpus sweep into the CLI

## Decision

Corpus health checks move from the ndr-curator agent into a deterministic `ndr doctor [--ledger] [--fix] [--json]` command.

## Why

Agent-run checks are slow, token-costly, and non-deterministic; a CLI sweep is instant and scriptable.

> [!info]- Full reasoning
> The curator agent re-derived check logic on every run, producing inconsistent findings and burning tokens on mechanical work. A deterministic CLI command runs in milliseconds, pipes cleanly to jq, and can be called from CI. Separating the check logic from its host also makes the surface testable in isolation: pure cross-atom checks live in `src/domain/doctor.ts` with no I/O; a `DoctorPort` (`scanLedger` / `readTaxonomy` / `repairBackPointer`) keeps that surface apart from the existing `ReadPort`/`WritePort`. The agent becomes a thin wrapper once JUN-181 rewires `/drift-check`, `@ndr-drift-auditor`, and `@ndr-curator` onto the command's output contract.

## Alternatives

Keeping checks agent-side — rejected. Slow, token-costly, non-deterministic.

> [!info]- Why they lost
> The agent approach has no stable output contract for downstream skills, can't run in CI, and re-implements the same logic each invocation. The only upside (natural-language reporting) is preserved by routing agent output through `--json` findings.

## Assumptions

`doctor-output-contract-stable`

> [!warning]- doctor-output-contract-stable
> JUN-181 wires three skills/agents onto the `ndr doctor --json` findings schema before the agent wrapper is removed.
>
> - **Current state:** active — JUN-181 landed 2026-06-05; schema now load-bearing for `/drift-check`, `@ndr-drift-auditor`, `@ndr-curator`
> - **Revisit if:** the findings schema changes after JUN-181 lands and any consumer diverges

## Consequences

Check classes: bidirectional supersession integrity, dangling refs, status coherence, alias drift, taxonomy violations, missing required fields, id/title drift, malformed-file findings · `--fix` repairs missing `superseded_by` back-links only, idempotently · exit 0 healthy/repaired, 1 findings present, 3 repair write failure · `--json` enables machine consumers; human grouped report by default

> [!info]- Detail
> - Malformed atoms are findings, not skips — a health checker must not silently skip sick atoms (deliberate contrast with bulk-verb skip behavior; see the bulk-read atom for that side of the split).
> - `--fix` mutates only the `superseded_by` node of the parsed YAML doc; repair candidates derive from an existing schema-valid successor naming the predecessor, with no status requirement on the successor. Byte-stable: no other whitespace or node is touched.
> - The `DoctorPort` surface is distinct from `ReadPort`/`WritePort`; existing read/write code paths are unchanged.
> - JUN-181 rewires `/drift-check`, `@ndr-drift-auditor`, and `@ndr-curator` to call `ndr doctor`; until then the agent runs as before.
