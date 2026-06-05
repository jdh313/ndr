---
id: "0003"
title: "Q1 test method = discipline experiment, not build"
status: current
decision_date: 2026-05-13

project: '[[ndr]]'

derived_from:
  - "[[Mulling/2026-05-13_decision-capture-pipeline]]"
informed_by:
  - "[[Decisions/0002-mvp-scope-one-repo]]"
supersedes: []
superseded_by: []

area: process
topic: test-method
impacts: []

revisit_triggers: []

reversibility: medium
tags:
  - decision
  - meta-chain
---

# 0003 — Q1 test method = discipline experiment, not build

## Decision

Q1 is answered by sustained use of the discipline on real decisions over time, not by reaching a build milestone. The MVP is the test environment, not the deliverable.

## Why

Only sustained use produces signal — the corpus has to be lived in.

> [!info]- Full reasoning
> A build-shaped test gives a binary done/not-done answer that doesn't actually validate the underlying claim (discipline reduces cross-session drift). The hypothesis is about lived practice; the only way to measure that is to live it.

## Consequences

The build is sized to whatever is needed to *run* the discipline, not to ship a product. Future decisions about this project default to discipline-first sequencing.
