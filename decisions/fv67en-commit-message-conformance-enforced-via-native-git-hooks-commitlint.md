---
id: "fv67en"
title: Commit-message conformance enforced via native git hooks + commitlint
status: current
decision_date: 2026-07-08
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - commit-convention
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - 68gar5
---

# fv67en — Commit-message conformance enforced via native git hooks + commitlint

## Decision

Conventional Commits format is enforced on every commit via a `commit-msg` git hook running `commitlint` (`@commitlint/config-conventional`), wired through a committed `.githooks/commit-msg` script and `core.hooksPath`, set automatically by a `"prepare"` script on `bun install`. No commit-authoring tool (`czg`, `commitizen`) is included in v1 — the hook only validates, it doesn't help write the message.

## Commitments

- New devDependencies: `@commitlint/cli`, `@commitlint/config-conventional`; new files `commitlint.config.js`, `.githooks/commit-msg`; new `package.json` script `"prepare": "git config core.hooksPath .githooks"`.
- `bun install` self-wires the hook via `core.hooksPath` — no manual setup step per clone.
- `git commit --no-verify` still bypasses the hook, as with any git hook — this is a discipline aid, not a hard guarantee.
- Release-please's changelog/version-bump accuracy now depends on this hook actually running, not bypassed.
- No interactive commit-writing aid is included yet.

## Revisit if

- Enforcement proves too strict in practice (e.g. merge commits, revert commits needing special-casing).
- A commit-authoring tool gets added later.

## Context

- Release-please and other Conventional-Commits-driven tooling silently ignore non-conforming commits rather than erroring.
- This repo's actual history was only about 24% conformant before this decision — most commits used a `JUN-NNN: description` ticket-prefix style or bare imperative text, not Conventional Commits.
- A commit-message authoring tool only helps if the maintainer chooses to run it instead of a plain `git commit -m`; the repo's own history shows that choice doesn't reliably hold.

## Why

Intent alone doesn't hold under time pressure, proven by the repo's own 24% conformance rate — enforcement, not an optional authoring aid, is the piece that actually fixes non-conformance. A hook that rejects a non-conforming message at commit time is the actual safety net, where an opt-in authoring tool is not. The mechanism was chosen to add zero new toolchain weight: rather than a hook-manager package (Husky, lefthook, `bun-git-hooks`), a plain script at `.githooks/commit-msg` is checked into the repo and activated via `git config core.hooksPath .githooks`, run automatically by a `"prepare"` script that Bun executes on `bun install` — so it self-wires on any machine that clones the repo, with no new dependency beyond `commitlint` itself.

## Alternatives

- **czg (cz-git) / classic commitizen + cz-conventional-changelog** — deferred: a legitimate future addition if hand-writing Conventional Commits format becomes enough friction to want a guided prompt, but it doesn't solve the actual problem (enforcement) on its own. Classic commitizen specifically is also stale — the adapter package's last release was about 6 years ago, with a community fork existing because the original lost npm publish access.
- **Husky / lefthook / bun-git-hooks** — rejected: each adds a dependency (a package, or in lefthook's case a separate Go binary) purely to install one hook, when a checked-in script plus a `core.hooksPath` git config accomplishes the same thing with nothing new to depend on.
- **Python commitizen** — rejected for this repo: capable of the same enforcement, but Python-native — would require a Python runtime in this Bun/TS repo's CI/local environment for no benefit over `commitlint`.