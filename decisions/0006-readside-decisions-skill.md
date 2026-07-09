---
id: "0006"
title: Read-side context-loading via /decisions skill + auto-loaded rule on
  tracked projects
status: current
decision_date: 2026-05-13
author: Jacob Hoehler
conviction: tentative
project: ndr
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

## Why

A written corpus without a surfaced reading path is the same failure mode as a stale ADR folder.

The auto-loaded rule wires the read skill to fire (eventually, on tracked projects) without explicit invocation — so prior decisions enter context before new ones get proposed. Capture without read is a one-way street; readers re-derive current state from older artifacts and silent drift begins.

## Assumptions

`tracked-projects-opt-in`

Tracked projects opt in via a project-level `.claude/CLAUDE.md` marker; specifics deferred to post-scaffold.

- **Current state:** resolved by ndr:qevw6c (JUN-175) — two-part opt-in: `.claude/CLAUDE.md` snippet (behavioral) + `.ndr.toml` at repo root (machine-readable ledger marker the CLI consumes)
- **Revisit if:** more than one tracked project lands without a consistent opt-in shape

## Consequences

Two skills, not one: `/capture-decision` and `/decisions`. The supersession-walking primitive lives on the read side.
