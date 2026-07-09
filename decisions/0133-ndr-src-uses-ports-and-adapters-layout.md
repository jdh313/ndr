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

## Why

Ports and adapters keeps the domain core independent of I/O, which is the direct enabler of ndr:0129's library-underneath shape.

ndr:0129 establishes that the CLI is one consumer of a library, not the whole product. That shape only holds if the domain layer has no concrete I/O dependencies — otherwise every import of the library drags in filesystem or network code. The ports layer (interface-only TypeScript) is the seam: the domain expresses what it needs (read atoms, write atoms) without knowing how. Adapters implement the ports and are wired at the CLI entry point. Today that means a file-system ledger adapter; tomorrow it could be SQLite, a remote API, or an in-process mock for tests. The CLI itself (`src/cli/`) is an outer layer that imports adapters and domain — it is not re-used by MCP or TUI consumers, which import `domain` + `ports` directly and supply their own adapters.

## Alternatives

Flat `src/` with direct fs calls — rejected; feature-folder layout — deferred as premature at current command count.

- **Flat src/ with direct fs calls:** Simplest to start, hardest to test and extend. Any consumer of the library would inherit filesystem coupling; the library-underneath shape collapses.
- **Feature-folder layout** (e.g., `src/resolve/`, `src/capture/`): Organizes by capability rather than layer. Compatible with ports-and-adapters in principle, but adds a dimension of structure before the feature set is stable. Deferred — if the command surface grows large, features can be introduced as subdirectories within `domain/` and `cli/` without abandoning the layer model.

## Consequences

Domain types are I/O-free and unit-testable without mocks · Adapter swap (fs -> SQLite -> remote) is a wiring change, not a domain change · CLI entry is the only layer that imports concrete adapters.

- `src/domain/`: TypeScript types and pure functions — atom shape, ledger model, supersession logic. No `fs`, `fetch`, or Bun-specific imports.
- `src/ports/`: Interface definitions only. `ReadPort` and `WritePort` declare what operations exist; no implementation.
- `src/adapters/`: Concrete implementations. File-system ledger is the first adapter. SQLite or remote adapters added here later without touching domain.
- `src/cli/`: Commander program definition, adapter instantiation, and wiring. This is the composition root.
- Test strategy: domain tests are pure; adapter tests use a temp-dir fixture; CLI tests use an in-memory adapter injected at the entry point.
