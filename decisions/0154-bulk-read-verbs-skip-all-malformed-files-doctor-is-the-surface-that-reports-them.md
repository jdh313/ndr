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

## Why

One sick file must not take down corpus reads; silent-skip is now safe because `ndr doctor` is the dedicated surface that reports malformed files as findings.

The predecessor atom scoped skip-with-warning to schema-invalid atoms only. A parse-broken file (bad YAML fence, malformed frontmatter) still aborted the whole bulk command. That inconsistency is gone: `readAllAtoms` now delegates to `scanLedger`, so fence-broken files get the same skip-with-warning treatment as schema-invalid ones. The safety property that justified silent-skip — a dedicated reporting surface exists — now covers parse errors too, since `ndr doctor` classifies both `parse_error` and `schema_invalid` as findings (with missing-required-fields classified separately). Targeted reads retain the loud-failure contract: a zero exit from a targeted read still guarantees a valid atom. The warning format `ndr: skipping malformed atom <file> (<reason>)` is unchanged and machine-parseable; parse-error reasons are collapsed to one line.

## Consequences

Bulk verbs: skip-with-warning on fence/YAML parse failures AND schema-invalid atoms · Targeted reads: `AtomValidationError` on any malformed atom · `ndr doctor`: `parse_error` and `schema_invalid` findings; missing-required-fields classified separately · Warning format unchanged and machine-parseable

- Implemented by routing `readAllAtoms` through `MarkdownLedgerAdapter.scanLedger` — the same path `ndr doctor` uses, so the two surfaces stay in sync.
- Parse-error reason strings are collapsed to one line to keep the warning format parseable.
- Skills consuming bulk-read output are unaffected by the extension; they already handled the skip-with-warning contract from 0138.
- Supersedes 0138, whose scope (schema-invalid-only) is now widened to all malformed files.
