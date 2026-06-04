---
id: "0011"
title: Stale slug successor
status: current
decision_date: '2026-06-02'
aliases:
  - ndr-stale-slug
project: '[[Doctor Fixture]]'
supersedes:
  - '[[Decisions/0010-stale-slug-predecessor]]'
superseded_by: []
area: tooling
topic: framework
reversibility: medium
tags:
  - decision
---

# 0011 — Stale slug successor

## Decision

Current holder of `ndr-stale-slug`; its predecessor 0010 still holds the slug
too. The pair fires stale_alias_on_superseded (flag only — alias handover is
the supersession primitive's job, never auto-fixed).
