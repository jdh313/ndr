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

## Why

Three tightly coupled sub-decisions — brief shape, drift placement, and basename sourcing — must be locked together so consumers get a stable, unambiguous contract from the first CLI slice.

ndr-reader Stage 4 is already the established model for surfacing a resolved atom to a reader; copying it verbatim (minus assumption callouts, which belong to an interactive reading context, not a CLI brief) means the CLI inherits a proven format rather than inventing one.

The three sub-decisions below are load-bearing enough to warrant explicit recording because re-opening any one of them silently would break consumers without a trace in the ledger.

## Alternatives

Brief shape: trim further below Stage 4 (rejected) · Assumption callouts in brief (rejected) · Drift on stderr (rejected) · Vault-absolute path in brief (rejected)

- **Trim further than Stage 4:** Less information means callers lose the lineage and references that are the whole point of `resolve`. The Stage 4 model is already compact.
- **Assumption callouts in brief:** Assumption callouts are interactive altitude — they belong in a reading session, not a machine-readable CLI line. Omitting them keeps the brief scannable and parseable.
- **Drift on stderr:** Forcing consumers to merge streams (stdout + stderr) to reconstruct the full picture is an ergonomic burden and breaks simple pipeline use (`ndr resolve ... | jq`). Drift is a payload signal the caller asked for; it belongs in the payload.
- **Vault-absolute path (`Decisions/<id>-<slug>`) in brief:** The CLI accepts a configurable `--ledger` flag, so `Decisions/` is not a stable prefix. A vault-coupled path would break any non-default ledger configuration. Ledger-relative basename keeps the format adapter-aware and portable.

## Consequences

JUN-173 (slug + topic grains) inherits this format unchanged · Drift placement convention extends to any future grain · Re-opening any sub-decision requires a successor atom, not a silent code change

- **JUN-173 compatibility:** The brief format is intentionally format-stable across grains. Slug-grain and topic-grain output from JUN-173 will prepend the same drift warning and use the same brief shape — no per-grain format variant.
- **Drift convention propagation:** Any grain that walks a supersession chain emits the same `[!info] Drift: seed <id> superseded -> head <id>` line prepended to stdout. This becomes the settled pattern for drift surfacing across the CLI surface.
- **Successor-required policy for sub-decisions:** The three sub-decisions (brief shape, drift channel, basename sourcing) are recorded here rather than in comments or a spec doc so that re-opening one produces a legible ledger entry with a supersession pointer — not a silent diff in `formatBrief` or `getAtomFilename`.
- **`getAtomFilename` adapter contract:** If a second adapter appears (non-markdown), that adapter must expose an equivalent `getAtomFilename(id)` method, or the brief falls back to the portable `(ndr:<id>)` notation. The fallback is intentional — the brief does not break, it degrades gracefully.
