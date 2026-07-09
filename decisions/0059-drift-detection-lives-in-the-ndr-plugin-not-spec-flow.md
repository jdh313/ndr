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

## Commitments

- ndr gains a third user-facing skill (alongside `capture-decision` and `decisions`) and a fifth agent (alongside `curator`, `drafter`, `extractor`, `reviewer`).
- spec-flow:close carries an opt-in pre-archive prompt only, no implementation; its README links to ndr's drift-check.
- Drift-detection stays on-demand only, no hook integration — it does not run on every commit or spec-close.
- Repos using spec-flow without ndr cannot run drift-check.

## Context

- The v0.2.0 spec-flow rewrite (bec18a3) pivoted from ADR-centric to contract-centric and delegated the durable decision layer to ndr entirely; drift-check was deleted, not migrated.
- ndr already owns the supersession-chain traversal (via ndr:decisions).
- ndr-curator already handles corpus health (bidirectional pointers, orphans, taxonomy integrity).

## Why

ndr owns the decision atoms being audited and the supersession-chain walk; duplicating that walk in spec-flow would split the system of record. Restoring drift-check in spec-flow would require re-implementing traversal logic ndr already owns. A drift-auditor agent is a natural peer to ndr-curator at the code-vs-decision layer, not a foreign concern — keeping both capabilities in ndr preserves a single plugin as the semantic authority over decision atoms.

## Alternatives

- **Restore drift-check inside spec-flow** — rejected: would require spec-flow to re-implement the supersession-chain walk ndr:decisions already owns, blurring plugin boundaries between the system of record and a contract-lifecycle tool.
- **Extend ndr-curator with `--mode=drift`** — rejected: ndr-curator is mechanical (structural corpus health); drift-check is semantic (rationale vs. codebase). Bundling them conflates two distinct cognitive modes and complicates separate invocation.
