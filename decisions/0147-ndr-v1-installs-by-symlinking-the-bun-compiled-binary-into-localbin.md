---
id: '0147'
title: ndr v1 installs by symlinking the bun-compiled binary into ~/.local/bin
status: current
decision_date: '2026-06-03'
aliases: []
project: '[[ndr]]'
derived_from: []
informed_by:
- '[[Decisions/0128-ndr-tooling-uses-typescript-and-bun-for-v1]]'
- '[[Decisions/0129-ndr-is-cli-primary-with-a-library-underneath-skills-rewire-to-call-ndr-resolve]]'
supersedes: []
superseded_by: []
area: tooling
topic: deployment
impacts: []
revisit_triggers:
- "ndr needs to run on a machine without this manual symlink step (new laptop, CI,\
  \ or shared use) \u2014 declarative nix packaging becomes worth the cost"
- a current-Bun build breaks reproducibility
reversibility: easy
tags:
- decision
---
# 0147 — ndr v1 installs by symlinking the bun-compiled binary into ~/.local/bin

## Decision

`bun run install:bin` compiles `src/cli/bin.ts` to `dist/ndr` via `bun build --compile`, then symlinks it into `~/.local/bin/ndr` — putting ndr on PATH without any system-level install step.

## Why

`~/.local/bin` is mutable, already on PATH alongside the uv tools and claude, and a symlink means `bun run build` updates the installed binary in place with no darwin-rebuild or re-link.

> [!info]- Full reasoning
> The symlink-into-~/.local/bin pattern is already established on this machine (uv-managed tools, the claude binary). Reusing the same slot keeps the mental model uniform: one directory, one PATH entry, all personal binaries. The symlink indirection is the key property — it makes the install step a one-time bootstrapping act rather than a repeated ceremony; rebuilding updates the target automatically.
>
> Declarative nix-darwin packaging would give reproducibility and multi-machine symmetry, but requires ndr to stabilize first — shape, flags, and the ledger path are all still in flux for v1. The cost of maintaining a Nix derivation during active development exceeds the benefit until the surface is settled.

## Alternatives

Declarative nix-darwin / home-manager packaging — deferred post-v1.

> [!info]- Why they lost
> - **nix-darwin / home-manager:** The right long-term answer for reproducibility and new-machine bootstrap, but ndr's CLI surface and ledger defaults are still changing. Writing and maintaining a derivation during active v1 development adds overhead with no near-term payoff. Deferred explicitly until ndr stabilizes.

## Assumptions

`local-bin-on-path` · `bun-version-stability`

> [!warning]- local-bin-on-path
> `~/.local/bin` is present and on PATH on every machine where ndr is used.
>
> - **Current state:** active — verified on primary dev machine (2026-06-03)
> - **Revisit if:** ndr is installed on a second machine where ~/.local/bin is absent or not on PATH

> [!warning]- bun-version-stability
> The compiled binary is built against the current Bun install (tested against Bun 1.3.x, noted in README) rather than a hard-locked version.
>
> - **Current state:** active — acceptable for a personal tool at v1
> - **Revisit if:** a Bun upgrade produces a binary that silently misbehaves, or reproducibility across machines becomes a requirement

## Consequences

No uninstall recipe (delete the symlink by hand) · build pinned to current Bun, not a locked version · binary defaults the ledger to ~/Loose Ends/Decisions/ via os.homedir() from any CWD

> [!info]- Detail
> - No managed uninstall: deleting `~/.local/bin/ndr` is sufficient; no package manager to notify. Acceptable for a personal CLI.
> - Bun version: pinned to whatever Bun is current at build time. Noted in README. If Bun introduces a breaking ABI change the binary will need a rebuild — a known and accepted trade-off for a personal tool that the author builds from source.
> - Ledger default: the compiled binary resolves the ledger path at runtime via `os.homedir()`, so it works correctly from any CWD. No environment variable or config file required for the common case.
