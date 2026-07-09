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

## Why

A failed round-trip discovered after subagent refactoring leaves the pipeline broken with no clean fallback; sequencing the proof first keeps the existing path alive as a gate.

The `.md` round-trip (parse → persist → emit-markdown) is the integrity test for the entire hybrid architecture. If `vault-sync` cannot reproduce semantically-identical markdown from swamp data for every existing atom, the projection is unsound and the migration should not proceed. Running this test while `persist.py` and the plugin subagents are still the authoritative write path means a failed test has zero production impact — the existing pipeline continues operating. Only after round-trip is proven green on all 69 atoms does Phase 2 begin: refactoring `ndr-extractor`, `ndr-drafter`, `ndr-reviewer`, and the orchestrator to call `swamp model method run` instead of `persist.py`. `persist.py` is then retired. Phase 1 is purely additive; abandoning it at any point leaves the existing pipeline intact.

## Assumptions

`existing-pipeline-stability`

The current plugin subagents and `persist.py` remain stable and unmodified during Phase 1.

- **Current state:** active — no Phase 1 changes touch the plugin path
- **Revisit if:** a critical bug in `persist.py` requires a fix during Phase 1; patch the plugin, do not merge Phase 1 and Phase 2 work

## Consequences

Phase 1 is purely additive · Round-trip on 69 atoms gates Phase 2 · Subagents refactored only after gate passes · `persist.py` retired at end of Phase 2

- **Phase 1 deliverables:** `@jdh313/ndr/decision` model, `@jdh313/ndr/taxonomy` model, `migrate` workflow, `vault-sync` report. Round-trip verification pass on all 69 atoms.
- **Phase 1 success criterion:** `vault-sync` produces byte-stable (or semantically-identical with documented, intentional diffs) `.md` files for every existing atom. Any atom that fails is a blocker.
- **Phase 2 deliverables:** `ndr-extractor`, `ndr-drafter`, `ndr-reviewer`, and orchestrator refactored to invoke `swamp model method run`. `persist.py` removed.
- **If Phase 1 fails:** project halts. Existing plugin pipeline remains the write path. No subagent changes are made.
- **Reversibility is easy:** Phase 1 adds artifacts and workflows without modifying any existing file. The swamp migration can be abandoned at any point during Phase 1 with no cleanup required beyond deleting the new extension models.
