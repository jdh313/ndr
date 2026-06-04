# Worthiness

When a candidate passes the **atomicity** test (one chosen path, one set of consequences), it has the right *shape* to be an NDR. This doc covers the orthogonal question: is it the right *artifact*? An atomic candidate can still be wrong-grain — better lived as a code comment, a CLAUDE.md gotcha, or a rule file.

The rubric is a prompt for human judgment, not a pass/fail gate. The structural gates (`atomic only`, `supersession refusal`, `taxonomy enforcement`) live in the skill's `## Hard rules`; this lives one level softer.

## Three-question positive test

A candidate is NDR-worthy when **all three** are yes:

1. **Named alternative?** Is there a chosen path with an alternative anyone could plausibly have picked? Without an alternative, it's convention or assumption, not a decision.
2. **Future-revisitable?** Could future-you or a future agent plausibly want to revisit or override this? The required `reversibility:` field and the `supersedes:` primitive imply the capture target is something the system might re-decide.
3. **Rationale outlives the code site?** If the WHY rots when the function is rewritten, it's a code comment. If it survives code churn, it's NDR-shaped.

## Negative test

If **any** of these is yes, it's probably not an NDR:

- Self-evident from the code or framework defaults
- Inherited without a chosen alternative (no fork was made — just convention)
- Single-call-site WHY (better as a code comment at the site)
- Transient state (sprint plan, in-flight refactor, "for this week only")

**Explicitly NOT a negative criterion: "project-wide convention."** Many NDRs *are* project-wide conventions where the convention itself was the chosen path. The three-layer docs pattern below is the right home for those, with the convention referenced back at the NDR.

## Routing — where the answer goes when it's not an NDR

The point of this pass isn't to drop candidates — it's to send them to the right layer.

| Signal | Better home | Notes |
| --- | --- | --- |
| Single-call-site WHY, rots with the function | Code comment at the call site | The WHY is local; let it live local. |
| Project-wide enforcement of a chosen path | CLAUDE.md or rule file, **referencing the NDR by `ndr:` ref** | Three-layer pattern (below). |
| Data wart, environmental footgun, proposal that doesn't touch code | CLAUDE.md "Known gotchas" section | Operational guardrail, not a decision. |
| Still considering, not yet decided | Daily note / `/mull` / `/reflect` | Capture after the call lands. |
| Self-evident from framework defaults | Don't capture | Assume. |
| Reaffirmation of an existing decision without new substance | Don't capture | Edit the existing atom if anything genuinely changed. |

## Three-layer docs (when NDR-worthy AND project-wide)

A project-wide convention often deserves all three layers, each carrying what the others can't:

| Layer | What it carries |
| --- | --- |
| **NDR atom** | The WHY — chosen path vs. named alternatives, assumptions, revisit triggers |
| **Code-site comment** | What-not-to-do at the call site (load-bearing local guardrail) |
| **CLAUDE.md / rules** | Enforcement, gotchas, "do this not that" — pointed back at the NDR via `ndr:` reference |

No duplication: CLAUDE.md says "use stacked files (see `ndr:0057`)" rather than re-stating the rationale. The NDR is the canonical WHY; the rule file is the canonical enforcement; the code comment is the canonical local nudge.

## Calibration — worked examples

Walking the rubric against real personal atoms.

### Clean pass — `ndr:0061` (Proactive vault context at session start)

- **Named alternative?** Yes — SessionStart hook was the rejected path. The rationale spells out hook latency, iteration cost, no graceful degradation.
- **Future-revisitable?** Yes — `revisit_triggers:` explicitly include "rule compliance is poor" and "a SessionStart hook becomes viable." Reversibility `easy`.
- **Rationale outlives the rule file?** Yes — the "rule vs hook" tradeoff applies to any future iteration of session-start automation, not just this one rule.

Routing complement: the CLAUDE.md skip-condition list (`05-vault-session-start.md`) implements the rule and references the WHY only obliquely; that's correct — rules carry behavior, NDR carries rationale.

### Clean pass — `ndr:0058` (Keep swamp as a subdirectory inside homelab)

