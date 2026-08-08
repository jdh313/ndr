---
id: "0001"
title: Substrate = hosted CMS + Postgres + AI service (team-product scope)
status: current
decision_date: 2026-05-12
author: Jacob Hoehler
conviction: tentative
project: Decision Pipeline
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

- If/when the team product gets revisited, this stack is the starting point — not a re-greenfield exercise.

## Revisit if

- Team-product scope is killed entirely (currently gated on Q2a).

## Context

- The team-product scope needs multi-user authoring, persistence, a queryable schema, and a read surface that survives outside Obsidian.
- Building a schema layer from scratch is high effort for low novelty.
- Durability and analytics needs make a relational store non-negotiable.
- Capture needs to be normalized before persistence so the corpus stays clean as it grows.

## Why

A managed CMS gives schema, persistence, and an admin UI without rolling our own — mature for exactly this shape, and far less effort than a from-scratch build. Postgres backs the canonical store. The AI authoring service is the differentiator: it normalizes capture at write-time, before persistence, so the corpus stays clean as it grows.

## Alternatives

- **Self-hosted CMS** — rejected: adds ops without unique benefit over hosted.
- **Build-from-scratch** — rejected: reinvents schema, admin, and persistence that a managed CMS already provides.
- **Graph-DB substrate** — rejected: no managed authoring surface; would force a build-from-scratch anyway.
