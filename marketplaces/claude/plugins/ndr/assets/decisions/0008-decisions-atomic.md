---
id: "0008"
title: Decisions are atomic — one decision per artifact
status: current
decision_date: 2026-05-14
author: Jacob Hoehler
conviction: tentative
project: Decision Pipeline
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

One decision per artifact, never bundled. Single file per atom (`0042-use-fastapi.md`). No directory form, no descent files.

## Commitments

- Capture skill MUST split bundled candidates into N atoms.
- File naming: `<id>-<kebab-title>.md` per atom. Always single-file.
- Cross-decision relationships live in `informed_by:` / `labels:`, not in shared documents.
- Promotion to a directory is dropped from MVP entirely.

## Revisit if

- Evidence emerges that bundled atoms can supersede cleanly via some other mechanism.
- The edge-based grouping (`informed_by:` / `labels:`) turns out to be too lossy in practice.

## Context

- Bundled decisions (e.g. "use FastAPI + Postgres" in one file) can't supersede cleanly per-part — revising just one piece breaks the supersession primitive.
- The MVP originally planned promotion from a single file to a directory-of-files pattern for atoms whose content grew long.

## Why

Bundled decisions can't supersede cleanly per-part; atomicity makes the supersession primitive work. Once "use FastAPI + Postgres" lives in one file, revising just the Postgres half breaks that primitive. The grouping that bundling would have provided is instead carried by cross-decision edges (`informed_by:`, `labels:`), matching the Nested ADRs "let structure emerge from corpus" protocol. The single-file body shape handles length management — each section is written once at the length it deserves — making the originally-planned promotion-to-directory pattern unnecessary; a long section stays in the file without splitting it.
