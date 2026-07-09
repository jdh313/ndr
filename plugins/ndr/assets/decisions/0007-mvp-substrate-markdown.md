---
id: "0007"
title: Substrate revised to markdown-in-vault (MVP scope)
status: current
decision_date: 2026-05-14
author: Jacob Hoehler
conviction: tentative
project: Decision Pipeline
labels:
  - substrate
  - meta-chain
binds: []
supersedes:
  - "0005"
superseded_by: []
derived_from:
  - Mulling/2026-05-14_decision-capture-pipeline
informed_by:
  - "0006"
---

# 0007 — Substrate revised to markdown-in-vault (MVP scope)

## Decision

Markdown in `~/Loose Ends/Decisions/` is the MVP substrate. Retrieval via `obsidian-mcp search_notes` (frontmatter-first) plus an Obsidian Base for faceted browse.

## Commitments

- Graphiti preserved as fallback if the `personal-scale` assumption flips.

## Revisit if

- Personal corpus crosses ~500 atoms OR disambiguation drift becomes a felt problem.
- `obsidian-mcp` changes its search API in a way that defeats Stage 1 of `/decisions`.
- Vault location changes or the mulls/projects move out of `~/Loose Ends/`.

## Context

- Yesterday's Graphiti choice (ndr:0005) compared *unassisted* markdown to *tool-assisted* Graphiti — a category error, since both substrates now have tool assistance available.
- Personal-scale corpus runs roughly 50-200 decisions/year.
- Graphiti's automatic cross-session entity disambiguation is genuinely better at scale, but at an operational cost.

## Why

The fair comparison is tool-assisted markdown vs. tool-assisted Graphiti, not unassisted markdown vs. tool-assisted Graphiti. Made apples-to-apples, markdown wins at personal scale: no extra service to run, decisions co-located with the mulls that produced them, and full inspectability preserved. Graphiti's disambiguation advantage earns its keep at team scale, not personal scale.

## Alternatives

- **Graphiti** — rejected: see ndr:0005; better cross-session disambiguation, not worth the operational cost at personal scale.
- **Hosted CMS** — deferred: right answer at team-product scope (see ndr:0001), not in play for MVP.
