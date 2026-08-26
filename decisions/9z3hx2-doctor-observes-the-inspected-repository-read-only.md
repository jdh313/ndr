---
id: "9z3hx2"
title: Doctor observes the inspected repository read-only
status: current
decision_date: 2026-08-26
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - tooling
  - discipline
binds:
  - src/cli/index.ts
supersedes: []
superseded_by: []
derived_from:
  - https://github.com/jdh313/ndr/issues/20
  - https://github.com/jdh313/ndr/pull/36
informed_by:
  - "0152"
---

# 9z3hx2 — Doctor observes the inspected repository read-only

## Decision

`ndr doctor` never mutates the repository it inspects. Every VCS invocation it
makes to build a file inventory must be read-only — no working-copy snapshot,
no commit, no new entry in the jj oplog.

## Scope

- Binds: any command that shells out to a VCS to observe the state of the governed repository.
- Does not bind: writes to the ledger itself, which `ndr capture` and the other write verbs perform by design.

## Commitments

- Every VCS invocation added to an observing command carries the burden of proving it does not write. git's read verbs and jj's are not interchangeable in this respect: jj snapshots by default and git does not.
- The inventory reflects the last recorded snapshot rather than live disk, so a file written and never snapshotted is invisible to the binds check.
- jj must be invoked with `--ignore-working-copy`, which forecloses ever observing uncommitted working-copy state in a jj repository.

## Revisit if

- jj gains a read-only enumeration that reflects live disk without writing.
- A doctor check genuinely requires working-tree state rather than tracked state.

## Context

- The binds check needs an inventory of tracked files in the governed repository.
- `git ls-files` is cwd-scoped, and inside a jj workspace with no git index of its own it exits 0 while printing nothing.
- An empty enumeration was indistinguishable from a repository containing no matching file, so every bind glob failed at once.
- `jj file list` takes a working-copy snapshot before answering, and a snapshot writes a commit.
- Commits in this repository are SSH-signed through an agent, so that write fails outright whenever the agent is locked.

## Why

A command whose entire purpose is to report on a repository must not change
that repository. The cost is not hypothetical: a health check that writes can
fail on the write, and then reports nothing about health at all — which is
exactly what happened, since a signed commit through a locked agent aborts the
enumeration before any finding is produced. Making the read-only property a
rule rather than an incidental property of the current invocation is what keeps
the next VCS integration from reintroducing it, because the failure is silent
in the direction that matters: the writing form works fine on the machine of
whoever adds it.

The trade-off accepted is that the inventory is a view of the last snapshot
rather than of live disk. That is parity with the source it sits beside —
`git ls-files` reads the index, so a never-tracked file is absent from both —
and it costs nothing a binds check needs, since binds govern tracked paths.

## Alternatives

- **Accept jj's snapshotting default** — verdict: fatal. It makes an observing command a writing one, and the write fails under signed commits, taking the whole health report down with it.
- **Drop jj and enumerate with git alone** — verdict: fatal for the case that prompted the decision. git cannot answer in a jj workspace at all, so the binds class would be permanently skipped exactly where the bug was reported.
