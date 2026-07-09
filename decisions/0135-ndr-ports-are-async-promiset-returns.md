---
id: "0135"
title: ndr ports are async (Promise<T> returns)
status: current
decision_date: 2026-06-02
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - framework
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - "0128"
  - "0129"
---

# 0135 — ndr ports are async (Promise<T> returns)

## Decision

`ReadPort` and `WritePort` methods return `Promise<T>`, even though the first adapter (markdown filesystem) could be implemented synchronously.

## Commitments

- Every `ReadPort` / `WritePort` call site is `await`-ed.
- Test bodies that exercise ports are `async`.

## Context

- The markdown adapter reads/writes files; `node:fs/promises` is already async, so the current adapter doesn't drive the choice either way.
- Future adapters under consideration: sqlite (fast, but its node bindings are async-by-convention), an MCP-backed adapter (network-bound, inherently async), and a hypothetical remote-ledger HTTP adapter (async).

## Why

Future adapters (sqlite, MCP, HTTP) won't be sync-fast — locking the interface to sync now would force a breaking change later. The decision is about not painting future adapters into a corner, not about the current adapter's needs. Picking sync now means every call site refactors when the second adapter ships; picking async now means callers always `await` and the cost is one tick per call.

## Alternatives

- **Sync interfaces** — rejected: forces a breaking change at the second adapter, which lands inside the same project window (JUN-172 ships `ndr resolve` against the markdown adapter; later adapters won't be sync).
- **Dual sync+async surface** — rejected: forks the type contract for no real benefit — every adapter would have to implement both surfaces, or callers would have to choose which surface they consume.
