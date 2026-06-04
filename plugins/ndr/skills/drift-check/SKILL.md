---
name: drift-check
description: On-demand audit of code against current `~/Loose Ends/Decisions/` atoms. Use when the user says "drift check", "ndr drift check", "audit decisions against code", "are my decisions still accurate", "ndr coherence check", or asks for an audit of the durable decision layer against current implementation. Walks the supersession chain to current heads, compares each against a user-chosen diff scope (working tree, branch range, commit range, or full repo), and surfaces divergences with three resolutions per item — amend, supersede, or revert. Read-only — never edits atoms or code.
argument-hint: "[scope: working-tree | <base>...HEAD | HEAD~N..HEAD | full-repo]"
allowed-tools:
  - Bash
  - Read
  - Task
---

# drift-check

## Overview

Run a drift check between the current repo's code and the current heads of `~/Loose Ends/Decisions/` atoms. Dispatches the `ndr-drift-auditor` agent for the walk-and-compare and renders its structured report as a human-facing punch list.

This skill encodes the **code-vs-decision coherence check** for ndr — complementary to `ndr-curator` (which checks corpus health between atoms) and `ndr-reviewer` (which checks individual atom shape).

## Vault tool usage

Per NDR atom 0100, vault tool calls follow a layered stack: `obsidian-cli` primary, tier-2 MCP for the explicitly-blessed operations. For this skill: the drift-check orchestrator does not read vault files directly — atom reads happen inside `ndr-drift-auditor`. That agent should use `obsidian-cli files Decisions/` to enumerate heads and `obsidian-cli read file=<path>` to load individual atoms; `mcp__obsidian-mcp__search_notes` (with `searchFrontmatter: true`) is available as a tier-2 fallback for frontmatter-based filtering if needed. This skill uses `Bash` for diff resolution and `Task` for agent dispatch. Atom file creation goes through `persist.py` — do not bypass it with `obsidian-cli create`.

## Hard rules

1. **Heads only.** Audit only atoms at the head of their supersession chain (empty `superseded_by:`, `status: current`). Non-heads are not the current state.
2. **Never mutate.** This skill surfaces divergences with three labeled resolutions per item (amend / supersede / revert). The human ratifies; the skill and agent do not edit atoms or code.
3. **Explicit scope.** Never silently default the diff scope. If the user didn't specify, ask.
4. **Don't fabricate divergence.** If the agent reports no drift, say so plainly — do not invent items to fill the report.
5. **On-demand only.** Drift-check is not a hook. If the user wants pre-commit drift detection, that's a separate decision to record before building.

## Inputs

`$ARGUMENTS` — optional diff-scope hint. Parsed as one of:

- `working-tree` — uncommitted + staged changes vs `HEAD`. Default frame for "before commit".
- `<base>...HEAD` — branch range diff (e.g. `main...HEAD`). Default frame for "before PR".
- `HEAD~N..HEAD` — commit range (e.g. `HEAD~10..HEAD`). Use for recent-window audits.
- `full-repo` — every head atom vs current `HEAD`. Most expensive; reserve for periodic sweeps.

If empty or ambiguous, prompt:

> "Which scope? `working-tree` | `<base>...HEAD` | `HEAD~N..HEAD` | `full-repo`"

## Method

### 1. Resolve diff scope

Parse `$ARGUMENTS`. If empty, ask the user (do not default silently).

### 2. Detect repo area hint (optional)

If a `CLAUDE.md` or `.claude/CLAUDE.md` exists in the repo, scan for any explicit hint about which `area:` values are relevant (e.g. "this repo's decisions live under `area: tooling`"). If found, pass as `area_filter` to the agent. Otherwise audit all heads — false positives are tolerable; missed drift is not.

### 3. Dispatch the agent

Invoke `ndr-drift-auditor` with:

```json
{
  "vault_decisions_path": "~/Loose Ends/Decisions",
  "diff_scope": {
    "kind": "<resolved kind>",
    "ref": "<resolved ref or null>"
  },
  "repo_path": ".",
  "area_filter": "<optional area>"
}
```

### 4. Render the report

Render the agent's structured JSON as a punch list:

```
# ndr drift check — <YYYY-MM-DD>

Scope: <kind> (`<ref>`)
VCS: <git | jj>
Atoms scanned: <N> heads (<M> non-heads skipped)
Divergences: <K>

## Divergences

### Decisions/0042-use-fastapi-for-auth.md
**At-risk clause:** "All token verification flows through `auth/verify.py`."

**Evidence:**
- `auth/middleware.py:23-41` — New middleware bypasses verify.py and calls a Starlette helper directly.

**Resolutions:**
- **Amend** — Successor atom narrowing 0042: middleware-layer adapters are exempt from the verify.py funnel when wrapping Starlette internals.
- **Supersede** — If middleware-layer auth is becoming the primary path, draft a successor that replaces 0042 wholesale.
- **Revert** — Remove the bypass in `auth/middleware.py:23-41` and route through `verify.py`.

**Recommendation:** Amend.
```

If `divergences: []`:

```
# ndr drift check — <YYYY-MM-DD>

Scope: <kind> (`<ref>`)
Atoms scanned: <N> heads (<M> non-heads skipped)
No drift detected.
```

### 5. Suggest next steps

After the punch list, offer the natural follow-ups for each divergence:

- For `recommendation: "amend"` or `"supersede"` — suggest `/capture-decision` to draft the successor atom (in ndr, both "amend" and "supersede" semantics land as a new atom with `supersedes: [<original>]`; the difference is scope of revision).
- For `recommendation: "revert"` — suggest the specific code change as a follow-up edit.
- For `recommendation: null` — no nudge; surface the resolutions and let the human decide.

Never auto-apply. The skill's job ends at the punch list plus next-step suggestions.

## When NOT to use this skill

- **Corpus health checks** (orphan back-pointers, alias conflicts, taxonomy violations, missing required fields) — use `ndr-curator` instead.
- **Reading a single decision** — use `/decisions <ref-or-topic>`.
- **Writing a new decision** — use `/capture-decision`.
- **Style or lint drift** — that's a linter, not an ndr concern.
- **Automatic / pre-commit checks** — drift-check is on-demand by design.

## Related

- `ndr-drift-auditor` (agent) — does the actual walk + compare. This skill is its orchestrator.
- `ndr-curator` (agent) — corpus health, complementary scope.
- `/capture-decision` — write-side; used to land amend/supersede outcomes as successor atoms.
- `/decisions` — read-side; useful before a drift check to confirm what's current on a topic.
- `spec-flow:close` — surfaces drift-check as an optional pre-archive prompt.
