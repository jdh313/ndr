---
id: "03kmgp"
title: Keep the two consumer install channels after going public; npm stays deferred
status: current
decision_date: 2026-08-18
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - deployment
  - tooling
binds:
  - package.json
  - README.md
supersedes:
  - 0q443w
superseded_by: []
derived_from: []
informed_by:
  - 5na05k
---

# 03kmgp — Keep the two consumer install channels after going public; npm stays deferred

## Decision

Now that the repository is public, ndr still ships through exactly two consumer channels: per-platform binaries attached to GitHub Releases, and a source install via `bun install -g https://github.com/jdh313/ndr.git` tracking `main`. No npm registry publish is added.

## Scope

- Binds: the consumer-facing install surface — `package.json` (`bin`, `private`), the README install section, and the plugin's missing-CLI install hint.
- Does not bind: release automation or the maintainer's dev-machine symlink install (ndr:0147).

## Commitments

- `main` must keep matching the latest stable release, which the two-lane release model guarantees by letting `main` receive only release merges — the git channel's correctness depends on it.
- `package.json` `bin` stays runnable from source under Bun (`src/cli/bin.ts` keeps its Bun shebang).
- `"private": true` stays in `package.json` until an npm publish is actually decided, so no tooling can publish by accident.
- Bun remains a hard prerequisite for the git channel; the binary channel is the answer for machines without it.

## Revisit if

- A consumer without Bun and without git access asks for ndr — the case only a registry serves.
- Someone wants `npx`/`bunx ndr` ergonomics or version-pinned installs that a git URL cannot express.
- Bun's git-dependency installs prove flaky in practice.

## Context

- The repository went public on 2026-08-18; the private-only reasoning behind the previous decision (git credential as the sole shared secret, unscriptable release assets) no longer holds.
- Release assets are now downloadable by anyone with a URL, and the git channel needs no credential at all.
- The install URL in the README was already switched from `git+ssh` to `https` ahead of the flip.
- The predecessor decision's own revisit condition was "the repo goes public".
- No consumer has yet asked for a registry install; the audience is still developers who have Bun.

## Why

Going public removed the constraints that shaped the original choice, but not the reason both channels exist: the release pipeline already builds the binaries, and the git URL is still the cheapest scriptable install-and-update path for Bun users. What changed is only that the channels got easier to use — no credential, plain https — so the earlier decision is re-affirmed on new grounds rather than replaced. Publishing to npm would add a release step, a package name to hold, and a lockstep to maintain with release-please for a demand that has not appeared; deferring it keeps the release surface exactly as large as it needs to be.

## Alternatives

- **Publish to npmjs on every stable release** — deferred: real value only once a non-Bun or version-pinning consumer exists; until then it is a third channel to keep honest.
- **Drop the git channel now that binaries are public** — rejected: Bun users lose the one-line install-and-update path for nothing in return.
- **GitHub Packages npm registry** — rejected: still needs a PAT; strictly worse than npmjs for a public package.
