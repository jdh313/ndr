# ndr PM interview: findings

Date: 2026-09-27. Interviewer: Claude (PM role). Interviewee: Jacob. Scope: lived experience with ndr over ~4 months across Wayfinder/CartaOS (with Andrew) and ~14 personal repos. This file records what Jacob said; it contains no proposed solutions. Verbatim quotes are in the transcript section at the bottom.

## Priority (Jacob's ranking)

1. **A. Capture timing.** Capture fires at `/end` or after final review, i.e. after the PR is reviewed or merged; atoms then wait for the next PR or go in as a docs-only PR. Decisions actually crystallize during planning and implementation.
2. **C. Binds cost.** `binds:` globs are agent-authored, go stale, get flagged by doctor/drift-check, and are the one doctor flag Jacob routinely ignores. In months of use he has never observed binds producing a benefit.
3. **B. Capture coverage.** Architecture-level, business, and "chose not to do X" decisions are missed. Causes named: Claude does not offer; capture is deferred until an implementation exists; Jacob self-censors because past proposals were "usually rejected" (reason not recalled). Even a code-scoped, in-conversation decision (rejecting a self-hosted S3 substitute in the Compose stack over API incompatibility, a deviation from the codebase convention) was never suggested.
4. **E. Semantic search.** Wants vector/meaning-based retrieval over atom bodies. Anticipated need, no cited incident. Reopens current head x4rf23 (pure-JS deterministic search, embedder rejected).
5. **D. Decision relationships.** Parent/child ("part of") and derived-from ("came from") links between atoms, distinct from supersession. Primary use: when changing one decision, surface all related ones for re-evaluation.

## What works

- **Retrieval on a large corpus.** Wayfinder has hundreds of atoms; when an atom exists it "does tend to come back". Clearest wins are there.
- **Agent-initiated grounding and `ndr:` refs in code.** Both rated "pretty good" without prompting.
- **Reviewer atomicity check.** Trusted; no complaints about shape-based failures.
- **Revising/superseding atoms.** "Usually goes okay."
- **Personal repos.** Paid off a couple of times, never got in the way. Low cost, low yield; value tracks corpus size.
- **Andrew** uses the ledger almost entirely through Claude sessions; no inter-person friction reported.

## Friction (beyond the ranked five)

- **Superseded atom acted on.** Claude sometimes proceeds on a superseded atom instead of the head. Best guess: a stale `ndr:<id>` in a ticket or code comment used without resolving. Unconfirmed; one instance believed to be in image-gen-ui on this machine.
- **Recall miss caught late.** An on-point atom was missed at grounding and found by an AI review pass after implementation, causing rework. Matches the "grounding-by-skim" pattern in the vault (CAR-1173).
- **PR inflation** from new/edited atoms in the code repo. Self-rated minor; same root as A.
- **New-label proposals** cluster at the start of a new area of work, then settle. Not felt as drift.

## Jacob's own ideas (unsolicited, recorded verbatim in transcript)

- **Ideal capture workflow:** the working agent sends candidate decisions to an ndr agent as it works; candidates accumulate; Jacob reviews keep/discard in a batch while the pre-push review agents run; atoms land in the same PR before push.
- **Same ledger for non-code decisions,** separated by search/labels rather than a second ledger.
- **Nesting:** "this decision came from this decision" and "this decision is part of this larger decision", with change-impact as the driver.
- **Semantic/vector search.**

## Open items to verify from evidence before designing

1. Locate the image-gen-ui superseded-atom incident and determine the entry path (stale ref vs direct Read vs search leak, JUN-332).
2. Mine transcripts for `/capture-decision` not-ndr/borderline routings and the stated reasons, to reconstruct why architecture/convention candidates were rejected.
3. Check whether `/capture-decision` or `/end` ran in the S3-decision session at all.
4. Confirm whether the shipped `/ground` uses `binds:` for ranking or only drift-check does (bears on C).
5. Confirm whether `informed_by` is surfaced anywhere in CLI output (bears on D).

## Pre-existing backlog this interview touches (for later triage, not re-discovery)

