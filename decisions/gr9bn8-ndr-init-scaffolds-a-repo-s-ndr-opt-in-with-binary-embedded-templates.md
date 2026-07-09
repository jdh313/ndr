---
id: "gr9bn8"
title: ndr init scaffolds a repo's NDR opt-in with binary-embedded templates
status: current
decision_date: 2026-06-07
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - deployment
binds: []
supersedes: []
superseded_by: []
derived_from:
  - ndr CLI session 2026-06-07
informed_by: []
---

# gr9bn8 — ndr init scaffolds a repo's NDR opt-in with binary-embedded templates

## Decision

`ndr init [--ledger <path>] [--project <name>] [--force]` scaffolds a repo's NDR opt-in by writing `.ndr.toml`, the ledger directory, starter `.taxonomy/{areas,topics}.yaml`, and the grounding rule — all from plain TS string constants compiled into the binary (`src/cli/templates.ts`).

## Commitments

- Taxonomy files are never overwritten by `--force` (user data); `.ndr.toml` is the only artifact `--force` rewrites. Each artifact is skipped if it already exists, so `ndr init` is idempotent and safe to re-run after partial failures.
- Default ledger path is `./decisions` and default project name is the directory name — both overridable via flags.
- `src/cli/templates.ts` is the single source of truth for scaffold shape; changes there propagate to all future `ndr init` invocations without a release of plugin assets.
- `initCommand` is implemented in the CLI layer with plain `node:fs`, not through the ports/adapters abstraction (ndr:0133) — scaffolding is classified as filesystem setup, not atom corpus access.
- A new `ndr init` entry point is now required before `ndr capture` in any fresh repo.

## Revisit if

- `init` needs to read or validate existing atoms (e.g., taxonomy conflict detection), at which point a corpus port becomes appropriate.

## Context

- Prior to this command, bootstrapping a repo's NDR setup required manually writing `.ndr.toml` and seeding taxonomy files, or copying from the vault plugin's reference directory.
- Neither prior path is reliable on machines without the Obsidian vault.

## Why

Embedding templates in the binary makes `ndr init` self-contained on any machine, with no vault or plugin-asset reads required. Plain TS string constants in `src/cli/templates.ts` are compiled into the distributed binary, so the command works air-gapped. The taxonomy seed values are intentional opinionated defaults; a user can extend them immediately after `init` without losing the scaffold.

## Alternatives

- **Read templates from the vault plugin's `references/` directory at runtime** — rejected: reintroduces the vault dependency and breaks on machines without the vault mounted; every invocation would require vault access, defeating the goal of a vault-independent CLI (see ledger-resolution decision).
