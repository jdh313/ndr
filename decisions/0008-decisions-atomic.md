---
id: "0008"
title: Decisions are atomic — one decision per artifact
status: current
decision_date: 2026-05-14
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - process
  - granularity
  - meta-chain
binds: []
supersedes: []
superseded_by: []
derived_from:
  - Mulling/2026-05-14_decision-capture-pipeline
informed_by:
  - "0007"
---

# 0008 — Decisions are atomic — one decision per artifact

## Decision

One decision per artifact, never bundled. Default to a single file (`0042-use-fastapi.md`); promote to a directory (`0042-use-fastapi/README.md` + descent files) only when an altitude grows long enough to warrant its own file.

## Commitments

- Capture skill MUST split bundled candidates into N atoms.
- File naming: `<id>-<kebab-title>.md` per atom; promotion to directory is explicit.
- Cross-decision relationships live in `informed_by:` / `area:` / `topic:`, not in shared documents.

## Revisit if

- Evidence emerges that bundled atoms can supersede cleanly via some other mechanism.
- The edge-based grouping (`informed_by:` / `area:` / `topic:`) turns out to be too lossy in practice.

## Context

- Once "use FastAPI + Postgres" lives in one file, revising just the Postgres half breaks the supersession primitive.

## Why

Bundled decisions can't supersede cleanly per-part: atomicity is what makes the supersession primitive work. The grouping that bundling would have provided is carried instead by cross-decision edges (`informed_by:`, `area:`, `topic:`), matching the [[Nested ADRs]] "let structure emerge from corpus" protocol. The meta-chain itself confirms this: 0005 to 0007 works cleanly because 0005 is atomic.
