---
id: "0133"
title: ndr src/ uses ports and adapters layout
status: current
decision_date: 2026-06-01
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - architecture
  - repo-shape
binds: []
supersedes: []
superseded_by: []
derived_from:
  - "JUN-170 — Scaffold repo: bun init, deps, lint/format"
informed_by:
  - "0128"
  - "0129"
---

# 0133 — ndr src/ uses ports and adapters layout

## Decision

`src/` is split into four buckets: `cli/` (Commander entry points), `domain/` (atom, ledger, supersession types), `ports/` (ReadPort, WritePort interfaces), `adapters/` (backend implementations); domain types carry no filesystem or network imports; adapters are wired at the CLI entry layer.

## Commitments

- `src/domain/` holds I/O-free TypeScript types and pure functions (atom shape, ledger model, supersession logic) — no `fs`, `fetch`, or Bun-specific imports, and unit-testable without mocks.
- `src/ports/` is interface-only: `ReadPort` and `WritePort` declare what operations exist, no implementation.
- `src/adapters/` holds concrete implementations (file-system ledger first); a SQLite or remote adapter is added here without touching domain.
- `src/cli/` is the composition root — the only layer that instantiates and wires concrete adapters.
- Test strategy follows the layers: domain tests are pure, adapter tests use a temp-dir fixture, CLI tests inject an in-memory adapter at the entry point.

## Context

- ndr:0129 establishes that the CLI is one consumer of a library, not the whole product.
- That shape holds only if the domain layer has no concrete I/O dependencies — otherwise every import of the library drags in filesystem or network code.

## Why

Ports and adapters keeps the domain core independent of I/O, which is the direct enabler of the library-underneath shape. The ports layer (interface-only TypeScript) is the seam: the domain expresses what it needs — read atoms, write atoms — without knowing how, and adapters implement those interfaces, wired at the CLI entry point. Today that means a file-system ledger adapter; tomorrow it could be SQLite, a remote API, or an in-process mock for tests. The CLI is an outer layer that imports adapters and domain, and is not reused by MCP or TUI consumers, which import `domain` + `ports` directly and supply their own adapters.

## Alternatives

- **Flat `src/` with direct fs calls** — rejected: simplest to start, hardest to test and extend; any consumer of the library inherits filesystem coupling and the library-underneath shape collapses.
- **Feature-folder layout** (e.g. `src/resolve/`, `src/capture/`) — deferred as premature: organizes by capability rather than layer and adds a dimension of structure before the feature set is stable; if the command surface grows, features can become subdirectories within `domain/` and `cli/` without abandoning the layer model.
