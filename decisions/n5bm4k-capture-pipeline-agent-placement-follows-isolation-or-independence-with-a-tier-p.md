---
id: "n5bm4k"
title: Capture-pipeline agent placement follows isolation-or-independence, with
  a tier-pinned reviewer
status: current
decision_date: 2026-07-10
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - process
  - tooling
binds:
  - plugins/ndr/skills/capture-decision/**
  - plugins/ndr/agents/**
supersedes: []
superseded_by: []
derived_from: []
informed_by: []
---

# n5bm4k — Capture-pipeline agent placement follows isolation-or-independence, with a tier-pinned reviewer

## Decision

In the capture pipeline a step is delegated to a subagent only when it needs
isolation (a source too big to hold) or independence (grading the author cannot
do for itself). The reviewer is the one agent on the common path, dispatched as a
blocking one-shot and pinned to a fixed model tier (`sonnet`). The drafter is
demoted to the long-source path; in-conversation body composition rides the
session model.

## Commitments

- The reviewer stays pinned to a fixed tier so atom quality is independent of the session model.
- The main agent composes the body in-conversation; the drafter is dispatched only when a large source warrants isolation.
- Cheap mechanical steps are not fragmented out to cheaper agents, because the round-trip cost exceeds the token savings.

## Revisit if

- Body composition at the session floor (Haiku) proves inadequate often enough to warrant mandatory escalation of composition to a pinned agent rather than relying on the reviewer as backstop.

## Context

- A subagent runs in isolated context and can be pinned to a model tier independent of the session; a skill runs in the main loop at the session's tier.
- Body composition is the one quality-sensitive step; the remaining steps are cheap in tokens or purely mechanical.
- A weaker session model tends to miss altitude and atomicity discipline in the body.
- For an in-conversation capture the orchestrator already holds every frontmatter value the composing stage would need.

## Why

The two things that justify a subagent's overhead are isolation and independence.
The reviewer supplies independence the author structurally lacks, and pinning its
tier turns it into a quality floor that decouples atom quality from the session
model — so the body can ride the session model and be backstopped rather than
always escalated. The drafter supplied only formatting for in-conversation
captures, since the orchestrator already holds every frontmatter value, so it
earns its isolated context only where a big source must be held.

## Alternatives

- **Everything through subagents (drafter and reviewer always)** — verdict: rejected: the drafter adds no judgment on in-conversation captures and the mailbox round-trips dominate the cost.
- **Everything in the skill (no reviewer agent)** — verdict: rejected: loses the independent grading the author cannot self-supply and binds atom quality to the session model tier.
