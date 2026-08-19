---
id: "0c9p1z"
title: GitHub Actions are pinned to commit SHAs, with Renovate maintaining the digests
status: current
decision_date: 2026-08-18
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - ci-strategy
  - tooling
binds:
  - .github/workflows/**
  - renovate.json
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - "0151"
---

# 0c9p1z — GitHub Actions are pinned to commit SHAs, with Renovate maintaining the digests

## Decision

Every `uses:` in the workflows references a full 40-character commit SHA with a trailing `# vN` comment; Renovate (`helpers:pinGitHubActionDigests`, base branch `dev`) is the only path that advances those digests.

## Scope

- Binds: `.github/workflows/**` and the Renovate configuration.
- Does not bind: the Bun version pin or npm dependencies, which Renovate handles under its recommended preset.

## Commitments

- Hand-bumping an action means resolving the tag to a SHA and updating the comment; a bare `@vN` will be flagged in review as a regression.
- Renovate PRs for digest bumps arrive on `dev` and must clear the same protected-branch checks as any other PR.
- Renovate is configured with `baseBranches: ["dev"]`; the repository default branch (`main`) is never a Renovate target.

## Revisit if

- GitHub ships immutable/verified action releases that make tag pins tamper-evident.
- Renovate stops being installed on the repository, leaving the pins to rot by hand.

## Context

- The repository became public on 2026-08-18 and now runs CI on fork PRs.
- The release workflows run with `contents: write` and upload binaries to GitHub Releases using the default token.
- Before the flip, all five actions in use were tag-pinned (`@v4`, `@v5`, `@v2`).
- Renovate's onboarding PR was open, targeting `main` by default because `main` is the default branch.

## Why

A tag can be moved; a public repository whose release job runs third-party actions with write permission is exactly the shape a moved tag targets. Digest pins close that door at zero runtime cost, and Renovate removes the usual objection — that SHA pins rot — by opening the bump PRs itself, complete with the version comment. Pointing Renovate at `dev` was required rather than optional: with `main` as the default branch every bot PR would otherwise violate the rule that `main` only receives release merges.

## Alternatives

- **Tag pins (`@v4`) as before** — rejected: mutable, and the release job's write token makes the blast radius real.
- **SHA pins without Renovate** — rejected: pins would rot; the first security bump would be a manual chore nobody schedules.
