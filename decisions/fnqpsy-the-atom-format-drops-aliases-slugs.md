---
id: "fnqpsy"
title: The atom format drops aliases/slugs
status: current
decision_date: 2026-07-08
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - referencing
  - meta-chain
binds: []
supersedes:
  - "0050"
superseded_by: []
derived_from:
  - docs/superpowers/specs/2026-07-08-atom-format-redesign.md
informed_by:
  - "0007"
---

# fnqpsy — The atom format drops aliases/slugs

## Decision

The atom format removes the `aliases:` frontmatter field and the lazy slug-minting it supported. Atoms no longer carry slugs, and the `ndr-`namespaced alias mechanism is gone.

## Commitments

- `ndr capture` neither accepts nor mints `aliases:`; doctor's slug-uniqueness and alias-handover checks are deleted.
- Supersession simplifies from three writes to two (the alias-handover write is removed).

## Revisit if

- A per-atom stable string handle becomes necessary that resolving a frozen id and walking to head cannot provide.

## Context

- `aliases:` was used by 2 of 52 atoms.
- Slug uniqueness assumed an Obsidian vault to be unique within; every ledger is now repo-resident with no vault.
- Lazy minting existed only to serve the `ndr:#slug` reference grain.

## Why

With the `#slug` reference grain removed, the field that stored slugs has no consumer left. Deleting `aliases:` also removes the slug-uniqueness sweep and, more consequentially, drops supersession from three coordinated writes to two — the alias-handover write existed solely to keep a slug attached to exactly one atom. The stable-concept-handle job slugs were meant to do is served by resolving a frozen id and walking to head.

## Alternatives

- **Keep `aliases:`, minted lazily (ndr:0050)** — rejected: 2-of-52 usage, no vault for uniqueness, and its only reference-grain consumer was removed.
- **Move slugs to a separate registry file** — rejected: adds a second source of truth beside the markdown substrate for a feature with no consumer.
