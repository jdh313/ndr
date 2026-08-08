---
name: ground
description: >
  Ground a coding session in relevant prior decisions before substantive edits.
  **This is the default first move on any substantive code task in a tracked NDR
  project** (refactor, new feature, migration, schema change, dependency swap) —
  invoke it before reaching for grep / Read / Linear context. Also use when
  delegating code work to a coding subagent (junior-dev / senior-dev /
  tech-lead) so the delegation prompt can include the live decision heads, or
  when the user says "what decisions touch this", "ground me in the NDRs", "what
  governs this area", "are there decisions about X in this repo". **Use even
  when ticket bodies or prior chat name specific atom IDs** — named atoms may be
  superseded; `Read`ing them directly bypasses the supersession walk and is the
  single biggest failure mode of this plugin. Resolves structured scopes with
  direct `ndr` CLI calls (the CLI walks supersession in-process); free-text
  scopes dispatch `@ndr-reader`. Returns a compact brief plus the `ndr:`
  reference strings the caller can paste into prompts, code comments, or commit
  messages.
argument-hint: '[scope-or-question]'
allowed-tools:
  - Read
  - Bash(pwd)
  - Bash(git rev-parse *)
  - Bash(command -v ndr)
  - Bash(ndr *)
  - Agent
---

# ground

## Overview

Surface the current decisions that govern an active piece of code work,
so the orchestrator can either consult them directly or fold them into a
delegation prompt for a coding subagent. The skill detects scope, runs
the matching `ndr` CLI query (or dispatches `@ndr-reader` for fuzzy
scopes), and presents the brief.

This is the read-side companion most useful **before** code is written:
`/decisions` answers "what did we decide about X?" when the user asks;
`/ground` answers "what should this coding agent know before it starts?"
without waiting for an explicit question.

## When to activate

1. **Starting substantive work on a tracked project** — repo with NDR
   coverage; before edits beyond trivial fixes.
2. **Before delegating to junior-dev / senior-dev / tech-lead** — so the
   delegation prompt carries the live heads, not stale recollection.
3. **The user asks for grounding** — "what decisions touch this",
   "ground me in the NDRs for this area", "are there decisions about X".
4. **A file path or area is about to change** — refactor, migration,
   schema change, dependency swap.

**Do NOT activate** for:

- Single-line fixes or typo corrections.
- Questions about the meaning of one specific atom the user already
  named (use `/decisions ndr:NNNN` instead).
- Projects with no NDR coverage — return a one-line "no decisions on
  this project" and stop.

## Prerequisite

`ndr` must be on PATH. Check once with `command -v ndr`; if missing, stop:

> "The `ndr` CLI isn't installed — run `bun run install:bin` in
> `~/Projects/ndr`, then retry."

There is no fallback path.

## Inputs

- `$ARGUMENTS` — free-form. May be:
  - empty → infer scope from CWD + a one-line summary of the active task
  - a file path → `src/auth/middleware.py`
  - an area phrase → `auth`, `migrations`, `repo shape`
  - a full question → `what governs the auth substrate in this repo?`

If empty and the active task is unclear from conversation context, ask
the user one tight question — "Grounding for what area? (file path, area
name, or short phrase)" — and proceed.

## Workflow

### 1. Detect the active scope

Build a scope picture from whatever signals are available:

- `cwd` — `pwd` (or `git rev-parse --show-toplevel` when inside a repo).
- `project` — if the repo root has a `.ndr.toml` with a `project` key,
  that is the project; the same file pins the ledger, so the CLI calls
  below automatically resolve against the right corpus. No probing
  needed. Without one, leave project unset.
- `label` words — from `$ARGUMENTS` or from recent context
  (files just edited, files the user named). `src/auth/` → `auth`,
  `migrations/` → `migrations`.
- `ref` — if `$ARGUMENTS` matches an `ndr:` reference, use it directly.

Keep this lightweight. Do not load atoms here.

### 2. Query

Pick the strongest signal, in priority order:

| Signal | Command |
| --- | --- |
| `ndr:` ref (atom-id, `label`) | `ndr resolve '<ref>'` |
| label word matching taxonomy | `ndr current --label <label> --verbose` |
| 1–3 concrete search terms | `ndr search '<terms>' --verbose` |
| fuzzy scope needing judgment/synthesis | dispatch `@ndr-reader` (payload below) |

Ledger resolution is automatic (`.ndr.toml` walk-up from CWD; the CLI
errors if none exists) — don't pass `--ledger` unless the user named one.

