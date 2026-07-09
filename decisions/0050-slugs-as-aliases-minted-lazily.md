---
id: "0050"
title: "NDR slugs live in atom aliases: frontmatter, minted lazily on demand"
status: current
decision_date: 2026-05-15
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - referencing
  - meta-chain
binds: []
supersedes: []
superseded_by: []
derived_from:
  - Decisions/0049-ndr-reference-scheme-three-grains
informed_by:
  - "0007"
---

# 0050 — NDR slugs live in atom aliases: frontmatter, minted lazily on demand

## Decision

A slug is a string in the atom's `aliases:` YAML frontmatter field, namespaced with an `ndr-` prefix (e.g. `aliases: [ndr-monorepo-shape]`). Slugs are minted only when a specific atom needs atom-grain external reference; default is `aliases: []`. Most atoms never carry a slug.

## Commitments

- Capture skill (per 0006/0008) gains optional `aliases:` field handling.
- Supersede skill must move `aliases:` from predecessor to successor — see 0051.
- Slug-naming convention: kebab-case, `ndr-` prefix.

## Revisit if

- The first real supersession-with-slug breaks alias resolution in any consumer.
- References accumulate without slugs and the supersession trap re-surfaces.

## Context

- Obsidian's native alias mechanism resolves `[[ndr-monorepo-shape]]`-style wikilinks to whichever atom carries that alias, with no plugin dependency.
- 0007 established plain markdown files as the sole substrate — no second source of truth.
- Eagerly inventing `area:`/`topic:` values ahead of need had already produced a taxonomy-drift hazard.

## Why

Using `aliases:` over a separate registry file keeps the substrate to markdown files (0007) rather than adding a second source of truth. The `ndr-` namespace prefix avoids alias collisions with non-NDR vault notes. Minting lazily — only when a specific atom needs atom-grain external reference — means slug invention happens at the moment a reference need exists, not speculatively, avoiding the same taxonomy-drift trap that eager `area:`/`topic:` invention hit.