- **Named alternative?** Yes, three of them — separate top-level repo, jj/git submodule, scatter at homelab root. Each rejection has its own reasoning.
- **Future-revisitable?** Yes — `revisit_triggers:` cover publishing-as-template, CI divergence, navigability decay (with the explicit "rename to `tools/`" escape valve).
- **Rationale outlives the directory layout?** Yes — the atomic-commits-across-trees argument applies even if the structure later moves under a `tools/` umbrella.

### Clean pass via supersession — `ndr:0102` (Markdown remains canonical; swamp migration paused)

- **Named alternative?** Yes — three rejected paths (execute as planned, pause-atom without superseding, drop-and-revert).
- **Future-revisitable?** Yes — load-bearing `## Assumptions` (`obsidian-cli-plus-mcp-sufficient`, `no-concrete-pain-yet`) with explicit "revisit if" conditions.
- **Rationale outlives the code site?** Yes — this is a substrate decision; rationale ("99 atoms with no friction", "Logseq DB-migration cautionary tale") is durational.

Why this atom is the canonical example of supersession-driven worthiness: 0102 doesn't add a feature, it flips the head because assumptions behind 0070 weakened. The whole reason supersession exists is to record that flip without rewriting history. If the rule was "only capture forward progress," 0102 would be skipped — and the chain head would lie about how the system actually operates.

### Close-call pass with routing complement — `ndr:0057` (Stacked-files Jellyfin convention)

- **Named alternative?** Yes — single-MKV merge (deferred), per-disc subfolders (rejected), Music Videos collection (rejected).
- **Future-revisitable?** Yes — `revisit_triggers:` cover per-movie merge upgrades and Jellyfin convention changes.
- **Rationale outlives the code site?** Mostly — the WHY is partly Jellyfin's documented behavior (which lives in Jellyfin's docs), but the *chosen path among Jellyfin's recognized patterns* is the user's call, and the validated-experiment evidence ("Bruce Springsteen Live in Barcelona, 6 duplicates → 0") is durational.

**Routing complement:** this atom benefits from a homelab CLAUDE.md entry that says "media goes in stacked-files layout (`ndr:0057`)" — without it, the convention enforcement lives only in the audit method. The NDR is the WHY, the CLAUDE.md entry is the enforcement, the `swamp model jellyfin audit` is the verification. Three-layer pattern.

### Synthetic NO example — "Use 8-space indentation in `tools/audit.py`"

Not from the corpus — illustrative only.

- **Named alternative?** Weak — "any other indentation," but the choice isn't substantively debated.
- **Future-revisitable?** No — once the file is reformatted, the decision is invisible. There's no condition that would flip it.
- **Rationale outlives the code site?** No — the rationale (if any) belongs in the formatter config (`pyproject.toml`, `.editorconfig`), not in the decision corpus.

Routing: `.editorconfig` entry. If the project enforces a uniform style across all files, a CLAUDE.md note. Never an NDR.

## Secondary uses

The rubric isn't just for capture-time. Other valid uses:

- **Atom corpus review** — periodically walk old atoms through the rubric to see which still earn their keep. Atoms that fail the rubric in hindsight are candidates for supersession-with-routing (the successor atom is a no-op that records "this should have been a CLAUDE.md entry; moved to `<location>`").
- **Collaborator onboarding** — train a new agent or human on what belongs in the corpus by walking them through the calibration examples.
- **`/drift-check` extension (future)** — surface atoms whose at-risk clauses no longer match the code AND whose original capture grain looks wrong in hindsight.

## Failure mode to watch

Rubrics-as-prompts can become checkbox theater that *lowers* judgment quality — every candidate "passes" because the rubric is satisfied on paper. The existing taxonomy gate is friction-as-feature precisely because it's a hard halt, not a guided form. Keep this rubric on the soft-prompt side of that line:

- It does NOT auto-drop candidates.
- It does NOT block persistence.
- It surfaces a one-line routing hint to the user during Step 3 of `capture-decision` ("this looks like a code comment — keep as NDR?"), then defers to the user's call.
- The user can always say "keep it" and the candidate proceeds normally.
