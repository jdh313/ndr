---
id: "c5jpyv"
title: The .ndr.toml `project` key is required, mirroring the atom schema
status: current
decision_date: 2026-07-11
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - substrate
  - file-organization
binds:
  - src/cli/config.ts
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - "0130"
  - q618cy
---

# c5jpyv — The .ndr.toml `project` key is required, mirroring the atom schema

## Decision

`parseRepoConfig` requires a non-empty `project` in `.ndr.toml`; a config missing or
emptying the key is broken and fails loudly rather than resolving projectless. This
matches the atom frontmatter schema, which already requires a non-empty `project` on
every atom.

## Scope

- Binds: config parsing (`src/cli/config.ts`) — the `.ndr.toml` surface only.
- Does not bind: capture-time project provenance. A captured atom's `project` still
  comes from the draft frontmatter, never from this config key — that decoupling is
  unchanged and remains unowned.

## Commitments

- `ndr status` must never crash on a now-broken (projectless) config — it degrades to
  ledger source `none` (vy8yvk); the resolution path is guarded to honor that.
- Pre-existing `.ndr.toml` files without `project` become broken and fail loudly on any
  resolution path; adopters add the key or regenerate via `ndr init`.

## Revisit if

- A legitimate projectless-config use case emerges — a ledger whose atoms genuinely
  carry no single project owner.

## Context

- The atom frontmatter schema requires a non-empty `project` on every atom (ndr:0130 —
  every atom has exactly one project owner).
- The config parser made `project` optional, so the config schema permitted a state the
  atom schema forbids.
- `ndr init` always writes a `project` (defaulting to the directory name), so the gap
  was reachable only via a hand-written or pre-existing config.
- `ndr status`'s ledger resolution was unguarded against a broken config and crashed
  rather than reporting.

## Why

The config schema and the atom schema disagreed on whether `project` is mandatory — the
config permitted a projectless state the atom layer rejects at write time. Requiring
`project` at parse makes the two layers agree, and fails a misconfigured repo loudly
(consistent with the present-but-broken-config philosophy) rather than silently
resolving a config the write path cannot honor. The scenarios this must serve — a shared
ledger holding many projects, a monorepo with multiple projects — all lean on `project`
being present; none needs a projectless config. Guarding `status`'s resolution completes
an existing intent (`findRepoConfigSafe` already guarded one call site, not the other) so
the command run to diagnose the failure does not itself crash.

## Alternatives

- **Keep `project` optional** — rejected: leaves the config and atom schemas
  contradictory and lets a repo resolve a config whose `project` the atom layer will
  demand anyway.
- **Wire capture to derive `project` from the resolved config** — deferred: would close
  the deeper gap (atom `project` is drafter-supplied, not config-sourced) but changes
  capture semantics and risks the CI/scripting ledger-override case; a separate decision.
