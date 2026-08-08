---
id: "0006"
title: Read-side context-loading via /decisions skill + auto-loaded rule on
  tracked projects
status: current
decision_date: 2026-05-13
author: Jacob Hoehler
conviction: tentative
project: Decision Pipeline
labels:
  - tooling
  - read-side
  - meta-chain
binds: []
supersedes: []
superseded_by: []
derived_from:
  - Mulling/2026-05-13_decision-capture-pipeline
informed_by:
  - "0005"
---

# 0006 — Read-side context-loading via /decisions skill + auto-loaded rule on tracked projects

## Decision

A `/decisions <topic>` skill plus an auto-loaded rule completes the write/read symmetry. Capture alone produces a corpus that no one reads — the read-side has to be in scope too.

## Commitments

- Two skills, not one: `/capture-decision` and `/decisions`.
- The supersession-walking primitive lives on the read side.

## Revisit if

- More than one tracked project lands without a consistent opt-in shape.

## Context

- Capture alone produces a corpus that no one reads — the same failure mode as a stale ADR folder.
- Without a surfaced reading path, readers re-derive current state from older artifacts and silent drift begins.

## Why

A written corpus without a surfaced reading path is the same failure mode as a stale ADR folder — capture without read is a one-way street. The auto-loaded rule wires the read skill to fire on tracked projects without explicit invocation, so prior decisions enter context before new ones get proposed.
