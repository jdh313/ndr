---
id: "v6jda1"
title: Collapse to a single release lane on main; retire the beta channel
status: current
decision_date: 2026-08-19
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - ci-strategy
  - process
binds:
  - release-please-config.json
  - .github/workflows/**
  - renovate.json
  - .claude/rules/branch-workflow.md
supersedes:
  - 5na05k
superseded_by: []
derived_from: []
informed_by:
  - e5jfz1
  - 0c9p1z
  - ry7rww
---

# v6jda1 — Collapse to a single release lane on main; retire the beta channel

## Decision

`main` is the only long-lived branch and the only release lane: one
release-please instance cuts every release from it, feature branches root on
`main` and merge back into it, and the `dev` branch with its prerelease config,
manifest, changelog, and workflow is deleted.

## Scope

- Binds: the release and CI workflows, the single release-please config/manifest
  pair, `renovate.json`, and the branch-workflow rule.
- Does not alter what a release contains — the native-runner binary matrix and
  the lockstep plugin version are untouched (ndr:68gar5, ndr:nbyhyp).
- Does not reinstate the fast-forward-only invariant retired by the predecessor.

## Commitments

- Merge-only commits on `main` now carry the whole anti-divergence guard alone;
  the mandatory post-stable back-merge that used to share the load is gone with
  the second lane.
- Reintroducing any second long-lived branch means reintroducing a
  reconciliation rule alongside it, not just the branch.
- Trusted-dev consumers have no versioned prerelease binaries; the `#dev`
  git-URL install channel no longer resolves.
- Renovate carries no `baseBranches` pin, so it targets the default branch;
  re-pinning it to a branch that does not exist silently stops all dependency
  PRs, and Renovate is the only path that advances the pinned action digests.

## Revisit if

- Prerelease binaries are wanted again by anyone who is not the maintainer.
- A release goes out broken in a way a beta soak would plausibly have caught.
- A second long-lived branch is reintroduced for any reason.

## Context

- The predecessor named "the beta channel goes unused once offered" as an
  explicit revisit condition, and the maintainer confirmed it went unused.
- The two lanes required duplicated release workflows, a duplicated binary
  build matrix, and disjoint config/manifest/changelog triples.
- The only content `dev` held that `main` did not was its own prerelease
  manifest.
- The mandatory post-stable back-merge was manual ceremony at every release
  boundary and was the step most likely to be skipped.
- One beta Release PR was open at decision time.

## Why

The predecessor was recorded `tentative` against a named condition, and the
condition fired: a channel nobody consumes is pure carrying cost. That cost was
not abstract — duplicated workflows that must be mirrored by hand, a manual
back-merge at every release, and a `renovate.json` pinned to the second branch.
Each is a place for the lanes to drift, which is the failure the predecessor's
own commitments were written to prevent.

What made the collapse cheap rather than merely desirable is that the second
lane held nothing: `dev`'s entire delta from `main` was the prerelease manifest
being deleted. There was no integration work to preserve, so the teardown is a
deletion rather than a migration.

The guard question is what took the most weight. The predecessor traded away a
fast-forward-only invariant for two narrower rules, and this decision removes
one of the two. That is acceptable because the remaining rule is the one that
actually addresses the original incident: sibling patch commits require two
branches receiving the same change independently, which cannot happen when only
one long-lived branch exists and nothing is committed to it directly. The
back-merge rule was reconciling a divergence that no longer has a way to arise.

## Alternatives

- **Keep `dev` as an integration branch without the beta release lane** —
  rejected: retains the merge ceremony and the mirrored-workflow risk while
  giving up the only thing the branch bought.
- **Keep the beta lane and accept the carrying cost** — rejected: the channel
  went unused, so the cost buys nothing.
- **Cut a final `1.0.1-beta` before teardown** — rejected: it would publish a
  prerelease that no documented install path resolves to afterward.
