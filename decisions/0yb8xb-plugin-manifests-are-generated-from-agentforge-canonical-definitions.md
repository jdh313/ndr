---
id: "0yb8xb"
title: Plugin manifests are generated from AgentForge canonical definitions
status: current
decision_date: 2026-08-08
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - tooling
  - deployment
binds:
  - MARKETPLACE.yaml
  - plugins/ndr/PACKAGE.yaml
  - marketplaces/**
  - release-please-config.json
  - release-please-config-dev.json
  - .github/workflows/ci.yml
supersedes:
  - h7vdvf
superseded_by: []
derived_from:
  - agentforge commit 0ebebbb
informed_by:
  - nbyhyp
---

# 0yb8xb — Plugin manifests are generated from AgentForge canonical definitions

## Decision

The plugin stays co-located with the CLI in this repo, served from the repo's own
marketplace. `MARKETPLACE.yaml` and `plugins/ndr/PACKAGE.yaml` are the only maintained
sources of plugin metadata: both manifests are compiled output, published per-target under
`marketplaces/<target>/` and committed, with a CI job that recompiles through a pinned
AgentForge and fails on any difference.

## Scope

- Binds: plugin and marketplace metadata, the publication layout, and where the plugin is
  served from.
- Does not bind: skills, agents, hooks, references, and assets, which stay maintained in
  place under `plugins/ndr/`.

## Commitments

- Exactly one Claude Code plugin named `ndr` may be enabled at a time; if both are enabled
  simultaneously, `ndr@ndr` is the live source.
- cc-marketplace's `ndr` entry stays frozen at v0.6.1, deprecated in place (banner +
  `[DEPRECATED]` descriptions) rather than deleted.
- No file under `marketplaces/` is ever hand-edited; the next compile republishes the whole
  tree and silently discards the edit.
- `plugins/ndr/PACKAGE.yaml`'s `defaults.version` is the single version field, owned by
  release-please's `yaml` extra-files updater. Both manifests derive from it, so they cannot
  disagree.
- Compilation goes through a worktree pinned to the SHA in `.github/workflows/ci.yml`, never
  the `agentforge` binary on PATH — that is a symlink into a dev `dist/` and can produce
  output CI rejects.
- The Claude marketplace root is `marketplaces/claude`, not the repo root.

## Revisit if

- The ndr repo is no longer checked out on the target machine — co-location's benefit
  depends on that.
- The plugin gains a second package, making the marketplace non-single-plugin.
- AgentForge's canonical schema changes in a way that costs more to track than the drift it
  prevents.

## Context

- `h7vdvf` established co-location so a CLI change and its skill-side consumer land in one
  commit. That reasoning is unchanged; this atom carries it forward and revises only the
  machinery commitment.
- `h7vdvf` accepted shipping bare: no automated validation or sync machinery, justified by
  single-plugin scale.
- Under that arrangement the two hand-written manifests drifted. `marketplace.json` sat at
  `0.8.0` with a description predating `/interrogate-decision`, while `plugin.json` was at
  `1.0.0-beta`.
- The drift was structural. `nbyhyp` put `plugin.json` under release-please via `extra-files`,
  but nothing bumped `marketplace.json` — it was in neither release config and no workflow
  touched it.
- Nothing in `src/`, `test/`, or CI referenced the plugin tree at all.
- cc-marketplace had already run this migration across fifteen packages, so the pattern and
  its failure modes were known rather than speculative.

## Why

A second copy of a fact drifts from the first whenever only one of them has an owner. Naming
one source and generating the rest removes the class of bug instead of repairing this
instance of it: the version is now unrepresentable in two states. Single-plugin scale argued
against the machinery when the alternative was hand-maintenance of two files, but it stopped
arguing once the machinery existed elsewhere and the hand-maintained copies had already
diverged in production.

## Alternatives

- **Keep both manifests hand-written and add the missing `extra-files` entry for
  `marketplace.json`** — rejected: repairs the one field that drifted while leaving every
  other duplicated field, notably the description, with no owner.
- **Fold ndr into the cc-marketplace collection** — rejected: contradicts co-location, whose
  benefit is that a CLI change and its skill-side consumer land in one commit.
- **Keep release-please pointed at the generated `plugin.json`** — rejected: makes the
  compile non-hermetic, with output feeding back in as input.
