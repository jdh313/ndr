---
id: "0075"
title: "Migration is two-phase: prove swamp round-trip before refactoring plugin
  subagents"
status: current
decision_date: 2026-05-18
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - process
  - deployment
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by: []
---

# 0075 — Migration is two-phase: prove swamp round-trip before refactoring plugin subagents

## Decision

Build the swamp extensions alongside today's plugin pipeline in Phase 1 and prove byte-stable round-trip on all 69 existing atoms before touching any subagent in Phase 2.

## Commitments

- Round-trip on all 69 atoms gates Phase 2 — refactoring `ndr-extractor`, `ndr-drafter`, `ndr-reviewer`, and the orchestrator to call `swamp model method run` cannot start until the gate passes. `persist.py` is retired only at the end of Phase 2.
- Phase 1 deliverables: `@jdh313/ndr/decision` model, `@jdh313/ndr/taxonomy` model, `migrate` workflow, `vault-sync` report, plus a round-trip verification pass on all 69 atoms.
- Phase 1 success criterion: `vault-sync` produces byte-stable (or semantically-identical with documented, intentional diffs) `.md` files for every existing atom — any atom that fails is a blocker.
- Phase 1 additions must not modify any existing file (purely additive) — abandoning Phase 1 at any point requires no cleanup beyond deleting the new extension models.
- If Phase 1 fails, the project halts: the existing plugin pipeline remains the write path and no subagent changes are made.

## Revisit if

- A critical bug in `persist.py` requires a fix during Phase 1 — patch the plugin directly; do not merge Phase 1 and Phase 2 work.

## Context

- The plugin subagents (`ndr-extractor`, `ndr-drafter`, `ndr-reviewer`) and orchestrator, plus `persist.py`, are the current authoritative write path for NDR atoms.
- 69 atoms exist in the current pipeline.
- A failed round-trip discovered only after subagent refactoring would leave the pipeline broken with no clean fallback.

## Why

The `.md` round-trip (parse -> persist -> emit-markdown) is the integrity test for the entire hybrid architecture: if `vault-sync` cannot reproduce semantically-identical markdown from swamp data for every existing atom, the projection is unsound and the migration should not proceed. Sequencing that proof before subagent refactoring keeps the existing path alive as a gate — running the test while `persist.py` and the plugin subagents are still authoritative means a failed test has zero production impact. Only after round-trip is proven green on all 69 atoms does Phase 2 begin.
