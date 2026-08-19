---
id: "4b95td"
title: The marketplace drift gate runs on every PR, forks included
status: current
decision_date: 2026-08-18
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - ci-strategy
  - deployment
binds:
  - .github/workflows/ci.yml
supersedes:
  - r8ceg6
superseded_by: []
derived_from: []
informed_by:
  - 0yb8xb
---

# 4b95td — The marketplace drift gate runs on every PR, forks included

## Decision

The `marketplace` job checks out the pinned AgentForge compiler with the default
`GITHUB_TOKEN` and carries no `if:` guard, so the recompile-and-compare gate runs
on every pull request, fork PRs included.

## Scope

- Binds: which pull requests the marketplace drift gate executes for, and how CI
  authenticates the pinned-compiler checkout.
- Does not bind: the compiler pin itself — `AGENTFORGE_REF` still names an exact
  commit, and bumping it stays a deliberate edit.

## Commitments

- CI's read access to the compiler now depends on `jdh313/agentforge` staying
  public; taking it private again breaks the gate in this repo and in
  cc-marketplace, and would require restoring a credential in both.
- Fork PRs execute the gate under `pull_request`, so the job must never gain a
  step that needs a secret — that would reintroduce the unfixable red check.
- Retiring `AGENTFORGE_DEPLOY_KEY` is finished work, not optional cleanup: the
  secret is deleted from both repos and the deploy key removed from
  `jdh313/agentforge` once both workflow changes have merged.

## Revisit if

- `jdh313/agentforge` goes private again, or moves to an org where the default
  `GITHUB_TOKEN` cannot read it.
- The gate needs a step that requires a secret.
- The compiler is vendored or published as a package, removing the cross-repo
  checkout entirely.

## Context

- `jdh313/agentforge` became public on 2026-08-18.
- `actions/checkout` reads a public repository with the default `GITHUB_TOKEN`,
  which is available to fork `pull_request` runs.
- The prior carve-out existed solely because GitHub withholds secrets from fork
  runs, which made the job's fail-closed deploy-key assertion unfixable by an
  outside contributor.
- `AGENTFORGE_DEPLOY_KEY` was shared with cc-marketplace's CI, so the credential
  could only be retired once both repos stopped using it.
- The gate is the only automated barrier between a hand-edit under
  `marketplaces/` and `main` (0yb8xb).

## Why

The predecessor named this exact change as its removal condition, and left the
carve-out tentative precisely so it would not calcify — honoring that now costs
one commit and restores full coverage. Removing the credential is what makes the
change worth more than deleting an `if:`: a fail-closed secret check is a
permanent source of environment-dependent failures, and a shared deploy key
coupled two repos' CI to one revocation. Dropping both leaves a job whose only
inputs are public, which is why the conviction is strong where the predecessor's
was tentative — there is no longer a tradeoff being managed, just a dependency
that got simpler.

## Alternatives

- **Keep the `if:` guard and just drop the secret** — rejected: the guard's whole
  justification was secret unavailability on forks; keeping it would forfeit fork
  coverage for no remaining reason.
- **Keep the deploy key for a public repo** — rejected: an unnecessary credential
  with cross-repo blast radius and no compensating benefit.
- **Vendor the compiler or publish it as a package** — deferred: still dissolves
  the cross-repo checkout, but the public-repo checkout removes the pressure that
  made it worth its cost.
