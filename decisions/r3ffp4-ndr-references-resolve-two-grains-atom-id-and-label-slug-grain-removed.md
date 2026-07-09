---
id: "r3ffp4"
title: NDR references resolve two grains — atom-id and label; slug grain removed
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
  - "0049"
superseded_by: []
derived_from:
  - docs/superpowers/specs/2026-07-08-atom-format-redesign.md
informed_by:
  - "0008"
---

# r3ffp4 — NDR references resolve two grains — atom-id and label; slug grain removed

## Decision

`ndr:` references resolve two grains: `ndr:<atom-id>` (a frozen historical anchor whose resolve walks to the current head) and `ndr:<label>` (all current heads carrying that label). The `ndr:#slug` grain is removed.

## Commitments

- `ndr resolve` and the `/decisions` reader handle exactly two grains; the slug-resolver path is deleted.
- `ndr:<label>` returns all current heads carrying the label, replacing the old `ndr:area/topic` form.

## Revisit if

- A tracked project needs a stable per-atom concept handle that resolving a frozen id and walking to head cannot serve.

## Context

- NDR references are bi-temporal: a writer may mean the atom that justified a code site, or the decision that currently governs it.
- The `#slug` grain was referenced nowhere outside ndr's own code, and the `aliases:` field that backed it was used by only 2 of 52 atoms.
- Every ledger is now repo-resident, read by agents via CLI briefs and by humans in editor/GitHub diffs — no Obsidian slug namespace to be unique in.

## Why

The atom-id anchor plus resolve-to-head already covers the "stable concept that follows supersession" job the slug grain was meant to serve, so a third grain earns nothing. Collapsing area and topic into labels turns the old area-grain reference into a single `ndr:<label>` lookup. Two grains still let the writer choose intent at write time — id for history, label for current area-governance — on one prefix and one resolver, without the unused middle grain or its slug-uniqueness machinery.

## Alternatives

- **Keep the three-grain scheme (ndr:0049)** — rejected: the `#slug` grain was used nowhere outside ndr's own code and had no repo to be unique in.
- **Collapse to a single id grain** — rejected: loses area-grain governance (`ndr:<label>`), which real call sites need when a whole area governs the code.
