---
id: '0072'
title: Taxonomy as sibling swamp model with method-time validation
status: superseded
decision_date: '2026-05-18'
aliases: []
project: '[[ndr]]'
derived_from: []
informed_by: []
supersedes: []
superseded_by:
- '[[Decisions/0153-taxonomy-enforcement-in-the-cli-era-hard-gate-at-capture-advisory-at-doctor]]'
area: architecture
topic: data-modelling
impacts: []
revisit_triggers: []
reversibility: medium
tags:
- decision
---
# 0072 — Taxonomy as sibling swamp model with method-time validation

## Decision

Areas and topics live as their own `@jdh313/ndr/taxonomy` swamp model; `decision.persist` reads the taxonomy artifact at method-time and rejects unknown values. Adding a new area or topic is a data mutation, not an extension rebuild.

## Why

Taxonomy needs to be mutable without a code deploy, but enforcement must remain a hard constraint at write time.

> [!info]- Full reasoning
> Encoding areas and topics as Zod enums provides the strongest type guarantee but makes taxonomy extension a publish cycle: edit the enum, rebuild, republish the extension. That friction is intentional for schema shape but wrong for a vocabulary that grows organically. A sibling swamp model gives the taxonomy its own data artifact, version history, and methods (`addArea`, `addTopic`, `list`) while letting `decision.persist` enforce it as a live lookup. The enforcement friction is preserved — an unknown area still fails at persist time — but the fix is a `swamp model method run @jdh313/ndr/taxonomy addArea` call, not a code change. The taxonomy is also independently queryable and versioned: the full history of when each area or topic entered the system is available without inspecting git commits.

## Alternatives

Zod enum in Decision schema: rejected (rebuild on every new area). Flat config file in the extension bundle: rejected (not queryable, not versioned independently).

> [!info]- Why they lost
> - **Zod enum:** Any new area or topic requires editing the extension source, rebuilding, and republishing. The taxonomy grows as the project scope grows — this would make every vocabulary addition a development task.
> - **Flat config file bundled with the extension:** Avoids the enum rebuild, but the file is opaque to swamp queries, loses version history except through git, and cannot be mutated at runtime without an out-of-band file edit.

## Consequences

Sibling model `@jdh313/ndr/taxonomy` with `addArea`/`addTopic`/`list` methods · New area/topic is a data mutation · `decision.persist` enforces via live lookup · Taxonomy is independently versioned

> [!info]- Detail
> - `@jdh313/ndr/taxonomy` is a separate extension alongside `@jdh313/ndr/decision`. It holds the canonical vocabulary artifact.
> - `decision.persist` calls `data.latest('taxonomy', 'vocabulary')` and rejects any `area` or `topic` not present — same enforcement surface as today's `taxonomy.yaml` check, but runtime rather than parse-time.
> - Taxonomy history is swamp data versioning: adding `process/rollback-playbook` produces a new data version with timestamp and author.
> - Collapsing taxonomy back into a Zod enum later requires rebuilding the extension but does not touch decision artifacts — reversibility is medium.
