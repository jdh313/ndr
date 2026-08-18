---
id: "r8ceg6"
title: The marketplace drift gate runs on same-repo PRs only
status: superseded
decision_date: 2026-08-17
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - ci-strategy
  - deployment
binds:
  - .github/workflows/ci.yml
supersedes: []
superseded_by:
  - 4b95td
derived_from: []
informed_by:
  - 0yb8xb
---

# r8ceg6 — The marketplace drift gate runs on same-repo PRs only

## Decision

The `marketplace` job in CI is guarded by
`if: github.event.pull_request.head.repo.full_name == github.repository`, so the
recompile-and-compare gate runs on same-repo pull requests and is skipped on fork
pull requests. Drift on a fork PR is caught by human review instead.

## Scope

- Binds: which pull requests the marketplace drift gate executes for.
- Does not bind: the `ci` job (tests, lint, typecheck, build), which runs on every
  pull request including forks.

## Commitments

- A fork PR touching `plugins/` reaches review with `marketplaces/` unverified; the
  maintainer recompiles locally before merging it.
- The carve-out is removed, not maintained: when the compiler stops being private,
  the `if:` guard is deleted so the gate covers every PR again.
- Contributor-facing docs must say not to hand-edit `marketplaces/` while the gate
  cannot enforce it on their PRs.

## Revisit if

- `jdh313/agentforge` becomes public.
- The compiler is vendored into this repo or published as a package, removing the
  private checkout.
- A fork PR lands `marketplaces/` drift that human review misses.

## Context

- Making this repo public was under consideration, which introduces fork pull
  requests as a category CI must handle.
- The gate compiles through `jdh313/agentforge`, which is private, checked out with
  `secrets.AGENTFORGE_DEPLOY_KEY`.
- GitHub withholds secrets from `pull_request` runs originating in a fork, so the
  job's fail-closed deploy-key assertion fails there.
- That failure is unfixable by the contributor who triggers it, and reads as a
  broken repo rather than a policy boundary.
- The workflow triggers on `pull_request`, not `pull_request_target`, so fork code
  never executes with the deploy key — the exposure risk is already absent.
- The deploy key is shared with cc-marketplace's CI, so anything touching it has
  blast radius beyond this repo.

## Why

A red check nobody can turn green is worse than an absent check: it trains
contributors and maintainer alike to ignore CI status, which costs more than the
narrow verification being skipped. The gate's value is also asymmetric by
population — nearly every commit that touches `plugins/` is the maintainer's, and
those still run the gate, so skipping forks forfeits little coverage while
removing a guaranteed-failing step. Making the guard's removal condition explicit
in the workflow comment keeps it from calcifying into permanent policy, which is
the real hazard of a stopgap. The alternative fixes both address the root cause
rather than the symptom, and are preferred once their prerequisite work is done;
this buys the ability to go public without blocking on that work.

## Alternatives

- **Make `jdh313/agentforge` public** — deferred: the correct end state and the
  reason this atom is tentative, but it needs its own secrets-and-history audit
  plus retiring the deploy key in two repos first.
- **Vendor the compiler or publish it as a package** — deferred: removes the
  private dependency entirely and dissolves the shared-deploy-key coupling, at a
  cost well above the guard it replaces.
- **Leave the job failing on fork PRs** — rejected: an unfixable red check on every
  outside contribution.
- **Drop the marketplace gate entirely** — rejected: it is the only thing standing
  between a hand-edit under `marketplaces/` and `main` (0yb8xb).
