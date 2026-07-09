---
id: "8gh40e"
title: Supersession returns to a two-write primitive
status: current
decision_date: 2026-07-08
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - supersession
  - meta-chain
binds: []
supersedes:
  - "0051"
superseded_by: []
derived_from:
  - docs/superpowers/specs/2026-07-08-atom-format-redesign.md
informed_by:
  - "0008"
---

# 8gh40e — Supersession returns to a two-write primitive

## Decision

Supersession is a two-write transaction: write the successor (`supersedes: [predecessor]`) and patch the predecessor (`status: superseded`, `superseded_by: [successor]`). The alias-handover third write is gone.

## Commitments

- `ndr capture` performs the successor write and predecessor patch as one transaction; the alias-handover write and slug-uniqueness check are deleted.
- Field-handover stays part of the supersession transaction: if a future field must move between atoms, the primitive grows rather than splitting the handover into a separate user step.

## Revisit if

- A new frontmatter field is introduced that must migrate between atoms during supersession.

## Context

- The three-write primitive existed solely to move an `aliases:` slug from predecessor to successor atomically.
- `aliases:` is removed from the format, so no frontmatter field now moves between atoms during supersession.
- A two-write pair was the original supersession primitive before slugs were added.

## Why

With `aliases:` gone, the only field that ever migrated during supersession no longer exists, so the third write has nothing to carry. Supersession collapses back to the minimal atomic pair — successor write plus predecessor patch — which the CLI performs as a single transaction. Semantics stay binary and whole-atom; `binds:` never affects status, so the chain walk remains the simple canonical primitive.

## Alternatives

- **Keep the three-write primitive (ndr:0051)** — rejected: its third write only existed for alias handover, which is now moot.
