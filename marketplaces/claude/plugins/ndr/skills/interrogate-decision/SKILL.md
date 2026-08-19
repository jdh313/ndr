---
name: interrogate-decision
description: >-
  Deep, interactive pre-capture deliberation on a candidate architectural
  decision. Use when the user invokes `/interrogate-decision`, says "interrogate
  this candidate", "is this NDR-grade", "should I record this decision", "is
  this decision-worthy", or "stress-test this before I capture it". Grounds the
  candidate in real code, names the genuine fork and alternatives, finds the
  first principle, weighs the asymmetry and failure modes, tests whether it
  binds the future, and routes it (new NDR / amend / supersede / merge /
  code-comment / skip). Runs the deliberation, STOPS for user adjudication, then
  hands off to `/capture-decision` for the actual write — it never writes to the
  ledger itself.
argument-hint: '[candidate decision to interrogate]'
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Agent
---

# interrogate-decision

## Overview

A deep, interactive deliberation that runs **before** a decision is captured. Where `/capture-decision` is a thin write orchestrator and `worthiness.md` is a soft three-question grain test, this skill is the heavy analytical walk for candidates consequential enough to earn it: research the real code, name the genuine fork, find the first principle, weigh the asymmetry, enumerate failure modes, test the forward bind, and route the verdict.

It runs the deliberation (Moves 1–8), **stops for user adjudication**, and only then hands the verdict to `/capture-decision`. It does not assign ids, draft frontmatter, or write atoms — that is `/capture-decision`'s job, reached at the end as a handoff, not re-implemented here.

```
research code ──► name fork ──► first principle ──► tradeoffs ──► asymmetry
   ──► failure modes ──► forward-bind ──► routing verdict ──► STOP
   ──► (user adjudicates) ──► /capture-decision  [only if new NDR / amend / supersede]
```

## When to use

- A candidate decision is on the table and the user wants it stress-tested before it enters (or is kept out of) the ledger.
- The routing call is genuinely close and the cost of getting it wrong is high — a `hard`-reversibility architectural choice, a possible supersession, a "is this even a decision?" judgment.
- The user explicitly asks to interrogate, deliberate on, or pressure-test a candidate.

**Do NOT use** for:

- Routine capture where the decision is already clear — go straight to `/capture-decision`.
- Reading existing decisions — that's `/decisions` (by topic/ref) or `/ground` (active coding context).
- A candidate that's obviously not a decision (typo-fix rationale, framework default) — the answer is "skip"; say so in one line without the full walk.

## Prerequisite

`ndr` must be on PATH — Move 6 and Move 8 query existing heads to judge composition and routing. Check once with `command -v ndr`; if missing, stop:

> "The `ndr` CLI isn't installed — install it (`bun install -g https://github.com/jdh313/ndr.git`, or download a release binary), then retry."

## Relationship to the other surfaces

- **`worthiness.md`** — the soft grain/routing rubric. This skill is the deep interactive walk of that same judgment, plus the code-research, first-principles, and asymmetry layers the rubric deliberately lacks. Don't restate the rubric; the heuristics live in the reference doc below.
- **`${CLAUDE_PLUGIN_ROOT}/references/interrogation.md`** — the shared heuristics for every move. This skill is the *workflow*; the doc is the *method*. `/capture-decision` Step 2.5 pulls individual moves from the same doc, so there's one source.
- **`/capture-decision`** — the write-side companion this skill hands off to. Ground → interrogate → capture is the full pre-capture pipeline.

## Inputs

- `$ARGUMENTS` — the candidate decision, free-text. If empty, infer the candidate from the current conversation and confirm it in one line before starting (`"Interrogating: <one-line restatement>. Right candidate?"`).

## Method

Load `${CLAUDE_PLUGIN_ROOT}/references/interrogation.md` first — it holds the method for each move. The steps below are the workflow skeleton; the doc is the how.

This is interactive and conversational. Surface each move's finding as you go (list-first, terse), but the moves build on each other — don't dump all eight at once. The point is a deliberation the user participates in, not a report.

### Step 1 — Ground in real code (Move 1)

Find and **quote** the actual code/config/artifact the candidate is about (`rg`, `Glob`, `Read`). If the user's description disagrees with what the code shows, correct the framing before continuing — the corrected candidate is what gets interrogated. If there's no code yet (forward-looking call), say so; it's a plan, which changes Step 5 but nothing else.

### Step 2 — Name the fork and genuine alternatives (Move 2)

State the chosen path and the alternatives anyone could plausibly have picked, each with the one-line reason a reasonable engineer would pick it. **Flag the no-real-alternative case** — if there was no fork, it's a convention/default and routes out of the ledger; do not manufacture a fork.

### Step 3 — Litmus / first principle (Move 3)

Find the general rule that makes this specific choice fall out as a corollary. A clean principle is both a worthiness signal and the durable WHY for the eventual rationale. No general rule → likely a convention or coin-flip, not a record. Don't invent a grand principle to dignify an arbitrary choice.

### Step 4 — Tradeoffs per path (Move 4)

Honest pros/cons for the chosen path and each genuine alternative — concrete, including the chosen path's costs.

