---
id: "p42qaq"
title: Migration grandfathers unreconstructable Context via an advisory placeholder
status: current
decision_date: 2026-07-08
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - meta-chain
  - process
binds: []
supersedes: []
superseded_by: []
derived_from:
  - docs/superpowers/specs/2026-07-08-atom-format-redesign.md
informed_by: []
---

# p42qaq — Migration grandfathers unreconstructable Context via an advisory placeholder

## Decision

A migrated atom whose pre-decision context cannot be reconstructed keeps a `## Context` section holding the single bullet `- (not reconstructed at migration)`. Doctor treats that placeholder as advisory while a missing `## Context` is a finding. New captures always require real Context.

## Commitments

- Doctor's Context check: a missing section is a finding; a placeholder-only Context is advisory.
- The migration pass emits the placeholder rather than fabricating context; new captures may not use it.

## Revisit if

- Placeholder atoms accumulate to the point that the advisory grading hides real context gaps that should be backfilled.

## Context

- The redesign makes `## Context` a required body section, but atoms written before it existed have no recorded pre-decision context.
- Fabricating context during a mechanical migration would plant false history.
- Doctor needs to distinguish "never had context" from "context genuinely omitted."

## Why

A recognizable placeholder marker lets doctor grade honestly: an atom that truthfully could not reconstruct its context is advisory, not a hard finding, so the migration is not forced to invent history to pass. Requiring real Context on every new capture keeps the standard strict going forward, and because the placeholder string itself is the signal, no date cutoff is needed. Fabricating context to avoid the placeholder is explicitly disallowed.

## Alternatives

- **Require reconstructed Context on every migrated atom** — rejected: forces fabricating pre-decision history the migration cannot actually know.
- **Make Context optional to accommodate old atoms** — rejected: weakens the standard for all new captures just to grandfather a one-time migration.
