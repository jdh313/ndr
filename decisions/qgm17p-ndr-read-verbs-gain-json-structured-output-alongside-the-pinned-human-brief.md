---
id: "qgm17p"
title: ndr read verbs gain --json structured output alongside the pinned human brief
status: current
decision_date: 2026-06-07
aliases: []
project: "[[ndr]]"
derived_from:
  - "[[ndr CLI session 2026-06-07]]"
informed_by: []
supersedes: []
superseded_by: []
area: tooling
topic: read-side
impacts: []
revisit_triggers: []
reversibility: medium
tags:
  - decision
---

# qgm17p — ndr read verbs gain --json structured output alongside the pinned human brief

## Decision

`resolve`, `search`, `current`, and `lineage` each accept a `--json` flag emitting structured output instead of the pinned human brief, complementing rather than replacing the existing format.

## Why

Skills and library consumers currently parse formatted text from the human brief — a latent fragility on the core read path that `--json` eliminates.

> [!info]- Full reasoning
> The pinned human brief (ndr:0136) was designed for readability in a terminal or skill prompt. Consuming it programmatically means parsing text that can change format without a semver bump. A parallel `--json` path gives skills and automation a stable, typed contract. Shapes: `resolve atom-id/slug` returns `{kind:'brief', drift, seed_id, head_id, head: AtomSummary, lineage, references}`; `resolve area/topic`, `search`, and `current` return `{kind:'list', count, atoms: AtomSummary[]}`; `lineage` returns `{kind:'lineage', head_id, chain}`. `AtomSummary = {id, title, area, topic, status, decision_date, reversibility, path, gist}`. The human brief format is unchanged — this is additive.

## Consequences

New output contract for all read verbs · skills rewire to `--json` · human brief unchanged

> [!info]- Detail
> - Skills that currently parse the human brief text can be rewired to `--json` without any change to the underlying read logic.
> - The typed shapes (`AtomSummary`, discriminated `kind` union) become an implicit contract; changes to field names are breaking for callers. Keep them stable or version them.
> - The human brief path (ndr:0136) is unaffected — both output modes coexist on the same verb.
