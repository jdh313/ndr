---
id: "tx3w7j"
title: Accept the orphaned pre-rewrite commits on GitHub; no further history rewrite
status: current
decision_date: 2026-08-18
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - process
  - repo-shape
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by: []
---

# tx3w7j — Accept the orphaned pre-rewrite commits on GitHub; no further history rewrite

## Decision

The pre-rewrite commit history that GitHub still serves through closed pull-request refs is left in place. No further metadata rewrite of the branches and no GitHub Support removal request are made; the current history, including the committer email stamped by the 2026-08-17 rewrite, is the final published one.

## Scope

- Binds: the git history of `main`, `dev`, and the release tags as published to GitHub.
- Does not bind: future content-level scrubs done as ordinary forward commits.

## Commitments

- The two author emails present in the orphaned commits stay reachable by anyone who knows a SHA or fetches `refs/pull/8/head`; nothing in the repo may be described as having removed them.
- Any future rewrite of published history must be treated as creating a new orphaned line, not as replacing the old one.

## Revisit if

- GitHub garbage-collects unreachable PR refs on its own, making a clean purge possible without Support.
- One of the exposed addresses becomes a concrete problem (harassment, an employer request), which would justify the Support request despite the cost.

## Context

- History was rewritten on 2026-08-17 to change author metadata; every rewritten commit is tree-identical to its original.
- GitHub keeps the original commits reachable through the closed release-please PR ref (`refs/pull/8/head`); the API still returns them by SHA.
- The rewrite itself stamped the rewriting machine's committer email on 73 current commits, so the same address the rewrite tried to remove from an author field is present as a committer field on the published branches.
- Users cannot delete PR refs; only a GitHub Support request can purge unreachable objects.
- The `ndr-v1.0.0-beta` tag was moved from a duplicate parallel line onto the tree-identical commit in `dev`'s ancestry before publishing.

## Why

Another metadata-only rewrite would not remove anything: the objects it tried to hide would remain reachable through the same PR refs, and it would add a third orphaned line while forcing every clone and the release tags to be re-pointed again. The Support route is the only real purge, and once the addresses are accepted as public the request buys nothing. Stopping here keeps the published history stable — a property that matters more for a freshly public repository than a partial scrub that cannot be completed.

## Alternatives

- **Rewrite the committer field and force-push again** — rejected: metadata-only, tree-identical, and the originals stay reachable; net effect is one more orphaned history.
- **File a GitHub Support removal request for the orphaned SHAs** — deferred: the only effective purge, kept in reserve for the case where an exposed address becomes a concrete problem.
