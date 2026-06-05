---
id: "0004"
title: "Manual discipline won't sustain; minimum viable test requires capture-skill tooling"
status: current
decision_date: 2026-05-13

project: '[[ndr]]'

derived_from:
  - "[[Mulling/2026-05-13_decision-capture-pipeline]]"
informed_by:
  - "[[Decisions/0003-q1-method-discipline-experiment]]"
supersedes: []
superseded_by: []

area: process
topic: discipline
impacts: []

revisit_triggers: []

reversibility: easy
tags:
  - decision
  - meta-chain
---

# 0004 — Manual discipline won't sustain; minimum viable test requires capture-skill tooling

## Decision

The MVP includes a capture skill (`/capture-decision`). Pure hand-rolled markdown without skill support is not a valid test path.

## Why

A capture skill is part of the test apparatus — without it, friction kills the discipline before it can produce signal.

> [!info]- Full reasoning
> Writing a structured decision artifact after every chat without skill support has too high an activation energy. The discipline lapses, the test fails to produce signal, and Q1 stays unanswered. The skill is part of the test apparatus, not separate from it.

## Assumptions

`tooling-lowers-activation-energy`

> [!warning]- tooling-lowers-activation-energy
> A capture skill reduces activation energy enough that the discipline sustains across sessions; pure hand-rolled markdown does not.
>
> - **Current state:** untested at MVP install time; the MVP itself is the test
> - **Revisit if:** running the skill for several weeks shows the friction is still too high (refine UX) or unnecessary (drop tooling, run manual)

## Consequences

`/capture-decision` is in MVP scope. Discipline-without-tooling is no longer a valid path for testing Q1.
