---
id: "0049"
title: "NDR references use ndr: prefix with three grains — atom-id, slug, topic"
status: current
decision_date: 2026-05-15
author: "Jacob Hoehler"
conviction: strong
project: "Decision Pipeline"
derived_from:
  - "[[Personal/Projects/Decision Pipeline — Reference Addressability]]"
informed_by: []
labels:
  - referencing
supersedes: []
superseded_by: []
---

# 0049 — NDR references use ndr: prefix with three grains — atom-id, slug, topic

## Decision

External and internal references to NDRs use a single `ndr:` prefix with three resolvable forms: `ndr:0011` (atom-id, frozen historical anchor), `ndr:#monorepo-shape` (slug, atom-grain concept that follows supersession), and `ndr:architecture/repo-shape` (topic, area-grain returning all current atoms in scope). The `/decisions` skill parses all three.

## Why

NDR references are bi-temporal: a writer may mean "the atom that justified this code" or "the decision that currently governs this code." Forcing one reference form to do both jobs is what makes ADR-NNNN refs go stale on supersession.

> [!info]- Full reasoning
> The dominant industry pattern (ADR-NNNN inline) collapses historical anchor and current governance into one identifier; supersession breaks that collapse. Atomicity (0008) creates the atom-vs-concept split, so the reference scheme has to bridge it. Three grains let the writer pick intent at write-time: id for history, slug for atom-grain governance, topic for area-grain governance. Same prefix, same resolver, same skill.

## Assumptions

`three-grain-split-is-load-bearing` · `prefix-collision-is-acceptable`

> [!warning]- three-grain-split-is-load-bearing
> Writers will use more than one form in practice — refs aren't all atom-id or all topic.
>
> - **Current state:** untested; first real test is the work-monorepo 184-ref backfill
> - **Revisit if:** triage shows the mix is overwhelmingly one form (then collapse to that form)

> [!warning]- prefix-collision-is-acceptable
> The `ndr:` prefix doesn't collide with other reference schemes in repos under management.
>
> - **Current state:** no known collisions in the work monorepo
> - **Revisit if:** a tracked project already uses `ndr:` for something else

## Consequences

- `/decisions` skill (0006) gains a reference-resolver mode in addition to topic-search.
- Code-comment convention for NDR-tracked repos: `ndr:<grain>` is the documented reference style.
- The work-monorepo 184-ref backfill becomes a triage: each ref classified as id / slug / topic.
