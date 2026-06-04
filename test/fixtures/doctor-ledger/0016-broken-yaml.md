---
id: "0016
title: Broken yaml
status: current
---

# 0016 — Broken yaml

## Decision

Seeded fault: the id scalar's quote is never closed, so the YAML does not
parse. Fires parse_error under malformed.
