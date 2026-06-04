---
id: "NNNN"
title: "Short imperative phrase"
status: current             # current | superseded | retracted
decision_date: YYYY-MM-DD

project: "[[Path/To/Project]]"

derived_from: []
informed_by: []
supersedes: []
superseded_by: []

area: TODO
topic: TODO
impacts: []                  # wikilinks to architecture pages, repo notes, code refs

revisit_triggers: []

reversibility: medium
tags:
  - decision
---

# NNNN — Short imperative phrase

## Decision

One sentence — what was decided. This is the gist altitude; never put it in a callout.

## Why

Brief gist line — the load-bearing reason, in one sentence.

> [!info]- Full reasoning
> Longer prose. Why this path over alternatives, what tipped the call, any nuance the gist line glosses.

## Alternatives

One-line list of the alternatives considered + their verdict (rejected / deferred / preserved-elsewhere). Omit this section if there were no meaningful alternatives.

> [!info]- Why they lost
> Per-alternative paragraph or bullet on why each lost.

## Assumptions

Backtick-separated list of assumption slugs, one per assumption. Omit if no load-bearing assumptions.

> [!warning]- <slug>
> One-sentence description of the assumption.
>
> - **Current state:** verified-date | "active" | "needs check"
> - **Revisit if:** condition that would flip the decision

## Consequences

One-line list of consequences, `·`-separated.

> [!info]- Detail
> Bulleted detail on each consequence.
