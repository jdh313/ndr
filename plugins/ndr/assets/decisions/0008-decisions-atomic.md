---
id: "0008"
title: "Decisions are atomic — one decision per artifact"
status: current
decision_date: 2026-05-14

project: "[[Decision Pipeline]]"

derived_from:
  - "[[Mulling/2026-05-14_decision-capture-pipeline]]"
informed_by:
  - "[[Decisions/0007-mvp-substrate-markdown]]"
supersedes: []
superseded_by: []

area: process
topic: granularity
impacts: []

revisit_triggers: []

reversibility: hard
tags:
  - decision
  - meta-chain
---

# 0008 — Decisions are atomic — one decision per artifact

## Decision

One decision per artifact, never bundled. Single file per atom (`0042-use-fastapi.md`). No directory form, no descent files.

## Why

Bundled decisions can't supersede cleanly per-part; atomicity makes the supersession primitive work. Hybrid altitude callouts handle length-management without splitting files.

> [!info]- Full reasoning
> Once "use FastAPI + Postgres" lives in one file, revising just the Postgres half breaks the supersession primitive. The grouping that bundling would have provided is carried by cross-decision edges (`informed_by:`, `area:`, `topic:`) instead, matching the [[Nested ADRs]] "let structure emerge from corpus" protocol. The MVP originally planned a single-file-with-promote-to-directory pattern for atoms where an altitude grew long; hybrid callouts (default-collapsed `[!info]-` sections) make that promotion unnecessary — long content can hide behind a callout without splitting the file. Promotion to a directory is dropped from MVP entirely.

## Assumptions

`supersession-needs-atomicity` · `structure-emerges-from-corpus`

> [!warning]- supersession-needs-atomicity
> Supersession is a per-decision primitive; bundled decisions cannot supersede cleanly per-part.
>
> - **Current state:** active — confirmed by the meta-chain itself (0005 → 0007 works cleanly because 0005 is atomic)
> - **Revisit if:** evidence emerges that bundled atoms can supersede cleanly via some other mechanism

> [!warning]- structure-emerges-from-corpus
> Grouping that a bundled artifact would have flattened can be carried by cross-decision edges (`informed_by:`, `area:`, `topic:`).
>
> - **Current state:** active; consistent with [[Nested ADRs]] protocol
> - **Revisit if:** the edge-based grouping turns out to be too lossy in practice

## Consequences

- Capture skill MUST split bundled candidates into N atoms.
- File naming: `<id>-<kebab-title>.md` per atom. Always single-file.
- Cross-decision relationships live in `informed_by:` / `area:` / `topic:`, not in shared documents.
