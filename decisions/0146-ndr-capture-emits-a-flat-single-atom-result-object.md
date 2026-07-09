---
id: "0146"
title: ndr capture emits a flat single-atom result object
status: current
decision_date: 2026-06-02
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - write-side
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - "0129"
---

# 0146 — ndr capture emits a flat single-atom result object

## Decision

`ndr capture` prints `{id, path, superseded[], aliases_moved[]}` on stdout on success; errors surface via exit code plus a JSON object on stderr, never as a field in the result.

## Commitments

- JUN-175 consumers (skills rewired to call the CLI) rely on a fixed pattern: check exit code, parse stdout on 0, parse stderr on non-zero.
- `superseded[]` and `aliases_moved[]` remain arrays even for a single capture — one invocation that supersedes two predecessors carrying slugs populates both.
- Stderr JSON schema is a separate, future concern; this decision constrains only stdout shape and the error-channel separation.

## Context

- The `persist.py` reference returned a batch aggregate `{written[], superseded[], aliases_moved[], errors[]}` because it was designed to process several candidates in one call.
- `ndr capture` operates on one atom at a time; the caller (a skill or script) loops.

## Why

Single-atom capture is the unit of work here — a batch aggregate shape has no caller to match it. A batch shape at the single-atom boundary would require callers to index into a one-element `written[]` array and check a parallel `errors[]` array on every parse — extra surface for bugs with no benefit. Keeping `superseded` and `aliases_moved` as arrays is still correct in the single-atom shape, since one capture can supersede several predecessors and move several slugs — the cardinality is genuinely one-to-many. Separating errors onto stderr with exit codes follows standard POSIX CLI convention and lets JUN-175 skill consumers branch on `$?` before parsing stdout, rather than parsing stdout to discover whether the operation succeeded.

## Alternatives

- **Errors as a field in the stdout JSON result** — rejected: requires the caller to always parse stdout even on failure, conflating the success and failure reading paths.
- **The persist.py batch aggregate shape** — rejected: a mismatch to the single-atom call site; would require callers to unwrap a one-element array on every success.
