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

## Why

The supersession chain is the load-bearing primitive: readers need to walk named atoms in a sequence, not traverse data version history.

Swamp data versioning tracks in-place edits to a single artifact (typo fix, body refinement). It does not carry the semantic that "0042 and 0089 are different atoms in an explicit lineage" — that relationship needs a named, queryable edge. Collapsing supersession into data versions would bury the chain inside swamp's internal history, making it invisible to CEL queries and impossible to surface as distinct vault files. The current mental model — one file equals one atom, supersession is explicit lineage — maps directly onto one swamp artifact per revision with `supersedes:`/`superseded_by:` edges. Chain walk stays a first-class query: `data.query('decision', 'supersedes contains <id>')` forward, reverse walk backward.

## Alternatives

Data-versioned single artifact per decision chain: rejected. Hybrid (versions for minor, new artifact for major): deferred as premature complexity.

- **Data-versioned single artifact:** Loses the "0042 and 0089 are different atoms" semantics. Chain walk requires history traversal through swamp internals, not a CEL query. Vault cannot emit two distinct files for two revisions. The chain becomes opaque.
- **Hybrid minor/major versioning:** Requires a rule for what constitutes "major" — a judgment call at every supersession. Adds complexity for no clear gain. Explicit chain is simple and consistent.

## Consequences

New artifact per revision with its own swamp id · Supersession edges reference predecessor id strings · Data versioning reserved for in-place edits · Chain walk is a CEL query

- Each revision creates a new `@jdh313/ndr/decision` artifact. Swamp data ids are stable per-artifact; the NDR `id` field (`"0042"`) is a separate human-readable sequence number assigned at persist time.
- `supersedes` and `superseded_by` fields reference predecessor NDR id strings (e.g., `"0042"`). Wire format stays round-trip-friendly to markdown.
- Swamp data versioning is used only for in-place corrections to a single revision — typo fixes, callout refinements. It is not the supersession primitive.
- Re-modeling as data-versioned later would require collapsing N artifacts per chain into one — a non-trivial data migration with no fallback. Hence `reversibility: hard`.
