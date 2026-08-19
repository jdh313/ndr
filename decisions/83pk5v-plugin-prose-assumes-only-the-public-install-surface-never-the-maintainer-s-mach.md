---
id: "83pk5v"
title: Plugin prose assumes only the public install surface, never the
  maintainer's machine
status: current
decision_date: 2026-08-18
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - tooling
  - deployment
binds:
  - plugins/ndr/**
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - 0q443w
  - q618cy
  - "0147"
---

# 83pk5v — Plugin prose assumes only the public install surface, never the maintainer's machine

## Decision

Everything shipped under `plugins/ndr/` — skills, agents, references, hooks — addresses an external installer: the CLI install hint is the public `bun install -g <git URL>` / release-binary path, `/ndr-bootstrap` takes its target ledger from the skill argument or `$NDR_LEDGER`, and worked examples are self-contained rather than pointers into the maintainer's private ledger or vault.

## Scope

- Binds: `plugins/ndr/**` and the compiled copies under `marketplaces/`.
- Does not bind: `CLAUDE.md`, `decisions/`, or maintainer-only docs, which may describe the maintainer's own workflow as long as they say so.

## Commitments

- No plugin file may name a home-directory path (`~/Projects/…`, `~/Loose Ends/…`), a private sibling plugin (`librarian:*`, `superpowers:*`), or an atom id that exists only in a private ledger.
- `/ndr-bootstrap` refuses to run without a target ledger instead of guessing one.
- The install hint in every skill/agent must stay in step with the consumer channels decision; a change to the channels is a change to those hints.

## Revisit if

- The plugin grows a config surface (a settings file) that makes a default bootstrap target legitimate again.
- The maintainer's vault integration is generalized into an optional, documented adapter rather than a hardcoded path.

## Context

- The repository went public on 2026-08-18; the plugin is installable by anyone through the committed marketplace.
- Before the flip, `/ndr-bootstrap` copied seed content into a hardcoded `~/Loose Ends/Decisions` vault path, and eight skills/agents told a missing-CLI user to run `bun run install:bin` in `~/Projects/ndr`.
- The worthiness reference walked its rubric against personal atoms (a homelab layout, a media-server convention) that resolve only in the maintainer's private ledger.
- The CLI already resolves a ledger via `--ledger`, `NDR_LEDGER`, or `.ndr.toml` walk-up.

## Why

A skill that writes into a directory that exists on one machine, or points a stranded user at a checkout they do not have, fails on first use for every installer but one — and does so silently enough that the failure looks like ndr being broken. Reusing the CLI's existing ledger-resolution vocabulary for bootstrap keeps one mental model; refusing without a target is safer than inventing a default the CLI does not know about. Anonymized examples cost a little concreteness but stay readable to anyone, whereas private atom ids read as dead links.

## Alternatives

- **Keep the maintainer defaults and document them as "currently hardcoded"** — rejected: honest but still broken for every external installer.
- **Default bootstrap to the nearest `.ndr.toml` ledger** — deferred: a bootstrap usually targets a personal catch-all ledger with no repo config nearby; an explicit argument is unambiguous now, and the walk-up can be added later without breaking callers.
