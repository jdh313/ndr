---
id: "0q443w"
title: "Keep two consumer install channels: git-URL bun install and Release binaries"
status: current
decision_date: 2026-07-10
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - deployment
  - tooling
binds:
  - package.json
  - README.md
supersedes: []
superseded_by: []
derived_from:
  - "claude-code session 2026-07-10 (distribution debate: Releases vs GH npm
    registry vs git-URL install)"
informed_by:
  - "0147"
  - 68gar5
---

# 0q443w — Keep two consumer install channels: git-URL bun install and Release binaries

## Decision

ndr supports two consumer install channels side by side: compiled per-platform binaries attached to GitHub Releases, and a source install via `bun install -g git+ssh://…ndr.git` tracking `main`. Git-channel updates are bun-native re-installs; no custom upgrade command ships yet.

## Scope

- Binds: the consumer-facing install surface — `package.json` (`bin`, `private`) and README install docs.
- Does not bind: release automation (release-please workflow, native-runner build matrix) — governed by ndr:68gar5, unchanged.
- Does not bind: the maintainer's dev-machine install — that remains governed by ndr:0147 (still current), unchanged by this decision.

## Commitments

- `main` stays release-grade: fast-forward-only from `dev`, so `main` HEAD and the latest release track together — the git channel's correctness depends on this.
- `package.json` `bin` must stay runnable from source under Bun (`src/cli/bin.ts` keeps its `#!/usr/bin/env bun` shebang); a compiled-only refactor would silently break the git channel.
- Bun is a hard prerequisite for git-channel consumers.
- `"private": true` stays in `package.json` as a guard against accidental registry publishing.
- No custom `ndr upgrade` command until demand exists; git-channel updates are re-runs of the install command.

## Revisit if

- A non-dev consumer (no git access, no Bun) needs ndr.
- The repo goes public — npmjs distribution flips the calculus entirely.
- Bun's git-dependency installs prove flaky in practice (cache staleness, lifecycle-script surprises).
- The source-run and compiled-run behaviors diverge.

## Context

- The repo is private; prospective consumers are a handful of trusted devs.
- Those devs are assumed to have git configured for GitHub, but not necessarily the `gh` CLI or a personal access token.
- Release assets on a private repo are not scriptable with git credentials alone — browser download only, which also trips macOS Gatekeeper quarantine on unsigned-workflow downloads.
- The release pipeline already builds ad-hoc-signed per-platform binaries on every release (ndr:68gar5).
- `package.json` `bin` already points at `src/cli/bin.ts`, which carries a Bun shebang — a git install needs no build step.
- Bun does not run lifecycle scripts for git-sourced packages unless trusted, so the repo's `prepare` script is inert on consumer installs.
- Branch policy already guarantees `main` advances only by fast-forward from `dev`.

## Why

The only credential every consumer is known to hold is git access to the repo, and the git-URL install converts exactly that credential into a scriptable install-and-update path — no PAT minting, no `gh` onboarding, no new infrastructure. The binary channel stays open because it is already paid for by the 68gar5 pipeline and serves the cases source install cannot (no Bun on the machine, binary-grade startup). Keeping both open costs nothing operationally: the discipline both channels lean on — `main` matching the latest release — is already enforced by the branch workflow, so neither channel can drift ahead of the other in substance.

## Alternatives

- **GitHub Packages npm registry** — rejected: every consumer must mint a classic PAT with `read:packages` and wire it into `.npmrc`/`bunfig.toml`; a second, redundant credential next to their existing git auth.
- **gh-CLI-scripted Release downloads as the default consumer path** — rejected: assumes a `gh` install + auth consumers are not known to have; remains a fine optional convenience for those who do.
- **Custom `ndr upgrade` subcommand** — deferred: a small, non-breaking addition once someone actually runs a stale version long enough to matter.
- **npmjs publish** — deferred: only relevant if the repo goes public.
