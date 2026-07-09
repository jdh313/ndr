---
id: "f6fqbx"
title: "New zero-discipline frontmatter fields: conviction and author"
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
  - "0004"
---

# f6fqbx — New zero-discipline frontmatter fields: conviction and author

## Decision

Two new frontmatter fields land: `conviction` (`strong` | `tentative` | `arbitrary`, required with no default) and `author` (auto-filled by `ndr capture` from `git config user.name`). Neither requires anyone to remember to update it later.

## Commitments

- `ndr capture` auto-fills `author:` from git and rejects a missing `conviction:`.
- Doctor adds `author` and `conviction` to the required fields and drops `reversibility`.
- `author` records the human on whose behalf the capture ran — never the agent, which is a pen, not an author.

## Revisit if

- A three-value conviction scale proves too coarse or too fine to drive the supersession bar in practice.

## Context

- The format had no signal for how firmly a decision was held, so every head looked equally load-bearing to a reviser.
- The removed `reversibility:` field was validated and displayed but consumed by no behavior.
- A prior decision established that manual-discipline fields rot (ndr:0004).

## Why

`conviction` captures a judgment made once at capture time — how hard the author would defend the call — and feeds `/interrogate-decision` and `/ground` the supersession bar, so weak-conviction heads surface first when a revisit fires. It is required with no default because a default invites never making the judgment, the same rationale that makes `supersedes:` presence-required. `author` is machine-filled. Both fields therefore honor the no-manual-discipline principle: one is a capture-time judgment, the other is auto-filled, and neither needs later maintenance.

## Alternatives

- **Keep `reversibility:` instead of `conviction:`** — rejected: it drove no behavior; conviction is what that field was reaching for.
- **Make `conviction` optional with a default** — rejected: a default is never revisited, so the judgment never actually gets made.
