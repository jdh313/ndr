---
id: "qgm17p"
title: ndr read verbs gain --json structured output alongside the pinned human brief
status: current
decision_date: 2026-06-07
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - read-side
binds: []
supersedes: []
superseded_by: []
derived_from:
  - ndr CLI session 2026-06-07
informed_by: []
---

# qgm17p — ndr read verbs gain --json structured output alongside the pinned human brief

## Decision

`resolve`, `search`, `current`, and `lineage` each accept a `--json` flag emitting structured output instead of the pinned human brief, complementing rather than replacing the existing format.

## Commitments

- `resolve atom-id/slug` returns `{kind:'brief', drift, seed_id, head_id, head: AtomSummary, lineage, references}`.
- `resolve area/topic`, `search`, and `current` return `{kind:'list', count, atoms: AtomSummary[]}`.
- `lineage` returns `{kind:'lineage', head_id, chain}`.
- `AtomSummary = {id, title, area, topic, status, decision_date, reversibility, path, gist}` — these typed shapes (plus the discriminated `kind` union) are an implicit contract; changing field names is breaking for callers, so keep them stable or version them.
- The human brief format (ndr:0136) is unchanged; both output modes coexist on the same verb.
- Skills that currently parse the human brief text can be rewired to `--json` without any change to the underlying read logic.

## Context

- The pinned human brief (ndr:0136) was designed for readability in a terminal or skill prompt.
- Skills and library consumers currently parse formatted text from that human brief to consume it programmatically.
- Consuming formatted text means parsing a format that can change without a semver bump — a latent fragility on the core read path.

## Why

A parallel `--json` path gives skills and automation a stable, typed contract instead of parsed prose, eliminating that fragility on the core read path. It is additive: the human brief stays the default, `--json` is opt-in per invocation.
