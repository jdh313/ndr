---
id: "0004"
title: Manual discipline won't sustain; minimum viable test requires
  capture-skill tooling
status: current
decision_date: 2026-05-13
author: Jacob Hoehler
conviction: tentative
project: Decision Pipeline
labels:
  - process
  - discipline
  - meta-chain
binds: []
supersedes: []
superseded_by: []
derived_from:
  - Mulling/2026-05-13_decision-capture-pipeline
informed_by:
  - "0003"
---

# 0004 — Manual discipline won't sustain; minimum viable test requires capture-skill tooling

## Decision

The MVP includes a capture skill (`/capture-decision`). Pure hand-rolled markdown without skill support is not a valid test path.

## Commitments

- `/capture-decision` is in MVP scope.
- Discipline-without-tooling is no longer a valid path for testing Q1.

## Revisit if

- Running the skill for several weeks shows the friction is still too high (refine UX) or unnecessary (drop tooling, run manual).

## Context

- Writing a structured decision artifact after every chat without skill support has too high an activation energy.
- High activation energy causes the discipline to lapse before it can produce signal, leaving Q1 unanswered.

## Why

A capture skill is part of the test apparatus, not separate from it — without it, friction kills the discipline before it can produce signal.
