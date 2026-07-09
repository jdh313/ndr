---
id: "0144"
title: NDR atom ids are locally-generated short Crockford base32, not sequential
status: current
decision_date: 2026-06-02
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - referencing
  - meta-chain
binds: []
supersedes: []
superseded_by: []
derived_from:
  - Decisions/0049-ndr-reference-scheme-three-grains
informed_by:
  - "0050"
  - "0102"
  - "0129"
  - "0133"
---

# 0144 — NDR atom ids are locally-generated short Crockford base32, not sequential

## Decision

Atom ids are 6-character lowercase Crockford base32 strings (alphabet excludes i/l/o/u), generated locally from a CSPRNG at capture time — stateless, no ledger scan, no counter, no coordination required.

## Commitments

- Filenames remain `<id>-<kebab-title>.md`; the resolver and Zod schema accept both legacy `^\d{4}$` and new `^[0-9a-z]{6}$` id formats — slug (#...) and topic (.../...) grains are unaffected.
- A CI duplicate-id scan must run on every PR — the only gate, since a git merge driver cannot detect cross-file collisions. A collision is cheap to resolve, since a fresh atom has no inbound references yet.
- The ~130 existing 4-digit legacy atoms keep their ids forever (frozen pointers per 0049) — both id formats coexist in the vault indefinitely, no backfill, no rename.
- Chronological ordering is no longer encoded in the id; `decision_date` plus explicit supersession chains carry that signal now, so sorting by id produces arbitrary order for new atoms.
- The slug grain (0050) absorbs human-reference load, since opaque 6-char ids are harder to cite in conversation; whether slug minting becomes eager rather than lazy is a deferred follow-up.
- Implementation (JUN-174): the write-path port replaces max()+1 with CSPRNG base32 generation; the `AtomIdString` Zod schema and `asAtomId` guard widen to accept both formats; the CLI resolver atom-id grain regex widens; a new CI duplicate-id-scan workflow is added.

## Context

- Max()+1 sequential ids collide silently under concurrent multi-author capture: two clones at the same HEAD can each mint the same next id, and because the resulting files have different kebab-title filenames, git merges both cleanly with no conflict marker.
- The sequential scheme faces a trilemma: short ids, numeric-only, and coordination-free cannot all coexist.
- Max()+1 is coordination-dependent — it requires a single canonical ledger or a merge-time assignment step.
- Coordination-based alternatives (merge-time assignment, PR-number-as-id) couple capture to a GitHub remote, meaning the id is unknown at local capture time — which breaks writing `supersedes:` wikilinks before pushing.
- A custom git merge driver cannot catch cross-file id collisions, since differently-named files are invisible to it; a CI duplicate-id scan on PRs is the only robust gate regardless of id scheme.

## Why

The trilemma resolves by giving up numbers-only and keeping short + coordination-free — Crockford base32 is the encoding that satisfies both remaining constraints. Crockford specifically excludes i, l, o, u to eliminate visual ambiguity (1/l, 0/o) and the profanity surface of u-containing combinations.

## Alternatives

- **base64** — rejected: case-sensitive (breaks on case-insensitive APFS/NTFS), uses filename-unsafe `/` and `+`, and contains visually ambiguous characters.
- **decimal random** — rejected: base-10 needs ~9 digits for equivalent collision safety, versus 6 base32 chars (~5 bits/char = 30 bits = ~1 billion distinct ids; ~0.05% birthday-collision probability at 1,000 atoms).
- **Coordination-based schemes (merge-time assignment, PR-number-as-id)** — rejected: couples capture to a GitHub remote, meaning the id is unknown at local capture time, which breaks writing `supersedes:` wikilinks before pushing.
