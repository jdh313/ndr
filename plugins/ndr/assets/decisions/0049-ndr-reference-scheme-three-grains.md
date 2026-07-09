---
id: "0049"
title: "NDR references use ndr: prefix with three grains — atom-id, slug, topic"
status: current
decision_date: 2026-05-15
author: Jacob Hoehler
conviction: tentative
project: Decision Pipeline
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

External and internal references to NDRs use a single `ndr:` prefix with three resolvable forms: `ndr:0011` (atom-id, frozen historical anchor), `ndr:#monorepo-shape` (slug, atom-grain concept that follows supersession), and `ndr:architecture/repo-shape` (topic, area-grain returning all current atoms in scope). The `/decisions` skill parses all three.

## Commitments

- `/decisions` skill (0006) gains a reference-resolver mode in addition to topic-search.
- Code-comment convention for NDR-tracked repos: `ndr:<grain>` is the documented reference style.
- The work-monorepo 184-ref backfill becomes a triage: each ref classified as id / slug / topic.

## Revisit if

- Triage shows the mix of reference forms in practice is overwhelmingly one form (then collapse to that form).
- A tracked project already uses `ndr:` for something else.

## Context

- NDR references are bi-temporal — a writer may mean "the atom that justified this code" or "the decision that currently governs this code."
- The dominant industry pattern (ADR-NNNN inline) collapses historical anchor and current governance into one identifier; supersession breaks that collapse.
- Atomicity (0008) creates an atom-vs-concept split that any reference scheme has to bridge.

## Why

Forcing one reference form to do both jobs (historical anchor vs. current governance) is what makes ADR-NNNN-style refs go stale on supersession. Three grains let the writer pick intent at write-time: id for history, slug for atom-grain governance, topic for area-grain governance — same prefix, same resolver, same skill.
