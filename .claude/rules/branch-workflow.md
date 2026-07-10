---
description: Branch workflow — two-lane release model; never commit directly to main; back-merge main into dev after every stable release.
---

# Branch workflow

Two-lane release model (gitflow-style): `dev` is the integration branch and
**beta channel**; `main` is the **stable release** branch. Each lane runs its
own release-please instance with its own config, manifest, and changelog.

### Rules

- **Never commit or push directly to `main`.** All work lands on `dev` (or a
  feature branch rooted on `dev` that merges back into `dev`). The only
  commits `main` receives are `dev -> main` merge PRs and main's own
  release-please Release-PR merges.
- **Beta releases cut from `dev`** — release-please (`release-please-config-dev.json`
  + `.release-please-manifest-dev.json`, changelog `CHANGELOG-beta.md`) opens
  beta Release PRs (`vX.Y.Z-beta.N`); merging one cuts a prerelease with
  binaries.
- **Stable releases cut from `main`** — merge `dev -> main` via PR, then merge
  the stable Release PR release-please opens there (`release-please-config.json`,
  `CHANGELOG.md`).
- **After every stable release, back-merge `main -> dev` immediately** and
  sync `.release-please-manifest-dev.json` to the new stable version (so the
  next beta versions above it). Skipping this step is how the lanes drift —
  it is part of cutting a stable, not optional cleanup.
- The lanes' release files are disjoint by design (separate configs,
  manifests, changelogs). Never point both lanes at the same manifest or
  changelog.

### Why this exists

Divergence has bitten this repo: the same CI patch was committed to both `main`
and `dev` as sibling commits, so neither branch contained the other (patch-
identical, different SHAs). Recovery meant linearizing `dev` back onto
`origin/main` and force-pushing.

The original guard was a strict fast-forward-only invariant (`main` always an
ancestor of `dev`). That invariant was traded away for per-branch release
automation — beta releases from `dev` require release-please commits on both
branches, which fast-forward cannot express. The protection against the
original incident now lives in two narrower rules: nothing is ever committed
to `main` except merges (so no sibling patches can arise), and the mandatory
post-stable back-merge (so divergence is reconciled at every release boundary
instead of accumulating).
