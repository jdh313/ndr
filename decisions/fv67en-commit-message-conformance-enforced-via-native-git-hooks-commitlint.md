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

## Why

Release-please and other Conventional-Commits-driven tooling silently ignore non-conforming commits rather than erroring, and this repo's actual history was only about 24% conformant before this decision — proof that intent alone doesn't hold under time pressure. Enforcement, not an optional authoring aid, is the piece that actually fixes that.

A commit-message *authoring* tool (`czg`, classic `commitizen` + `cz-conventional-changelog`) only helps if the maintainer chooses to run it instead of a plain `git commit -m`. Given the repo's own history already shows that choice doesn't hold — most commits used a `JUN-NNN: description` ticket-prefix style or bare imperative text, not Conventional Commits — an opt-in tool doesn't change the outcome. A hook that rejects a non-conforming message at commit time is the actual safety net.

The mechanism was chosen to add zero new toolchain weight: rather than a hook-manager package (Husky, lefthook, `bun-git-hooks`), a plain script at `.githooks/commit-msg` is checked into the repo and activated via `git config core.hooksPath .githooks`, run automatically by a `"prepare"` script that Bun executes on `bun install` — so it self-wires on any machine that clones the repo, with no new dependency beyond `commitlint` itself.

## Alternatives

czg / classic commitizen + cz-conventional-changelog (deferred, not rejected) · Husky / lefthook / bun-git-hooks (rejected) · Python commitizen (rejected for this repo)

**czg (cz-git) / commitizen:** a legitimate future addition if hand-writing Conventional Commits format becomes enough friction to want a guided prompt — but it doesn't solve the actual problem (enforcement) on its own, so it's deferred rather than included in v1. Classic `commitizen` + `cz-conventional-changelog` specifically was also noted as stale (the adapter package's last release was about 6 years ago; a community fork exists because the original lost npm publish access).

**Husky / lefthook / bun-git-hooks:** all functional, but each adds a dependency (a package, or in lefthook's case a separate Go binary) purely to install one hook, when a checked-in script plus a `core.hooksPath` git config accomplishes the same thing with nothing new to depend on.

**Python commitizen:** capable of the same enforcement, but Python-native — would require a Python runtime in this Bun/TS repo's CI/local environment for no benefit over `commitlint`.

## Consequences

Non-conforming commit messages are rejected outright at commit time, locally · `bun install` self-wires the hook via `core.hooksPath`, no manual setup step per clone · no interactive commit-writing aid yet · release-please's changelog/version-bump accuracy now depends on this hook actually running, not bypassed

- New devDependencies: `@commitlint/cli`, `@commitlint/config-conventional`. New files: `commitlint.config.js`, `.githooks/commit-msg`. New `package.json` script: `"prepare": "git config core.hooksPath .githooks"`.
- `git commit --no-verify` still bypasses the hook, as with any git hook — this is a discipline aid, not a hard guarantee.
- Revisit if enforcement proves too strict in practice (e.g. merge commits, revert commits needing special-casing) or if a commit-authoring tool gets added later.