# Interrogation — deep pre-capture deliberation heuristics

`worthiness.md` answers a *soft, fast* question: given an atomic candidate, is an NDR the right **artifact**, or does it route elsewhere? Three yes/no prompts, no deep analysis.

This doc holds the **heavier analytical moves** for candidates that earn a real deliberation — consequential decisions where the cost of capturing the wrong thing (or skipping the right thing) is high enough to justify the work. It is the deep layer the `worthiness` rubric deliberately lacks.

Two consumers:

- **`/interrogate-decision`** — the full interactive walk. Runs every move below as a numbered step, stops for user adjudication, then hands the verdict to `/capture-decision`.
- **`/capture-decision` Step 2.5** — pulls individual moves (usually the asymmetry or forward-bind check) when a *borderline-and-heavy* candidate needs more than the three-question grain test before it proceeds.

No duplication with `worthiness.md`: that doc owns the **grain/routing rubric** (the three-question test, the negative test, the routing table, the three-layer docs pattern). This doc owns the **analytical method** — how to find the general rule, weigh the asymmetry, enumerate failure modes, and test the forward bind. The routing *buckets* live in `worthiness.md`; the *deliberation that fills them* lives here.

---

## Move 1 — Ground the candidate in real code

Before any reasoning, confirm the candidate describes reality. A decision interrogated against a misremembered implementation is worthless.

- Find the actual code, config, or artifact the candidate is about (`rg`, `Glob`, `Read`). Quote it — the literal lines, not a paraphrase.
- If the user's description and the code disagree, **say so and correct the framing** before continuing. The corrected candidate is what gets interrogated.
- If there is no code yet (a forward-looking architectural call), say that explicitly — the candidate is a *plan*, which changes the forward-bind check (Move 5) but not the rest.

**Tell that this move mattered:** the candidate's wording changes after you read the code. If it never changes, you either got lucky or didn't read closely enough.

## Move 2 — Name the real fork and its genuine alternatives

A decision is a fork. State the chosen path and the alternatives **anyone could plausibly have picked** — not strawmen.

- For each alternative, give the one-line reason a reasonable engineer would have chosen it. If you can't, it's a strawman; drop it.
- **Flag the no-real-alternative case.** If the only "alternative" is "don't do the obviously-correct thing," there was no fork — it's a convention or a framework default, and it routes out of the ledger per `worthiness.md`. Do not manufacture a fork to justify capture.

This move is the deep version of `worthiness.md`'s "named alternative?" question. The rubric asks *whether* one exists; this asks you to *state it well enough to argue both sides*.

## Move 3 — Litmus / first-principles: find the general rule

The strongest decisions are instances of a **general rule** that decides a whole *class* of questions. Find that rule.

- Ask: "What principle, if I stated it, would make this specific choice fall out as a corollary?" (e.g. *"Prefer the storage medium that survives a tooling rewrite"* → markdown over SQLite is a corollary.)
- A candidate that resolves to a clean first principle is usually NDR-worthy **and** tells you how to write the rationale — the principle is the durable WHY; the instance is just today's application.
- A candidate that resolves to *no* general rule — "we picked X because X was in front of us" — is often a convention or a coin-flip, not a decision worth a record.

**Anti-pattern:** inventing a grand principle to dignify an arbitrary choice. If the principle only ever applies to this one case, it isn't a principle — it's the decision wearing a hat.

## Move 4 — Tradeoffs per path

For the chosen path and each genuine alternative, the honest pros and cons. Brief, concrete, no hedging.

- Concrete costs and benefits, not abstractions. "Adds a 200ms cold-start" beats "may impact performance."
- Include the cost of the chosen path — a decision record that only lists the winner's upsides is propaganda, and future-you will distrust it.

## Move 5 — The asymmetry: which direction is cheaper to be wrong in

This is the move `worthiness.md` lacks entirely, and often the most decision-changing one.

