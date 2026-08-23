---
id: "s9yxd8"
title: nested_under is a hard presupposition edge that flags children on parent
  supersession
status: current
decision_date: 2026-08-22
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - architecture
  - meta-chain
binds:
  - src/domain/schema.ts
  - src/domain/doctor.ts
supersedes: []
superseded_by: []
derived_from:
  - https://claude.ai/code/artifact/4b17e014-3dd9-428a-b3e3-efc8390ef48d
informed_by:
  - 15qzf2
---

# s9yxd8 — nested_under is a hard presupposition edge that flags children on parent supersession

## Decision

An atom may declare `nested_under`, a hard edge asserting that it presupposes
another atom. When a parent is superseded, its children are flagged as unreviewed
against the new head. Children are never mutated, invalidated, or retracted by
the cascade.

## Scope

- Binds: the relation vocabulary, `doctor`'s sweep, and what `resolve` reports
  alongside a head.
- Does not bind: `informed_by`, which stays soft and unchanged.
- Does not bind: how a flag is cleared once a child has been re-reviewed, which
  remains open.

## Commitments

- The flag is derived by comparing the recorded parent id against that parent's
  chain head, and is never stored as a field.
- The nest graph must be acyclic, and is walked transitively so a grandchild
  flags when its grandparent moves.
- Every capture must choose between `informed_by` and `nested_under`, so the
  distinction has to stay teachable.

## Revisit if

- Cascade flags fire broadly enough that they are routinely ignored.
- The distinction between the soft and hard edge proves unteachable, showing up
  as atoms that pick one arbitrarily.

## Context

- The project describes itself as tooling for nested decision records, and its
  glossary defines atom, head, ledger, supersession, grain and drift — no nest.
- The frontmatter schema carried no parent edge of any kind.
- `informed_by` exists on 91 edges in this ledger and explicitly carries no
  supersession semantics.
- A decision such as "use this language feature for configuration" is void if
  "use this language" falls, and nothing surfaced that relationship.
- Surfacing drift is framed as the purpose of the tool.
- A known-stale head has been tracked by hand outside the ledger because the
  model could not express it.

## Why

Presupposition is the content of the edge, and it is exactly what the existing
soft edge declines to assert. Adding consequences to `informed_by` instead would
destroy a distinction 91 edges already rely on, so the two coexist.

Flagging rather than invalidating is the load-bearing half. A parent moving does
not void every child: replacing a parent may leave one child untouched and kill
another, and only a person can tell which. Cascading invalidation would retire
still-valid decisions silently, which is the failure the whole primitive exists
to prevent.

Deriving the flag rather than storing it means there is no field to maintain and
nothing to fall out of sync. That matters here specifically, because the state it
replaces is currently kept by hand in a file outside the ledger, where nothing
can check it.

## Alternatives

- **Rename `informed_by` and give it consequences** — rejected: loses the ability
  to say "this shaped me but I do not depend on it", which 91 edges use today.
- **Cascade invalidation, flipping children to a non-current status** — rejected:
  silently retires children that are still valid under the new parent.
- **Advisory hierarchy with no consequence at all** — rejected: that is
  `informed_by`, which already exists.
