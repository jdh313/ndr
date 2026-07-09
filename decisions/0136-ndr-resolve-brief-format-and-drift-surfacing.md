---
id: "0136"
title: ndr resolve brief format and drift surfacing
status: current
decision_date: 2026-06-01
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - read-side
binds: []
supersedes: []
superseded_by: []
derived_from:
  - JUN-172
informed_by:
  - "0049"
  - "0129"
---

# 0136 — ndr resolve brief format and drift surfacing

## Decision

`ndr resolve <atom-id>` emits a structured brief modeled on ndr-reader Stage 4: title + ledger-relative basename, area/topic/decision_date line, reversibility line, body gist, Lineage chain, and References block; when the seed atom is superseded a one-line drift warning is prepended to that output on stdout.

## Commitments

- JUN-173's slug-grain and topic-grain output must use this same brief format and prepend the same drift warning — no per-grain format variant.
- Any grain that walks a supersession chain must prepend the same `[!info] Drift: seed <id> superseded -> head <id>` line to stdout; this is the fixed drift-surfacing convention across the CLI.
- Re-opening any of the three sub-decisions (brief shape, drift channel, basename sourcing) requires a successor atom with a supersession pointer, not a silent diff to `formatBrief` or `getAtomFilename`.
- A future non-markdown adapter must expose an equivalent `getAtomFilename(id)` method, or the brief falls back to the portable `(ndr:<id>)` notation.

## Context

- ndr-reader Stage 4 already defines an established brief format for surfacing a resolved atom to a reader: title, area/topic/decision_date, reversibility line, gist, lineage, and references.
- The CLI accepts a configurable `--ledger` flag, so `Decisions/` is not a stable path prefix across configurations.

## Why

Three tightly coupled sub-decisions — brief shape, drift placement, and basename sourcing — are locked together here so consumers get a stable, unambiguous contract from the first CLI slice. Copying the established ndr-reader Stage 4 format (minus assumption callouts, which belong to an interactive reading context, not a CLI brief) means the CLI inherits a proven format rather than inventing one. The three sub-decisions are recorded explicitly because re-opening any one of them silently would break consumers without a trace in the ledger.

## Alternatives

- **Trim further than Stage 4** — rejected: less information means callers lose the lineage and references that are the whole point of `resolve`; the Stage 4 model is already compact.
- **Assumption callouts in brief** — rejected: assumption callouts are interactive altitude — they belong in a reading session, not a machine-readable CLI line; omitting them keeps the brief scannable and parseable.
- **Drift on stderr** — rejected: forces consumers to merge streams (stdout + stderr) to reconstruct the full picture, an ergonomic burden that breaks simple pipeline use (`ndr resolve ... | jq`); drift is a payload signal the caller asked for, so it belongs in the payload.
- **Vault-absolute path (`Decisions/<id>-<slug>`) in brief** — rejected: the CLI accepts a configurable `--ledger` flag, so `Decisions/` is not a stable prefix; a vault-coupled path would break any non-default ledger configuration, whereas a ledger-relative basename keeps the format adapter-aware and portable.
