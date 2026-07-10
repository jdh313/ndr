---
id: "0jz7z4"
title: Ship `ndr migrate --apply-bodies` as durable CLI despite the retirable
  pass-2 consumer
status: current
decision_date: 2026-07-09
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - process
binds:
  - src/cli/migrate.ts
  - plugins/ndr/skills/migrate-ledger/SKILL.md
supersedes: []
superseded_by: []
derived_from:
  - docs/superpowers/specs/2026-07-08-atom-format-redesign.md
informed_by:
  - "0075"
---

# 0jz7z4 — Ship `ndr migrate --apply-bodies` as durable CLI despite the retirable pass-2 consumer

## Decision

`ndr migrate --apply-bodies <file>` ships as a durable CLI command that splices a pass-2-reshaped body back into an atom file, preserving frontmatter, the fence gap, and a trailing newline, and tolerating one layer of double-JSON-encoding from a mailbox relay. It stays in the CLI after the retirable pass-2 tooling that is its only consumer is deleted.

## Commitments

- Any future change to the splice must preserve the atom's frontmatter unmodified and keep the trailing-newline guarantee on the written file.
- The `migrate-ledger` skill uses `--apply-bodies` for every body-splice step instead of a hand-rolled Edit or one-off script.

## Revisit if

- The command gains a second real consumer, or its double-JSON-decoding tolerance turns out to be masking a mailbox bug worth fixing at the source instead.

## Context

- Pass-2 body reshaping returns each reshaped body as JSON; something must splice it into the atom file without touching frontmatter.
- The pass-2 body-reshaping tooling is retirable, slated for deletion once every ledger in the fleet is migrated.
- A different repo's migration hand-wrote a Python applier and hit payloads double-JSON-encoded by a mailbox relay, requiring a second decode pass.
- Hand-rolled appliers (per-atom edits or a throwaway script) are prone to accidentally clobbering frontmatter during the splice.

## Why

Centralizing the splice in the CLI removes a correctness footgun -- frontmatter clobbering -- that a hand-rolled applier reintroduces on every migration run, and the double-JSON-encoding tolerance is handled once instead of being rediscovered per repo. The dead-code cost after pass-2 retires is bounded, and the command is idempotent and harmless to leave in place -- the same tradeoff already accepted for `ndr migrate` itself.

## Alternatives

- **Ad hoc applier per migration (hand-edit or a throwaway script)** -- rejected: reinvents the frontmatter-safe splice every time and repeats failure modes, like unhandled double-JSON-encoding, that a shared command fixes once.
