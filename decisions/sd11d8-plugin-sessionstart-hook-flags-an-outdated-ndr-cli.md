---
id: "sd11d8"
title: Plugin SessionStart hook flags an outdated ndr CLI
status: current
decision_date: 2026-07-10
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - deployment
  - tooling
binds:
  - plugins/ndr/**
supersedes: []
superseded_by: []
derived_from:
  - claude-code session 2026-07-10 (distribution debate)
informed_by: []
---

# sd11d8 — Plugin SessionStart hook flags an outdated ndr CLI

## Decision

The Claude Code plugin ships a SessionStart hook that compares `ndr --version` against the CLI version the plugin requires and emits an upgrade reminder when the installed binary is older. The check is fully offline — no network, no registry — and fail-silent on every error path.

## Commitments

- The hook must never block or noise a session on failure: a missing binary gets the existing install pointer; any comparison error exits silently.
- The plugin's required-CLI-version source must stay accurate on every release (free once versions are lockstep).

## Revisit if

- Reminder fatigue: consumers report the nag without acting on it.
- The plugin ever targets users who do not run the CLI.

## Context

- Plugin skills shell out to the `ndr` binary; version skew surfaces as skills invoking verbs or flags the installed CLI lacks, far from the actual cause.
- Plugin updates arrive via the Claude Code marketplace independently of CLI updates, so drift between the two is structural, not hypothetical.
- The CLI already exposes `--version`, read from `package.json`.

## Why

The operative failure is not "a newer version exists somewhere" but "this plugin expects CLI surface the installed binary lacks" — and that question is answerable entirely offline from the plugin's own metadata, instantly and without credentials. A network freshness check would add latency and an auth surface to learn something the maintainer can tell a handful of reachable devs directly.

## Alternatives

- **Network freshness check (`git ls-remote` / Releases API, cached)** — deferred: layerable later if "newer exists" ever becomes worth surfacing automatically.
- **No check** — rejected: silent skew produces confusing skill failures with no pointer to the fix.
