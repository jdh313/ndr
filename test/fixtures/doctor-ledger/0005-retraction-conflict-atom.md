---
id: "0005"
title: Retraction conflict atom
status: retracted
decision_date: '2026-06-01'
aliases: []
project: '[[Doctor Fixture]]'
supersedes: []
superseded_by:
  - '[[Decisions/0003-claiming-successor]]'
area: tooling
topic: framework
reversibility: medium
tags:
  - decision
---

# 0005 — Retraction conflict atom

## Decision

Seeded fault: status is `retracted` but superseded_by names 0003. Fires
retraction_conflict — if a successor exists, status should be `superseded`.
