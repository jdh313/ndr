---
id: '0102'
title: Markdown remains canonical for NDRs; swamp migration paused
status: current
decision_date: '2026-05-24'
aliases: []
project: '[[ndr]]'
derived_from: []
informed_by: []
supersedes:
- '[[Decisions/0070-ndr-adopts-hybrid-architecture-swamp-canonical-vault-as-projection]]'
superseded_by: []
area: substrate
topic: substrate
impacts: []
revisit_triggers:
- Concrete pain emerges that markdown + obsidian-cli + MCP cannot handle
- Cross-type queries that obsidian-cli base:query and MCP search_notes cannot satisfy
- Supersession-chain traversal becomes too slow for daily use
- A step-change in DB tooling that reframes the build-vs-adopt tradeoff
- A separate decision validates typed-record substrate for other atom types and explicitly
  extends to NDRs
reversibility: easy
tags:
- decision
---
# 0102 — Markdown remains canonical for NDRs; swamp migration paused

## Decision

Markdown is the canonical substrate for NDR atoms. The swamp migration defined in 0070 is paused — not cancelled — pending concrete evidence the current setup cannot handle operating needs.

## Why

The supersession chain head must reflect actual operating state — the system is markdown-canonical and 0070 was never executed.

> [!info]- Full reasoning
> 0070 was decided 2026-05-18 — six days before this atom. Neither Phase 1 (round-trip integrity for existing atoms) nor Phase 2 (promoting swamp as canonical) has been executed. In the intervening days, several inputs weakened the case for executing the migration now: Logseq's 2+ year DB-migration serves as a cautionary tale for DB-canonical at personal scale; 99 NDR atoms have been captured since 0070 was made with no friction emerging that would justify migration; basic-memory, Zensical, and Dendron all operate files-canonical at personal scale; 0100's obsidian-cli consolidation reduced the Obsidian-tool-friction motivation that helped justify 0070; and no concrete pain exists that the current markdown setup cannot handle. The decision is durational — swamp may become the right answer when a real trigger emerges — but the head of the supersession chain must reflect how the system is actually operating.
>
> **Update (2026-06-01, per [[Mulling/2026-05-31_ndr-shape-and-storage]]):** A structurally stronger reason has emerged. The repo collaboration path for NDR ledgers (per [[Decisions/0130-ndr-decisions-are-project-scoped-with-no-cross-project-tier]]) forecloses DB-canonical replacement — coworkers consuming atoms via GitHub render cannot read SQLite. Replacement is now structurally foreclosed by collaboration requirements, not just deferred for lack of pain. Augmentation sidecars (FTS, vector, graph) remain in scope as an additive layer; they do not contradict markdown-canonical.

## Alternatives

Execute 0070 as planned (rejected) · Pause-atom without superseding 0070 (rejected) · Drop 0070 and revert to 0007 (rejected)

> [!info]- Why they lost
> **Execute 0070 as planned:** No concrete pain has emerged that the current markdown setup cannot handle. Assumptions behind 0070 have weakened in the six days since it was made, and the opportunity cost of weekend cycles on the migration work is now visible.
>
> **Pause-atom without superseding 0070:** This was the initial framing in the session that produced this decision. It leaves 0070 at the chain head while the system operates as markdown-canonical — exactly the drift supersession is designed to prevent. A pause-atom that doesn't supersede is a workaround, not a clean record.
>
> **Drop 0070 and revert to 0007:** 0070 is not wrong — assumptions shifted. Reverting would misrepresent the history. This is also not a return to 0007's framing: 0007 recorded "MVP substrate is markdown" with an implicit assumption of temporariness. The current state is "markdown is canonical until a real trigger emerges" — a different claim.

## Assumptions

`obsidian-cli-plus-mcp-sufficient` · `no-concrete-pain-yet`

> [!warning]- obsidian-cli-plus-mcp-sufficient
> The obsidian-cli tier-2 MCP access layer (per 0100) is sufficient for all NDR read/write operations at current scale.
>
> - **Current state:** active — 99 atoms, no reported friction as of 2026-05-24
> - **Revisit if:** cross-type queries or supersession-chain traversal cannot be satisfied by obsidian-cli base:query and MCP search_notes

> [!warning]- no-concrete-pain-yet
> The current markdown + obsidian-cli setup handles all operating needs with no pain that would justify migration work.
>
> - **Current state:** active — consistent with 0101 deferral of atoms-first generalization
> - **Revisit if:** a concrete failure mode emerges (slow traversal, query gap, drift between canonical and access layer)

## Consequences

Markdown stays canonical · Swamp migration work paused (not deleted) · 0070 status flips to superseded · persist.py write path unchanged · consistent with 0101 atoms-first deferral

> [!info]- Detail
> - Markdown is the canonical NDR substrate. No change to how atoms are written or read.
> - The swamp migration work (model definitions, vault-sync, drift-check integration) is paused, not deleted. 0070 stands as a valid direction if concrete pain emerges.
> - 0070's status flips to superseded; this atom becomes the chain head.
> - `swamp model method run` does NOT become the write path. The capture-decision skill continues writing to markdown via persist.py.
> - This is consistent with 0101 (atoms-first generalization deferred) — both atoms record the same direction: don't expand or migrate substrate until evidence demands it.
