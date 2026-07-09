---
id: "yr00fm"
title: The grounding marker is a .claude/rules/ndr.md rule file, not a CLAUDE.md
  append
status: current
decision_date: 2026-06-07
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - read-side
binds: []
supersedes: []
superseded_by: []
derived_from:
  - ndr CLI session 2026-06-07
informed_by: []
---

# yr00fm — The grounding marker is a .claude/rules/ndr.md rule file, not a CLAUDE.md append

## Decision

`ndr init` writes the behavioral grounding marker as `.claude/rules/ndr.md`, not as an appended section in `.claude/CLAUDE.md`.

## Commitments

- The `.claude/` gitignore tradeoff carries over from the rejected alternative: only a root `CLAUDE.md` would escape a global ignore of `.claude/`; teams that gitignore `.claude/` must explicitly unignore `rules/ndr.md` if they want to commit it.
- `ndr init` writes the file only if it does not exist; `--force` does not touch it, since it is behavioral configuration rather than a scaffold artifact like `.ndr.toml`.

## Revisit if

- Claude Code changes the rules directory loading behavior or introduces a priority distinction between `rules/` and `CLAUDE.md`.

## Context

- Project-level `.claude/rules/*.md` files auto-load at Claude Code session start with the same priority as `.claude/CLAUDE.md` — a stable, documented feature.
- The rules-as-WHEN taxonomy treats a file that declares *when* to run `/ground` as a decision principle, not reference material.

## Why

A standalone rule file makes idempotency a plain file-existence check, makes removal a single file delete, and never merges NDR text into a file that holds unrelated content — the alternative (appending a `## NDR coverage` block with a content marker to `.claude/CLAUDE.md`) requires parsing file contents to detect the marker, makes removal a content-edit rather than a file delete, and risks interleaving NDR text with other CLAUDE.md sections written by humans. It also matches the rules-as-WHEN taxonomy: the file declares *when* to run `/ground`, which is a decision principle, not reference material.

## Alternatives

- **CLAUDE.md append** — rejected: idempotency requires scanning for a marker string inside the file, removal is a content edit, and the NDR block merges with potentially unrelated CLAUDE.md content written by humans; the one advantage (a root `CLAUDE.md` survives a global `.gitignore` of `.claude/`) doesn't outweigh those operational downsides, and the same tradeoff applies to the chosen approach anyway.
