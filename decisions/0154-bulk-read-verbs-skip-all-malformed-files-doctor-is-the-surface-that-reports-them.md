---
id: "0154"
title: Bulk read verbs skip all malformed files; doctor is the surface that
  reports them
status: current
decision_date: 2026-06-04
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - read-side
binds: []
supersedes:
  - "0138"
superseded_by: []
derived_from: []
informed_by: []
---

# 0154 — Bulk read verbs skip all malformed files; doctor is the surface that reports them

## Decision

Corpus-wide read verbs (search, current, slug resolution, topic-grain resolve) skip every malformed file with a stderr warning — fence/YAML parse failures included; targeted reads (getAtom / resolve by id) still throw `AtomValidationError` and fail loudly.

## Commitments

- `readAllAtoms` routes through `MarkdownLedgerAdapter.scanLedger` — the same path `ndr doctor` uses, so the two surfaces stay in sync.
- Parse-error reason strings collapse to one line to keep the warning format `ndr: skipping malformed atom <file> (<reason>)` parseable.
- Targeted reads (`getAtom` / resolve by id) keep throwing `AtomValidationError` on any malformed atom — a zero exit from a targeted read still guarantees a valid atom.
- Skills already consuming bulk-read output need no changes; they already handled the skip-with-warning contract from 0138, whose narrower scope (schema-invalid-only) this widens to all malformed files.

## Context

- The predecessor atom (0138) scoped skip-with-warning to schema-invalid atoms only; a parse-broken file (bad YAML fence, malformed frontmatter) still aborted the whole bulk command.
- That inconsistency meant one sick file could take down corpus-wide reads.

## Why

Silent-skip is now safe because `ndr doctor` is the dedicated surface that reports malformed files as findings — the safety property that justified skip-with-warning now covers parse errors too, since doctor classifies both `parse_error` and `schema_invalid` as findings (missing-required-fields classified separately). `readAllAtoms` now delegates to `scanLedger`, so fence-broken files get the same skip-with-warning treatment as schema-invalid ones. Targeted reads retain the loud-failure contract: a zero exit from a targeted read still guarantees a valid atom.
