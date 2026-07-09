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

## Why

A managed CMS gives schema + persistence + admin UI without rolling our own; Postgres backs the canonical store; the AI service handles capture and materialization at write-time.

The team-product scope needs multi-user authoring, persistence, a queryable schema, and a read surface that survives outside Obsidian. Building the schema layer from scratch is high effort for low novelty; a managed CMS is mature for exactly this shape. Postgres is non-negotiable for durability and analytics. The AI service is the differentiator — it normalizes capture before persistence, so the corpus stays clean as it grows.

## Alternatives

Self-hosted CMS · build-from-scratch · graph-DB substrate.

Documented in the originating mull. Headlines: self-hosted CMS adds ops without unique benefit; build-from-scratch reinvents schema/admin/persistence; graph-DB has no managed authoring surface and would force build-from-scratch anyway.

## Assumptions

`team-product-scope`

This decision applies to team-product scope, not the personal MVP.

- **Current state:** scope preserved per the project page §Architecture / Team-product scope
- **Revisit if:** team-product scope is killed entirely (currently gated on Q2a)

## Consequences

If/when the team product gets revisited, this stack is the starting point — not a re-greenfield exercise.
