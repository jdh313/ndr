---
id: "0131"
title: ndr CLI uses Commander over oclif
status: current
decision_date: 2026-06-01
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - framework
binds: []
supersedes: []
superseded_by: []
derived_from:
  - "JUN-170 — Scaffold repo: bun init, deps, lint/format"
informed_by:
  - "0128"
  - "0129"
---

# 0131 — ndr CLI uses Commander over oclif

## Decision

Use Commander (`commander` v15, npm) as the CLI framework for ndr; all subcommands defined via `program.command(...)`.

## Commitments

- All CLI entry points register through Commander's fluent `program.command(...)`; no generator-based scaffolding.
- No oclif dependency in the graph; oclif's hook system and plugin manifests are absent, so cross-cutting concerns (e.g. config loading) live in the domain/ports layer instead.
- A future MCP server or TUI imports `src/domain` + `src/ports` directly; the `src/cli` wrapper is not reused by those consumers.

## Revisit if

- Command count exceeds ~15, or third-party plugins need to register subcommands at runtime.
- ndr needs to load user-installed adapter plugins at runtime (that is oclif's strength).

## Context

- ndr:0129 establishes a CLI-primary / library-underneath shape: the domain + ports library is the real artifact, the CLI one consumer of it.
- oclif is optimized for plugin ecosystems and multi-binary distributions.
- The scaffold has a handful of commands and a single-binary distribution model.

## Why

Commander is lighter than oclif and keeps the outer CLI layer thin enough to wrap or replace without framework lock-in. oclif's plugin-loader and multi-binary machinery is overhead here, and it imposes structure on project layout that conflicts with the library-first shape. Commander gives argument parsing and help generation with no opinion on project structure, so the domain layer stays free of framework concepts and a future MCP server or TUI can import the same library without pulling oclif's runtime along.

## Alternatives

- **oclif** — rejected as too opinionated for this scale: its plugin-loader and multi-binary support are strengths neither needed now, and it imposes layout and command-registration structure that conflicts with the library-first shape.
- **yargs** — deferred: a viable alternative, but Commander's fluent `.command()` API is more readable at a small command count; revisit if the command count grows significantly or yargs-specific plugin needs emerge.
