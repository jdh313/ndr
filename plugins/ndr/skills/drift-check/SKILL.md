---
name: drift-check
description: On-demand audit of code against current decision heads. Use when the user says "drift check", "ndr drift check", "audit decisions against code", "are my decisions still accurate", "ndr coherence check", or asks for an audit of the durable decision layer against current implementation. Enumerates current heads via the `ndr` CLI, compares each against a user-chosen diff scope (working tree, branch range, commit range, or full repo), and surfaces divergences with three resolutions per item — amend, supersede, or revert. Read-only — never edits atoms or code.
argument-hint: "[scope: working-tree | <base>...HEAD | HEAD~N..HEAD | full-repo]"
allowed-tools:
  - Bash
  - Read
  - Task
---

# drift-check

## Overview

Run a drift check between the current repo's code and the current heads of the resolved decision ledger. Dispatches the `ndr-drift-auditor` agent for the enumerate-and-compare and renders its structured report as a human-facing punch list.

This skill encodes the **code-vs-decision coherence check** for ndr — complementary to `ndr-curator` (which reports corpus health via `ndr doctor`) and `ndr-reviewer` (which checks individual atom shape).

## Tool usage

All NDR ledger access goes through the `ndr` CLI (ndr:0129) — and it happens inside `ndr-drift-auditor`, not in this skill. The agent enumerates current heads with `ndr current --verbose` and `Read`s head files for full bodies; the CLI owns the supersession walk. `obsidian-cli` and MCP vault tools are not used for NDR atoms — they are scoped to non-NDR vault operations (ndr:0100). This skill uses `Bash` for diff resolution and ledger resolution, and `Task` for agent dispatch. Atom writes go through `ndr capture` (via `/capture-decision`) — never create atom files directly. If `ndr` is not on PATH, hard-error with the install hint (`bun run install:bin` in `~/Projects/ndr`); there is no fallback path.

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

### 2. Resolve the ledger

Standard resolution, mirroring the CLI's own walk-up: if a `.ndr.toml` exists between the repo root and the filesystem root, use its `ledger` value (relative paths resolve against that file's directory, `~/` expands); otherwise stop and tell the user to run `ndr init` (the CLI itself errors without a config). Pass the resolved path to the agent so it can both flag CLI calls (`--ledger`) and `Read` head files by joined path.

### 3. Detect repo area hint (optional)

If a `CLAUDE.md` or `.claude/CLAUDE.md` exists in the repo, scan for any explicit hint about which `area:` values are relevant (e.g. "this repo's decisions live under `area: tooling`"). If found, pass as `area_filter` to the agent. Otherwise audit all heads — false positives are tolerable; missed drift is not.

### 4. Dispatch the agent

Invoke `ndr-drift-auditor` with:

```json
{
  "ledger": "<resolved ledger path>",
  "diff_scope": {
    "kind": "<resolved kind>",
    "ref": "<resolved ref or null>"
  },
  "repo_path": ".",
  "area_filter": "<optional area>"
}
```

### 5. Render the report

Render the agent's structured JSON as a punch list:

```
# ndr drift check — <YYYY-MM-DD>

Scope: <kind> (`<ref>`)
VCS: <git | jj>
Atoms scanned: <N> heads
Divergences: <K>

## Divergences

### 0042-use-fastapi-for-auth.md
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
Atoms scanned: <N> heads
No drift detected.
```

If the agent reports `malformed_skipped > 0`, append one line: `<M> malformed atom(s) skipped — run \`ndr doctor\` (or dispatch \`ndr-curator\`) for the full picture.`

### 6. Suggest next steps

After the punch list, offer the natural follow-ups for each divergence:

- For `recommendation: "amend"` or `"supersede"` — suggest `/capture-decision` to draft the successor atom (in ndr, both "amend" and "supersede" semantics land as a new atom with `supersedes: [<original>]`; the difference is scope of revision).
- For `recommendation: "revert"` — suggest the specific code change as a follow-up edit.
- For `recommendation: null` — no nudge; surface the resolutions and let the human decide.

Never auto-apply. The skill's job ends at the punch list plus next-step suggestions.

## When NOT to use this skill

- **Corpus health checks** (orphan back-pointers, alias conflicts, taxonomy violations, missing required fields, malformed files) — `ndr doctor` via `ndr-curator` instead.
- **Reading a single decision** — use `/decisions <ref-or-topic>`.
- **Writing a new decision** — use `/capture-decision`.
- **Style or lint drift** — that's a linter, not an ndr concern.
- **Automatic / pre-commit checks** — drift-check is on-demand by design.

## Related

- `ndr-drift-auditor` (agent) — does the actual enumerate + compare. This skill is its orchestrator.
- `ndr-curator` (agent) — corpus health via `ndr doctor`, complementary scope.
- `/capture-decision` — write-side; used to land amend/supersede outcomes as successor atoms.
- `/decisions` — read-side; useful before a drift check to confirm what's current on a topic.
- `spec-flow:close` — surfaces drift-check as an optional pre-archive prompt.
