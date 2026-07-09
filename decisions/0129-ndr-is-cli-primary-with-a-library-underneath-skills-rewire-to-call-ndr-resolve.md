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

## Scope

- Binds: NDR-specific read/resolution operations in `/decisions`, `/ground`, and the reader agent.
- Does not bind: `obsidian-cli` for non-NDR vault operations (wiki pages, meeting notes, project pages, per 0100).

## Commitments

- `/decisions`, `/ground`, and the reader agent must be rewired to route resolution through `ndr resolve` rather than `obsidian-cli read` or `search_notes`.
- The library layer underneath the CLI stays importable independently, so a future MCP server or TUI can reuse the same supersession logic without reimplementing it.

## Revisit if

- Profiling shows `ndr` subprocess overhead exceeds agent inference time per call, making MCP-server-mode the rational next move.
- Corpus grows such that chains shorten (more frequent supersession) or agents switch to a model where per-hop inference is negligible.

## Context

- The performance problem diagnosed in the prior mull is subagent dispatch and per-hop inference cycles, not file I/O.
- `obsidian-cli` and `search_notes` are substrate-generic tools that do not know about `superseded_by`.
- The existing `/decisions` and `/ground` skills do multi-stage retrieval with sequential per-hop reads inside the agent, incurring per-hop inference cost that scales poorly as chains lengthen.
- 11 atoms currently have non-empty `superseded_by`, with the longest chain at 4 hops.

## Why

The CLI's perf win is supersession-awareness baked into the read primitive: a single call that does the supersession walk in-process and returns the head atom in one shot solves the diagnosed problem. But the CLI only solves the problem if skills route through it — continuing to call generic tooling would mean the supersession-awareness property buys nothing. Rewiring the read primitive propagates the benefit everywhere, vault ledger and repo ledger identically, and the library layer underneath means future callers (MCP server, programmatic integration) share the same supersession logic without reimplementing it. MCP-server-mode and TUI are deferred future layers — subprocess is fine at current corpus size and call frequency.

## Alternatives

- **Pure MCP server** — deferred: would eliminate subprocess overhead for the agent path, but MCP cold-start context and the lack of supersession-awareness in generic MCP tools make it not strictly better than CLI today.
- **Obsidian-native / `obsidian-cli` only** — rejected: substrate-generic, doesn't know `superseded_by`; routing through it means every supersession walk needs multiple round-trips and agent inference cycles.
- **Agent-side walk (current state)** — replaced: works but incurs per-hop inference cycles and scales poorly as chains lengthen.
