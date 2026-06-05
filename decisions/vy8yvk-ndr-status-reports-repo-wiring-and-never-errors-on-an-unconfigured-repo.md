---
id: "vy8yvk"
title: ndr status reports repo wiring and never errors on an unconfigured repo
status: current
decision_date: 2026-06-07
aliases: []
project: "[[ndr]]"
derived_from:
  - "[[ndr CLI session 2026-06-07]]"
informed_by: []
supersedes: []
superseded_by: []
area: tooling
topic: read-side
impacts: []
revisit_triggers: []
reversibility: easy
tags:
  - decision
---

# vy8yvk — ndr status reports repo wiring and never errors on an unconfigured repo

## Decision

`ndr status` reports how a repo is wired up — resolved ledger and its source (flag / env / `.ndr.toml` / none), atom counts (current / total), taxonomy presence, and the grounding marker at `.claude/rules/ndr.md` — and is the one read verb that reports rather than errors when no ledger resolves.

## Why

Verifying a repo's NDR wiring previously took four manual shell commands; `ndr status` consolidates that into one surface and closes the `init` → `status` loop.

> [!info]- Full reasoning
> Before this verb, confirming a repo was correctly wired meant separately inspecting the ledger path, counting atoms, checking the taxonomy files, and looking for the grounding marker. `ndr status` collapses those into a single read. Critically, it is the one read verb that never throws on an unconfigured repo — every other verb errors with "run `ndr init`", but status reports `source: none` so its output is always useful, including before `init` has ever run. It offers both a human layout and `--json` for scripting parity with the other read verbs.

## Consequences

Never-throws contract is load-bearing · human + `--json` output · pairs with `ndr init`

> [!info]- Detail
> - The never-throw-on-`none` behavior is the whole point — any regression that makes `status` error on an unconfigured repo silences the most useful diagnostic for a misconfigured setup.
> - Read-only with no ledger side effects, so reversibility is easy — the verb can be removed or renamed without touching state.
