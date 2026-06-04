---
id: "0050"
title: "NDR slugs live in atom aliases: frontmatter, minted lazily on demand"
status: current
decision_date: 2026-05-15

project: "[[Decision Pipeline]]"

derived_from:
  - "[[Decisions/0049-ndr-reference-scheme-three-grains]]"
informed_by:
  - "[[Decisions/0007-mvp-substrate-markdown]]"
supersedes: []
superseded_by: []

area: tooling
topic: referencing
impacts: []

revisit_triggers: []

reversibility: medium
tags:
  - decision
  - meta-chain
---

# 0050 — NDR slugs live in atom aliases: frontmatter, minted lazily on demand

## Decision

A slug is a string in the atom's `aliases:` YAML frontmatter field, namespaced with an `ndr-` prefix (e.g. `aliases: [ndr-monorepo-shape]`). Slugs are minted only when a specific atom needs atom-grain external reference; default is `aliases: []`. Most atoms never carry a slug.

## Why

Obsidian's native alias mechanism makes `[[ndr-monorepo-shape]]` wikilinks resolve to the atom carrying that alias — no plugin dependency. Lazy minting sidesteps the taxonomy-drift hazard of inventing slugs per-atom upfront.

> [!info]- Full reasoning
> Using `aliases:` over a separate registry file keeps the substrate to "markdown files" (0007) — no second source of truth. The `ndr-` namespace prefix avoids alias collisions with non-NDR vault notes. Lazy minting means slug invention happens at the moment a reference need exists, not speculatively, which avoids the same taxonomy-drift trap that `area:`/`topic:` would hit if those were invented eagerly.

## Assumptions

`obsidian-aliases-survive-handover` · `lazy-minting-fires-on-time`

> [!warning]- obsidian-aliases-survive-handover
> Moving an alias between atoms at write-time keeps Obsidian's alias index in sync, so `[[ndr-monorepo-shape]]` resolves to the new atom after supersession.
>
> - **Current state:** native Obsidian alias mechanism is stable; cross-plugin behavior (Bases, dataview) less verified
> - **Revisit if:** the first real supersession-with-slug breaks resolution in any consumer

> [!warning]- lazy-minting-fires-on-time
> Writers will mint a slug when external reference is first needed, not after the ref already exists and has gone stale.
>
> - **Current state:** untested; depends on supersede-skill prompting for slug minting
> - **Revisit if:** refs accumulate without slugs and the supersession trap re-surfaces

## Consequences

- Capture skill (per 0006/0008) gains optional `aliases:` field handling.
- Supersede skill must move `aliases:` from predecessor to successor — see 0051.
- Slug-naming convention: kebab-case, `ndr-` prefix.
