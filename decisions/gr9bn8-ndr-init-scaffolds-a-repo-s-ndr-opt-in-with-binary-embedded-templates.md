---
id: "gr9bn8"
title: ndr init scaffolds a repo's NDR opt-in with binary-embedded templates
status: current
decision_date: 2026-06-07
aliases: []
project: "[[ndr]]"
derived_from:
  - "[[ndr CLI session 2026-06-07]]"
informed_by: []
supersedes: []
superseded_by: []
area: tooling
topic: deployment
impacts: []
revisit_triggers: []
reversibility: medium
tags:
  - decision
---

# gr9bn8 — ndr init scaffolds a repo's NDR opt-in with binary-embedded templates

## Decision

`ndr init [--ledger <path>] [--project <name>] [--force]` scaffolds a repo's NDR opt-in by writing `.ndr.toml`, the ledger directory, starter `.taxonomy/{areas,topics}.yaml`, and the grounding rule — all from plain TS string constants compiled into the binary (`src/cli/templates.ts`).

## Why

Embedding templates in the binary makes `ndr init` self-contained on any machine, with no vault or plugin-asset reads required.

> [!info]- Full reasoning
> Prior to this command, bootstrapping a repo's NDR setup required manually writing `.ndr.toml` and seeding taxonomy files, or copying from the vault plugin's reference directory. Neither is reliable on machines without the Obsidian vault. Plain TS string constants in `src/cli/templates.ts` are compiled into the distributed binary, so the command works air-gapped. The taxonomy seed values are intentional opinionated defaults; a user can extend them immediately after `init` without losing the scaffold.

## Alternatives

Read templates from the vault plugin's `references/` directory at runtime — rejected. Reintroduces vault dependency; breaks on machines without the vault mounted.

> [!info]- Why they lost
> - **Runtime template reads:** Every invocation would require vault access, defeating the goal of making the CLI vault-independent (see ledger-resolution decision).

## Assumptions

`init-is-not-corpus-access`

> [!warning]- init-is-not-corpus-access
> Scaffolding (writing `.ndr.toml`, taxonomy seeds, rule files) is classified as filesystem setup, not atom corpus access, so it is correctly implemented with plain `node:fs` in the CLI layer rather than through the ports/adapters abstraction (ndr:0133).
>
> - **Current state:** active — `initCommand` in CLI layer, no port interface
> - **Revisit if:** init needs to read or validate existing atoms (e.g., taxonomy conflict detection), at which point a corpus port becomes appropriate

## Consequences

New `ndr init` entry point required before `ndr capture` in any fresh repo · taxonomy files are never overwritten by `--force` (user data) · `.ndr.toml` is the only artifact `--force` rewrites · each artifact is skipped if it already exists (idempotent)

> [!info]- Detail
> - Default ledger path is `./decisions`; default project name is the directory name — both overridable via flags.
> - Idempotency means `ndr init` is safe to re-run after partial failures.
> - Taxonomy files are excluded from `--force` to protect user-extended content; only `.ndr.toml` is a pure scaffold artifact with no user data.
> - `src/cli/templates.ts` is the single source of truth for scaffold shape; changes there propagate to all future `ndr init` invocations without a release of plugin assets.
