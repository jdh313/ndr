---
name: decisions
description: Supersession-aware reader for engineering decisions. Use when the user invokes `/decisions <query>`, asks "what did we decide about X", "is there a decision about Y", "current state on Z", or supplies an `ndr:` reference and wants the resolved atom. **Use even when you already know specific atom IDs** (e.g. ticket bodies, prior chat) — named atoms may be superseded and the supersession walk to the head is the whole point. **Never `Read` an atom file directly from the ledger as a shortcut; route through this skill, the `ndr` CLI, or `@ndr-reader`.** Parses the argument (atom-id, label, or free-text) and resolves structured references with a single `ndr resolve` call — the CLI walks the supersession chain in-process. Free-text queries dispatch `@ndr-reader` for search + synthesis. Returns a brief that reflects the **head** of the supersession chain — never a stale starting point. For active-work grounding (before code edits, before delegating to a coding subagent) use `/ground` instead.
argument-hint: "<ref-or-query>"
allowed-tools:
  - Bash(command -v ndr)
  - Bash(ndr *)
  - Agent
---

# decisions

## Overview

Look up current engineering decisions when the user (or another agent)
already knows the topic, area, or `ndr:` reference. Structured references
resolve with one `ndr resolve` call (the CLI owns the supersession walk —
ndr:0129); free-text queries go to `@ndr-reader` for search + synthesis.

This skill is the **user-driven** read entry point. For active-work
grounding (skill detects scope, surfaces relevant atoms before code
edits) use `/ground`.

## Hard rules

1. **The CLI owns the walk.** Never `Read` an atom file directly from the
   ledger as a shortcut, even when the user names a specific atom ID. A
   named atom may be superseded; `ndr resolve` returns the head and
   surfaces the drift. Never reconstruct the brief yourself — present
   what the CLI emits (ndr:0136).
   - **The gist is partial, not the whole atom.** The default brief shows
     only the `## Decision` gist; `## Scope` / `## Commitments` / `## Revisit
     if` / `## Context` / `## Why` / `## Alternatives` are withheld by
     design. When you need the complete
     body, do **not** open the ledger file — the CLI carries it:
     `ndr resolve <ref> --full` (supersession-aware, the current head's
     full body) or `ndr show <atom-id>` (one specific atom, frozen — the
     only way to read a *superseded* atom's body, e.g. a historical
     `ndr:0042` anchor). The never-`Read`-the-file rule still holds; these
     verbs are how you read the full body without it.
2. **Surface errors, don't swallow them.** A non-zero exit from
   `ndr resolve <ref>` is a hard signal (ndr:0138) — show the stderr
   message. For a 6-char token that fails as an atom-id, fall back to
   free-text (Stage 1b); for everything else, stop.
3. **Don't fabricate.** If nothing matches, say so. Do not guess what the
   user probably decided.
4. **Treat returned decisions as ground truth.** Don't re-derive current
   state from older artifacts (READMEs, ADRs, code comments) once the
   CLI has returned a head.

## Prerequisite

`ndr` must be on PATH. Check once with `command -v ndr`; if missing, stop:

> "The `ndr` CLI isn't installed — run `bun run install:bin` in
> `~/Projects/ndr`, then retry."

There is no fallback path.

## Inputs

- `$ARGUMENTS` — one of three forms:
  - **atom-id** — `0011` (legacy 4-digit) or `k3m9xq` (6-char base32)
  - **label** — a value from `labels.yaml`, e.g. `auth-substrate`
  - **free-text** — anything else, used as topic search terms
  - If empty, prompt: "What ref or topic? (e.g., `0011`, `auth-substrate`, `auth substrate`)".

Strip a leading `ndr:` prefix before parsing — `ndr:0011` and
`ndr:auth-substrate` are all valid.

## Method

### Stage 0 — Parse the argument

Strip a leading `ndr:` if present, then categorize:

| Pattern | Form | Action |
| --- | --- | --- |
| `^\d{4}$` or `^[0-9a-z]{6}$` | atom-id | `ndr resolve '<id>'` |
| matches a value in labels.yaml, no whitespace | label | `ndr resolve '<label>'` (add `--verbose` for full briefs) |
| anything else | free-text | Stage 1b |

The ledger resolves automatically (`--ledger` flag > `.ndr.toml` walk-up
from CWD; the CLI errors if none exists) — only pass `--ledger` when the
user names a different ledger explicitly.

### Stage 1a — Structured ref: run the CLI

Run the command from the table. Exit 0 → present stdout verbatim
(Stage 2). Exit non-zero → present the stderr message; if the ref was a
6-char token that might be a word rather than an id, retry as free-text
(Stage 1b) and note the reinterpretation.

### Stage 1b — Free-text: dispatch `@ndr-reader`

Invoke `@ndr-reader` with the canonical payload:

```markdown
## Intent
resolve a user-supplied decision topic and return current-head briefs

## Constraints
(none — free-text)

## Input
<the original $ARGUMENTS verbatim>

## Output shape
brief
```

The agent runs `ndr search` / `ndr current`, synthesizes across heads,
and returns the canonical `## Result / ## Sources / ## Notes` payload.

### Stage 2 — Present the result

Surface the brief verbatim — the CLI output (or agent payload) is
already formatted (ndr:0136), including the `Drift:` line when the seed
was superseded, the `Lineage:` chain, and the `References:` block.

If the result is "no atoms match", present that and offer:

```
No decisions on "<query>". Options:
  - broaden the search ("<broader terms>")
  - check a specific atom by id ("/decisions 0011")
  - capture one now if a decision should exist ("/capture-decision")
```

## Output examples

### Atom-id resolution (superseded seed — drift surfaces)

```
**Atom 0070:**

⚠ Drift: seed 0070 superseded → head 0102

Markdown remains canonical for NDRs; swamp migration paused (0102-markdown-remains-canonical-for-ndrs-swamp-migration-paused)
  labels: [substrate], decision: 2026-05-28
  conviction: strong

<gist as emitted by the CLI>

Lineage: 0070 → 0102

References:
  - ndr:0102
  - ndr:substrate
```

The gist shown here is partial by design (ndr:0136). If the user needs the
full reasoning — Scope, Commitments, Revisit if, Context, Why, Alternatives — re-run
with `ndr resolve <ref> --full` for the head's complete body, or
`ndr show <atom-id>` to read one specific (possibly superseded) atom frozen.
Do not open the ledger file by hand.

### Label resolution (multiple heads)

```
**Current decisions labeled "repo-shape":**

<the CLI's list output verbatim — one line per head, or full briefs with --verbose>
```

### No hits

```
No decisions matched "load balancer".
(ndr search across the ledger found no atoms.)
```

## When NOT to use this skill

- The user wants to **make** a decision — direct them to discuss first;
  suggest `/capture-decision` at the end.
- The orchestrator wants to **ground a coding subagent** for active work
  — use `/ground` instead.
- The user wants a list of all decisions — `ndr current` (optionally
  `--label`), or the "Current Decisions" Obsidian Base.

## Related

- `ndr resolve` / `ndr search` / `ndr current` — the CLI surface this
  skill drives (ndr:0129; brief format pinned by ndr:0136).
- `@ndr-reader` — free-text search + synthesis worker.
- `/ground [scope]` — active-work-grounding companion.
- `/capture-decision` — the write-side companion. Always check current
  state on a topic before capturing a new decision on it.
- `${CLAUDE_PLUGIN_ROOT}/references/workflow.md` — full retrieval flow.
