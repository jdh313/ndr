---
id: "0002"
title: Fixable predecessor
status: superseded
decision_date: '2026-06-01'
aliases: []
project: '[[Doctor Fixture]]'
supersedes: []
superseded_by: []
area: tooling
topic: framework
reversibility: medium
tags:
  - decision
---

# 0002 — Fixable predecessor

## Decision

Seeded fault: 0003 claims to supersede this atom, but the superseded_by
back-link was lost. Fires missing_back_pointer (repairable with --fix) and
dangling_superseded; both must clear after the repair.
