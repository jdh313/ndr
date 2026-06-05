---
id: "q618cy"
title: NDR_LEDGER env joins ledger resolution as a shell-session override
status: current
decision_date: 2026-06-07
aliases: []
project: "[[ndr]]"
derived_from:
  - "[[ndr CLI session 2026-06-07]]"
informed_by: []
supersedes:
  - "[[Decisions/jtk7fn-ndr-ledger-resolution-drops-the-built-in-vault-default-\
    flag-ndr-toml-walk-up-err]]"
superseded_by: []
area: substrate
topic: file-organization
impacts: []
revisit_triggers: []
reversibility: medium
tags:
  - decision
---

# q618cy — NDR_LEDGER env joins ledger resolution as a shell-session override

## Decision

An `NDR_LEDGER` environment variable joins the ledger resolution order between the `--ledger` flag and the `.ndr.toml` walk-up: `--ledger` flag > `NDR_LEDGER` env > (capture only) draft vault_decisions > `.ndr.toml` walk-up from CWD > error pointing at `ndr init`.

## Why

The env var covers the testing and scripting case — "run this command against that ledger" — without touching a repo's committed `.ndr.toml`.

> [!info]- Full reasoning
> A flag beats everything but must be typed per invocation. A `.ndr.toml` is committed to the repo and is wrong to mutate for temporary work. An env var sits between them: it persists for a shell session or script run without altering any file on disk. The override semantics (env beats `.ndr.toml`) match the standard Unix contract for environment overrides of config files. `resolveLedger()` in `src/cli/config.ts` is the non-throwing core, returning `{path, source}` where `source` is `flag | env | config | none`; `resolveLedgerPath()` wraps it and throws on `none`.

## Assumptions

`env-override-beats-config`

> [!warning]- env-override-beats-config
> The convention that env vars override committed config (not fall back to it) is the correct semantic for this use case.
>
> - **Current state:** active
> - **Revisit if:** a use case emerges where env-as-fallback (lower priority than `.ndr.toml`) is the right default — e.g., CI environments that want the repo config to win.

## Consequences

Two-function split in `src/cli/config.ts` · env var is a de facto public contract

> [!info]- Detail
> - `resolveLedger()` / `resolveLedgerPath()` split keeps error-throwing out of the core logic, making the resolver unit-testable without catching exceptions.
> - Documenting `NDR_LEDGER` as supported is a lightweight public contract; renaming or dropping the var later is a breaking change for any script or CI pipeline that adopts it.