- Decisions are rarely symmetric. Ask: **if I'm wrong about the chosen path, how expensive is the recovery? If I'm wrong about rejecting the alternative, how expensive is that?**
- Cheap-to-reverse-if-wrong beats expensive-to-reverse-if-wrong even at equal expected value. A reversible mistake is a smaller bet than an irreversible one of the same size.
- Where the recovery cost is asymmetric enough to bind future work, capture it as a `## Commitments` bullet noting the escape valve; the overall confidence in the call is the atom's `conviction:` rating.
- When the asymmetry is stark, name the escape valve: the specific, cheap action that undoes the decision if it's wrong (e.g. *"rename the directory to `tools/`"*).

**Tell that this move mattered:** the asymmetry sometimes flips the recommendation — the option with the worse expected value wins because being wrong about it is cheap.

## Move 6 — Failure modes and composition

A decision doesn't live alone. Two questions:

- **Failure modes:** how does the chosen path break? What's the worst realistic outcome, and what's the early-warning sign? These become the atom's `## Revisit if` conditions — the conditions under which the head should be re-examined.
- **Composition:** what does this decision compose *with*? Does it constrain, enable, or quietly contradict an existing head? If it touches another atom's territory, that's a signal for the amend/merge routing in Move 7 — surface the related atom now, not at write time.

Run an `ndr search` / `ndr current --label <label>` here to surface neighboring heads before judging composition. A candidate that contradicts a `current` head is a **supersession**, not a fresh capture — and that changes everything downstream.

## Move 7 — Forward-looking bind check

The sharpest filter for NDR-worthiness: **does this bind future work, or just describe current state?**

- A decision *binds* if a future engineer or agent, working in this area, would be constrained or guided by it — "you must X", "never Y", "prefer Z when W."
- A statement that only *describes* what is currently true — "the auth service uses Postgres" — is documentation, not a decision. It rots when the code changes and there was never a fork to revisit. Route it to a README or CLAUDE.md, not the ledger.
- The test: **could a future change violate this?** If yes, it binds — capture it. If there's nothing to violate, there's no decision to record.

This is the deep version of `worthiness.md`'s "future-revisitable?" question, sharpened from "could someone revisit it" to "does it actively constrain what comes next."

## Move 8 — Where does it belong

Synthesize Moves 1–7 into one routing verdict. The buckets are defined in `worthiness.md`'s routing table; this move *chooses among them* using the analysis above:

| Verdict | When | Hand-off |
| --- | --- | --- |
| **New NDR** | Genuine fork (Move 2), binds the future (Move 7), rationale outlives the code site, no existing head covers it (Move 6). | `/capture-decision` (fresh). |
| **Amend a head** | An existing `current` head covers this, and the new thinking *refines* it without reversing the chosen path (new assumption, new revisit trigger, sharper rationale). | Edit the head's body directly — not a new atom. |
| **Supersede a head** | An existing `current` head is *contradicted* — the chosen path changed. | `/capture-decision` with `supersedes:` naming the predecessor. |
| **Merge** | The candidate is the same decision as an existing head, just re-stated. | Nothing new — point at the existing `ndr:` ref. |
| **Code comment / CLAUDE.md** | Single-call-site WHY, data wart, or project-wide enforcement of an already-recorded decision. | The relevant code site or doc, per the three-layer pattern in `worthiness.md`. |
| **Skip** | Framework default, no real fork (Move 2 flagged it), describes-not-binds (Move 7), or still being considered. | Nothing — or a daily note if it's "decide later." |

The amend-vs-supersede distinction is load-bearing: **refines → amend the body; reverses → supersede with a new atom.** Never silently rewrite a head's substance — that destroys the supersession history the whole system exists to preserve.

---

## Using this doc from `/capture-decision`

Step 2.5 of `capture-decision` runs the soft `worthiness` rubric. When a candidate is **borderline AND consequential** (the routing call is close *and* getting it wrong is expensive), pull the one or two moves from this doc that resolve the doubt — usually:

- **Move 5 (asymmetry)** when the question is "is this `hard` enough to really matter?"
- **Move 7 (forward-bind)** when the question is "is this a decision or just documentation?"

This is a targeted pull, not the full walk. The full interactive walk is `/interrogate-decision`'s job; `capture-decision` stays a thin orchestrator and borrows only what a specific borderline candidate needs.
