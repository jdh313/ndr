---
name: capture-decision
description: Capture engineering decisions from the current conversation as atomic markdown artifacts in the decision ledger. Use when the user invokes `/capture-decision`, says "capture this decision", "record this", "let's write this up as a decision", or signals at end of a chat that decisions landed and should be persisted. Materializes one file per atomic decision with required frontmatter, enforces taxonomy, and structurally protects the supersession primitive (refuses to write a revising decision without `supersedes:`). The write itself goes through `ndr capture` — the CLI owns id assignment, validation, and the two-write supersession transaction.
argument-hint: "[optional hint about what to capture]"
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - Agent
---

# capture-decision

## Overview

Thin orchestrator for the NDR capture pipeline. The work itself is delegated:

```
in-skill scan ──► user confirms candidates ──► ndr-drafter ──► ndr-reviewer ──► ndr capture ──► summary
```

This skill detects atomic decisions in the current conversation, confirms them with the user, delegates composition to the `ndr-drafter` subagent, sends drafts to `ndr-reviewer` for a verdict, then pipes each accepted draft to `ndr capture` for the deterministic write. Each stage has a single responsibility; the skill itself owns scope detection and user interaction.

## Prerequisite

`ndr` must be on PATH. Check once with `command -v ndr`; if missing, stop:

> "The `ndr` CLI isn't installed — run `bun run install:bin` in `~/Projects/ndr`, then retry."

There is no fallback path.

## Hard rules

These constraints are upstream of any subagent — the skill enforces them at the orchestration layer.

1. **Atomic only.** One chosen path, one set of consequences. Bundled candidates get split before reaching the drafter. Never let a bundle through.
2. **Supersession refusal is structural, not advisory.** If revising intent appears in the conversation ("revises", "supersedes", "instead of", "we changed our mind on") OR `informed_by:` points at a `current` decision being contradicted, AND the user has not named what's being superseded — refuse to proceed. Print:
   > "This looks like a revising decision but `supersedes:` is empty. Name the decision(s) being revised, or confirm this is a fresh decision."
3. **Review-then-persist.** No draft hits disk until the reviewer passes and the user accepts. There is no `draft` status. Drafts live in memory.
4. **Labels enforcement.** `labels:` (1-4 values) must come from `<ledger>/.taxonomy/labels.yaml`. Unknown values trigger "use existing or add new?" before drafting. `ndr capture` re-checks; the orchestrator's check is the friendly-prompt layer.
5. **Single-file atoms.** `<id>-<kebab-title>.md`. No directory form, no descent files. Length is managed by the fixed section shape in the body template (single altitude, plain markdown, no callouts).
6. **The CLI assigns ids.** Atoms get 6-char base32 ids generated inside `ndr capture` (ndr:0144). Never assign or guess an id in a draft; the body's `# PLACEHOLDER —` heading is patched by the CLI.

## Inputs

- `$ARGUMENTS` — optional free-text hint about what to capture. If absent, scan the whole conversation.

## Reference paths

- **Ledger:** resolved by the CLI — `--ledger` flag > `NDR_LEDGER` env > `.ndr.toml` walk-up from CWD > error pointing at `ndr init`. One atom per file, `<id>-<kebab-title>.md`.
- **Taxonomy (ledger-resident, mutable):** `<ledger>/.taxonomy/labels.yaml`.
- **Schema spec:** `${CLAUDE_PLUGIN_ROOT}/references/frontmatter-schema.md`.
- **Template:** `${CLAUDE_PLUGIN_ROOT}/references/decision-single.md`.
- **Worthiness rubric:** `${CLAUDE_PLUGIN_ROOT}/references/worthiness.md` — three-question test for "is this NDR-grain or should it route elsewhere?"
- **Subagents:** `ndr-drafter`, `ndr-reviewer` (and `ndr-extractor` for long-source captures, `ndr-curator` for periodic audits — both out of scope for the routine capture flow).

## Method

