---
id: "0072"
title: Taxonomy as sibling swamp model with method-time validation
status: superseded
decision_date: 2026-05-18
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - architecture
  - data-modelling
binds: []
supersedes: []
superseded_by:
  - "0153"
derived_from: []
informed_by: []
---

# 0072 — Taxonomy as sibling swamp model with method-time validation

## Decision

Areas and topics live as their own `@jdh313/ndr/taxonomy` swamp model; `decision.persist` reads the taxonomy artifact at method-time and rejects unknown values. Adding a new area or topic is a data mutation, not an extension rebuild.

## Commitments

- `@jdh313/ndr/taxonomy` is a separate extension alongside `@jdh313/ndr/decision`, holding the canonical vocabulary artifact.
- `decision.persist` calls `data.latest('taxonomy', 'vocabulary')` and rejects any `area`/`topic` not present — same enforcement surface as the old `taxonomy.yaml` check, but runtime rather than parse-time.
- Taxonomy history is carried by swamp data versioning: adding `process/rollback-playbook` produces a new data version with timestamp and author.
- Collapsing taxonomy back into a Zod enum later rebuilds the extension but does not touch decision artifacts (medium reversibility).

## Context

- Areas and topics were enforced via a `taxonomy.yaml` parse-time check.
- Encoding them as Zod enums would make each vocabulary addition a publish cycle (edit enum, rebuild, republish).
- The vocabulary grows organically as the project scope grows.

## Why

Taxonomy needs to be mutable without a code deploy, but enforcement must stay a hard write-time constraint. A Zod enum gives the strongest type guarantee at exactly the wrong friction: intentional for schema shape, wrong for an organically-growing vocabulary. A sibling swamp model gives the taxonomy its own data artifact, version history, and methods (`addArea`, `addTopic`, `list`), while `decision.persist` enforces it as a live lookup — an unknown area still fails at persist time, but the fix is a `swamp model method run @jdh313/ndr/taxonomy addArea` call, not a code change. The taxonomy is also independently queryable and versioned, so the full history of when each area or topic entered the system is available without inspecting git.

## Alternatives

- **Zod enum in the Decision schema** — rejected: any new area or topic requires editing the extension source, rebuilding, and republishing, making every vocabulary addition a development task as the taxonomy grows with project scope.
- **Flat config file bundled with the extension** — rejected: avoids the enum rebuild but is opaque to swamp queries, loses version history except through git, and cannot be mutated at runtime without an out-of-band file edit.
