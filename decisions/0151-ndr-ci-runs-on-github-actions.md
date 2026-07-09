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

## Why

The repo's remote is GitHub (jdh313/ndr) — GitHub Actions ships with the host, so no separate CI service to operate or integrate.

CircleCI, self-hosted runners, and Woodpecker on the homelab were all considered and rejected: they each add an integration that buys nothing at this repo's size and runtime (~15s clean). GitHub Actions is already present wherever the remote is GitHub; the marginal cost is zero.

Bun version is pinned to 1.3.14 (matching @types/bun) because oven-sh/setup-bun@v2 uses the pinned version as a binary-cache key — loose-version installs bypass the cache. Deps are cached separately via actions/cache on ~/.bun/install/cache keyed on bun.lock.

A single fail-fast job over a matrix is deliberate: total runtime is 13-16s with cache hits, and parallelism would add scheduling overhead without reducing wall-clock time at this scale.

## Alternatives

CircleCI (rejected) · self-hosted Woodpecker on homelab (rejected) · self-hosted GitHub runners (rejected)

- **CircleCI:** external service, separate auth, separate config format — net negative at this scale.
- **Woodpecker on homelab:** homelab runners add infra dependency (runner availability, tunnel config) for a repo that already lives on GitHub. No gain.
- **Self-hosted GitHub runners:** same homelab dependency concern; also requires the runner registration flow. Total runtime is 15s — cloud runners are sufficient.

## Assumptions

`bun-build-targets-stable-on-linux`

The bun build --compile step on ubuntu-latest validates that ndr:0128's bun-build-targets-stable assumption holds on the Linux runner.

- **Current state:** verified 2026-06-04 — `bun build --compile` succeeded on the ubuntu-latest runner in the first green runs (26963740763, 26970510627), 13-16s clean with cache hits.
- **Revisit if:** bun introduces a regression in --compile on linux/amd64, or if the build smoke step begins failing on otherwise-green commits.

## Consequences

CI is zero-ops to maintain · gate failures surface at first red step, downstream steps skipped · bun-build-targets-stable assumption from ndr:0128 is continuously verified on Linux

- Zero-ops: no runner registration, no third-party service accounts, no webhook wiring — the workflow file is the entire integration surface.
- Fail-fast ordering: bun test runs first; lint (oxlint), format check (oxfmt --check src), type check (tsc --noEmit), and build smoke (bun build --compile) follow. A test regression won't be obscured by a passing lint gate.
- The build smoke step closes the open unknown logged in ndr:0128 — bun cross-compile to linux/amd64 is now a continuously checked invariant, not a manual verification step.
