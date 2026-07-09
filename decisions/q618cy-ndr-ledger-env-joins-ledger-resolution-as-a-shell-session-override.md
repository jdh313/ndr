---
id: "q618cy"
title: NDR_LEDGER env joins ledger resolution as a shell-session override
status: current
decision_date: 2026-06-07
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - substrate
  - file-organization
binds: []
supersedes:
  - jtk7fn
superseded_by: []
derived_from:
  - ndr CLI session 2026-06-07
informed_by: []
---

# q618cy — NDR_LEDGER env joins ledger resolution as a shell-session override

## Decision

An `NDR_LEDGER` environment variable joins the ledger resolution order between the `--ledger` flag and the `.ndr.toml` walk-up: `--ledger` flag > `NDR_LEDGER` env > (capture only) draft vault_decisions > `.ndr.toml` walk-up from CWD > error pointing at `ndr init`.

## Commitments

- The `resolveLedger()` / `resolveLedgerPath()` split keeps error-throwing out of the core logic, making the resolver unit-testable without catching exceptions.
- Documenting `NDR_LEDGER` as supported is a lightweight public contract; renaming or dropping the var later is a breaking change for any script or CI pipeline that adopts it.

## Revisit if

- A use case emerges where env-as-fallback (lower priority than `.ndr.toml`) is the right default — e.g., CI environments that want the repo config to win.

## Context

- A flag beats everything but must be typed per invocation.
- A `.ndr.toml` is committed to the repo and is wrong to mutate for temporary work.
- The testing/scripting case ("run this command against that ledger") needs an override that doesn't touch a repo's committed config.
- The standard Unix contract has environment variables override committed config files.

## Why

An env var sits between the flag and `.ndr.toml`: it persists for a shell session or script run without altering any file on disk, covering the testing/scripting case without touching a repo's committed config. The override semantics (env beats `.ndr.toml`) match the standard Unix contract for environment overrides of config files. `resolveLedger()` in `src/cli/config.ts` is the non-throwing core, returning `{path, source}` where `source` is `flag | env | config | none`; `resolveLedgerPath()` wraps it and throws on `none`.
