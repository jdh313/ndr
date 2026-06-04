---
id: "0013"
title: Missing fields atom
status: current
decision_date: '2026-06-01'
aliases: []
project: '[[Doctor Fixture]]'
area: tooling
topic: framework
tags:
  - decision
---

# 0013 — Missing fields atom

## Decision

Seeded fault: `reversibility` and `supersedes` are absent from the
frontmatter. Fires missing_required_fields (and nothing in malformed).
