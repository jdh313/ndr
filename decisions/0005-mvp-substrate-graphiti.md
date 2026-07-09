---
id: "0005"
title: Capture skill writes to Graphiti as canonical storage; markdown export as
  periodic view
status: superseded
decision_date: 2026-05-13
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - substrate
  - meta-chain
binds: []
supersedes: []
superseded_by:
  - "0007"
derived_from:
  - Mulling/2026-05-13_decision-capture-pipeline
informed_by:
  - "0004"
---

# 0005 — Capture skill writes to Graphiti as canonical storage; markdown export as periodic view

## Decision

The MVP's canonical store is Graphiti; markdown is a periodic export for human-readable browsing. The capture skill writes to Graphiti directly.

## Revisit if

- Personal decision corpus grows beyond ~500 atoms AND disambiguation drift becomes a felt problem.

## Context

- Markdown alone would re-derive "what we mean by X" every session, drifting silently.

## Why

At decision time, automatic cross-session entity disambiguation seemed worth the operational cost: Graphiti's automatic disambiguation seemed worth the extra service. Markdown export keeps the corpus readable but is not canonical.

Superseded 2026-05-14 (see [[Decisions/0007-mvp-substrate-markdown]]): an apples-to-apples comparison — tool-assisted markdown vs. tool-assisted Graphiti — shifted the call once co-locating decisions with the originating mulls was weighed in. Graphiti remains the fallback if cross-session disambiguation later becomes load-bearing.

## Alternatives

- **Plain markdown in vault** — rejected (here): resurrected as the choice in [[Decisions/0007-mvp-substrate-markdown]] once the apples-to-apples comparison shifted.