A non-zero exit with a real error (not just "no atoms match") is
surfaced, not swallowed (ndr:0138).

For fuzzy scopes, invoke `@ndr-reader` with:

```markdown
## Intent
ground the active coding session in current decisions for <scope summary>

## Constraints
- scope: <project or "unspecified">
- cwd: <repo root>
- file path: <path-or-unset>

## Input
<the user's free-text scope, or a one-line summary of what the orchestrator
 is about to do>

## Output shape
brief
```

### 3. Present the brief (non-interrupting)

If heads came back:

- **Inline (1–2 heads):** show the brief verbatim from the CLI (or agent
  payload), prefixed with `**NDR grounding:**`.
- **Batch (3+ heads):** present as a compact table of titles + atom-ids
  + `ndr:` refs, with a one-line invitation: "Pull any of these into the
  working context? (1-N, all, skip)".
- **Full body when it matters** — the default brief is gist-only;
  `## Scope` / `## Commitments` / `## Revisit if` / `## Context` /
  `## Why` / `## Alternatives` are omitted (ndr:0136).
  When a head's reasoning or revisit conditions plausibly bear on the edit
  at hand, pull its complete body with `ndr resolve <ref> --full` (or
  `ndr show <atom-id>` for one specific atom) — do **not** open the ledger
  file by hand. The CLI owns the read; *seed* atoms must never be read
  directly.

If nothing matched:

- Surface a single line: `No NDR coverage for <scope>. Proceeding
  without grounding.` Do not nag.

### 4. Optionally hand off

If the orchestrator is about to dispatch a coding subagent (`junior-dev`,
`senior-dev`, `tech-lead`), append the `ndr:` reference strings from the
brief to the delegation prompt so the subagent has stable identifiers it
can include in code comments or commit messages without having to query
the ledger itself.

## Output examples

### Single relevant head

```markdown
**NDR grounding** (`auth` in `Apex`):

Auth substrate = Okta + custom session middleware (0042-okta-session-substrate)
  labels: [auth, substrate], decision: 2026-04-18
  conviction: strong

<gist as emitted by the CLI>

Lineage: 0030 → 0042

References:
  - ndr:0042
  - ndr:auth
  - ndr:substrate

⚠ Revisit if: this product surface moves to a tenant outside the company.
```

### Multiple heads (batch)

```markdown
**NDR grounding** (`repo shape`):

| Atom | Title | Ref |
|---|---|---|
| 0011 | Monorepo, symmetric apps layout | ndr:0011 |
| 0013 | Python packaging in monorepo | ndr:0013 |
| 0021 | Per-app CI builders, shared cache | ndr:0021 |

Pull any of these into the working context? (1-N, all, skip)
```

### No coverage

```markdown
No NDR coverage for `marketing-site` repo. Proceeding without grounding.
```

## Hard rules

1. **The CLI owns the walk.** Never `Read` an atom file directly, even
   when a ticket body or prior chat names specific atom IDs —
   `ndr resolve` returns the head and surfaces drift. When you need a
   head's full body (commitments, revisit conditions, reasoning), get it from
   the CLI — `ndr resolve <ref> --full` or `ndr show <atom-id>` — not by
   opening the file (step 3).
2. **Don't surface superseded atoms.** The CLI never returns one as a
   head; don't reintroduce them from memory.
3. **Stay quiet on empty.** No-coverage scenarios get one line. Don't
   nag, don't re-prompt for a different scope unless the user asks.
4. **Don't capture or write.** Grounding is read-only. If the user wants
   to record a new decision, redirect to `/capture-decision`.

## When NOT to use this skill

- The user already named a specific atom (`ndr:0011`, `0042`) — they
  want `/decisions` with a ref argument, not active-context grounding.
- The user is asking a topic-shaped question ("what did we decide about
  X?") — `/decisions` is the right surface.
- The repo has no NDR coverage and the user knows it.
- The work is too small to need grounding (typo fix, comment update).

## Related

- `ndr resolve` / `ndr search` / `ndr current` — the CLI surface this
  skill drives (ndr:0129; brief format pinned by ndr:0136).
- `@ndr-reader` — fuzzy-scope search + synthesis worker.
- `/decisions <ref-or-query>` — user-facing slash command for explicit
  queries with a topic or ref in hand.
- `/capture-decision` — the write-side companion. Ground first, then
  capture if the conversation produces a new decision.
- `${CLAUDE_PLUGIN_ROOT}/references/workflow.md` — full retrieval flow.
