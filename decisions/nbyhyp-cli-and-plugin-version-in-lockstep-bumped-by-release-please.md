---
id: "nbyhyp"
title: CLI and plugin version in lockstep, bumped by release-please
status: current
decision_date: 2026-07-10
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - process
  - deployment
binds:
  - release-please-config.json
  - plugins/ndr/.claude-plugin/plugin.json
supersedes: []
superseded_by: []
derived_from:
  - claude-code session 2026-07-10 (distribution debate)
informed_by:
  - 68gar5
---

# nbyhyp — CLI and plugin version in lockstep, bumped by release-please

## Decision

The CLI (`package.json`) and the Claude Code plugin (`plugin.json`) carry a single shared version, bumped together by release-please: the plugin manifest is registered as an extra-file in the release config. One repo release moves one number.

## Commitments

- `plugin.json`'s `version` is never hand-edited; release-please owns it.
- Prose-only plugin changes still cut a CLI version bump — accepted noise.
- Version equality between CLI and plugin is an invariant the plugin's SessionStart drift hook relies on.
- The one-time `release-as: 1.0.0` pin must be removed from the release config after the 1.0.0 release cuts, or every subsequent release re-pins to 1.0.0.

## Revisit if

- The plugin ever distributes on its own cadence or separately from this repo.

## Context

- The two versions had diverged with no reconciliation rule (CLI at 0.1.0, plugin at 0.8.0).
- release-please already owns `package.json`'s version (ndr:68gar5).
- The plugin's CLI-drift hook needs a "required CLI version" pin from somewhere.
- Both artifacts live in one repo and release in one act (Release PR merge, tag, fast-forward of `main`).
- Neither diverged number is a natural successor for a shared series; unification requires an explicit one-time version choice.

## Why

Lockstep deletes the pin bookkeeping: the drift hook can read the plugin's own `version` as the required CLI version, so there is no separate minimum-version file to forget in a release commit — which was the likeliest future bug in the independent-versions design. Version-coupled components that break on skew are the textbook case for lockstep; trigger.dev ships an entire `update` command whose sole job is forcing its CLI and packages back into version match.

## Alternatives

- **Independent versions + explicit min-CLI-version pin in the plugin** — rejected: manual bookkeeping on every release; the forgotten bump is the predictable failure.
- **Semver range compatibility declarations between plugin and CLI** — rejected: ceremony without benefit for a single-repo, single-maintainer pair.
