---
id: '0128'
title: NDR tooling uses TypeScript and Bun for v1
status: current
decision_date: '2026-06-01'
aliases: []
project: '[[ndr]]'
derived_from:
- '[[Mulling/2026-05-31_ndr-shape-and-storage]]'
informed_by:
- '[[Mulling/2026-05-29_ndr-lookup-perf-and-substrate]]'
supersedes: []
superseded_by: []
area: tooling
topic: framework
impacts: []
revisit_triggers:
- npm distribution becomes hard at work and bun build single-binary doesn't unstick
  it
- TUI materializes and Ink ergonomics actively fight the design
- Constrained TS ergonomics erode velocity past the 2-3 week ramp window
reversibility: medium
tags:
- decision
---
# 0128 — NDR tooling uses TypeScript and Bun for v1

## Decision

The `ndr` CLI is built in TypeScript, bundled with Bun as a single binary. Commander or oclif handles CLI authoring; Zod handles schema validation.

## Why

Bun-bundled binaries land in the 30-60ms cold-start range; optimized Python tops out at 80-120ms and requires sacrificing the ergonomics that made Python attractive.

> [!info]- Full reasoning
> The decision turned on two axes: cold-start latency and authoring ergonomics. For `ndr`, both matter — the tool runs in the terminal as both an agent subprocess and a human interactive command.
>
> Python/uv was the early favorite on inertia: pydantic, existing plugin code, familiar toolchain. But the existing plugin is ~500 lines of Python (`persist.py` + tests); the bulk is markdown. The Python anchor was weaker than it looked.
>
> Optimizing Python for cold-start (msgspec instead of pydantic, argparse instead of typer, lazy imports, PyOxidizer for packaging) achieves ~80-120ms — but replaces the ergonomics that justified Python. Argparse over Typer is a real regression; msgspec over pydantic trades readability for speed. Constrained Python is no longer fluent Python, so the velocity advantage erodes precisely when you need it.
>
> Bun-bundled TypeScript gives ~30-60ms cold start without any ergonomics sacrifice. Commander/oclif provide ergonomic CLI authoring comparable to Typer. Zod provides schema validation comparable to pydantic. The eventual TUI (if it ships) fits Ink naturally. Single binary via `bun build` deploys on any machine including the work machine without a runtime dependency.
>
> The 2-3 week slower ramp to fluent TS is a one-time cost. The cold-start gap compounds on every invocation for the life of the tool.

## Alternatives

Python/uv (rejected) · Optimized Python with PyOxidizer (rejected)

> [!info]- Why they lost
> **Python/uv (standard ergonomics):** Click/Typer + pydantic gives the best Python authoring experience but lands at ~150-300ms cold start. For a tool invoked as an agent subprocess many times per session, that tax is felt.
>
> **Optimized Python (msgspec + argparse + PyOxidizer):** Achieves ~80-120ms cold start — closer but still 2-4x the Bun floor. More critically, argparse over Typer and msgspec over pydantic are ergonomics regressions. The constrained variant isn't the Python that made Python attractive; accepting those constraints eliminates the inertia argument.

## Assumptions

`bun-build-targets-stable` · `bun-ergonomics-survive-team-context`

> [!warning]- bun-build-targets-stable
> `bun build --compile` produces stable, portable single binaries on macOS and Linux targets relevant to this project (personal machine + work machine).
>
> - **Current state:** verified — `bun build --compile` succeeds on the GitHub Actions ubuntu-latest runner (Bun 1.3.14, 2026-06-04, JUN-180); the CI workflow runs the build as a smoke gate on every push/PR so the assumption stays continuously checked
> - **Revisit if:** Bun compile mode drops support for a required target or produces broken binaries in CI

> [!warning]- bun-ergonomics-survive-team-context
> TypeScript CLI authoring with Commander/Zod stays ergonomic enough at work that the collab path doesn't reintroduce Python.
>
> - **Current state:** needs check — work machine not yet configured; assumption is untested
> - **Revisit if:** npm distribution is blocked at work and `bun build` single-binary doesn't bridge the gap

## Consequences

Adds TS/Bun toolchain as a project dependency · Existing `persist.py` plugin remains Python for now · TUI path stays open via Ink

> [!info]- Detail
> - `persist.py` and the existing plugin assets are Python and markdown respectively; they are unaffected by this decision. The new CLI is a separate artifact.
> - Bun and Node/npm coexist; no conflict with other JS tooling in the ecosystem.
> - Ink TUI is a natural future extension — same project, same language, no context switch.
> - Single-binary distribution means the work-machine install is a file copy, not a runtime install, mitigating the npm access uncertainty.
