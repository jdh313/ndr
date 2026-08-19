---
id: "e5jfz1"
title: Protect main and dev with PR-plus-checks rules, admins exempt
status: current
decision_date: 2026-08-18
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - ci-strategy
  - process
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - 5na05k
  - 4b95td
---

# e5jfz1 — Protect main and dev with PR-plus-checks rules, admins exempt

## Decision

Both release branches carry GitHub branch protection: changes land only through a pull request whose `ci` and `marketplace` checks pass, force-pushes and deletions are blocked, and zero approving reviews are required. Repository admins are exempt from the PR requirement.

## Scope

- Binds: the GitHub repository settings for `main` and `dev`.
- Does not bind: feature branches, release-please's own working branches, or the CI workflow definitions themselves.

## Commitments

- The required check names are the CI job ids `ci` and `marketplace`; renaming either job silently blocks every merge until the protection rule is updated.
- The post-stable `main -> dev` back-merge and manifest resyncs keep working only because the admin exemption exists — the branch-workflow rule, not GitHub, is what stops the admin from pushing sibling patches to `main`.
- Outside contributors cannot bypass the gate; a second maintainer with admin rights would inherit the exemption and the rule-based discipline that goes with it.

## Revisit if

- A second maintainer joins and the convention-only guard on admin pushes becomes too thin.
- GitHub rulesets or a merge queue offer the same gate without an admin exemption on the free tier.
- Fork PRs regularly fail one of the required checks for reasons unrelated to the change.

## Context

- The repository became public on 2026-08-18; until then branch protection was unavailable on the private free-tier repository.
- The branch-workflow rule already forbids direct commits to `main` and prescribes `dev -> main` PRs plus a mandatory `main -> dev` back-merge, enforced by convention only.
- The maintainer is a single person who also merges the release-please Release PRs and performs the back-merges directly.
- CI runs the `ci` job (test, lint, format, typecheck, compile smoke) and the `marketplace` job (pinned-compiler drift gate) on every PR, forks included.

## Why

Once the repository is public, anyone can open a PR and any leaked token could push; requiring a PR with the two existing checks turns the convention into an enforced gate at zero new infrastructure. Zero required approvals and the admin exemption are the price of staying a one-person project: requiring approvals would leave the maintainer unable to merge their own work, and enforcing the rule on admins would break the back-merge and manifest-resync steps that the two-lane release model needs. Blocking force-pushes is the one hard guarantee that matters most after a history rewrite — the branches cannot be silently rewritten again.

## Alternatives

- **No protection, rely on the branch-workflow rule alone** — rejected: the rule binds agents and the maintainer, not outside contributors or stolen credentials.
- **Enforce the rule on admins too** — rejected: the `main -> dev` back-merge and dev-manifest resync would need a PR for every routine step, and release-please's flow assumes the maintainer can push those.
- **Require one approving review** — rejected: a solo maintainer cannot approve their own PRs; it would freeze the project until a second maintainer exists.
