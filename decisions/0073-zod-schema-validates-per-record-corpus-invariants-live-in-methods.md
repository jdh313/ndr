---
id: "0073"
title: Zod schema validates per-record; corpus invariants live in methods
status: current
decision_date: 2026-05-18
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - architecture
  - write-side
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by: []
---

# 0073 — Zod schema validates per-record; corpus invariants live in methods

## Decision

The Zod schema for `@jdh313/ndr/decision` validates a single record's shape; cross-atom invariants (supersession chain integrity, alias uniqueness, reference resolution) live in model methods `persist` and `supersede`.

## Commitments

- The Zod schema enforces per-record shape only: required fields present and typed, `status` in `{current, superseded, retracted}`, `reversibility` in `{easy, medium, hard}`, body string contains the required headings.
- `decision.persist` enforces corpus constraints: taxonomy lookup for `area`/`topic`, alias uniqueness across `status: current` artifacts, and `supersedes`/`superseded_by` reference resolution.
- `decision.supersede` guards the chain: predecessor must exist and be `status: current`, rejecting an attempt to supersede an already-superseded atom (matching the plugin's exit-code-2 behavior).
- Body altitude shape (`## Why` gist + collapsed callout, correct heading order) stays the `ndr-reviewer` subagent's job — too soft for a schema constraint, too nuanced for a method assertion.
- Re-homing a check between layers later (e.g. promoting alias uniqueness into a Zod async refinement) is a mechanical refactor, no data migration (medium reversibility).

## Context

- A Zod schema operates on a single object in isolation — it cannot see other artifacts.
- Cross-atom checks (alias uniqueness across current atoms, supersedes-reference resolution, double-supersession) require querying the corpus.
- swamp method logic runs inside an execution environment where `data.query` and `data.latest` are available.

## Why

Schema refinements that reach outside one record require querying other artifacts — that is method work, not schema work. A single-object validator can enforce that `status` is one of three values or that the body contains the required headings, but it cannot check whether an alias is unique across all current atoms, whether a `supersedes` id refers to an atom that exists and is current, or whether patching a predecessor's `superseded_by` would create a double-supersession. The split is swamp-idiomatic: schema is the shape contract, methods are the corpus contract. Body altitude is too soft for either layer, so it stays with the reviewer subagent.