### Step 1 — Scan

Scan the current conversation for atomic decisions. The context is already loaded — no subagent needed here. Atomic = one chosen path with one set of consequences. Common shapes:

- "Use X for Y" (one tool, one purpose)
- "Don't do X" (a rejected path)
- "X over Y because Z" (a chosen path with a named alternative)

Split bundles. "We'll use FastAPI and Postgres" is two atoms. "Use FastAPI because it's async and we already have Postgres" is one atom (Postgres is context).

Discard non-decisions: open questions, observations, tasks, hypotheticals.

**If the source is too long to scan inline** (e.g. the user pastes a full transcript or asks you to capture from a file), invoke the `ndr-extractor` subagent with the source. It returns structured candidates. For routine in-conversation captures, scan inline.

### Step 2 — Detect supersession intent

Before confirming candidates, scan the conversation for revising intent:

- Phrases: "revises", "supersedes", "instead of", "we changed our mind on", "switching from X to Y".
- Substantive: a candidate directly contradicts a decision named in `informed_by:` context, or named in chat by id.

For each candidate with revising signal, you'll need to ask the user: **what is being superseded?** Note this against the candidate; ask in Step 3.

### Step 2.5 — Worthiness pass

Atomicity (Step 1) checks *shape*. This pass checks *grain* — is the candidate actually NDR-worthy, or would it live better as a code comment, CLAUDE.md gotcha, or rule file? Full criteria in `${CLAUDE_PLUGIN_ROOT}/references/worthiness.md`; load and skim if any candidate is borderline.

For a candidate that is **borderline AND consequential** (the routing call is close *and* getting it wrong is expensive), pull the one or two deep moves that resolve the doubt from `${CLAUDE_PLUGIN_ROOT}/references/interrogation.md` — usually the asymmetry check ("is this `hard` enough to matter?") or the forward-bind check ("a decision, or just documentation?"). This is a targeted pull, not the full walk — when a candidate needs the whole eight-move deliberation, that's `/interrogate-decision`'s job, run before capture.

For each candidate, ask:

1. **Named alternative?** Is there a chosen path with an alternative anyone could plausibly have picked?
2. **Future-revisitable?** Could future-you or a future agent want to revisit or override this?
3. **Rationale outlives the code site?** Or does the WHY rot when the function is rewritten?

Tag each candidate:

