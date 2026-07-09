---
id: "4sjcjm"
title: ndr CLI adds opt-in full-body reads — resolve --full and frozen show
status: current
decision_date: 2026-06-08
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
  - JUN-190
informed_by:
  - "0136"
---

# 4sjcjm — ndr CLI adds opt-in full-body reads — resolve --full and frozen show

## Decision

`ndr` exposes two opt-in full-body reads — `ndr resolve <ref> --full` (walks to the current head, then emits that head's complete body) and `ndr show <atom-id>` (frozen, no walk, emits one atom's raw file verbatim, including superseded atoms) — while the default `resolve` brief stays gist-only.

## Why

An agent that surfaced a decision had to run a second `Read` of the head file to see anything past the gist; a single CLI call should return the whole atom.

ndr:0136 deliberately keeps the default brief gist-only (Decision gist + metadata + lineage + references), omitting Why / Alternatives / Consequences / Assumptions. That keeps the common case scannable — but the reader skills then told agents to `Read` the head file by path for the full body, which is a second step and one that invited reading the wrong (seed) file. `--full` folds the full body into the `resolve` call the skills already make; `show` adds the one thing `resolve` structurally cannot do — return a *specific* atom frozen in place, the only way to read a superseded atom's own body (e.g. the historical anchor behind an `ndr:0042` code reference). The distinguishing axis is currency-aware (`resolve`, walks to the head) vs. frozen (`show`, this exact atom).

## Alternatives

Single `ndr show` verb for both reads (rejected) · `resolve --full --frozen` flag combo (rejected) · keep the `Read`-the-head-file flow (rejected).

- **One `show` verb for everything:** cannot express "current head, in full" without a resolve-then-show second step — the exact two-call flow this set out to remove. Two verbs split cleanly on the currency-vs-frozen axis.
- **`--frozen` flag on `resolve`:** overloads one verb with contradictory semantics (walk vs. don't-walk); a separate verb reads better in skill docs and keeps each output shape coherent.
- **Keep `Read`-the-head-file:** leaves the second step and the seed-file footgun in place; the goal was to make full bodies a CLI call, not a file read.

## Assumptions

`full-body-context-cost`

Returning whole atom bodies (especially `resolve area/topic --full` across many heads) is cheap enough for agent context that no truncation or pagination is needed.

- **Current state:** active
- **Revisit if:** full-body output across a wide topic routinely blows the caller's context budget

## Consequences

Default brief unchanged, ndr:0136 stands · `--json` gains a `body` field under `--full`/`show` · `--verbose` on single-atom `resolve` now errors and points at `--full` · reader skills (`/decisions`, `/ground`, `@ndr-reader`, drift lane) point at the verbs instead of `Read` · new `getRawAtom` read-port method.

- **0136 stands:** the default `resolve` brief is still gist-only; full reads are strictly opt-in, so this is additive (`informed_by` 0136), not a supersession.
- **JSON `body`:** present only under `--full`/`show`, so the default list/brief JSON stays lean.
- **`--verbose` reject:** single-atom `resolve` is always at least a brief, so `--verbose` had no meaning there; it now exits 1 redirecting to `--full` instead of silently no-op'ing.
- **Skill consistency:** the "gist is partial, full body is one command away" contract is now uniform across the reader surfaces; none still say "Read the head file".
- **`getRawAtom`:** new read-port method backing `show`, returning the raw on-disk file text byte-for-byte.
