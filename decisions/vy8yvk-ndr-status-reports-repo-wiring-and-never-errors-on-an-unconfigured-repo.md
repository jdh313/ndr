---
id: "vy8yvk"
title: ndr status reports repo wiring and never errors on an unconfigured repo
status: current
decision_date: 2026-06-07
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
  - ndr CLI session 2026-06-07
informed_by: []
---

# vy8yvk — ndr status reports repo wiring and never errors on an unconfigured repo

## Decision

`ndr status` reports how a repo is wired up — resolved ledger and its source (flag / env / `.ndr.toml` / none), atom counts (current / total), taxonomy presence, and the grounding marker at `.claude/rules/ndr.md` — and is the one read verb that reports rather than errors when no ledger resolves.

## Commitments

- The never-throw-on-`none` behavior is load-bearing: any regression that makes `status` error on an unconfigured repo silences the most useful diagnostic for a misconfigured setup.
- `status` is read-only with no ledger side effects, so it can be removed or renamed later without touching state.
- Output is available in both human layout and `--json`, for scripting parity with the other read verbs.

## Context

- Verifying a repo's NDR wiring previously took four manual shell commands: inspecting the ledger path, counting atoms, checking taxonomy files, and looking for the grounding marker.
- Every other read verb errors with "run `ndr init`" when no ledger resolves.

## Why

`ndr status` consolidates the four-command wiring check into one surface and closes the `init` -> `status` loop. Making it the one read verb that never throws on an unconfigured repo means its output is always useful, including before `init` has ever run — every other verb errors, but status reports `source: none` instead. It offers both a human layout and `--json`, giving scripting parity with the other read verbs.
