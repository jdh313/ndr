---
id: "0050"
title: "NDR slugs live in atom aliases: frontmatter, minted lazily on demand"
status: current
decision_date: 2026-05-15
author: Jacob Hoehler
conviction: tentative
project: Decision Pipeline
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

- The first real supersession-with-slug breaks resolution in any consumer (Bases, dataview, etc.).
- Refs accumulate without slugs and the supersession trap re-surfaces.

## Context

- Using a separate registry file for slugs would introduce a second source of truth, conflicting with 0007's markdown-only substrate.
- Inventing slugs per-atom upfront risks the same taxonomy-drift trap that eager `area:`/`topic:` invention would hit.
- Obsidian's native alias mechanism resolves `[[alias]]` wikilinks to the atom carrying that alias, with no plugin dependency.

## Why

Using `aliases:` over a separate registry file keeps the substrate to "markdown files" (0007) — no second source of truth. The `ndr-` namespace prefix avoids alias collisions with non-NDR vault notes. Lazy minting means slug invention happens at the moment a reference need exists, not speculatively, avoiding the same taxonomy-drift trap eager `area:`/`topic:` invention would hit.
