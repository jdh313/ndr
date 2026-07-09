---
id: "0005"
title: Capture skill writes to Graphiti as canonical storage; markdown export as
  periodic view
status: superseded
decision_date: 2026-05-13
author: Jacob Hoehler
conviction: tentative
project: Decision Pipeline
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

- Markdown alone would re-derive "what we mean by X" every session, risking silent drift across sessions.
- Cross-session entity disambiguation was a live concern for the substrate choice.

## Why

At decision time, automatic cross-session entity disambiguation seemed worth the added operational cost of running a separate service. Markdown export keeps the corpus readable but would not be canonical.

## Alternatives

- **Plain markdown in vault** — rejected at this point: later resurrected as the choice in ndr:0007 once the comparison basis shifted.
