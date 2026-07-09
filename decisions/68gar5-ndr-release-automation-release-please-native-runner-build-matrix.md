---
id: "68gar5"
title: "ndr release automation: release-please + native-runner build matrix"
status: current
decision_date: 2026-07-08
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
---

# 68gar5 — ndr release automation: release-please + native-runner build matrix

## Decision

`ndr`'s versioning and release pipeline uses **release-please** (`googleapis/release-please-action@v5`, `release-type: node`) to manage version bumps, changelog generation, and tagging from Conventional Commits, staged via a Release PR. A second job in the same workflow builds the compiled binary on native OS/arch runners (not cross-compiled from one host) and uploads each as a GitHub Release asset.

## Commitments

- Adds `release-please` as CI-only tooling; no new build-time dependency.
- `src/cli/index.ts` and `tsconfig.json` now read the CLI's reported version from `package.json`, replacing a hardcoded `"0.0.0"` constant disconnected from any bump.
- Release automation now depends on Conventional-Commits-conforming commit messages to actually generate releases; enforcement of that convention is a separate, related decision.
- Distribution is GitHub Release binary assets only for v1 — no package registry, no Homebrew tap yet.

## Revisit if

- The macOS build/codesign step fails in CI.
- Bun ships a fix that removes the need for the manual codesign workaround (worth simplifying the workflow at that point).

## Context

- Solo maintenance means no second-reviewer safety net; an immediate-release-on-merge model risks release sprawl or a bad commit shipping unreviewed.
- `bun build --compile --target=...` cross-compilation carries two open bugs as of Bun 1.3.x: a macOS codesign truncation issue (oven-sh/bun#29120, #29361) that can trigger Gatekeeper/SIGKILL on Apple Silicon if signing isn't handled explicitly, and a broken musl/arm64 cross-build path (oven-sh/bun#14292, closed "not planned").

## Why

Release-please gives a deliberate, PR-first review checkpoint before any version cuts — the missing second-reviewer safety net this repo needs. Its Release PR accumulates changes and requires an explicit merge to cut, unlike an immediate-release-on-merge model (semantic-release, `auto`'s `shipit` mode, Python commitizen's `cz bump`-in-CI pattern). It also has first-class presets across ecosystems (`node`, `python`, `simple`, `go`, `rust`, `java`, `php`), so the same action/workflow shape generalizes to this maintainer's other, mostly Python, repos later — just swap `release-type`, no new tool per language.

Native-runner building sidesteps both open Bun cross-compilation bugs rather than trusting cross-compile from a single host: building each OS/arch pair on its own native GitHub Actions runner (`ubuntu-latest`, `ubuntu-24.04-arm`, `macos-13`, `macos-latest`) avoids both, with an explicit ad-hoc `codesign` step for the macOS artifacts.

## Alternatives

- **Changesets** — rejected: built around per-package changelog granularity, which is moot in this single-package repo; bot-automated changeset generation still can't produce a meaningful changelog description.
- **semantic-release** — rejected: releases immediately on every qualifying merge with no review checkpoint, the exact risk this decision avoids.
- **release-it / np** — rejected: built around automating `npm publish`, which this project explicitly doesn't want — wrong tool class.
- **auto** — rejected: sidesteps commit conventions via PR labels, but its `shipit` mode still releases immediately per merge, reintroducing the no-checkpoint risk.
- **Knope / cocogitto** — rejected: both are separate Rust binaries with no JS/Bun-native path; Knope needs manual regex config per file with no ecosystem preset, cocogitto has no confirmed Python-file support. Neither offers enough advantage to justify a second toolchain.
- **Python commitizen (`cz bump`)** — rejected: its release model runs `cz bump` directly in CI on merge, the same immediate-release shape as semantic-release, and would require a Python runtime in this Bun/TS repo's CI for no benefit.
- **npm publish as distribution channel** — rejected: would reintroduce a Node/Bun runtime dependency, contradicting the rationale for a dependency-free single binary.
- **Homebrew tap** — deferred: a reasonable v2 distribution channel, but needs a second repo and formula-update automation; deferred until the binary release pipeline itself is proven.