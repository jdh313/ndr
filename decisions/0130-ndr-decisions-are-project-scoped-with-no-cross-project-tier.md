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

## Scope

- Binds: every NDR atom's project ownership — exactly one project per atom, no cross-project or shared-vs-solo tier above it.

## Commitments

- No additional abstraction layer above project is needed — the `ndr` CLI's multi-corpus support (parametrizing the decisions root) covers both vault and repo ledgers.
- Vault-default remains a reasonable configuration default for personal-machine invocations, but it is only a default corpus root, not a declaration that vault decisions are a different category.

## Revisit if

- A real cross-project decision surfaces and the ad-hoc response (pick a primary, link from the other) feels like a structural workaround rather than a reasonable call.
- A cross-project decision is captured as single-project and the misclassification is only discovered post-hoc, suggesting the trigger isn't firing early enough.

## Context

- The earlier framing from the mull was "vault-default for solo, per-repo for collab", which introduced an implicit solo-vs-shared axis above the project axis.
- At current scale (one person, a handful of work repos), every decision has a natural primary owner.
- No cross-project decision had surfaced in the existing 125-atom corpus.
- The frontmatter schema's `project:` field already points to a single wikilink.
- The `ndr` CLI already supports parametrizing the decisions/corpus root.

## Why

The simpler one-tier model covers every real case today, so a cross-project tier is YAGNI. The earlier "solo vs. shared" framing is correct as an observation but wrong as a structural tier — vault and repo are both "a git directory of markdown," and which root the CLI uses is a config/CWD concern, not a category distinction in the schema. "Cross-project decision" as a first-class concept would anticipate a need that hasn't materialized; if a work team convention genuinely needs cross-repo visibility, the right response is to handle it then — either by picking a canonical repo as the ledger, or by revisiting this decision with a concrete example in hand.
