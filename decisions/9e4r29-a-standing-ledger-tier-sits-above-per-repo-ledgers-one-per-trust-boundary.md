---
id: "9e4r29"
title: A standing ledger tier sits above per-repo ledgers, one per trust boundary
status: current
decision_date: 2026-08-22
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - substrate
  - file-organization
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - 15qzf2
---

# 9e4r29 — A standing ledger tier sits above per-repo ledgers, one per trust boundary

## Decision

A standing ledger holds atoms that no single repo owns — durable positions and
atoms binding several projects. There is one standing ledger per trust boundary,
never one shared across boundaries, so a work standing ledger and a personal one
never see each other.

## Scope

- Binds: where an atom lives when its scope names several projects or wildcards
  the project dimension.
- Does not bind: the standing ledger's substrate, which is decided separately.
- Does not bind: per-repo ledgers, which keep owning atoms scoped to one project.

## Commitments

- A standing ledger is an ordinary ledger to every read path; nothing may treat
  it as a special case beyond being in the read set.
- Trust boundaries are enforced by a ledger being absent, never by filtering a
  ledger that is present.
- An atom whose project dimension wildcards belongs in a standing ledger; one
  sitting in a repo ledger is a corpus-health finding.

## Revisit if

- A standing atom needs to be visible inside one trust boundary and invisible in
  another, which absence cannot express.
- Standing atoms accumulate to where they need internal partitioning of their own.

## Context

- A position such as "use pydantic-settings for env config" predates the repos it
  governs and outlives them.
- pydantic-settings was decided independently in `lifeops` and `radar`, and Bun
  CLI distribution independently in `ndr` and `clearance-driven-dev` — re-reasoned
  each time, with no shared lineage.
- Every ledger is pinned to a repo root by `.ndr.toml`, so an atom governing no
  single repo has no home.
- Seven atoms exist twice across `jdh-agents` and an archived spike, differing
  only in their `project:` line.
- A ledger holding 28 atoms across 8 distinct projects already exists in the
  vault, reachable only from directories that no repo ledger claims.
- Decision records are also kept on a work machine whose ledger is unreachable
  from personal machines.

## Why

The cost being paid is re-deciding, not duplicating. A duplicated atom costs one
edited line and did not drift; a re-derived decision costs the whole
deliberation again, and the corpus shows that happening across four ledgers on
three separate positions. Only a tier that no repo owns can hold the decision
once.

Binding the tier to a trust boundary rather than to a person or a machine is the
load-bearing half. Enforcement then needs no mechanism: the personal standing
ledger is not present on the work machine, so there is nothing to filter, nothing
to misconfigure, and no leak surface. A single shared tier would have to solve
partitioning deliberately and would fail open.

## Alternatives

- **Pin standing decisions to whichever repo discovered them first** — rejected:
  makes every other repo's inheritance depend on an arbitrary historical accident,
  and the owning repo can be archived.
- **Replicate a standing atom into every repo that needs it** — rejected: the
  status quo, and the corpus already shows same-id copies forking into divergent
  bodies.
- **One shared standing tier across all boundaries with per-atom visibility** —
  rejected: makes leaking work decisions a configuration error rather than an
  impossibility.