- A: vault 2026-07-25 note on spec-flow `/close` writing atoms post-review; ledger-relocation idea.
- B: Inbox note "NDR — Add Worthiness Rubric"; JUN-288 Context guidance overreach; "flip the variable" check (2026-09-14).
- C: JUN-369 dimension-map scope, JUN-372 doctor scope checks, GH #38 binds_matches_nothing.
- D: JUN-282 supersession DAG, JUN-371 branching lineage (supersession-shaped, not composition-shaped).
- E: JUN-192 BM25, JUN-364/365/366 search escalation, x4rf23 revisit condition pending, JUN-332 superseded leak.
- Superseded-atom misread: GH #13 (prose citing superseded atoms), JUN-374 (drift advisory on stdout).

---
## Interview transcript notes (chronological)

**Q1 last clear win / where.** "It definitely gets its most clear wins at work when I'm working on CartaOS/Wayfinder with Andrew. We've built up hundreds of NDRs so far, and it does a really good job of referencing them when we need them."
- Win = retrieval at reference time on a large corpus (hundreds), two-person team context.
- Follow-up pending: what "referencing them when we need them" looks like concretely (which entry point: /ground, /decisions, agent-initiated?), and Andrew's relationship to the ledger.
**Q1b what referencing looks like.** "Claude does a pretty good job of pulling them in automatically, as well as putting the references in code."
- Two working behaviors: (1) agent-initiated grounding without being asked; (2) `ndr:` references written into code comments. Both rated positively ("pretty good", not "always").
**Q1c miss modes.** "It sometimes pulls an old atom and doesn't follow through, or misses an atom that it only finds out about later and has to do some rework. I believe this happened recently in the image-gen-ui project on this computer as well."
- Miss mode A: pulls an *old* atom and does not follow through (clarify: superseded atom not walked to head, vs current atom whose content is stale, vs read-but-ignored).
- Miss mode B: recall miss; on-point atom discovered later, causing rework. Matches vault-recorded "grounding-by-skim" (CAR-1173).
- Concrete recent instance: image-gen-ui repo on this machine (can be located later via session transcripts / ledger timestamps).
**Q1d "old" = superseded.** Confirmed: miss mode A is Claude acting on a superseded atom rather than the head. This is the exact failure the supersession walk exists to prevent, so the question is *how* the superseded atom entered context (a direct file Read bypassing the CLI? `ndr search` leaking superseded atoms, cf. JUN-332? a stale `ndr:` id in a ticket/prompt resolved without the walk?). Follow-up pending.
**Q1e entry path.** "I'm guessing a ticket or code comment had the old ndr, but I can't recall." Unconfirmed; best guess is a stale `ndr:<id>` in a ticket body or code comment that was read as-is instead of resolved. Open item: find the actual instance (image-gen-ui transcripts) before designing anything.
**Q1f how the missed atom surfaced.** "I believe a reviewer caught it later on." A review-stage agent (not grounding, not doctor, not a human) found the on-point atom after implementation. Grounding recall missed; review recall hit. Cost = rework after code was written.
  - Clarified: "As in AI reviewer" (a Claude review pass, e.g. /code-review or a review agent), not Andrew.

