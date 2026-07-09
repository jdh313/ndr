---
id: "0059"
title: Drift-detection lives in the ndr plugin, not spec-flow
status: current
decision_date: 2026-05-17
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - read-side
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by: []
---

# 0059 — Drift-detection lives in the ndr plugin, not spec-flow

## Decision

The code-vs-decision drift-check capability belongs in the ndr plugin (skill: `drift-check`, agent: `ndr-drift-auditor`); spec-flow's `close` skill offers it as an opt-in pre-archive prompt but does not own the implementation.

## Why

ndr owns the decision atoms being audited and the supersession-chain walk; duplicating that walk in spec-flow would split the system of record.

The v0.2.0 spec-flow rewrite (bec18a3) pivoted from ADR-centric to contract-centric and delegated the durable decision layer to ndr entirely — drift-check was deleted, not migrated. Restoring it in spec-flow would require re-implementing ndr's supersession-chain traversal, which ndr:decisions already owns. Beyond the duplication concern, ndr-curator already handles corpus health (bidirectional pointers, orphans, taxonomy integrity); a `drift-auditor` agent is a natural peer at the code-vs-decision layer, not a foreign concern. Keeping both capabilities in ndr preserves a single plugin as the semantic authority over decision atoms.

## Alternatives

Restore drift-check inside spec-flow (rejected) · Extend ndr-curator with `--mode=drift` (rejected)

**Restore drift-check inside spec-flow:** Would require spec-flow to re-implement the supersession-chain walk that ndr:decisions owns. ndr is the system of record for decision atoms; spec-flow is a contract lifecycle tool. Responsibilities would blur across plugin boundaries.

**Extend ndr-curator with `--mode=drift`:** ndr-curator is mechanical — it audits structural corpus health (pointer hygiene, orphan detection, taxonomy correctness). Drift-check is semantic — it asks whether a decision's stated rationale still holds against the codebase. Bundling them under one agent conflates two distinct cognitive modes and complicates separate invocation. Keeping them as siblings (`ndr-curator` and `ndr-drift-auditor`) lets each stay focused and separately invocable.

## Consequences

ndr gains `drift-check` skill + `ndr-drift-auditor` agent · spec-flow:close gains an opt-in prompt, not an implementation · drift-detection is on-demand only, no hook integration · repos using spec-flow without ndr cannot run drift-check

- ndr gains a third user-facing skill (alongside `capture-decision` and `decisions`) and a fifth agent (alongside `curator`, `drafter`, `extractor`, and `reviewer`).
- spec-flow:close references the capability via an opt-in pre-archive prompt; the spec-flow README links to ndr's drift-check but carries no implementation.
- The v0.1 on-demand-only stance is preserved — no hook integration. Drift-check runs when explicitly invoked, not on every commit or spec-close.
- Repos using spec-flow but not ndr cannot run drift-check. This is acceptable: drift-check is only meaningful when an ndr corpus of decision atoms exists to check against.
