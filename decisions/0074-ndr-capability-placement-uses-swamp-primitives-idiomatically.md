---
id: "0074"
title: NDR capability placement uses swamp primitives idiomatically
status: current
decision_date: 2026-05-18
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - architecture
  - framework
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - "0006"
---

# 0074 — NDR capability placement uses swamp primitives idiomatically

## Decision

Each NDR capability lands on the swamp primitive that fits it: typed mutations on the model, projections on a report, multi-step pipelines on workflows, read-side resolution in the skill via CEL. Not everything is a model method.

## Commitments

- Model methods on `@jdh313/ndr/decision`: `persist` (write + corpus checks), `supersede` (flip predecessor + write successor), `lookup` (by id or slug), `parseMarkdown` (extract frontmatter + body from existing `.md`) — state mutations and single-artifact reads, run under the model lock.
- Report `@jdh313/ndr/vault-sync`: reads all decision artifacts and emits `~/Loose Ends/Decisions/<id>-<slug>.md`; idempotent (byte-stable output or it is a bug).
- Workflow `migrate` sequences `parseMarkdown` → `persist` → `vault-sync` across the 69 existing atoms, with a round-trip verification step; workflow `drift-check` sequences query → diff → agent → report.
- Skill `/decisions` keeps `walkChain` as CEL query composition; re-homing it to a model method later is a non-breaking refactor.

## Context

- The swamp migration (0070) made swamp the canonical substrate, exposing model methods, reports, and workflows as available primitives.
- Each primitive has a distinct execution context and access pattern: model methods run under a per-model write lock with `data.latest`/`data.query`; reports are idempotent projections; workflows coordinate multiple steps, models, and agents over time; skills own the user-facing read surface.

## Why

Forcing all logic into model methods produces an over-coupled model with no benefit, because each primitive fits a different capability. Projection (`vault-sync`) reads across all artifacts and writes to the filesystem — it does not belong on any single artifact's model. Multi-step coordination (`migrate`, `drift-check`) needs retry, parallelism, and multi-model reach that a single method call cannot express. Read-only chain-walking (`walkChain`) should not acquire a write lock, and coupling the model to a navigation pattern that belongs in the read tier is exactly the over-coupling to avoid; the skill already owns the user-facing surface and composes lookup and query without touching state.

## Alternatives

- **Everything as model methods** — rejected: model methods run under the per-model write lock, so read-only operations would acquire a write lock, projection logic would sit on the wrong model, and multi-model workflows are not expressible as a single method.
- **Hybrid Python plugin + swamp** — rejected: keeps two write paths, when the point of the migration is a single canonical substrate; a permanent hybrid adds coordination overhead and drift risk between the paths.
