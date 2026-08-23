---
id: "7c5g54"
title: The atom format drops the status field; live-ness is computed from successors
status: current
decision_date: 2026-08-23
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - meta-chain
  - write-side
binds:
  - src/domain/schema.ts
  - src/domain/doctor.ts
supersedes: []
superseded_by: []
derived_from:
  - .docs/2026-08-23-supersession-dag-design.md
informed_by:
  - jkxmp5
---

# 7c5g54 — The atom format drops the status field; live-ness is computed from successors

## Decision

The atom format has no `status:` field. Whether an atom still stands is computed
from its successors and their scopes at the point of the query. Retraction, if it
is ever needed, gets a field of its own rather than a value fused with
supersession.

## Scope

- Binds: the frontmatter schema, the migration path, and every verb that reported
  an atom as current or superseded.
- Does not bind: the supersession edges themselves, which are unchanged.

## Commitments

- Every existing atom needs a migration pass to strip the field, since the schema
  is strict and would otherwise reject each one as invalid.
- No verb may report live-ness without a scope point to report it at.
- The health sweep loses its status-coherence check outright rather than gaining a
  rewritten one.
- Reading an atom file directly stops showing whether it stands, making the CLI
  the only way to tell.

## Revisit if

- Retraction is needed, at which point it needs a field of its own and a rule for
  how it interacts with supersession.
- Computing live-ness becomes a measurable cost in the read verbs.

## Context

- The field carried three values: current, superseded, and retracted.
- Across ten ledgers and 468 atoms, `retracted` appears zero times.
- An atom's successors and their scopes already determine whether it has been
  replaced at a given point.
- Supersession became scope-relative, so one field could no longer state whether
  an atom stands.
- Reading atom files directly is already forbidden; the CLI owns the walk.

## Why

The field fused two unrelated facts. One — whether the atom was replaced — is
derived from data already on disk, and is now scope-relative, so it cannot be
stated in a single line at all. The other — whether the author withdrew it — is
absolute and authored, and has never once been written. Removing what is derived
and what is unused leaves nothing behind, which is the whole argument.

Keeping the field as a cache of the computed value is the tempting middle path,
and it fails the way every duplicated fact fails: it can drift, so something has
to police it, and the only workflow it would serve is a human reading the raw
file, which is already ruled out.

Retraction is the one real loss, and it is the loss of a capability never
exercised. Giving it a field when it is first needed costs less than carrying a
three-valued enum whose third value has never been written, and it avoids fusing
an authored fact back together with a derived one.

## Alternatives

- **Keep one authored bit, `valid` / `invalid`** — rejected: retraction under
  another name, and `invalid` already means malformed in the health sweep's
  vocabulary.
- **Keep the field as a cache of the computed value** — rejected: derived state on
  disk drifts, and needs a check of its own to catch the drift.
- **Replace the enum with a lifecycle axis, `pending` / `active` / `archived`** —
  rejected: implies a ratification step that does not exist, and `archived` has no
  rule separating it from superseded or retracted.
