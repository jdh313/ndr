---
id: "0049"
title: "NDR references use ndr: prefix with three grains — atom-id, slug, topic"
status: current
decision_date: 2026-05-15
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - referencing
  - meta-chain
binds: []
supersedes: []
superseded_by: []
derived_from:
  - Personal/Projects/Decision Pipeline — Reference Addressability
informed_by:
  - "0006"
  - "0008"
---

# 0049 — NDR references use ndr: prefix with three grains — atom-id, slug, topic

## Decision

External and internal references to NDRs use a single `ndr:` prefix with three resolvable forms: `ndr:0011` (atom-id, frozen historical anchor), `ndr:#monorepo-shape` (slug, atom-grain concept that follows supersession), and `ndr:architecture/repo-shape` (topic, area-grain returning all current atoms in scope).

## Commitments

- The `/decisions` skill (0006) parses all three grains and gains a reference-resolver mode in addition to topic-search.
- Code-comment convention for NDR-tracked repos: `ndr:<grain>` is the documented reference style.
- The Wayfinder 184-ref backfill becomes a triage: each ref classified as id / slug / topic.

## Revisit if

- Triage of the Wayfinder 184-ref backfill shows the reference-form mix is overwhelmingly one form (then collapse to that form).
- A tracked project already uses `ndr:` for something else (prefix collision).

## Context

- NDR references are bi-temporal: a writer may mean "the atom that justified this code" or "the decision that currently governs this code."
- The dominant industry pattern (ADR-NNNN inline) collapses historical anchor and current governance into one identifier; supersession breaks that collapse.
- Forcing one reference form to do both jobs is what makes ADR-NNNN refs go stale on supersession.

## Why

Atomicity (0008) creates the atom-vs-concept split, so the reference scheme has to bridge it. Three grains let the writer pick intent at write-time: id for history, slug for atom-grain governance, topic for area-grain governance — same prefix, same resolver, same skill.
