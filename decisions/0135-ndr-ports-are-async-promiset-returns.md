---
title: ndr ports are async (Promise<T> returns)
status: current
decision_date: '2026-06-02'
aliases: []
project: '[[ndr]]'
derived_from: []
informed_by:
- '[[Decisions/0128-ndr-tooling-uses-typescript-and-bun-for-v1]]'
- '[[Decisions/0129-ndr-is-cli-primary-with-a-library-underneath-skills-rewire-to-call-ndr-resolve]]'
supersedes: []
superseded_by: []
area: tooling
topic: framework
impacts:
- '[[NDR]]'
revisit_triggers: []
reversibility: easy
tags:
- decision
id: '0135'
---
## Decision

`ReadPort` and `WritePort` methods return `Promise<T>`, even though the first adapter (markdown filesystem) could be implemented synchronously.

## Why

Future adapters (sqlite, MCP, HTTP) won't be sync-fast — locking the interface to sync now would force a breaking change later.

> [!info]- Full reasoning
> The markdown adapter reads/writes files; `node:fs/promises` is already async, so the current adapter doesn't drive the choice. The decision is about not painting future adapters into a corner. sqlite is fast but its node bindings are async-by-convention. An MCP-backed adapter is network-bound and inherently async. A hypothetical remote-ledger HTTP adapter is async. Picking sync now means every call site refactors when the second adapter ships; picking async now means callers always `await` and the cost is one tick per call.

## Alternatives

Sync interfaces (rejected) · Dual sync+async surface (rejected)

> [!info]- Why they lost
> **Sync interfaces:** Force a breaking change at the second adapter, which lands inside the same project window (JUN-172 ships `ndr resolve` against the markdown adapter; later adapters won't be sync).
>
> **Dual sync+async:** Forks the type contract for no real benefit — every adapter would have to implement both surfaces, or callers would have to choose which surface they consume.

## Consequences

Every `ReadPort` / `WritePort` call site is `await`ed · Test bodies are `async` · No measurable cost in the CLI path
