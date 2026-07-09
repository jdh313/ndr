---
id: "0151"
title: ndr CI runs on GitHub Actions
status: current
decision_date: 2026-06-04
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - ci-strategy
binds: []
supersedes: []
superseded_by: []
derived_from:
  - JUN-180
informed_by:
  - "0128"
  - "0132"
---

# 0151 — ndr CI runs on GitHub Actions

## Decision

The ndr repo uses a single GitHub Actions workflow (.github/workflows/ci.yml): one job on ubuntu-latest, triggered on push and PR to main, running five fail-fast gates in sequence.

## Commitments

- CI is zero-ops to maintain — no runner registration, no third-party service accounts, no webhook wiring; the workflow file is the entire integration surface.
- Gates run fail-fast in order: `bun test`, then lint (`oxlint`), format check (`oxfmt --check src`), type check (`tsc --noEmit`), and build smoke (`bun build --compile`) — a downstream gate is never obscured by an earlier passing one.
- The build-smoke step continuously re-verifies the bun-build-targets-stable assumption from ndr:0128 on Linux (verified 2026-06-04: `bun build --compile` succeeded on ubuntu-latest in runs 26963740763 and 26970510627, 13-16s clean with cache hits) — this closes what was previously a manual verification step.

## Revisit if

- Bun introduces a regression in `--compile` on linux/amd64, or the build smoke step begins failing on otherwise-green commits.

## Context

- The repo's remote is GitHub (jdh313/ndr).
- Total CI runtime is small — about 15s clean.
- `oven-sh/setup-bun@v2` uses the pinned Bun version as a binary-cache key; loose-version installs bypass the cache.
- Three alternative CI approaches were considered: CircleCI, self-hosted Woodpecker on the homelab, and self-hosted GitHub runners.

## Why

GitHub Actions ships with the host, so there is no separate CI service to operate or integrate — the marginal cost is zero since it is already present wherever the remote is GitHub. Bun version is pinned to 1.3.14 (matching @types/bun) so the `setup-bun` cache key stays stable; deps are cached separately via `actions/cache` on `~/.bun/install/cache` keyed on `bun.lock`. A single fail-fast job over a matrix is deliberate: total runtime is 13-16s with cache hits, and parallelism would add scheduling overhead without reducing wall-clock time at this scale.

## Alternatives

- **CircleCI** — rejected: external service, separate auth, separate config format — net negative at this scale.
- **Self-hosted Woodpecker on the homelab** — rejected: adds an infra dependency (runner availability, tunnel config) for a repo that already lives on GitHub, with no gain.
- **Self-hosted GitHub runners** — rejected: same homelab-dependency concern; also requires the runner registration flow. Total runtime is 15s, so cloud runners are sufficient.
