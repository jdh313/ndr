---
id: "5na05k"
title: "Adopt a two-lane release model: betas from dev, stables from main"
status: current
decision_date: 2026-07-10
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - ci-strategy
  - process
binds:
  - .github/workflows/**
  - .claude/rules/branch-workflow.md
supersedes: []
superseded_by: []
derived_from:
  - claude-code session 2026-07-10 (release-please on dev discussion)
informed_by:
  - 68gar5
  - nbyhyp
  - 0q443w
---

# 5na05k — Adopt a two-lane release model: betas from dev, stables from main

## Decision

`dev` and `main` each run their own release-please lane: `dev` cuts `vX.Y.Z-beta.N` prereleases with binaries from a dev-specific config, manifest, and changelog; `main` cuts stables as before. A stable is cut by merging `dev -> main` via PR, then main's Release PR — followed by an immediate `main -> dev` back-merge.

## Scope

- Binds: the release workflows, both release-please config/manifest pairs, and the branch-workflow rule.
- Does not alter what a release contains (native-runner binary matrix, lockstep plugin version — ndr:68gar5, ndr:nbyhyp).

## Commitments

- The `main -> dev` back-merge plus syncing `.release-please-manifest-dev.json` to the new stable version is a mandatory part of cutting a stable, not optional cleanup.
- Nothing is committed to `main` except merges (`dev -> main` PRs and main's own Release-PR merges).
- The two lanes keep disjoint release files (configs, manifests, changelogs) — never point both at the same file.
- The binary build matrix is duplicated across `release.yml` and `release-dev.yml`; changes must be mirrored.
- The strict fast-forward-only invariant on `main` is retired; its protection is carried by the two narrower rules above.

## Revisit if

- The post-stable back-merge gets skipped in practice and the lanes drift.
- The beta channel goes unused once offered.
- release-please ships first-class multi-branch coordination that removes the dual-config ceremony.

## Context

- The branch rule previously held `main` to fast-forward-only advances from `dev`, adopted after a sibling-commit divergence incident.
- release-please operates by merging Release PRs into its target branch, so per-branch releases require release commits on both branches — something fast-forward-only cannot express.
- Stable releases already produced main-only release commits, an undocumented gap in the fast-forward invariant.
- Trusted-dev consumers now have install channels (ndr:0q443w) but no way to get versioned pre-release binaries.

## Why

The two-lane shape puts the beta/stable distinction in branch topology, where it is visible and hard to misapply, rather than in a manual edit of a Release PR title at cut time — that legibility is what the maintainer weighted over preserving the fast-forward invariant. The invariant itself was already leaking (main-only release commits), so the trade is less "give up a working guard" than "replace a guard that no longer fit the release machinery with two narrower ones": merge-only commits on `main` make sibling patches impossible, and the mandatory post-stable back-merge reconciles divergence at every release boundary instead of letting it accumulate.

## Alternatives

- **Single-lane release-please on `dev` with `main` as a fast-forward tag pointer** — rejected: preserves the old invariant, but the beta/stable distinction then hangs on hand-editing Release PR titles; the maintainer preferred branch semantics to carry it.
- **`#dev` git-URL installs as an informal beta channel** — preserved-elsewhere: still works for source installs, but provides no versioned prerelease binaries.
- **No beta channel** — rejected: the status quo; trusted devs would get stables only.
