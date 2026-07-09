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

## Why

Single-atom capture is the unit of work — a batch aggregate result shape has no caller to match it.

The `persist.py` reference returned a batch aggregate `{written[], superseded[], aliases_moved[], errors[]}` because it was designed to process several candidates in one call. `ndr capture` operates on one atom at a time; the caller (a skill or script) loops. A batch shape at the single-atom boundary would require callers to index into a one-element `written[]` array and check a parallel `errors[]` array on every parse — extra surface for bugs with no benefit.

Keeping `superseded` and `aliases_moved` as arrays is correct even in the single-atom shape: one capture can supersede several predecessors and move several slugs, so the cardinality is genuinely one-to-many.

Separating errors onto stderr with exit codes follows standard POSIX CLI convention and lets the JUN-175 skill consumers branch on `$?` before parsing stdout, rather than parsing stdout to discover whether the operation succeeded.

## Alternatives

Emit errors as a field in the stdout JSON alongside the result — rejected; keep the persist.py batch aggregate shape — rejected.

Errors in the result body require the caller to always parse stdout even on failure, and conflates the success and failure reading paths. The batch aggregate shape is a mismatch to the single-atom call site and would require callers to unwrap a one-element array on every success.

## Consequences

Skill consumers branch on exit code before parsing stdout · Stdout is always a valid single-atom object on exit 0 · Stderr carries structured error context for exits 1-3

- JUN-175 consumers (skills rewired to call the CLI) can use a simple pattern: check exit code, parse stdout on 0, parse stderr on non-zero.
- `superseded[]` and `aliases_moved[]` remain arrays — a single `ndr capture` invocation that supersedes two predecessors carrying slugs will populate both.
- Stderr JSON schema is a separate concern; this decision constrains only stdout shape and the error-channel separation.
