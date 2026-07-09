---
id: "0129"
title: NDR is CLI-primary with a library underneath; skills rewire to call `ndr
  resolve`
status: current
decision_date: 2026-06-01
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - tool-routing
binds: []
supersedes: []
superseded_by: []
derived_from:
  - Mulling/2026-05-31_ndr-shape-and-storage
informed_by:
  - "0049"
  - "0102"
  - "0100"
---

# 0129 — NDR is CLI-primary with a library underneath; skills rewire to call `ndr resolve`

## Decision

The `ndr` tool is a CLI wrapping a TypeScript library. Skills (`/decisions`, `/ground`) and the reader agent call `ndr resolve` instead of generic markdown tooling. MCP server and TUI are deferred future layers.

## Why

The CLI's perf win is supersession-awareness baked into the read primitive — `obsidian-cli` and `search_notes` are generic and miss `superseded_by`; `ndr resolve` walks in-process.

The performance problem diagnosed in the prior mull is subagent dispatch and per-hop inference cycles, not file I/O. The solution is a single CLI call that does the supersession walk in-process and returns the head atom in one shot.

But the CLI only solves the problem if skills route through it. If `/decisions`, `/ground`, and the reader agent continue calling `obsidian-cli` or `search_notes`, vault-default just means generic tooling makes many calls and misses supersession — the supersession-awareness property buys nothing.

Rewiring skills to call `ndr resolve` as the read primitive propagates the benefit everywhere: vault ledger and repo ledger identically. The library layer underneath the CLI means future callers (MCP server, a programmatic integration) share the same supersession logic without reimplementing it.

MCP-server-mode is deferred to when subprocess cold-start actually becomes a bottleneck. At current corpus size and call frequency, subprocess is fine. TUI is deferred similarly — it's a future layer, not a v1 requirement.

## Alternatives

Pure MCP server (deferred) · Obsidian-native / `obsidian-cli` only (rejected) · Agent-side walk (current state, being replaced)

**Pure MCP server:** Would eliminate subprocess overhead for the agent path, but MCP cold-start context and the lack of supersession-awareness in generic MCP tools make it not strictly better than CLI today. Deferred until subprocess cold-start is confirmed as the bottleneck.

**Obsidian-native / `obsidian-cli` only:** `obsidian-cli` and `search_notes` are substrate-generic — they do not know `superseded_by`. Routing through them means every supersession walk requires multiple round-trips and agent inference cycles to assemble the chain. The vault-default position loses its meaning if supersession is handled by a generic read layer.

**Agent-side walk (current state):** The existing `/decisions` and `/ground` skills do multi-stage retrieval with sequential per-hop reads inside the agent. This works but incurs per-hop inference cycles and scales poorly as chains lengthen. Replaced by `ndr resolve` doing the walk in-process.

## Assumptions

`cli-cold-start-acceptable` · `supersession-awareness-matters-for-perf`

Subprocess cold-start for `ndr` (30-60ms Bun-bundled) is acceptable in agent-via-terminal invocations and does not become the dominant latency source.

- **Current state:** active — Bun cold-start benchmarks support this; no live agent-path timing yet
- **Revisit if:** Profiling shows `ndr` subprocess overhead exceeds agent inference time per call, making MCP-server-mode the rational next move

The supersession walk is a frequent-enough operation that routing it through a purpose-built primitive (vs. generic tool calls) produces measurable session latency improvement.

- **Current state:** active — 11 atoms with non-empty `superseded_by`; longest chain 4 hops; per-hop inference cost confirmed as the bottleneck in prior mull
- **Revisit if:** Corpus grows such that chains shorten (more frequent supersession) or agents switch to a model where per-hop inference is negligible

## Consequences

Skills `/decisions` and `/ground` require rewiring · `obsidian-cli` demoted to non-NDR vault operations · Library layer stays importable for future MCP and TUI layers

- `/decisions`, `/ground`, and the reader agent each need a prompt/wiring update to route resolution through `ndr resolve` rather than `obsidian-cli read` or `search_notes`.
- `obsidian-cli` remains the right tool for non-NDR vault operations (reading wiki pages, meeting notes, project pages) per atom 0100; this decision narrows NDR-specific read operations away from it, not vault operations broadly.
- The TypeScript library underneath the CLI is importable by a future MCP server mode without duplicating supersession logic — the CLI is a thin dispatch layer over the library, not the other way around.
