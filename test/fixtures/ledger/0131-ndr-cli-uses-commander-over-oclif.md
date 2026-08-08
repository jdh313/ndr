---
id: '0131'
title: ndr CLI uses Commander over oclif
status: current
decision_date: '2026-06-01'
author: "Jacob Hoehler"
conviction: strong
project: "ndr"
derived_from:
- "[[JUN-170 — Scaffold repo: bun init, deps, lint/format]]"
informed_by: []
labels:
- framework
supersedes: []
superseded_by: []
---
# 0131 — ndr CLI uses Commander over oclif

## Decision

Use Commander (`commander` v15, npm) as the CLI framework for ndr; all subcommands defined via `program.command(...)`.

## Why

Commander is lighter than oclif and keeps the outer CLI layer thin enough to wrap or replace without framework lock-in.

> [!info]- Full reasoning
> ndr:0129 establishes a CLI-primary / library-underneath shape: the domain + ports library is the real artifact; the CLI is one consumer of it. oclif is optimized for plugin ecosystems and multi-binary distributions — that machinery is overhead here. Commander gives argument parsing and help generation with no opinion on project structure, so the domain layer stays free of framework concepts. A future MCP server or TUI can import the same library without pulling oclif's runtime along.

## Alternatives

oclif — rejected as too opinionated for this scale; yargs — deferred (Commander's API is simpler at this command count).

> [!info]- Why they lost
> - **oclif:** Plugin-loader and multi-binary support are oclif's strengths; neither is needed now, and the framework imposes structure on project layout and command registration that conflicts with the library-first shape.
> - **yargs:** Viable alternative. Commander's fluent `.command()` API is more readable at a small command count; revisit if command count grows significantly or yargs plugin needs emerge.

## Assumptions

`ndr-scale-stays-small` · `no-plugin-loader-needed`

> [!warning]- ndr-scale-stays-small
> ndr's subcommand surface stays narrow enough that Commander's lack of a plugin system is not a constraint.
>
> - **Current state:** active — scaffold has a handful of commands
> - **Revisit if:** command count exceeds ~15 or third-party plugins need to register subcommands at runtime

> [!warning]- no-plugin-loader-needed
> The distribution model stays single-binary; no multi-package plugin loader is required.
>
> - **Current state:** active
> - **Revisit if:** ndr needs to load user-installed adapter plugins at runtime (that is oclif's strength)

## Consequences

All CLI entry points follow `program.command(...)` conventions · No oclif dependency in the graph · MCP/TUI wrappers import the library layer, not the CLI layer.

> [!info]- Detail
> - Subcommands registered consistently through Commander's fluent API; no generator-based scaffolding.
> - oclif's hook system and plugin manifests are absent; cross-cutting concerns (e.g., config loading) live in the domain/ports layer instead.
> - A future MCP server or TUI imports `src/domain` + `src/ports` directly; the CLI wrapper in `src/cli` is not re-used by those consumers.
