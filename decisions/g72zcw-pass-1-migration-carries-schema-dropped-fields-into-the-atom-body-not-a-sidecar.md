---
id: "g72zcw"
title: Pass-1 migration carries schema-dropped fields into the atom body, not a
  sidecar
status: current
decision_date: 2026-07-09
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - process
  - meta-chain
binds:
  - src/cli/migrate.ts
  - plugins/ndr/agents/ndr-migrator.md
supersedes: []
superseded_by: []
derived_from:
  - docs/superpowers/specs/2026-07-08-atom-format-redesign.md
informed_by:
  - p42qaq
  - "0075"
---

# g72zcw — Pass-1 migration carries schema-dropped fields into the atom body, not a sidecar

## Decision

When `ndr migrate` (pass 1) converts frontmatter to the new schema, it relocates the fields the schema drops -- `revisit_triggers` and `reversibility` -- into the atom body instead of a sidecar file. `revisit_triggers` becomes a `## Revisit if` stub; a hard-to-undo `reversibility` value becomes a strippable HTML-comment hint toward a `## Commitments` bullet. Other reversibility values carry nothing forward.

## Commitments

- The pass-2 agent and its reviewer must merge revisit conditions from both the body's existing `## Assumptions` content and the pass-1-deposited stub.
- The pass-2 agent must strip the reversibility HTML comment before the atom's final body ships.

## Revisit if

- A sidecar or other out-of-band channel becomes necessary because the pass-2 agent gains git access or a second read step stops being costly.

## Context

- The new atom-format schema drops the frontmatter fields `revisit_triggers` and `reversibility`.
- The pass-2 body-reshaping agent is Read-only with no git access, so it cannot recover anything pass 1 already deleted from frontmatter.
- The redesign spec defines `## Revisit if` as the body's replacement for both the old body Assumptions section and the `revisit_triggers` field.
- `reversibility` is a killed field subsumed by `conviction`; only a "hard to undo" value has surviving content worth preserving (a candidate `## Commitments` bullet) -- every other value has nothing to carry.
- A different repo's migration lost `## Revisit if` content silently because its triggers lived only in frontmatter and the reshaping agent never saw the deletion.

## Why

Fields already visible to pass 1 are the only chance to preserve them, since pass 2 cannot see anything pass 1 deletes. Depositing directly in the body is turnkey -- the pass-2 agent already reads the body it is reshaping, whereas an out-of-band channel adds wiring the agent must be told to consult. This is also not a workaround: `revisit_triggers`' real destination under the redesign is `## Revisit if` regardless of migration, so relocating it during pass 1 is the intended mapping arriving early rather than a stopgap. `reversibility` has no field-level home left, so surfacing only its hard-to-undo case as a strippable hint avoids inventing structure for content that mostly has nowhere to go.

## Alternatives

- **Sidecar file (e.g. `.migration/carried.json`) holding dropped fields** -- rejected: requires pass-2 dispatch to read a second source and the orchestrator to wire that lookup, for no benefit over a location the agent already reads.