### Step 5 — The asymmetry (Move 5)

Which direction is cheaper to be wrong in? Recovery cost of a wrong chosen-path vs. a wrong rejection. This *is* the source material for a `## Commitments` bullet when the recovery cost is asymmetric enough to bind future work, and it informs the atom's `conviction:` rating. Name the escape valve when the asymmetry is stark. Note when the asymmetry flips the recommendation.

### Step 6 — Failure modes and composition (Move 6)

How does the chosen path break, and what's the early-warning sign (→ future `## Revisit if` conditions)? What does it compose with? **Run `ndr search '<terms>'` / `ndr current --label <label> --verbose` here** to surface neighboring heads. A candidate that contradicts a `current` head is a supersession, not a fresh capture — flag it now.

### Step 7 — Forward-looking bind check (Move 7)

Does it bind future work or just describe current state? The test: **could a future change violate it?** Binds → capture-worthy. Only describes → route to README/CLAUDE.md, not the ledger.

### Step 8 — Routing verdict (Move 8)

Synthesize 1–7 into one verdict using the routing table in `interrogation.md`: **new NDR / amend a head / supersede a head / merge / code-comment-or-CLAUDE.md / skip.** Use the `ndr` heads surfaced in Step 6 to judge amend-vs-supersede-vs-merge (refines → amend body; reverses → supersede; same decision → merge). Give the verdict with a one-line justification rooted in the moves above.

### Step 9 — STOP and adjudicate

**Do not proceed to capture.** Present the verdict summary (see Output) and stop for the user. The user confirms, overrides, or adjusts the routing. This gate is the whole point — the deliberation informs a human call; it doesn't pre-empt it.

### Step 10 — Hand off (only if the user confirms new NDR / amend / supersede)

- **New NDR or supersede** → invoke `/capture-decision`, passing the candidate plus what the interrogation produced: the fork and alternatives (Step 2), the first-principle rationale (Step 3), the `conviction:` rating and any `## Commitments` bullet (Step 5), the `## Revisit if` conditions (Step 6), and — for a supersession — the predecessor head's `ndr:` ref to populate `supersedes:`. `/capture-decision` owns drafting, review, id assignment, and the `ndr capture` write.
- **Amend a head** → the change refines an existing head's body without reversing it. Surface the head's path (from the `ndr` brief) and the specific edit; the user applies it directly. This is a body edit, not a new atom — no supersession.
- **Merge / code-comment / CLAUDE.md / skip** → no capture. State where the content goes (existing `ndr:` ref, code site, doc) and stop.

Never call `ndr capture` from this skill. The handoff is to `/capture-decision`, which already owns every hard rule (atomicity, supersession refusal, taxonomy, id assignment).

## Output example

```markdown
**Interrogation verdict: `interrogate-decision` as a standalone skill**

1. Code: confirmed — no skill exists yet; siblings are `capture-decision`, `ground` (quoted their frontmatter).
2. Fork: standalone skill vs. fold into capture-decision Step 2.5 vs. expand worthiness.md.
   Genuine — each has a real advocate.
3. Principle: "a deep interactive walk and a thin write orchestrator are different
   responsibilities" → separate skill falls out as a corollary.
4. Tradeoffs: standalone adds a surface to maintain; folding bloats the thin orchestrator.
5. Asymmetry: wrong-to-split is cheap (merge later); wrong-to-fold is expensive
   (capture-decision stops being thin). → favors split. conviction: strong.
6. Failure mode: skill drifts from capture-decision's contract. Composes with worthiness.md
   (shares the routing buckets). No contradicting head — ndr search returned nothing.
7. Forward-bind: yes — constrains where future pre-capture logic lives. Binds.
8. Verdict: NEW NDR + new skill. No existing head to amend or supersede.

— Stopping for your call. Capture this as a fresh atom via /capture-decision? (confirm / adjust / skip)
```

## Hard rules

1. **Run 1–8, then STOP.** Adjudication (Step 9) is the user's. Never skip the stop gate and capture autonomously.
2. **Never write to the ledger.** No `ndr capture`, no id assignment, no atom files. Capture is `/capture-decision`'s sole responsibility; this skill hands off.
3. **The CLI owns the supersession walk.** When surfacing neighboring heads (Step 6), use `ndr search` / `ndr current` / `ndr resolve` — never `Read` a seed atom file directly to judge composition.
4. **Don't manufacture a fork.** If Move 2 finds no real alternative, the honest verdict is "convention/default → route out," not a forced capture.

## Related

- `/capture-decision` — the write-side companion; the Step 10 handoff target. Owns drafting, review, and the `ndr capture` write.
- `/ground` — read-side grounding before code work. Ground → interrogate → capture is the full flow.
- `/decisions <topic-or-ref>` — supersession-aware reader for existing decisions.
- `${CLAUDE_PLUGIN_ROOT}/references/interrogation.md` — the deep heuristics for every move (shared with `capture-decision` Step 2.5).
- `${CLAUDE_PLUGIN_ROOT}/references/worthiness.md` — the soft grain/routing rubric this skill walks deeply.
