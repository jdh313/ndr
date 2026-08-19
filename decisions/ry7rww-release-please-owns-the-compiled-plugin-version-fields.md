---
id: "ry7rww"
title: release-please owns the compiled plugin version fields
status: current
decision_date: 2026-08-19
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - ci-strategy
  - deployment
binds:
  - release-please-config.json
  - release-please-config-dev.json
supersedes: []
superseded_by: []
derived_from:
  - https://github.com/jdh313/ndr/pull/30
informed_by:
  - 0yb8xb
  - 4b95td
---

# ry7rww — release-please owns the compiled plugin version fields

## Decision

Both release-please lanes carry `json` `extra-files` entries for the four
compiled plugin `version` fields, so the version bump lands inside
release-please's own release commit rather than in a follow-up recompile pushed
onto the Release-PR branch.

## Scope

- Binds: the `version` field in `.claude-plugin/marketplace.json`,
  `marketplaces/claude/.claude-plugin/marketplace.json`,
  `marketplaces/claude/plugins/ndr/.claude-plugin/plugin.json`, and
  `marketplaces/codex/plugins/ndr/.codex-plugin/plugin.json`.
- Does not bind: any other byte under `marketplaces/` or the root manifest —
  those stay compiler-only output that no automation may write.
- Does not bind: the marketplace-level `metadata.version`, which comes from
  `MARKETPLACE.yaml` and is deliberately outside the configured jsonpaths.

## Commitments

- Adding a compiled manifest that carries a plugin `version` means adding a
  matching `extra-files` entry to both release-please configs, or the drift
  gate fails on the next release.
- Two mechanisms now write the same four fields — the AgentForge compiler and
  release-please — and they must agree byte-for-byte.
- Changing the compiled manifests' layout (moving or renaming a `version`
  field) is now a release-please config change as well as a compiler change.

## Revisit if

- AgentForge grows a version-injection mode that reads the released version
  directly, making the duplicated updaters redundant.
- release-please stops force-pushing the Release-PR branch on sync, which would
  make a post-hoc recompile commit durable.
- A compiled manifest starts carrying a version that is not the plugin version,
  so a jsonpath can no longer distinguish them.

## Context

- `plugins/ndr/PACKAGE.yaml`'s `defaults.version` was the only version field
  release-please updated, via a `yaml` `extra-files` entry.
- The four compiled manifests are committed compiler output and carry the same
  plugin version, so a bump left them one release behind.
- The `marketplace` CI job recompiles through a pinned AgentForge and fails on
  any difference, so it failed on every Release PR.
- The failure was hit at 1.0.0 and again at 1.0.1; both times it was cleared by
  a manual `chore: recompile marketplace manifests` commit pushed onto the
  release branch.
- release-please force-pushes the Release-PR branch whenever it syncs the PR.

## Why

Force-push is what settles it. Any fix that adds a commit to the Release-PR
branch is racing a branch release-please rewrites on every sync, so it has to
re-run on each sync and can still be clobbered between the sync and the rerun.
A change release-please itself makes is regenerated as part of that rewrite, so
it is idempotent by construction and cannot be lost.

The mechanism is also narrow enough to trust. release-please's `json` updater
resolves a jsonpath and rewrites only the semver substring at each matched node,
re-serializing with the original formatting, so the blast radius is four lines
and the marketplace-level `metadata.version` is untouched. Verified against the
pinned compiler: bumping `PACKAGE.yaml` alone reproduces exactly this four-file
drift and nothing else, and applying the updaters returns `agentforge check` to
exit 0 for both a stable and a beta version.

That leaves the cost: automation now writes bytes that the compiler otherwise
owns exclusively. This is accepted because the drift gate is unchanged — it
still recompiles and compares on every pull request, so if the updaters ever
diverge from the compiler, CI catches it exactly as it caught the stale
manifests in the first place. The rule being relaxed is "no human hand-edits";
a machine writing precisely what a recompile would write, under a gate that
verifies the claim, is not the failure that rule exists to prevent.

## Alternatives

- **A recompile step in the release workflows** — rejected: it lands as a commit
  on a branch release-please force-pushes, so it must re-run on every PR sync
  and can still be lost to a race, and it would add an AgentForge checkout plus
  write permissions to both release workflows.
- **Auto-fixing inside the `marketplace` CI job when the only drift is
  `version`** — rejected: it gives a gate the power to mutate what it is
  supposed to be judging, and inherits the same force-push race.
- **Keep the manual recompile commit** — rejected: it made every release a
  two-step manual operation and had already been forgotten once.
- **Drop the version field from the compiled manifests** — rejected: both
  runtimes read it, and CLI/plugin version lockstep depends on it.
