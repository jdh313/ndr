---
id: "qst8yn"
title: interrogate-decision is a standalone skill, not folded into capture-decision
status: current
decision_date: 2026-06-09
aliases: []
project: "[[ndr]]"
derived_from:
  - "[[ndr interrogate-decision skill design session]]"
informed_by: []
supersedes: []
superseded_by: []
area: process
topic: write-side
impacts: []
revisit_triggers: []
reversibility: easy
tags:
  - decision
---

# qst8yn — interrogate-decision is a standalone skill, not folded into capture-decision

## Decision

The deep, interactive pre-capture deliberation lives in its own skill (interrogate-decision), backed by a dedicated references/interrogation.md, rather than being folded into capture-decision's Step 2.5 or absorbed into worthiness.md.

## Why

One skill, one responsibility: heavy judgment and a thin deterministic write mechanism are different surfaces and should not share an entry point.

> [!info]- Full reasoning
> capture-decision self-describes as a "thin orchestrator" — adding an eight-move deliberation loop would contradict that design intent and couple the write path to heavyweight reasoning it was never meant to host. Equally, worthiness.md self-describes as a soft rubric ("a prompt for human judgment, not a pass/fail gate"); loading it with deep heuristics (code-grounding, first-principle, asymmetry, failure-modes, forward-bind) destroys its deliberately short, low-friction character. A standalone skill preserves both surfaces as designed. The deliberation also has independent value: a thinker may want to interrogate a candidate rigorously without committing to capture — the standalone form makes that invocation possible. capture-decision Step 2.5 pulls individual moves from interrogation.md on borderline-and-heavy candidates, so there is one shared source; no logic is duplicated across files.

## Alternatives

Fold deliberation into capture-decision Step 2.5 (rejected) · Expand worthiness.md to hold heavy heuristics (rejected)

> [!info]- Why they lost
> - **Fold into capture-decision Step 2.5:** bloats the orchestrator that is explicitly designed to stay thin, and traps the deliberation inside the write flow so it cannot be invoked independently. The orchestrator's declared character is "thin" — this alternative directly contradicts it.
> - **Expand worthiness.md:** destroys worthiness.md's deliberately soft and short character. Every routine capture would drag the heavy doc into context, taxing the common path for the benefit of the rare borderline case.

## Assumptions

`step-10-handoff-contract` · `routing-buckets-consistent` · `standalone-skill-earns-keep`

> [!warning]- step-10-handoff-contract
> Step 10's handoff contract stays aligned with capture-decision's candidate payload shape.
>
> - **Current state:** active
> - **Revisit if:** capture-decision changes its candidate input shape — the interrogation skill's Step 10 output must match whatever payload capture-decision expects at its entry point.

> [!warning]- routing-buckets-consistent
> worthiness.md and interrogation.md do not contradict on the shared routing buckets.
>
> - **Current state:** active
> - **Revisit if:** a routing bucket (e.g., "borderline-and-heavy") is defined differently in the two docs, creating ambiguity about which path a candidate takes.

> [!warning]- standalone-skill-earns-keep
> The standalone skill remains invoked in practice and does not go vestigial.
>
> - **Current state:** active
> - **Revisit if:** capture-decision Step 2.5's targeted pull proves sufficient and the full eight-move walk is never run; escape valve is to collapse interrogate-decision's steps into Step 2.5 and delete the skill dir (interrogation.md survives either way).

## Consequences

interrogate-decision is independently invokable · capture-decision stays thin · worthiness.md stays short · interrogation.md is the single source for deep heuristics

> [!info]- Detail
> - interrogate-decision can be run without intent to capture — useful when a thinker wants deliberation but is not yet ready to commit a candidate to the ledger.
> - capture-decision's thin-orchestrator character is preserved; its Step 2.5 is a targeted pull (one or two moves), not a full deliberation host.
> - worthiness.md remains the fast, soft, three-question grain check — low friction on the common path.
> - interrogation.md is the single authoritative source for the eight-move deep heuristics; both skills draw from it, so there is no divergence risk between a "capture copy" and a "standalone copy".
