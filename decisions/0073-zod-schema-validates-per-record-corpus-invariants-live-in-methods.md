---
id: '0073'
title: Zod schema validates per-record; corpus invariants live in methods
status: current
decision_date: '2026-05-18'
aliases: []
project: '[[ndr]]'
derived_from: []
informed_by: []
supersedes: []
superseded_by: []
area: architecture
topic: write-side
impacts: []
revisit_triggers: []
reversibility: medium
tags:
- decision
---
# 0073 — Zod schema validates per-record; corpus invariants live in methods

## Decision

The Zod schema for `@jdh313/ndr/decision` validates a single record's shape; cross-atom invariants (supersession chain integrity, alias uniqueness, reference resolution) live in model methods `persist` and `supersede`.

## Why

Schema refinements that reach outside one record require querying other artifacts — that is method work, not schema work.

> [!info]- Full reasoning
> A Zod schema operates on a single object in isolation. It can enforce that `status` is one of three values, that `reversibility` is present, that the body string contains the required headings. It cannot check whether an alias is unique across all `status: current` atoms, whether a `supersedes` id refers to an atom that actually exists and is `current`, or whether patching `superseded_by` on a predecessor would create a double-supersession. Those checks require querying the artifact corpus — the right home is method logic that runs inside swamp's execution environment where `data.query` and `data.latest` are available. The split is swamp-idiomatic: schema is the shape contract, methods are the corpus contract. Body altitude shape (heading + gist + collapsed callout) is too soft for either layer — that remains the `ndr-reviewer` subagent's job.

## Consequences

Zod enforces record shape · `decision.persist` enforces corpus constraints · `decision.supersede` guards against double-supersession · Body altitude remains reviewer territory

> [!info]- Detail
> - **Zod schema enforces:** required fields present and typed, `status` in `{current, superseded, retracted}`, `reversibility` in `{easy, medium, hard}`, body string contains `## Decision`, `## Why`, `## Consequences` headings.
> - **`decision.persist` enforces:** taxonomy lookup for `area`/`topic`, alias uniqueness across `status: current` artifacts, `supersedes`/`superseded_by` reference resolution (referenced ids exist).
> - **`decision.supersede` enforces:** predecessor exists and is `status: current` — rejects an attempt to supersede an already-superseded atom, matching today's exit-code-2 behavior in the plugin.
> - **Body altitude shape** (`## Why` gist + collapsed callout, correct heading order) is too soft for a hard schema constraint and too nuanced for a method assertion. It stays with the `ndr-reviewer` subagent.
> - Re-homing validation between layers later (e.g., promoting alias uniqueness into a Zod async refinement) is a mechanical refactor — no data migration required, hence `reversibility: medium`.
