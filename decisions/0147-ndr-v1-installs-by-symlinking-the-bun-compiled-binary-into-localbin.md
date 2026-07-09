---
id: "0147"
title: ndr v1 installs by symlinking the bun-compiled binary into ~/.local/bin
status: current
decision_date: 2026-06-03
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - deployment
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - "0128"
  - "0129"
---

# 0147 — ndr v1 installs by symlinking the bun-compiled binary into ~/.local/bin

## Decision

`bun run install:bin` compiles `src/cli/bin.ts` to `dist/ndr` via `bun build --compile`, then symlinks it into `~/.local/bin/ndr` — putting ndr on PATH without any system-level install step.

## Commitments

- No managed uninstall: deleting `~/.local/bin/ndr` by hand is sufficient, since there is no package manager to notify.
- The build is pinned to whatever Bun is current at build time (tested against Bun 1.3.x, noted in README), not a hard-locked version; a Bun ABI break requires a rebuild.
- The compiled binary resolves the ledger path at runtime via `os.homedir()`, so it works correctly from any CWD with no environment variable or config file required for the common case.

## Revisit if

- ndr is installed on a second machine where `~/.local/bin` is absent or not on PATH.
- A Bun upgrade produces a binary that silently misbehaves, or reproducibility across machines becomes a requirement.

## Context

- The symlink-into-`~/.local/bin` pattern is already established on this machine (uv-managed tools, the `claude` binary), and `~/.local/bin` is mutable and already on PATH.
- Declarative nix-darwin/home-manager packaging would give reproducibility and multi-machine symmetry, but ndr's shape, flags, and ledger path are all still in flux for v1.

## Why

Reusing the same slot keeps the mental model uniform: one directory, one PATH entry, all personal binaries. The symlink indirection is the key property — it makes the install step a one-time bootstrapping act rather than a repeated ceremony; rebuilding updates the target automatically with no darwin-rebuild or re-link. The cost of maintaining a Nix derivation during active development exceeds the benefit until the surface is settled.

## Alternatives

- **Declarative nix-darwin / home-manager packaging** — deferred post-v1: the right long-term answer for reproducibility and new-machine bootstrap, but ndr's CLI surface and ledger defaults are still changing; writing and maintaining a derivation during active v1 development adds overhead with no near-term payoff.
