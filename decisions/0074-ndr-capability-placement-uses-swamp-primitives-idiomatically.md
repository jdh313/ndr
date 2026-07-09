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

## Why

Each swamp primitive has a distinct execution context and access pattern; forcing all logic into model methods produces an over-coupled model with no benefit.

- **Model methods** (`persist`, `supersede`, `lookup`, `parseMarkdown`) handle state mutations and single-artifact reads. They run with the model's lock and have access to `data.latest`/`data.query`.
- **Report** (`vault-sync`) is the right primitive for projection: it reads all decision artifacts and emits files. Reports are idempotent by contract and run on demand or on a schedule — exactly the semantics the vault sync needs.
- **Workflows** (`migrate`, `drift-check`) coordinate multiple steps, models, and agents over time. `migrate` sequences parseMarkdown → persist → vault-sync across 69 atoms; `drift-check` sequences query → diff → agent → report. Neither fits in a single method call.
- **Read-side skill** (`/decisions`) keeps `walkChain` as CEL composition: `data.query('decision', 'supersedes contains <id>')` forward, reverse for backward. The skill already owns the user-facing surface; chain-walking is pure read logic that composes lookup and query without touching state. Promoting it to a model method adds a lock acquisition for a read-only operation and couples the model to a navigation pattern that belongs in the read tier.

## Alternatives

Make everything a model method: rejected. Keep all logic in plugin Python scripts alongside swamp calls: rejected.

- **Everything as model methods:** Model methods run under the per-model lock. Read-only operations (walkChain) should not acquire a write lock. Projection logic (vault-sync) does not belong on the artifact's model — it reads across all artifacts and writes to the filesystem. Workflows needing retry, parallelism, and multi-model coordination are not expressible as a single method.
- **Hybrid Python plugin + swamp:** Keeps two write paths. The point of the migration is a single canonical substrate; a permanent hybrid adds coordination overhead and drift risk between the two paths.

## Consequences

Model: `persist`/`supersede`/`lookup`/`parseMarkdown` · Report: `vault-sync` (idempotent projection) · Workflows: `migrate` + `drift-check` · Skill: `walkChain` as CEL

- **Model methods on `@jdh313/ndr/decision`:** `persist` (write + corpus checks), `supersede` (flip predecessor + write successor), `lookup` (by id or slug), `parseMarkdown` (extract frontmatter + body structure from existing `.md`).
- **Report `@jdh313/ndr/vault-sync`:** reads all decision artifacts, emits `~/Loose Ends/Decisions/<id>-<slug>.md`. Idempotent — byte-stable output or it is a bug.
- **Workflow `migrate`:** sequences `parseMarkdown` → `persist` → `vault-sync` for each of the 69 existing atoms. Includes round-trip verification step.
- **Workflow `drift-check`:** queries current atoms, diffs against vault files, routes discrepancies to a drift-auditor agent, emits a report.
- **Skill `/decisions`:** chain-walking stays as CEL query composition. Re-homing `walkChain` to a model method later is a non-breaking refactor.
