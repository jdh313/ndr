---
description: Branch workflow — dev is only ever ahead of main; never commit or push directly to main.
---

# Branch workflow

`dev` is the integration branch; `main` is the release branch. The invariant
is **`dev` is only ever ahead of `main`, never divergent** — `main` must always
be a strict ancestor of `dev`.

### Rules

- **Never commit or push directly to `main`.** Land all work on `dev` (or a
  feature branch that merges into `dev`), then advance `main` from `dev`.
- Move `main` forward by **fast-forward only** (`git merge --ff-only dev`, or a
  PR that fast-forwards). If `main` cannot fast-forward from `dev`, something was
  committed to `main` directly — stop and reconcile, do not force it.
- Keep feature branches rooted on `dev` and merge them back into `dev`.

### Why this exists

Divergence has bitten this repo: the same CI patch was committed to both `main`
and `dev` as sibling commits, so neither branch contained the other (patch-
identical, different SHAs). Recovering meant linearizing `dev` back onto
`origin/main` and force-pushing `dev`. Committing only to `dev` and advancing
`main` by fast-forward makes that failure mode impossible.
