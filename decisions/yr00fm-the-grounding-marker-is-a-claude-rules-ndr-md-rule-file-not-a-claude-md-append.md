---
id: "yr00fm"
title: The grounding marker is a .claude/rules/ndr.md rule file, not a CLAUDE.md
  append
status: current
decision_date: 2026-06-07
aliases: []
project: "[[ndr]]"
derived_from:
  - "[[ndr CLI session 2026-06-07]]"
informed_by: []
supersedes: []
superseded_by: []
area: tooling
topic: read-side
impacts: []
revisit_triggers: []
reversibility: easy
tags:
  - decision
---

# yr00fm — The grounding marker is a .claude/rules/ndr.md rule file, not a CLAUDE.md append

## Decision

`ndr init` writes the behavioral grounding marker as `.claude/rules/ndr.md`, not as an appended section in `.claude/CLAUDE.md`.

## Why

A standalone rule file makes idempotency a plain file-existence check and never merges into a file that holds unrelated content.

> [!info]- Full reasoning
> Project-level `.claude/rules/*.md` files auto-load at Claude Code session start with the same priority as `.claude/CLAUDE.md` — this is a stable, documented feature. The alternative approach (append a `## NDR coverage` block with a content marker) requires parsing file contents to detect the marker, makes removal a content-edit rather than a file delete, and risks interleaving NDR text with other CLAUDE.md sections. A dedicated rule file avoids all three: existence check suffices for idempotency, removal is a single file delete, and the file's scope is unambiguous. It also matches the rules-as-WHEN taxonomy: the file declares *when* to run `/ground`, which is a decision principle, not reference material.

## Alternatives

Append a `## NDR coverage` block with a content marker to `.claude/CLAUDE.md` — rejected. A standalone file was unambiguously cleaner on all axes except one.

> [!info]- Why they lost
> - **CLAUDE.md append:** Idempotency requires scanning for a marker string inside the file. Removal is a content edit. The NDR block merges with potentially unrelated CLAUDE.md content written by humans. The one advantage — a root `CLAUDE.md` would survive a global `.gitignore` of `.claude/` — does not outweigh the operational downsides, and the same tradeoff applies to the chosen approach.

## Assumptions

`rules-dir-auto-loads`

> [!warning]- rules-dir-auto-loads
> `.claude/rules/*.md` auto-loads at Claude Code session start at the same priority as `.claude/CLAUDE.md`.
>
> - **Current state:** active — verified against Claude Code docs at decision date
> - **Revisit if:** Claude Code changes the rules directory loading behavior or introduces a priority distinction between `rules/` and `CLAUDE.md`

## Consequences

Grounding marker is idempotent on file existence · removal is a single file delete of `.claude/rules/ndr.md` · file scope is unambiguous · tradeoff: `.claude/` gitignore still buries the file

> [!info]- Detail
> - The `.claude/` gitignore tradeoff is unchanged from the alternative: only a root `CLAUDE.md` would escape a global ignore of `.claude/`. Teams that gitignore `.claude/` must explicitly unignore `rules/ndr.md` if they want to commit it.
> - `ndr init` writes the file only if it does not exist; `--force` does not touch it (it is behavioral configuration, not a scaffold artifact like `.ndr.toml`).
