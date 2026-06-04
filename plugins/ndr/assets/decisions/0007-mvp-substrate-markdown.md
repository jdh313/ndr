---
id: "0007"
title: "Substrate revised to markdown-in-vault (MVP scope)"
status: current
decision_date: 2026-05-14

project: "[[Decision Pipeline]]"

derived_from:
  - "[[Mulling/2026-05-14_decision-capture-pipeline]]"
informed_by:
  - "[[Decisions/0006-readside-decisions-skill]]"
supersedes:
  - "[[Decisions/0005-mvp-substrate-graphiti]]"
superseded_by: []

area: substrate
topic: substrate
impacts: []

revisit_triggers: []

reversibility: medium
tags:
  - decision
  - meta-chain
---

# 0007 — Substrate revised to markdown-in-vault (MVP scope)

## Decision

Markdown in `~/Loose Ends/Decisions/` is the MVP substrate. Retrieval via `obsidian-mcp search_notes` (frontmatter-first) plus an Obsidian Base for faceted browse.

## Why

Tool-assisted markdown vs tool-assisted Graphiti was the apples-to-apples comparison; markdown wins at personal scale.

> [!info]- Full reasoning
> Yesterday's Graphiti choice ([[Decisions/0005-mvp-substrate-graphiti]]) compared *unassisted* markdown to *tool-assisted* Graphiti — a category error. Today's comparison (tool-assisted both ways) favors markdown for personal scale: no extra service, decisions co-located with the mulls that produced them, inspectability preserved. Graphiti's automatic cross-session entity disambiguation is genuinely better — but earns its keep at team scale, not personal scale.

## Alternatives

**Graphiti** (rejected — see [[Decisions/0005-mvp-substrate-graphiti]]) · **Hosted CMS** (deferred to team scope — see [[Decisions/0001-substrate-team-product-cms]]).

> [!info]- Why they lost
> - **Graphiti** — better cross-session disambiguation; not worth its operational cost at personal scale.
> - **Hosted CMS** — right answer at team-product scope, not in play for MVP.

## Assumptions

`personal-scale` · `obsidian-mcp-frontmatter-search-stays` · `vault-stays-the-substrate`

> [!warning]- personal-scale
> Personal-scale corpus (~50–200 decisions/year) — automatic entity disambiguation is not load-bearing.
>
> - **Current state:** active assumption; revisit if corpus grows past ~500 atoms
> - **Revisit if:** personal corpus crosses ~500 atoms OR disambiguation drift becomes a felt problem

> [!warning]- obsidian-mcp-frontmatter-search-stays
> `obsidian-mcp` continues to support efficient frontmatter-first search via `search_notes`.
>
> - **Current state:** verified 2026-05-14
> - **Revisit if:** `obsidian-mcp` changes its search API in a way that defeats Stage 1 of `/decisions`

> [!warning]- vault-stays-the-substrate
> `~/Loose Ends/` remains the long-term vault for mulls and projects (decisions live co-located there).
>
> - **Current state:** stable
> - **Revisit if:** vault location changes or the mulls/projects move out

## Consequences

No new service · decisions are first-class Obsidian citizens · cross-session disambiguation stays manual at personal scale.

> [!info]- Detail
> - No new service to run.
> - Decisions are first-class Obsidian citizens — wikilinks, Bases, search all work.
> - Cross-session entity disambiguation is *manual* (via the finite taxonomy + the supersession walk). Acceptable trade at personal scale.
> - Graphiti preserved as fallback if the `personal-scale` assumption flips.
