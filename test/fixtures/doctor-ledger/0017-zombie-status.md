---
id: "0017"
title: Zombie status atom
status: zombie
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

# 0017 — Zombie status atom

## Decision

Seeded fault: every required field is present but `status: zombie` is not a
legal enum value. Fires schema_invalid under malformed.
