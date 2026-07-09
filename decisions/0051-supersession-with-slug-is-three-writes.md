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

## Why

A crash mid-supersede with the handover deferred leaves either a duplicate alias (two atoms claim the same slug) or a dangling alias (slug points at superseded atom). Folding handover into the supersede primitive means the invariant "exactly one atom holds a given slug at any time" is structurally protected, not discipline-dependent.

0008's two-write supersession primitive assumed no slug field. Slugs introduce a third mutable point on the predecessor — `aliases:` is now the only frontmatter field that can move between atoms. Treating it as part of the supersession transaction matches the structural-protection pattern 0008 established for `supersedes:`. The supersede skill enforces the invariant; the substrate (plain YAML) doesn't have to.

## Assumptions

`three-write-is-the-only-mutation` · `slug-uniqueness-enforced-at-write`

No other frontmatter field needs to move between atoms during supersession.

- **Current state:** active — `id`, `title`, `decision_date`, `area`, `topic`, `assumptions` are atom-immutable by 0008
- **Revisit if:** another field gets discovered to need handover (e.g., backlinks-as-frontmatter)

The supersede skill (and capture skill, for new slug minting) refuses to write a slug already in use elsewhere.

- **Current state:** to be implemented in skill code
- **Revisit if:** uniqueness violations surface in practice (suggests the check is missing or bypassable)

## Consequences

- Supersede skill (not yet built) carries the three-write atomicity, including alias handover.
- 0008's "supersession-needs-atomicity" assumption gains a sub-clause: atomicity now covers `aliases:` field handover when applicable.
- A future revision: if another field needs handover, this becomes an N-write primitive; the contract stays "all field-handover is part of supersession."