- **`ndr-worthy`** — all three yes. Pass through silently in Step 3.
- **`borderline`** — one is a maybe, or the candidate is project-wide enough that a CLAUDE.md/rule entry should complement the NDR. Tag with a one-line routing note for Step 3.
- **`not-ndr`** — fails the test, or is a clear fit for one of the routing buckets in `worthiness.md` (single-call-site WHY → code comment; data wart → CLAUDE.md gotcha; still considering → daily note; framework default → don't capture). Tag with the suggested home.

This pass does **not** auto-drop candidates. It surfaces a routing nudge to the user in Step 3; the user always has the final say. This is friction-as-friendly-prompt, not a hard gate — the hard gates are `## Hard rules` and the taxonomy preflight (Step 4).

### Step 3 — Confirm candidates

Present each candidate as a one-line summary. Append routing nudges for `borderline` / `not-ndr` tags and the revising question for candidates with supersession signal:

```
I see N atomic decisions in this conversation:

  1. Use FastAPI for the auth service
  2. Single Postgres instance, no read replicas at MVP
  3. Switch from JWT to PASETO  ← revises a prior decision; which one? (atom id)
  4. Use stacked-files layout for multi-disc Jellyfin rips
       └─ borderline: convention-with-rationale; consider also adding a homelab CLAUDE.md entry referencing this NDR
  5. Use 4-space indentation in tools/audit.py
       └─ not-ndr: single-file style choice → suggest .editorconfig instead. Keep as NDR anyway?

Confirm, edit titles, drop any, route, or answer the revising question.
```

Wait for the user's response. Capture for each confirmed candidate:

- Title (user can edit)
- `supersedes:` list (plain atom ids like `["0042"]`) — required when revising signal triggered; defaults to `[]`.

If revising signal triggered and the user neither named a predecessor nor confirmed "this is fresh", refuse. Print the rule-2 message and stop.

### Step 4 — Labels preflight (optional but friendly)

For each candidate, suggest 1-4 `labels:` based on the conversation. Read `<ledger>/.taxonomy/labels.yaml` once and cache. If a suggested value is not in the taxonomy:

```
"<value>" is not in labels.yaml.
Use existing: <comma-separated list>
Or add new: <value>?
```

If "add new", `Edit` `labels.yaml` to append the value before drafting. `ndr capture` will re-validate — this preflight is friendly UX, not the structural gate.

### Step 5 — Delegate composition

Invoke the `ndr-drafter` subagent. Pass:

```json
{
  "candidates": [
    {
      "title": "Use FastAPI for the auth service",
      "gist": "...",
      "quotes": ["..."],
      "suggested_labels": ["tooling", "substrate"],
      "suggested_project": "Auth Rewrite",
      "supersedes": [],
      "derived_from": ["<chat / mull source path or ref>"],
      "informed_by": [],
      "decision_date": "<ISO today>",
      "project": "Auth Rewrite",
      "conviction": "tentative",
      "binds": []
    }
  ]
}
```

The drafter returns `{drafts: [{frontmatter, body, missing_fields}]}`. If any `missing_fields` are non-empty: prompt the user, fill in the values, and re-invoke the drafter with the filled candidate. Repeat until all drafts come back with `missing_fields: []`.

### Step 6 — Review

Invoke `ndr-reviewer` with `{mode: "pre-persist", drafts: [...]}`. The reviewer returns either:

- `{verdict: "pass", issues: []}` — proceed to Step 7.
- `{verdict: "fail", issues: [...]}` — surface issues to the user. For `severity: load-bearing` (atomicity, body altitude), the user must decide whether to edit the candidate(s) and re-draft, or proceed despite the warning (rare — prefer fixing). For `severity: mechanical`, you may auto-fix (e.g. set missing field) and re-invoke the reviewer.

Do not call `ndr capture` until the reviewer passes (or the user explicitly overrides a load-bearing flag).

### Step 7 — Persist

`ndr capture` is **single-atom**: loop over the accepted drafts and pipe each one to the CLI as JSON on stdin. Use a quoted heredoc — it avoids shell-quoting hazards (JSON quotes, newlines, `$`, backticks pass through verbatim) and keeps each persist call to a single Bash invocation. The draft payload is `{frontmatter, body}`.

**Normalize the payload before piping** (defense-in-depth — a stray field from any caller, not just `ndr-drafter`, must not fail the write):

- **Strip `missing_fields`** — drafter scratch, not part of the payload.
- **Strip `frontmatter.id` if present** — the CLI mints the id only when the field is absent; a leftover placeholder string (e.g. `"TBD — assigned by ndr capture"`) is validated and rejected. Delete the key so the mint path runs.
- **Normalize the body H1 to `# PLACEHOLDER — <title>`** — the CLI patches the `# PLACEHOLDER —` sentinel into `# <id> — <title>`. If a draft arrived with the title already inline (`# <title>` or `# <id> — <title>`), the sentinel is absent and the heading never gets the id. Rewrite the first H1 line to `# PLACEHOLDER — <title>` before piping.

Then pipe the cleaned `{frontmatter, body}`:

```bash
ndr capture <<'NDR_DRAFT_EOF'
{"frontmatter": { ...one draft's frontmatter... }, "body": "..."}
NDR_DRAFT_EOF
```

The body's `# PLACEHOLDER —` heading is patched to the assigned id by the CLI — leave it as the drafter produced it.

**Branch on the exit code before touching stdout** (ndr:0146 — errors go to stderr as JSON; stdout is only populated on success):

- `0` — success. Parse stdout: `{id, path, superseded}` (array even for one predecessor). Accumulate for the summary.
- `1` — validation failure (bad JSON, required fields, enums, taxonomy). Surface `error.messages` and loop back to drafting for that atom.
- `2` — supersession conflict (predecessor already superseded by a different atom). Surface and stop — manual resolution.
- `3` — mid-transaction failure (half-state). Surface the half-state report so the user knows exactly what was written vs patched and what to repair by hand.

Continue the loop for remaining drafts only after exit 0; on 2 or 3, stop the run and summarize what landed before the failure.

### Step 8 — Summarize

Report what was written and what was patched. One line per file. See Output examples below.

## When to use the extractor subagent

The default flow scans the conversation inline (Step 1). Invoke `ndr-extractor` instead when:

- The user pastes a long transcript, doc, or PR thread.
- The user asks to capture decisions from a file path or wikilink.
- The conversation has accumulated so much context that an inline scan would be unreliable.

The extractor returns the same `{candidates: [...]}` structure that Step 3 expects.

## Output examples

### Fresh decision

```
Captured 1 decision:

  k3m9xq-use-fastapi-for-auth.md
    labels: [tooling, substrate]
    supersedes: [] (fresh decision)
```

### Revising decision

```
Captured 1 decision with supersession:

  v8t2ne-split-apps-into-services.md (successor)
    labels: [architecture, repo-shape]
    supersedes: ["0011"]

  Patched:
    0011-monorepo-symmetric-apps-layout.md
      status: current → superseded
      superseded_by: [] → ["v8t2ne"]
```

### Refused (supersession-blind)

```
Refused: "Switch to Litestar for auth" looks like a revising decision
(intent words: "switch to", "instead of FastAPI"),
but `supersedes:` is empty.

Name the decision being revised, or confirm this is fresh.
```

### Half-state (exit 3 from ndr capture)

```
HALF-STATE during supersession:

  Successor written: v8t2ne-split-apps-into-services.md
  Patch failed on: 0011-monorepo-symmetric-apps-layout.md
  Reason: file not found

Manual fix: edit 0011-..., set status: superseded,
append "v8t2ne" to superseded_by.
```

## When NOT to use this skill

- The user is **considering** a decision, not making one. (Capture afterward.)
- The user wants a quick journal entry — use `/note-capture` (daily-note append).
- The user wants to revise a decision's *body* without changing its substance — edit the file directly; don't write a new atom.

## Related

- `/decisions <topic>` — the read-side companion. Use it BEFORE capture to check whether a current decision on the topic already exists (avoid accidental parallel decisions).
- `/interrogate-decision` — the deep pre-capture deliberation. Run it BEFORE this skill when a candidate is consequential enough to stress-test (genuine fork, possible supersession, "is this even a decision?"); it produces a routing verdict and hands the confirmed candidate here.
- `ndr capture` — the deterministic write path (ndr:0129, ndr:0146); owns ids (ndr:0144) and the two-write supersession transaction (ndr:0051).
- `ndr-extractor` — long-source candidate extraction.
- `ndr-drafter` — frontmatter + body composition.
- `ndr-reviewer` — pre-persist judge (atomicity, body altitude, soft mechanical checks).
- `ndr-curator` — corpus-level health audit (run periodically, not per-capture).
- `${CLAUDE_PLUGIN_ROOT}/references/frontmatter-schema.md` — full schema spec.
- `${CLAUDE_PLUGIN_ROOT}/references/taxonomy.md` — taxonomy rules and growth protocol.
- `${CLAUDE_PLUGIN_ROOT}/references/worthiness.md` — three-question rubric for grain/routing (Step 2.5).
- `${CLAUDE_PLUGIN_ROOT}/references/interrogation.md` — deep deliberation heuristics; Step 2.5 pulls individual moves for borderline-and-heavy candidates.
- `${CLAUDE_PLUGIN_ROOT}/references/workflow.md` — capture + read end-to-end.
