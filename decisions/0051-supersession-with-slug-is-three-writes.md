---
id: "0051"
title: Supersession with a slug is a three-write atomic primitive
status: current
decision_date: 2026-05-15
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - supersession
  - meta-chain
binds: []
supersedes: []
superseded_by: []
derived_from:
  - Decisions/0050-slugs-as-aliases-minted-lazily
informed_by:
  - "0008"
---

# 0051 — Supersession with a slug is a three-write atomic primitive

## Decision

When the predecessor carries an `aliases:` slug, the supersede skill performs three coordinated writes: predecessor (`status: superseded`, `superseded_by: [successor]`, `aliases: []`), successor (`status: current`, `supersedes: [predecessor]`, `aliases: [moved slug]`), and the linkage between them. The alias handover is atomic with the supersession itself, not a separate user step.

## Commitments

- Supersede skill (not yet built) must carry the three-write atomicity, including alias handover.
- 0008's "supersession-needs-atomicity" invariant gains a sub-clause: atomicity now covers `aliases:` field handover when applicable.
- If another field later needs handover, the primitive becomes N-write, but the contract stays "all field-handover is part of supersession."

## Revisit if

- Another frontmatter field is discovered to need handover during supersession (e.g., backlinks-as-frontmatter).
- Slug uniqueness violations surface in practice (the write-time check is missing or bypassable).

## Context

- 0008 established a two-write supersession primitive that assumed no slug field.
- `aliases:` is the only frontmatter field that can move between atoms during supersession.
- A crash mid-supersede with alias handover deferred as a separate step could leave either a duplicate alias (two atoms claim the same slug) or a dangling alias (slug points at a superseded atom).

## Why

Folding alias handover into the supersede primitive means the invariant "exactly one atom holds a given slug at any time" is structurally protected, not discipline-dependent. Treating it as part of the supersession transaction matches the structural-protection pattern 0008 established for `supersedes:` — the supersede skill enforces the invariant so the substrate (plain YAML) doesn't have to.
