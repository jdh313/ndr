---
id: "0128"
title: NDR tooling uses TypeScript and Bun for v1
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
  - Mulling/2026-05-31_ndr-shape-and-storage
informed_by:
  - "2026"
---

# 0128 — NDR tooling uses TypeScript and Bun for v1

## Decision

The `ndr` CLI is built in TypeScript, bundled with Bun as a single binary. Commander or oclif handles CLI authoring; Zod handles schema validation.

## Scope

- Does not bind: `persist.py` and the existing plugin assets — they remain Python and markdown respectively, unaffected by this decision; the new CLI is a separate artifact.

## Commitments

- Work-machine installation uses single-binary file copy (via `bun build --compile`), not an npm/runtime install — mitigating the npm-access uncertainty at work.

## Revisit if

- Bun compile mode drops support for a required target or produces broken binaries in CI.
- npm distribution is blocked at work and `bun build` single-binary doesn't bridge the gap.

## Context

- Bun-bundled binaries land in the 30-60ms cold-start range.
- Optimized Python (msgspec, argparse, PyOxidizer) tops out at ~80-120ms cold start.
- Python/uv with Click/Typer + pydantic gives ~150-300ms cold start.
- The existing plugin is ~500 lines of Python (`persist.py` + tests); the bulk of the project is markdown.
- The `ndr` tool runs in the terminal both as an agent subprocess and as a human interactive command, so cold-start latency is felt on every invocation.
- Optimizing Python for cold-start requires msgspec instead of pydantic and argparse instead of typer — regressions in ergonomics compared to Typer/pydantic.

## Why

The decision turned on two axes: cold-start latency and authoring ergonomics — both matter given how the tool is invoked. Python/uv was the early favorite on inertia (existing plugin code, familiar toolchain), but the Python anchor was weaker than it looked given how small `persist.py` is. Optimizing Python for cold-start replaces the very ergonomics that justified choosing Python in the first place, so the velocity advantage erodes precisely when it's needed — constrained Python is no longer fluent Python. Bun-bundled TypeScript gives the ~30-60ms cold start without sacrificing ergonomics: Commander/oclif are comparable to Typer, Zod is comparable to pydantic, Ink covers the eventual TUI path naturally, and a single binary via `bun build` deploys on any machine (including the work machine) without a runtime dependency. The 2-3 week slower ramp to fluent TS is a one-time cost, while the cold-start gap compounds on every invocation for the life of the tool.

## Alternatives

- **Python/uv (standard ergonomics)** — rejected: Click/Typer + pydantic gives the best Python authoring experience but lands at ~150-300ms cold start, a felt tax for a tool invoked many times per session as an agent subprocess.
- **Optimized Python (msgspec + argparse + PyOxidizer)** — rejected: achieves ~80-120ms, still 2-4x the Bun floor, and argparse-over-Typer / msgspec-over-pydantic are ergonomics regressions that eliminate the inertia argument for Python.
