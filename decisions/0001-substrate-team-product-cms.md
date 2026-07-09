---
id: "0001"
title: Substrate = hosted CMS + Postgres + AI service (team-product scope)
status: current
decision_date: 2026-05-12
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - substrate
  - meta-chain
binds: []
supersedes: []
superseded_by: []
derived_from:
  - Mulling/2026-05-12_decision-capture-pipeline
informed_by: []
---

# 0001 — Substrate = hosted CMS + Postgres + AI service (team-product scope)

## Decision

For the team-product scope: a hosted headless CMS (Payload as the leading candidate) backed by Postgres, fronted by an AI authoring service, with SSG-rendered read views.

## Scope

- Binds: team-product scope.
- Does not bind: the personal MVP.

## Commitments

- If/when the team product gets revisited, this stack is the starting point, not a re-greenfield exercise.

## Revisit if

- Team-product scope is killed entirely (currently gated on Q2a).

## Context

- The team-product scope needs multi-user authoring, persistence, a queryable schema, and a read surface that survives outside Obsidian.

## Why

A managed CMS gives schema, persistence, and admin UI without rolling our own — building the schema layer from scratch is high effort for low novelty, and a managed CMS is mature for exactly this shape. Postgres is non-negotiable for durability and analytics. The AI service is the differentiator: it normalizes capture before persistence, so the corpus stays clean as it grows.

## Alternatives

- **Self-hosted CMS** — rejected: adds ops without unique benefit.
- **Build-from-scratch** — rejected: reinvents schema/admin/persistence.
- **Graph-DB substrate** — rejected: no managed authoring surface; would force build-from-scratch anyway.
