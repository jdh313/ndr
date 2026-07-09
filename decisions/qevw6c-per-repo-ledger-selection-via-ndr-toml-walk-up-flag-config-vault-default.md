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

## Why

The vault default stays zero-config; the TOML file is the declarative, machine-readable opt-in that the CLI can consume — the CLAUDE.md snippet alone cannot serve that role.

The CLI needs a signal it can read at runtime to know which ledger to target. A CLAUDE.md snippet is behavioral grounding for the skill layer, not a parse target for the TypeScript CLI. An env var is per-shell and invisible inside the repo. A central registry (rejected by ndr:0130) would push cross-project coupling back in. `.ndr.toml` at the repo root is declarative, version-controlled, and walk-up semantics mean nested CWDs (monorepo packages, subdirectory sessions) land in the right ledger automatically. A present-but-broken file fails loudly (exit 1) rather than silently falling through to the vault default — silent fallback would mask misconfiguration and deposit atoms in the wrong ledger.

This also closes ndr:0006's open `tracked-projects-opt-in` assumption: the two-part opt-in is now CLAUDE.md snippet (makes grounding happen) + `.ndr.toml` (tells the CLI where atoms land).

## Alternatives

CLAUDE.md snippet alone (rejected — behavioral but not CLI-parseable) · env var (rejected — per-shell, not per-repo) · central registry (rejected by ndr:0130)

- **CLAUDE.md snippet alone:** Grounds the skill correctly but the CLI binary can't read it at capture time. Would require a separate machine-readable signal anyway.
- **Env var:** Per-shell scope means it doesn't travel with the repo. Invisible in version control; easy to forget when opening a new terminal session.
- **Central registry:** Explicitly rejected by ndr:0130 as cross-project coupling. Requires updating a separate file every time a new repo opts in.

## Assumptions

`capture-payload-precedence`

The draft payload's `vault_decisions` slot sits between the `--ledger` flag and the `.ndr.toml` walk-up in resolution order, preserved for backward compatibility with drafter payloads.

- **Current state:** active
- **Revisit if:** payload-specified ledgers cause confusion in practice, or the `vault_decisions` field is dropped from the draft schema

## Consequences

Repos must add `.ndr.toml` to opt into a non-default ledger · walk-up is the only multi-CWD strategy; no per-directory override · broken TOML is a hard failure, not a silent fallback

- Repos already using the vault default need no file — zero-config path is unchanged.
- Walk-up means a single `.ndr.toml` at the repo root covers all subdirectory sessions; a monorepo with distinct per-package ledgers would need per-package files.
- Hard failure on broken TOML is intentional: silent fallback to the vault default would deposit atoms in the wrong ledger without any signal to the user.
