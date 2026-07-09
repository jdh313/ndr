---
id: "jtk7fn"
title: NDR ledger resolution drops the built-in vault default — flag > .ndr.toml
  walk-up > error
status: superseded
decision_date: 2026-06-07
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - substrate
  - file-organization
binds: []
supersedes:
  - qevw6c
superseded_by:
  - q618cy
derived_from:
  - ndr CLI session 2026-06-07
informed_by: []
---

# jtk7fn — NDR ledger resolution drops the built-in vault default — flag > .ndr.toml walk-up > error

## Decision

Ledger resolution follows: `--ledger` flag > (capture only) draft `vault_decisions` > `.ndr.toml` walk-up from CWD > `RepoConfigError` pointing at `ndr init`. The hardcoded `DEFAULT_LEDGER_PATH` constant (`~/Loose Ends/Decisions/`) is removed entirely.

## Scope

- Does not bind: home-dir `.ndr.toml` placement is documentation-only — nothing in the CLI enforces or special-cases it.
- Does not bind: capture's draft-vault short-circuit (checking `vault_decisions` before the walk) is unchanged; only the final fallback is removed.

## Commitments

- `resolveLedgerPath` throws `RepoConfigError` with `NO_LEDGER_MESSAGE` when nothing resolves; the message cites `ndr init` and optionally `--ledger` as the two resolution paths.
- The constant deletion is a clean break: no conditional fallback, no env-var escape hatch.

## Revisit if

- The `.ndr.toml` walk-up is capped below home (e.g., stops at a git root boundary) — breaks the assumption that a `~/.ndr.toml` is reachable from any subdirectory of `~`.

## Context

- The old fallback baked a single user's vault layout (`~/Loose Ends/Decisions/`) as a hardcoded constant (`DEFAULT_LEDGER_PATH`) in `src/cli/config.ts`.
- Any repo without a `.ndr.toml` silently wrote atoms into the wrong ledger.
- A hardcoded vault-path fallback is a global side effect that breaks the CLI in any repo that isn't the personal vault.

## Why

Removing the constant forces an explicit opt-in per repo, making `ndr` fully vault-independent. A user who wants a personal catch-all ledger reproduces the old behavior by placing a `~/.ndr.toml` at the top of the walk — no special-case code required, since the vault becomes just another configured ledger. The error message (`RepoConfigError` / `NO_LEDGER_MESSAGE`) directs new adopters to `ndr init` rather than leaving them with a silent misdirected write.

## Alternatives

- **Warn-and-continue** — rejected: still silently writes atoms to the wrong ledger in a new repo; the only safe signal is a hard error that halts capture and points to `ndr init`.
