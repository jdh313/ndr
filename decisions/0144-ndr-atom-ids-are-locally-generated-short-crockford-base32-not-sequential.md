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

## Why

Max()+1 sequential ids collide silently under concurrent multi-author capture: two clones at the same HEAD each mint the same next id, and because the resulting files have different kebab titles, git merges both cleanly with no conflict marker.

The sequential scheme hits a trilemma: short ids, numeric-only, and coordination-free cannot coexist. Max()+1 is coordination-dependent — it requires a single canonical ledger or a merge-time assignment step. Coordination-based alternatives (merge-time assignment, PR-number-as-id) couple capture to a GitHub remote and mean the id is unknown at local capture time, which breaks writing `supersedes:` wikilinks before pushing.

A custom git merge driver cannot catch cross-file id collisions — differently-named files are invisible to it. A CI duplicate-id scan on PRs is the only robust gate regardless of id scheme.

The trilemma resolution: give up numbers-only, keep short + coordination-free. Crockford base32 (not base64, not decimal) wins on three axes:
- **vs. base64:** base64 is case-sensitive (breaks on case-insensitive APFS/NTFS), uses filename-unsafe `/` and `+`, and contains visually ambiguous chars.
- **vs. decimal random:** base-10 needs ~9 digits for equivalent collision safety; 6 base32 chars encode ~5 bits/char = 30 bits = ~1 billion distinct ids. At 1,000 atoms the birthday-collision probability is ~0.05%.
- **Crockford specifically:** excludes i, l, o, u to eliminate visual ambiguity (1/l, 0/o) and the profanity surface of u-containing combos.

Filenames remain `<id>-<kebab-title>.md`. The resolver and Zod schema accept both legacy `^\d{4}$` and new `^[0-9a-z]{6}$` formats. Slug (#...) and topic (.../...) grains are unaffected.

## Consequences

CI duplicate-id scan required as backstop · ~130 legacy 4-digit atoms frozen in place · chronological ordering moves to `decision_date` + supersession chains · human reference leans on slug grain (0050)

- **CI backstop (required):** A duplicate-id scan must run on every PR. A merge driver cannot detect cross-file collisions; CI is the only gate. A collision is cheap to resolve — the fresh atom has no inbound references yet, so regenerating its id is a one-file change.
- **Legacy ids frozen:** The ~130 existing 4-digit atoms keep their ids forever. Per 0049, atom ids are frozen pointers — no backfill, no rename. Both id formats coexist in the vault indefinitely.
- **Ordering no longer encoded in the id:** Sequential ids carried implicit chronology. That signal is gone; `decision_date` plus explicit supersession chains now carry it. Sorting by id produces arbitrary order for new atoms.
- **Slug grain absorbs human-reference load:** Opaque 6-char ids are harder to cite in conversation. The slug grain (0050) is the ergonomic handle; whether to make slug minting eager rather than lazy is a deferred follow-up.
- **Implementation (JUN-174):** The write-path port replaces max()+1 with CSPRNG base32 generation. The `AtomIdString` Zod schema and `asAtomId` guard widen to accept both formats. The CLI resolver atom-id grain regex widens. A new CI duplicate-id scan workflow is added.
