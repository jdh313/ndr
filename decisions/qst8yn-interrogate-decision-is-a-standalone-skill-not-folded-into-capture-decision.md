---
id: "qst8yn"
title: interrogate-decision is a standalone skill, not folded into capture-decision
status: current
decision_date: 2026-06-09
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - process
  - write-side
binds: []
supersedes: []
superseded_by: []
derived_from:
  - ndr interrogate-decision skill design session
informed_by: []
---

# qst8yn — interrogate-decision is a standalone skill, not folded into capture-decision

## Decision

The deep, interactive pre-capture deliberation lives in its own skill (interrogate-decision), backed by a dedicated references/interrogation.md, rather than being folded into capture-decision's Step 2.5 or absorbed into worthiness.md.

## Commitments

- interrogate-decision can be run without intent to capture, for a thinker who wants deliberation but isn't ready to commit a candidate to the ledger.
- capture-decision's thin-orchestrator character is preserved; its Step 2.5 is a targeted pull (one or two moves), not a full deliberation host.
- worthiness.md remains the fast, soft, three-question grain check — low friction on the common path.
- interrogation.md is the single authoritative source for the eight-move deep heuristics; both skills draw from it, so there's no divergence risk between a "capture copy" and a "standalone copy."

## Revisit if

- capture-decision changes its candidate input shape — the interrogation skill's Step 10 output must match whatever payload capture-decision expects at its entry point.
- A routing bucket (e.g., "borderline-and-heavy") is defined differently in worthiness.md and interrogation.md, creating ambiguity about which path a candidate takes.
- capture-decision Step 2.5's targeted pull proves sufficient and the full eight-move walk is never run — escape valve is to collapse interrogate-decision's steps into Step 2.5 and delete the skill dir (interrogation.md survives either way).

## Context

- capture-decision self-describes as a "thin orchestrator."
- worthiness.md self-describes as a soft rubric — "a prompt for human judgment, not a pass/fail gate."
- A thinker may want to interrogate a candidate rigorously without committing to capture.

## Why

One skill, one responsibility: heavy judgment and a thin deterministic write mechanism are different surfaces and should not share an entry point. Folding an eight-move deliberation loop into capture-decision's Step 2.5 would contradict its thin-orchestrator design intent and couple the write path to heavyweight reasoning it was never meant to host. Loading worthiness.md with deep heuristics (code-grounding, first-principle, asymmetry, failure-modes, forward-bind) would destroy its deliberately short, low-friction character. A standalone skill preserves both surfaces as designed, and independently serves a thinker who wants to interrogate a candidate rigorously without yet committing to capture. capture-decision's Step 2.5 pulls individual moves from interrogation.md on borderline-and-heavy candidates, so there is one shared source and no duplicated logic across files.

## Alternatives

- **Fold into capture-decision Step 2.5** — rejected: bloats the orchestrator that is explicitly designed to stay thin, and traps the deliberation inside the write flow so it cannot be invoked independently.
- **Expand worthiness.md** — rejected: destroys its deliberately soft and short character; every routine capture would drag the heavy doc into context, taxing the common path for the rare borderline case.