**Q2 most frequent day-to-day friction.** Jacob listed four (verbatim):
1. "The ndrs aren't captured until the end, and sometimes not suggested until after I've already pushed and merged a PR, meaning they either need to wait until another PR is ready to be merged, or go in as a docs-only PR." → capture timing vs PR lifecycle. Corroborates vault 2026-07-25 note on spec-flow /close writing atoms post-review.
2. "The scoping to specific files seemed like a good idea at first, but the scope quickly goes stale requiring more edits than we'd like." → `binds:` globs rot; maintenance cost exceeds value. (Related backlog: JUN-369 dimension-map scope, JUN-372 doctor stale scope.path, GH #38.)
3. "New or edited NDRs tend to inflate the number of changes in PRs (minor gripe)." → self-rated minor. Same root as #1: ledger lives in the code repo.
4. "Perhaps biggest, they don't currently offer a good way to document architecture and/or business decisions that don't necessarily have code scope itself." → self-rated *biggest*. Atom model presumes code-scoped decisions; architecture-level and business decisions have no good home. (Related: JUN-294 second axis; vault 0101 "atoms beyond decisions" paused.)
- Follow-ups pending: #4 first (what he does with those decisions today; examples); #1 (what "suggested" means: who suggests, when, why late); #2 (does he still set binds, or has he stopped).
**Q2a where non-code decisions go today.** "Right now it either goes into a non-git-tracked file, or doesn't get written down at all." → Two outcomes, both lossy: an untracked file (invisible to Andrew, to grounding, to review) or nothing. No example given yet.
**Q2b example + blocker.** "First, Claude didn't offer to capture it, or the capture was set to be delayed until an implementation was made, or I just didn't think to capture it. For instance, once again in image-gen-ui, I was thinking about trying to capture the idea of splitting files by purpose rather than having large files, but didn't have a good way to propose the suggestion to the agent."
- Example: image-gen-ui, a codebase-wide convention ("split files by purpose rather than large files"). Repo-wide, no single binds glob, not tied to one implementation.
- Three blockers named, none of them the atom format: (a) Claude did not offer; (b) capture deferred until implementation exists (a *policy* decision with no implementation to wait for never gets its turn); (c) Jacob had no natural way to *propose* a candidate decision to the agent mid-session ("didn't have a good way to propose the suggestion").
- Note: (b) is the same mechanism as friction #1 (capture-at-end), showing up as a permanent deferral rather than a late one.
**Q2c the real blocker = worthiness uncertainty + learned rejection.** "It was more not knowing if it was NDR worthy, and knowing in the past that they were usually rejected."
- Key finding: the worthiness gate has trained Jacob *not to propose*. Conventions/architecture candidates were "usually rejected" in the past, so now he self-censors before even asking. The capture pipeline's rejection behavior has a chilling effect upstream of capture.
- Ties to the vault Inbox note "NDR — Add Worthiness Rubric" (no rubric exists; filter is shape-based). Here the felt problem is the inverse of the rubric note's worry: not too-lax, but rejecting a class of decisions he wants kept.
- Follow-up pending: who rejected (the skill's worthiness pass? ndr-reviewer? the orchestrator?) and on what stated ground (e.g. "belongs in CLAUDE.md / a rule file").
**Q2d rejection reasons.** "I don't recall." Open item: mine session transcripts for /capture-decision "not-ndr" / "borderline" routings and the reasons given, to reconstruct the rejection pattern from evidence rather than memory.
**Q3 capture trigger today.** "The capture is typically suggested after final review, or during `/end`." → Both triggers sit at or after the point where the PR is already reviewed/merged. No mid-session trigger exists in practice. The PR lifecycle and the capture lifecycle are sequenced wrong relative to each other.
**Q3a when decisions crystallize + ideal workflow (Jacob's own words, unsolicited).** "It's usually during planning or during implementation. My ideal workflow would be for it to send possible options to an ndr agent while it works, and then review them with me and decide whether or not they're worth keeping, while the backend review agents are running before pushing."
- Decisions land during planning and implementation, i.e. well before review/end.
- Ideal (his design, recorded in section 3): (1) the working agent streams *candidate* decisions to a background ndr agent as they occur; (2) candidates accumulate during the task; (3) human-in-the-loop keep/discard review happens *in parallel with* the pre-push review agents; (4) atoms land in the same PR before push.
- Implied requirements: a candidate queue/holding area that is not yet the ledger; capture that does not block the coding agent; review-with-Jacob is a batch step, not per-candidate interruptions; worthiness decided by Jacob at that batch step.
**Q4 binds in practice.** "Claude tends to set them automatically, then complain during doctor or drift checks." → binds are agent-authored, not human-chosen; the same agent later flags them stale. Jacob's felt cost is the maintenance loop (edit atom, re-review), not the initial authoring. Nobody said binds ever *helped* (e.g. ranked the right atom during /ground); follow-up pending on whether he has seen any upside from binds at all.
**Q4a binds upside.** "I don't believe I have." → No observed benefit from binds in months of use; only observed cost. Strong signal for the ranking step. (Cross-check later: does /ground actually use binds for ranking in the shipped skill, or is that only drift-check?)
**Q5 Andrew.** "He uses it through Claude sessions almost entirely." → Second human user exists but is agent-mediated; no human reading of atoms. Confirms the vault's July note (design premise "coworkers read atoms in PRs" inverted). No friction between them reported (question not directly answered; do not over-read).
**Q6 retrieval vs capture gaps.** "The atom does tend to come back if one is available, although there are also occasions where no atom was captured. For instance, in a past ticket I'd decided not to use a self-hosted S3 bucket for the Docker Compose stack in our app due to API incompatibilities, which was a break from everything else in the codebase where we did use local copies of AWS services, but a decision was never suggested or recorded there."
- Retrieval is not the felt problem; *capture coverage* is. When an atom exists, it comes back.
- Example (Wayfinder): rejected a self-hosted S3 substitute in the Compose stack because of API incompatibility, breaking a codebase-wide pattern (local copies of AWS services everywhere else). Textbook NDR (fork, alternative, rationale, deviates from convention) and never suggested. Note this one *was* code-scoped and still missed, so the miss is not only the architecture/business class from Q2.
- Pattern across Q2b and Q6: capture suggestion depends on the agent recognizing a decision moment; deviations-from-convention and "chose not to do X" decisions are being missed.
**Q6a S3 decision was in-conversation.** "It was discussed in the conversation." → The decision, its alternative, and its rationale were all in the transcript; a capture pass at session end had the material and still did not propose it (or no capture pass ran). Pure detection miss, not a missing-context miss. Open item: check whether /capture-decision or /end actually ran in that session, or whether the session ended without either.
**Q7 revising atoms.** "It usually goes okay." → Supersession/edit flow is not a pain point. Frequency not stated. Deprioritize JUN-250 (amend) relative to capture-timing and coverage.
**Q8 personal repos.** "It's paid off a couple times, but not as often. Hasn't really gotten in the way." → Low-cost, low-yield outside Wayfinder. Value scales with corpus size and session count; personal repos have small ledgers. No friction there, so personal-repo ergonomics are not a priority axis.
**Q9 quality gates.** "The main flag I tend to ignore is the scope one if I don't feel like hunting that down. I think reviewer usually does a pretty good job making sure the atoms are atomic."
- Doctor: the stale-binds / scope flag is the one routinely ignored ("hunting that down" = cost of finding the new correct glob). Third time binds shows up as pure cost (Q2 #2, Q4, Q4a, Q9).
- Reviewer: positive; atomicity check trusted. No complaint about shape-based failures.
**Q10 where non-code decisions live + nesting idea (Jacob's own, unsolicited).** "Probably in the same ledger, using search to separate them. Another idea I had was to think more about nesting decisions, like showing this decision came from this decision. Or this decision is a part of this larger other decision."
- Placement: same per-repo ledger; separation by search/labels, not by ledger. (Implies search must be good enough to separate classes; note the literal-substring search limitation.)
- Business vs architecture distinction: not answered; do not assume.
- Idea (section 3): explicit **nesting / derivation relationships** between atoms: (a) "came from" = derived-from / caused-by lineage between decisions; (b) "part of" = parent/child composition, small decision nested under a larger one. Distinct from supersession. Existing `informed_by` field partially covers (a) but is not surfaced anywhere (check). Nothing covers (b). Note the product is literally named *nested* decision records.
- Related backlog: JUN-282 fan-out DAG, JUN-371 branching lineage (both about supersession, not composition).
**Q10a what nesting should answer.** "That would be my thought, or vice versa. If we go to change a decision, we may want to re-evaluate all the others."
- Endorses both directions: grounding on a child pulls the parent; grounding on a parent pulls children.
- Primary use he named: **change impact**. Superseding/revising one decision should surface every related decision (children, siblings under the same parent, derived decisions) for re-evaluation. Today supersession touches only the direct chain.
**Q11 taxonomy + search.** "Claude does offer new ones occasionally, especially at the beginning of new sets. I think we need to add the ability to do full body searches at some point."
- Labels: new-label proposals cluster at the start of a new area/"set" of work, then settle. Not felt as drift. No complaint about label count or vagueness.
- Search (Jacob's ask, section 3): "full body searches". Note: `ndr search` already matches bodies, but as a literal whole-phrase substring; his perception that body search is missing is consistent with the memory note that multi-word queries return nothing, so users learn "search doesn't work". Treat as: search that finds atoms by meaning/terms in the body (JUN-192 BM25 territory), not a new surface.
**Q11a search clarified.** "I was thinking more like semantic search or vector search." → The ask is semantic/vector retrieval, not lexical. No specific failed search cited; it is an anticipated need (for separating decision classes and for recall), not a reported incident. Context to weigh later: x4rf23 (search stays pure-JS/deterministic; embedder rejected, 2026-07-26) is a *current head* with a revisit condition known to be mis-specified; the vault's gated FTS-vs-vector validation was never run. This ask reopens that decision, so it goes through supersession, not a quiet change.
**Q12 ranking.** Jacob's order: **A (capture timing) > C (binds cost) > B (capture coverage) > E (semantic search) > D (decision relationships).**
