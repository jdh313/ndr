---
name: migrate-ledger
description: "One-time, retirable migration of an NDR ledger from the old atom format (Obsidian callouts, area/topic, aliases, wikilinks) to the new repo-native format (labels, conviction, author, binds, single-altitude body). Use when the user says 'migrate the ledger', 'run the ndr migration', 'convert this ledger to the new format', or points at a repo whose decisions are still old-format. Orchestrates the full two-pass sequence: mechanical ndr migrate (pass 1), Claude-driven body reshaping in batches (pass 2), an ndr doctor acceptance sweep, and one reviewable PR. Runs once per ledger, then this skill and the ndr-migrator agent are deleted from the plugin."
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Edit
  - Task
---

# migrate-ledger

## Overview

Convert one NDR ledger to the new atom format. Two passes:

1. **Pass 1 — mechanical (`ndr migrate`).** Frontmatter conversion (wikilinks ->
   plain values; area+topic+tags -> labels; backfill author from git history and
   conviction: tentative; drop killed fields) and callout flattening. It also
   **carries the two fields the new schema drops but pass 2 needs** into the body,
   so the Read-only agent can see them: `revisit_triggers:` becomes a `## Revisit if`
   stub, and a hard-to-undo `reversibility:` becomes a strippable HTML-comment hint.
   Idempotent.
2. **Pass 2 — judgment (`@ndr-migrator`).** Per-atom body reshaping: extract
   `## Context`, filter old Consequences into real `## Commitments`, merge revisit
   conditions from **both** sources (body `## Assumptions` + the pass-1 `## Revisit
   if` stub) into one deduped `## Revisit if`, merge gist+callout duplication into
   single prose, reorder sections, and return a typed `suggested_conviction`.

This skill is **retirable**: once every tracked ledger is migrated, delete this
skill and `agents/ndr-migrator.md` from the plugin. The `ndr migrate` CLI command
stays (it is idempotent and harmless); the pass-2 tooling does not.

This skill is `disable-model-invocation: true` — it fires only on explicit
`/migrate-ledger`.

## When to invoke

- A repo's `decisions/` ledger is still old-format (callouts, `area:`/`topic:`,
  `aliases:`, wikilink refs) and needs converting to the new format.
- Run once per ledger across the tracked repos.

## When NOT to invoke

- The ledger is already new-format (`ndr doctor` is clean, atoms carry
  `conviction:`/`labels:`). Re-running pass 1 is safe (idempotent) but pass 2 is
  wasted work.
- You only want the mechanical pass — call `ndr migrate` directly.

## Method

### Step 0 — Locate the ledger and confirm it is old-format

    ndr migrate --dry-run --json

The summary's `migrated` count is the number of old-format atoms pass 1 would
touch; `skipped` are already-new-format. If `migrated` is 0, stop — nothing to do.

### Step 1 — Pass 1 (mechanical)

    ndr migrate --json

This rewrites frontmatter in place, flattens callouts, seeds
`.taxonomy/labels.yaml` from the old areas+topics+stray tags, and removes the old
axis files. Commit as a discrete mechanical commit:

    git add -A && git commit -m "refactor: ndr migrate pass 1 (mechanical frontmatter + callout flattening)"

### Step 2 — Pass 2 (body reshaping, batched)

List the migrated atoms and dispatch `@ndr-migrator` in batches of ~8-10 files,
passing the absolute paths. The agent returns, per atom, the reshaped `body`
(frontmatter untouched) plus a typed `suggested_conviction`.

Apply the bodies with the CLI, not by hand — it splices each body while preserving
frontmatter and guarantees the fence gap + trailing newline:

    # Save the agent's JSON return to a file (raw — no re-encoding), then:
    ndr migrate --apply-bodies batch.json --json

Do NOT hand-roll a body applier with Edit — that re-invents frontmatter-clobber
risk. If the agent's return arrives double-JSON-encoded through the mailbox, save
it raw anyway; `--apply-bodies` tolerates one layer of double-encoding.

Then act on each `suggested_conviction`: it is a typed value (`strong` / `tentative`
/ `arbitrary` / `null`), so batch the frontmatter bumps rather than parsing prose.
A `null` leaves pass-1's `tentative` seed in place.

### Step 3 — Quality gate per atom

For each reshaped atom, dispatch `@ndr-reviewer` in audit mode (pass the file path)
to grade atomicity and body shape against the new template. Fix blocking findings.

### Step 4 — Acceptance sweep

    ndr doctor --json

Expected: no `missing_context` findings; a `placeholder_context` advisory is
acceptable for atoms whose context genuinely couldn't be reconstructed. Resolve any
`taxonomy`, `missing_fields`, or `frontmatter_body_drift` findings.

### Step 5 — Assemble one reviewable PR

Commit pass 2 as a separate commit, push the branch, open a PR linking the redesign
spec. Keep pass 1 and pass 2 as distinct commits.

## Grandfathering

An atom whose Context genuinely can't be reconstructed keeps `## Context` with a
single bullet `- (not reconstructed at migration)`. Doctor treats a
placeholder-only Context as advisory, a missing Context as a finding. New captures
always require real Context.

## Notes

- Pass 1 is idempotent — safe to re-run. Pass 2 is one-time judgment work.
- Delete this skill and `ndr-migrator` once all ledgers are converted.
