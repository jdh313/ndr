---
id: "0102"
title: Markdown remains canonical for NDRs; swamp migration paused
status: current
decision_date: 2026-05-24
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - substrate
binds: []
supersedes:
  - "0070"
superseded_by: []
derived_from: []
informed_by: []
---

# 0102 — Markdown remains canonical for NDRs; swamp migration paused

## Decision

Markdown is the canonical substrate for NDR atoms. The swamp migration defined in 0070 is paused — not cancelled — pending concrete evidence the current setup cannot handle operating needs.

## Commitments

- The swamp migration work (model definitions, vault-sync, drift-check integration) stays paused, not deleted — 0070 remains a valid direction if concrete pain emerges.
- `swamp model method run` does not become the write path; the capture-decision skill continues writing to markdown via `persist.py`.

## Revisit if

- Cross-type queries or supersession-chain traversal cannot be satisfied by obsidian-cli `base:query` and MCP `search_notes`.
- A concrete failure mode emerges (slow traversal, query gap, drift between canonical and access layer).

## Context

- 0070 (the swamp migration) was decided 2026-05-18, six days before this atom, and neither its Phase 1 (round-trip integrity) nor Phase 2 (promoting swamp as canonical) had been executed.
- Logseq's 2+ year DB-migration serves as a cautionary tale for DB-canonical storage at personal scale.
- 99 NDR atoms had been captured since 0070 with no friction reported that would justify migration.
- basic-memory, Zensical, and Dendron all operate files-canonical at personal scale.
- 0100's obsidian-cli consolidation reduced the Obsidian-tool-friction motivation that had helped justify 0070.
- No concrete pain existed that the current markdown setup could not handle.
- (Update 2026-06-01) The repo collaboration path for NDR ledgers (per 0130) means coworkers consume atoms via GitHub render, which cannot read SQLite.

## Why

The supersession chain head must reflect actual operating state, and the system was operating markdown-canonical with 0070 never executed. The inputs above weakened the case for executing the migration now, and the opportunity cost of weekend cycles on migration work had become visible. The decision is durational — swamp may become the right answer when a real trigger emerges — but the chain head must reflect how the system is actually operating, consistent with 0101's deferral of atoms-first generalization.

**Update (2026-06-01, per [[Mulling/2026-05-31_ndr-shape-and-storage]]):** A structurally stronger reason emerged: the repo collaboration path forecloses DB-canonical replacement outright, not just defers it for lack of pain. Augmentation sidecars (FTS, vector, graph) remain in scope as an additive layer; they do not contradict markdown-canonical.

## Alternatives

- **Execute 0070 as planned** — rejected: no concrete pain had emerged that the current markdown setup could not handle, assumptions behind 0070 had weakened in the six days since it was made, and the opportunity cost of weekend cycles on migration work was now visible.
- **Pause-atom without superseding 0070** — rejected: the initial framing in the session that produced this decision; it leaves 0070 at the chain head while the system operates markdown-canonical — exactly the drift supersession is designed to prevent, and a pause without superseding is a workaround, not a clean record.
- **Drop 0070 and revert to 0007** — rejected: 0070 is not wrong, assumptions shifted, so reverting would misrepresent history. It is also not a true return to 0007's framing: 0007 recorded "MVP substrate is markdown" with an implicit assumption of temporariness, while the current state is "markdown is canonical until a real trigger emerges" — a different claim.
