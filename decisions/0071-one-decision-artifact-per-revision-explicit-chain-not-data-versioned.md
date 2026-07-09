---
id: "0071"
title: One Decision artifact per revision (explicit chain), not data-versioned
status: current
decision_date: 2026-05-18
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - architecture
  - supersession
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - "0008"
---

# 0071 — One Decision artifact per revision (explicit chain), not data-versioned

## Decision

Each revised decision is a new `@jdh313/ndr/decision` artifact with its own swamp data id and explicit `supersedes:` edges to predecessors; swamp's native data versioning is not used to represent supersession.

## Commitments

- Each revision creates a new `@jdh313/ndr/decision` artifact; swamp data ids are stable per-artifact, while the NDR `id` (`"0042"`) is a separate human-readable sequence number assigned at persist time.
- `supersedes`/`superseded_by` reference predecessor NDR id strings (e.g. `"0042"`); the wire format stays round-trip-friendly to markdown.
- Swamp data versioning is reserved for in-place corrections to a single revision (typo fixes, callout refinements) — never the supersession primitive.
- Re-modeling as data-versioned later would require collapsing N artifacts per chain into one — a non-trivial, fallback-less data migration (hence hard reversibility).

## Context

- Swamp data versioning tracks in-place edits to a single artifact (typo fix, body refinement).
- The existing mental model was one file equals one atom, with supersession as explicit lineage.
- Chain walk needs to stay a queryable operation over named atoms.

## Why

The supersession chain is the load-bearing primitive: readers walk named atoms in sequence, not data version history. Data versioning does not carry the semantic that "0042 and 0089 are different atoms in an explicit lineage" — that relationship needs a named, queryable edge. Collapsing supersession into data versions would bury the chain inside swamp's internal history, invisible to CEL queries and impossible to surface as distinct vault files. One swamp artifact per revision with `supersedes:`/`superseded_by:` edges maps directly onto the existing mental model, and keeps chain walk a first-class query: `data.query('decision', 'supersedes contains <id>')` forward, reverse backward.

## Alternatives

- **Data-versioned single artifact per chain** — rejected: loses the "0042 and 0089 are different atoms" semantics; chain walk requires history traversal through swamp internals rather than a CEL query, and the vault cannot emit two distinct files for two revisions. The chain becomes opaque.
- **Hybrid (versions for minor, new artifact for major)** — deferred as premature complexity: requires a rule for what counts as "major," a judgment call at every supersession, for no clear gain over a simple, consistent explicit chain.
