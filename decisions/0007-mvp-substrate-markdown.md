---
id: "0007"
title: Substrate revised to markdown-in-vault (MVP scope)
status: superseded
decision_date: 2026-05-14
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - substrate
  - meta-chain
binds: []
supersedes:
  - "0005"
superseded_by:
  - "0070"
derived_from:
  - Mulling/2026-05-14_decision-capture-pipeline
informed_by:
  - "0006"
---

# 0007 — Substrate revised to markdown-in-vault (MVP scope)

## Decision

Markdown in `~/Loose Ends/Decisions/` is the MVP substrate. Retrieval via `obsidian-mcp search_notes` (frontmatter-first) plus an Obsidian Base for faceted browse.

## Commitments

- No new service to run.
- Decisions remain first-class Obsidian citizens: wikilinks, Bases, and search must keep working against them.
- Cross-session entity disambiguation is manual, via the finite taxonomy plus the supersession walk — an accepted trade at personal scale.

## Revisit if

- Personal corpus crosses ~500 atoms OR disambiguation drift becomes a felt problem.
- `obsidian-mcp` changes its search API in a way that defeats Stage 1 of `/decisions`.
- Vault location changes, or the mulls/projects move out of `~/Loose Ends/`.

## Context

- Yesterday's Graphiti choice ([[Decisions/0005-mvp-substrate-graphiti]]) compared *unassisted* markdown to *tool-assisted* Graphiti — a category error.

## Why

Today's comparison (tool-assisted both ways) favors markdown for personal scale: no extra service, decisions co-located with the mulls that produced them, inspectability preserved. Graphiti's automatic cross-session entity disambiguation is genuinely better, but it earns its keep at team scale, not personal scale.

## Alternatives

- **Graphiti** — rejected: better cross-session disambiguation, but not worth its operational cost at personal scale (see [[Decisions/0005-mvp-substrate-graphiti]]).
- **Hosted CMS** — deferred: right answer at team-product scope, not in play for MVP (see [[Decisions/0001-substrate-team-product-cms]]).
