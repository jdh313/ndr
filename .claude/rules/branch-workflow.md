---
description: Branch workflow — single release lane on main; never commit directly to main; feature branches root on main and merge back via PR.
---

# Branch workflow

Single release lane. `main` is the only long-lived branch and the only release
branch: one release-please instance (`release-please-config.json`,
`.release-please-manifest.json`, `CHANGELOG.md`) cuts every release from it.

### Rules

- **Never commit or push directly to `main`.** All work lands on a feature
  branch rooted on `main` that merges back into `main` via PR. The only
  commits `main` receives are those merges and release-please's own Release-PR
  merges. This rule is load-bearing — see below.
- **Releases cut from `main`** — merge the Release PR release-please opens
  there; that publishes the tag and the binary matrix.
- **Release PRs need no manual recompile.** The release-please config carries
  `json` `extra-files` entries for the four compiled plugin `version` fields,
  so the Release PR arrives already passing the `marketplace` drift gate. If it
  fails that gate, the updaters have drifted from the compiler — fix the
  config, do not push a recompile commit onto the release branch
  (release-please force-pushes it on the next sync and the commit is lost).

### Why this exists

Divergence has bitten this repo: the same CI patch was committed to both `main`
and a second long-lived branch as sibling commits, so neither branch contained
the other (patch-identical, different SHAs). Recovery meant linearizing the
second branch back onto `origin/main` and force-pushing.

Two guards have since been retired. The original one was a strict
fast-forward-only invariant, traded away for per-branch release automation. Its
replacement pair — merge-only commits on `main` plus a mandatory post-stable
back-merge — lost its second half when the beta lane was retired: with one
branch there is nothing to back-merge.

That leaves **merge-only commits on `main`** carrying the whole guard, which is
why it is stated first and why it survives the collapse to a single lane. A
sibling-commit divergence needs two branches receiving the same patch
independently; only one branch is long-lived now, and nothing is committed to
it directly. Reintroducing a second long-lived branch means reintroducing a
reconciliation rule alongside it.
