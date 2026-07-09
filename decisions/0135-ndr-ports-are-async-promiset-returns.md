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

## Decision

`ReadPort` and `WritePort` methods return `Promise<T>`, even though the first adapter (markdown filesystem) could be implemented synchronously.

## Why

Future adapters (sqlite, MCP, HTTP) won't be sync-fast — locking the interface to sync now would force a breaking change later.

The markdown adapter reads/writes files; `node:fs/promises` is already async, so the current adapter doesn't drive the choice. The decision is about not painting future adapters into a corner. sqlite is fast but its node bindings are async-by-convention. An MCP-backed adapter is network-bound and inherently async. A hypothetical remote-ledger HTTP adapter is async. Picking sync now means every call site refactors when the second adapter ships; picking async now means callers always `await` and the cost is one tick per call.

## Alternatives

Sync interfaces (rejected) · Dual sync+async surface (rejected)

**Sync interfaces:** Force a breaking change at the second adapter, which lands inside the same project window (JUN-172 ships `ndr resolve` against the markdown adapter; later adapters won't be sync).

**Dual sync+async:** Forks the type contract for no real benefit — every adapter would have to implement both surfaces, or callers would have to choose which surface they consume.

## Consequences

Every `ReadPort` / `WritePort` call site is `await`ed · Test bodies are `async` · No measurable cost in the CLI path
