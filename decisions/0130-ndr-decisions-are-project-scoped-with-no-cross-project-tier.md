---
id: "0130"
title: NDR decisions are project-scoped with no cross-project tier
status: current
decision_date: 2026-06-01
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - substrate
  - file-organization
binds: []
supersedes: []
superseded_by: []
derived_from:
  - Mulling/2026-05-31_ndr-shape-and-storage
informed_by: []
---

# 0130 — NDR decisions are project-scoped with no cross-project tier

## Decision

Every NDR atom has exactly one project owner. A ledger lives at the project root — vault for personal/life/meta projects, a repo for code projects. No cross-project or shared-vs-solo tier exists above project.

## Why

The simpler one-tier model covers every real case today; a cross-project tier is YAGNI.

The earlier framing from the mull — "vault-default for solo, per-repo for collab" — introduced an implicit axis (solo vs. shared) above the project axis. That framing is correct as an observation but wrong as a structural tier.

The cleaner model collapses it: vault and repo are both "a git directory of markdown." The `ndr` CLI accepts a corpus root; which root it uses is a config/CWD concern, not a category distinction in the schema. Personal projects use the vault as their ledger. Code projects use the repo. Both are ledgers; neither is special.

"Cross-project decision" as a first-class concept anticipates a need that hasn't materialized. At current scale (one person, a handful of work repos), every decision has a natural primary owner. If a work team convention genuinely needs visibility across multiple repos, the right response is to handle it then — either by picking a canonical repo as the ledger, or by revisiting this decision with a concrete example in hand.

## Assumptions

`cross-project-decisions-stay-rare` · `revisit-trigger-will-fire-clearly`

Cross-project decisions — where a single atom genuinely belongs to two or more projects with no obvious primary owner — remain rare enough that handling them ad-hoc is lower cost than building infrastructure for them.

- **Current state:** active — no cross-project decision has surfaced in the existing 125-atom corpus
- **Revisit if:** A real cross-project decision surfaces and the ad-hoc response (pick a primary, link from the other) feels like a structural workaround rather than a reasonable call

When a genuinely cross-project decision appears, it will be recognizable as such — not silently misclassified as single-project.

- **Current state:** active — the trigger conditions in `revisit_triggers` are concrete (specific work scenario, specific personal scenario)
- **Revisit if:** A cross-project decision is captured as single-project and the misclassification is only discovered post-hoc, suggesting the trigger isn't firing early enough

## Consequences

No schema changes needed · `ndr` CLI accepts corpus root as config/CWD · Vault is one ledger among many, not a privileged tier

- The frontmatter schema is unchanged — `project:` already points to one wikilink. This decision ratifies that single-project constraint as intentional, not a limitation to work around.
- The `ndr` CLI's multi-corpus support (parametrize the decisions root) is sufficient for both vault and repo ledgers; no additional abstraction layer is needed.
- "Vault-default" as a configuration default for personal-machine invocations is still reasonable — but it is a default corpus root, not a declaration that vault decisions are a different category.
