---
id: "0005"
title: "Capture skill writes to Graphiti as canonical storage; markdown export as periodic view"
status: superseded
decision_date: 2026-05-13

project: "[[Decision Pipeline]]"

derived_from:
  - "[[Mulling/2026-05-13_decision-capture-pipeline]]"
informed_by:
  - "[[Decisions/0004-manual-discipline-wont-sustain]]"
supersedes: []
superseded_by:
  - "[[Decisions/0007-mvp-substrate-markdown]]"

area: substrate
topic: substrate
impacts: []

revisit_triggers: []

reversibility: medium
tags:
  - decision
  - meta-chain
---

# 0005 — Capture skill writes to Graphiti as canonical storage; markdown export as periodic view

## Decision

The MVP's canonical store is Graphiti; markdown is a periodic export for human-readable browsing. The capture skill writes to Graphiti directly.

## Why

At decision time, automatic cross-session entity disambiguation seemed worth the operational cost.

> [!info]- Full reasoning
> Markdown alone would re-derive "what we mean by X" every session, drifting silently — Graphiti's automatic disambiguation seemed worth the extra service. Markdown export keeps the corpus readable but is not canonical.

## Alternatives

Plain markdown in vault — rejected here, then resurrected as the choice in [[Decisions/0007-mvp-substrate-markdown]] once the apples-to-apples comparison shifted.

## Assumptions

`graphiti-disambiguation-load-bearing-at-personal-scale`

> [!warning]- graphiti-disambiguation-load-bearing-at-personal-scale
> Automatic cross-session entity disambiguation is load-bearing even at ~50–200 decisions/year (personal scale).
>
> - **Current state:** rejected on 2026-05-14 — see 0007
> - **Revisit if:** personal decision corpus grows beyond ~500 atoms AND disambiguation drift becomes a felt problem

## Status

Superseded by [[Decisions/0007-mvp-substrate-markdown]] on 2026-05-14.

> [!info]- Why this was superseded
> The apples-to-apples comparison (tool-assisted markdown vs tool-assisted Graphiti) shifted the call: at personal scale the extra service isn't worth it, and co-locating decisions with the mulls that produced them is a real advantage. Graphiti remains the fallback if cross-session disambiguation later becomes load-bearing.
