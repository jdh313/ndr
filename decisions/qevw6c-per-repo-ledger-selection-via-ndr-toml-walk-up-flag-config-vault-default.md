---
id: "qevw6c"
title: Per-repo ledger selection via .ndr.toml walk-up, flag > config > vault default
status: superseded
decision_date: 2026-06-04
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - substrate
  - file-organization
binds: []
supersedes: []
superseded_by:
  - jtk7fn
derived_from: []
informed_by:
  - "0130"
  - "0147"
  - "0006"
---

# qevw6c — Per-repo ledger selection via .ndr.toml walk-up, flag > config > vault default

## Decision

A repo opts into a specific decision ledger by placing `.ndr.toml` at or above the CWD; every ndr verb resolves its ledger as: `--ledger` flag > (capture only) draft payload's `vault_decisions` > `.ndr.toml` walk-up from CWD toward filesystem root > vault default `~/Loose Ends/Decisions/`.

## Scope

- Does not bind: per-directory override — CWD walk-up is the only multi-CWD strategy.

## Commitments

- Repos already using the vault default need no file — the zero-config path is unchanged.
- A single `.ndr.toml` at the repo root covers all subdirectory sessions via walk-up; a monorepo with distinct per-package ledgers would need per-package files.
- A present-but-broken `.ndr.toml` fails loudly (exit 1) rather than silently falling back to the vault default.

## Revisit if

- Payload-specified ledgers cause confusion in practice, or the `vault_decisions` field is dropped from the draft schema.

## Context

- The CLI needs a runtime-readable signal to know which ledger to target.
- A CLAUDE.md snippet is behavioral grounding for the skill layer, not a parse target for the TypeScript CLI.
- An env var is per-shell and invisible inside the repo.
- A central registry was already rejected (ndr:0130) as cross-project coupling.
- ndr:0006 left an open `tracked-projects-opt-in` assumption about how a repo opts in.

## Why

The vault default stays zero-config; the TOML file is the declarative, machine-readable opt-in the CLI can consume at runtime. `.ndr.toml` at the repo root is declarative, version-controlled, and its walk-up semantics mean nested CWDs (monorepo packages, subdirectory sessions) land in the right ledger automatically. A present-but-broken file fails loudly (exit 1) rather than silently falling through to the vault default — silent fallback would mask misconfiguration and deposit atoms in the wrong ledger. This also closes ndr:0006's open `tracked-projects-opt-in` assumption: the two-part opt-in is now the CLAUDE.md snippet (makes grounding happen) plus `.ndr.toml` (tells the CLI where atoms land).

## Alternatives

- **CLAUDE.md snippet alone** — rejected: grounds the skill correctly but the CLI binary can't read it at capture time; would require a separate machine-readable signal anyway.
- **Env var** — rejected: per-shell scope means it doesn't travel with the repo, is invisible in version control, and is easy to forget when opening a new terminal session.
- **Central registry** — rejected by ndr:0130 as cross-project coupling; requires updating a separate file every time a new repo opts in.
