---
# No `id:` field. `ndr capture` mints the atom-id on persist; a draft that emits
# an `id` (even a placeholder string) is rejected at validation. Omit it.
title: "Short imperative phrase"
status: current             # current | superseded | retracted
decision_date: YYYY-MM-DD
# author: omit — `ndr capture` auto-fills from `git config user.name`.
conviction: tentative       # strong | tentative | arbitrary. Required, no default.

project: ndr                # plain string naming the project

labels:                     # 1-4 values from <ledger>/.taxonomy/labels.yaml
  - TODO
binds: []                   # optional; repo-relative glob patterns this decision governs

supersedes: []              # plain atom ids, e.g. ["0072"]. Present even when empty.
superseded_by: []
derived_from: []            # free-form refs: PR URL, transcript path, mull note
informed_by: []             # plain atom ids; no supersession semantics
---

# PLACEHOLDER — Short imperative phrase

<!-- The H1 stays literally `# PLACEHOLDER — <title>`. `ndr capture` patches the
     `# PLACEHOLDER —` sentinel into `# <minted-id> — <title>` on persist. Do not
     inline the title or an id into the heading yourself. -->

## Decision

One paragraph, 1-3 sentences (<= ~60 words), prose. States what is now true.
No rationale (that is Why), no situation (that is Context). Never a bullet list —
a bulleted Decision is usually several atoms in a trenchcoat.

## Scope

Optional. Bullets. The semantic boundary a glob can't express — negative scope,
conditional applicability, layer-shaped boundaries. Omit when scope is fully
implied by labels.

- Binds: <where it applies>
- Does not bind: <explicit exclusion>

## Commitments

Optional. Bullets. One bullet per obligation the decision creates — an invariant
to maintain, a coupling introduced, a recurring cost, an option foreclosed.
Never restates what the decision does — only what it demands.

## Revisit if

Optional. Bullets. Pure flip conditions, one per bullet. No restated beliefs, no
rationale. Replaces the old Assumptions section and the `revisit_triggers:` field.

## Context

Required. Bullets. The pre-decision world: what was true, broken, or newly
constrained. May NOT name the chosen option. One fact per bullet — gives
drift-audit a per-fact staleness check. A thin atom may carry a single bullet,
but the section is required.

## Why

Required. Prose, roomy. The weighing — not just the reasons but what tipped the
call. Ordered most-load-bearing-first. May NOT introduce new facts about the
situation (those are Context). An argument against a specific alternative belongs
in Alternatives.

## Alternatives

Optional. Bullets, one per alternative: `**name** — verdict: fatal reason`.
Verdict is one of rejected / deferred / preserved-elsewhere. A bullet may take a
follow-on paragraph when genuinely needed; default is the one-liner. Omit if
there were no meaningful alternatives.
