---
id: "jtk7fn"
title: NDR ledger resolution drops the built-in vault default — flag > .ndr.toml
  walk-up > error
status: superseded
decision_date: 2026-06-07
aliases: []
project: "[[ndr]]"
derived_from:
  - "[[ndr CLI session 2026-06-07]]"
informed_by: []
supersedes:
  - "[[Decisions/qevw6c-per-repo-ledger-selection-via-ndr-toml-walk-up-flag-con\
    fig-vault-default]]"
superseded_by:
  - "[[Decisions/q618cy-ndr-ledger-env-joins-ledger-resolution-as-a-shell-sessi\
    on-override]]"
area: substrate
topic: file-organization
impacts: []
revisit_triggers: []
reversibility: medium
tags:
  - decision
---

# jtk7fn — NDR ledger resolution drops the built-in vault default — flag > .ndr.toml walk-up > error

## Decision

Ledger resolution follows: `--ledger` flag > (capture only) draft `vault_decisions` > `.ndr.toml` walk-up from CWD > `RepoConfigError` pointing at `ndr init`. The hardcoded `DEFAULT_LEDGER_PATH` constant (`~/Loose Ends/Decisions/`) is removed entirely.

## Why

A hardcoded vault path is a global side-effect that breaks the CLI in any repo that is not the personal vault — removing it makes `ndr` fully vault-independent.

> [!info]- Full reasoning
> The old fallback baked in a single user's vault layout as a constant in `src/cli/config.ts`. Any repo without a `.ndr.toml` silently wrote atoms into the wrong ledger. Removing the constant forces an explicit opt-in per repo. A user who wants a personal catch-all ledger reproduces the old behavior by placing a `~/.ndr.toml` at the top of the walk — no special-case code required, and the vault becomes just another configured ledger. The error message directs new adopters to `ndr init` rather than leaving them with a silent misdirected write.

## Alternatives

Keep `DEFAULT_LEDGER_PATH` but demote it to a warning — rejected. Silently writing to a fallback path is the failure mode we are fixing; a warning still misdirects writes.

> [!info]- Why they lost
> - **Warn-and-continue:** Still silently writes atoms to the wrong ledger in a new repo. The only safe signal is an error that halts the capture and points to `ndr init`.

## Assumptions

`~/.ndr.toml-walk-reaches-home`

> [!warning]- ~/.ndr.toml-walk-reaches-home
> The `.ndr.toml` walk-up terminates at the filesystem root, so a `~/.ndr.toml` placed in the home directory is reachable from any subdirectory of `~`.
>
> - **Current state:** active — walk-up implementation confirmed in `resolveLedgerPath`
> - **Revisit if:** walk-up is capped below home (e.g., stops at a git root boundary)

## Consequences

`DEFAULT_LEDGER_PATH` removed from `src/cli/config.ts` · `resolveLedgerPath` now throws `RepoConfigError` with `NO_LEDGER_MESSAGE` when nothing resolves · personal vault reproduced via `~/.ndr.toml` · every repo must opt in via `ndr init` before `ndr capture` works

> [!info]- Detail
> - The constant deletion is a clean break: no conditional, no env-var escape hatch.
> - `NO_LEDGER_MESSAGE` should cite `ndr init` and optionally `--ledger` as the two resolution paths.
> - The `~/.ndr.toml` pattern is documentation-only; nothing in the CLI enforces or special-cases home-dir placement.
> - Capture's draft-vault short-circuit (checking `vault_decisions` before the walk) is unchanged — only the final fallback is removed.
