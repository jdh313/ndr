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

## Why

Release-please gives a deliberate, PR-first review checkpoint before any version cuts — needed since there is no second reviewer to catch a bad commit before it ships. Native-runner building sidesteps two live Bun `--compile` cross-compilation bugs (macOS codesign truncation, broken musl/arm64 cross-build) rather than trusting cross-compile from a single host.

Solo maintenance means no second-reviewer safety net, so an immediate-release-on-merge model (semantic-release, `auto`'s `shipit` mode, Python commitizen's `cz bump`-in-CI pattern) risks release sprawl or a bad commit shipping unreviewed. release-please's Release PR accumulates changes and requires an explicit merge to cut, which fits that constraint.

release-please also has first-class presets across ecosystems (`node`, `python`, `simple`, `go`, `rust`, `java`, `php`), so the same action/workflow shape generalizes to this maintainer's other, mostly Python, repos later — just swap `release-type`, no new tool per language.

On the build side, `bun build --compile --target=...` cross-compilation carries two open bugs as of Bun 1.3.x: a macOS codesign truncation issue (oven-sh/bun#29120, #29361) that can trigger Gatekeeper/SIGKILL on Apple Silicon if signing isn't handled explicitly, and a broken musl/arm64 cross-build path (oven-sh/bun#14292, closed "not planned"). Building each OS/arch pair on its own native GitHub Actions runner (`ubuntu-latest`, `ubuntu-24.04-arm`, `macos-13`, `macos-latest`) avoids both, with an explicit ad-hoc `codesign` step for the macOS artifacts.

## Alternatives

Changesets (rejected) · semantic-release (rejected) · release-it / np / auto / Knope / cocogitto / Python commitizen (rejected) · npm publish as distribution channel (rejected) · Homebrew tap (deferred)

**Changesets:** built around per-package changelog granularity, which is moot in this single-package repo; bot-automated changeset generation still can't produce a meaningful changelog description, so it doesn't even remove the ceremony downside.

**semantic-release:** releases immediately on every qualifying merge with no review checkpoint — the exact risk this decision avoids.

**release-it / np:** built around automating `npm publish`, which this project explicitly doesn't want (see Consequences) — wrong tool class.

**auto:** sidesteps commit conventions via PR labels, but its `shipit` mode still releases immediately per merge, reintroducing the no-checkpoint risk.

**Knope / cocogitto:** both are separate Rust binaries with no JS/Bun-native path; Knope matches the PR-first model but needs manual regex config per file with no ecosystem preset, cocogitto has no confirmed Python-file support. Neither offers enough advantage over release-please to justify a second toolchain.

**Python commitizen (`cz bump`):** actively maintained and cross-language via generic `version_files`, but its release model runs `cz bump` directly in CI on merge — immediate release, the same rejected shape as semantic-release — and would require a Python runtime in this Bun/TS repo's CI for no benefit.

**npm publish:** would reintroduce a Node/Bun runtime dependency, directly contradicting the rationale in the tooling/framework decision for a dependency-free single binary.

**Homebrew tap:** a reasonable v2 distribution channel (fits macOS/nix-darwin/Homebrew usage) but needs a second repo and formula-update automation — deferred until the binary release pipeline itself is proven.

## Assumptions

`bun-build-targets-stable`

This decision's native-runner build matrix is the concrete verification step for the darwin-target gap in that assumption (tracked on the tooling/framework decision that chose Bun). Until the macOS jobs in this workflow have actually run in CI with the ad-hoc codesign step, the assumption stays at "needs check," not "verified," for the darwin targets.

- **Revisit if:** the macOS build/codesign step fails in CI, or Bun ships a fix that removes the need for the manual codesign workaround (worth simplifying the workflow at that point).

## Consequences

Adds `release-please` as CI-only tooling, no new build-time dependency · `NDR_VERSION` now reads from `package.json` instead of a hardcoded string · npm publish and a Homebrew tap are explicitly out of scope for v1 · commit-message conformance becomes load-bearing for this pipeline to register real work

- `src/cli/index.ts` and `tsconfig.json` changed so the CLI's reported version tracks `package.json` (previously a separate hardcoded `"0.0.0"` constant, disconnected from any bump).
- Release automation now depends on Conventional-Commits-conforming commit messages to actually generate releases; enforcement is a separate, related decision.
- Distribution is GitHub Release binary assets only for v1 — no package registry, no Homebrew tap yet.