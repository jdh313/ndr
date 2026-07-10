---
id: "n8w6a6"
title: ndr capture accepts a markdown draft file, not only a JSON payload
status: current
decision_date: 2026-07-10
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - process
binds:
  - src/cli/index.ts
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - kvamt6
---

# n8w6a6 — ndr capture accepts a markdown draft file, not only a JSON payload

## Decision

`ndr capture` accepts a markdown draft (a `---` frontmatter fence plus body) in
addition to the JSON wire shape. A leading `---` is the sentinel that selects the
markdown branch; the CLI converts it to the internal `{frontmatter, body}` and
strips any stray placeholder `id` before minting.

## Commitments

- The markdown branch reuses the existing capture core (split, validate, mint, two-write); it never becomes a second write path.
- A stray `id` in a draft's frontmatter is stripped before minting so a hand-authored draft does not trip validation.

## Context

- Authoring an atom body inside a JSON string requires hand-escaping every newline, which is error-prone for long prose.
- The JSON wire shape and a markdown atom carry identical information: a frontmatter object plus a body string.
- The capture core operates on `{frontmatter, body}` independent of the input encoding, and JSON payloads begin with `{` while atoms begin with `---`, so the two are unambiguous.

## Why

The body is prose, and authoring it inside a JSON string means escaping every
newline by hand — a step the main agent repeatedly stumbled on. The two encodings
carry the same information, so accepting markdown at the CLI boundary removes the
escaping hazard without touching the deterministic capture core, and the leading
`---` versus `{` makes the branch unambiguous.

## Alternatives

- **JSON-only stdin (the prior contract)** — verdict: rejected: forces the author to escape the body into a JSON string, the exact hazard this removes.
