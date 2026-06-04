---
id: "0007"
title: Dangling superseded-by atom
status: superseded
decision_date: '2026-06-01'
aliases: []
project: '[[Doctor Fixture]]'
supersedes: []
superseded_by:
  - '[[Decisions/8888-also-gone]]'
area: tooling
topic: framework
reversibility: medium
tags:
  - decision
---

# 0007 — Dangling superseded-by atom

## Decision

Seeded fault: superseded_by names 8888, which does not exist in the ledger.
Fires dangling_superseded_by_ref (orphan supersession).
