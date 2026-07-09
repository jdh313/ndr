---
id: "wrb1kw"
title: Atom bodies use one altitude per section in operational-first order
status: current
decision_date: 2026-07-08
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - meta-chain
  - write-side
binds: []
supersedes: []
superseded_by: []
derived_from:
  - docs/superpowers/specs/2026-07-08-atom-format-redesign.md
informed_by:
  - "0008"
---

# wrb1kw — Atom bodies use one altitude per section in operational-first order

## Decision

An atom body uses one altitude per section in a fixed operational-first order — Decision, Scope, Commitments, Revisit if, Context, Why, Alternatives — with prose reserved for Decision and Why and bullets for every other section. Callouts, gist lines, and slug lists are gone.

## Commitments

- `## Decision`, `## Context`, and `## Why` are required; all other sections omit-if-empty.
- `## Context` may not name the chosen option — it is a pre-decision fact inventory, one bullet per fact, so drift-audit gets a per-fact staleness check.
- `## Commitments` states only an obligation the decision creates, never a restatement of the Decision.

## Revisit if

- A section routinely needs two altitudes to be legible, or a required section is empty on a large share of real atoms.

## Context

- The prior body wrote each section twice — a gist line plus a collapsed `> [!info]-` callout restating it — and a corpus audit found sections that merely restated the Decision.
- Callouts render as plain blockquotes outside Obsidian, and every ledger is now read via CLI briefs and GitHub/PR diffs.
- Atoms recorded the choice and rationale but not the pre-decision problem context or the scope/applicability of the call.

## Why

Writing each section once, at the length it deserves, removes the gist-plus-callout duplication. Ordering by operational importance puts every terse section a reader needs while working above `## Why`, the one unbounded prose section, so the operational surface fits the first screenful and nothing pays Why's scroll cost. Prose for the claim (Decision) and the weighing (Why) with bullets for the inventories keeps arguments readable and lists scannable; a required `## Context` closes the pre-decision-world gap, and the Decision's flowing-sentence constraint is structural pressure toward atomicity.

## Alternatives

- **Keep the hybrid gist-plus-callout altitude** — rejected: Obsidian-only rendering, duplicated content, and no home for problem context or scope.
- **Narrative section order (how-we-got-here first)** — rejected: pushes the operational sections below the unbounded Why, so the working surface no longer fits a screenful.
