# Workflow

How `/capture-decision`, `/decisions`, `/ground`, and the audit surfaces (`/drift-check`, `@ndr-curator`) interact, end-to-end. All NDR corpus operations route through the `ndr` CLI (ndr:0129) — the CLI walks supersession chains in-process, so no skill or agent ever re-implements the walk.

## The `ndr` CLI

The shared substrate for both flows. Installed via `bun run install:bin` in `~/Projects/ndr` (ndr:0147); skills hard-error with that hint when the binary is missing — there is no fallback path.

| Verb | Job |
| --- | --- |
| `ndr resolve <ref> [--json]` | Resolve any reference grain (atom-id, label) to current-head brief(s), with drift surfaced when the seed was superseded |
| `ndr search <query> [--json]` | Free-text search across atom titles + bodies; returns current heads |
| `ndr current [--label] [--json]` | List current heads, optionally filtered by label; the count goes to stderr |
| `ndr lineage <id> [--json]` | Walk a supersession chain explicitly |
| `ndr capture [file]` | Write path — single atom draft as JSON, from a file arg or stdin |
| `ndr doctor [--fix] [--json]` | Corpus health checks; exit 1 when findings present; `--fix` repairs missing back-links; `--json` for machine consumers |
| `ndr init` | Scaffold a repo's opt-in (`.ndr.toml`, ledger, taxonomy, `.claude/rules/ndr.md`) |
| `ndr status [--json]` | Report wiring: resolved ledger + source, atom counts, taxonomy, grounding marker |
| `ndr labels` | List the resolved ledger's taxonomy labels |

Every read verb takes `--json` for structured output — a complement to the pinned human brief (ndr:0136) so skills parse data instead of formatted text.

### Ledger resolution

Every verb resolves its ledger the same way:

1. `--ledger <path>` flag (wins outright)
2. `NDR_LEDGER` env var (a shell-session override; only the flag beats it)
3. *(capture only)* the draft payload's `vault_decisions` field
4. `.ndr.toml` walk-up — from the CWD toward the filesystem root, the first `.ndr.toml` found pins the ledger
5. Error pointing at `ndr init` — there is no built-in default ledger (`ndr status` reports this case instead of erroring)

`.ndr.toml` is the per-repo opt-in marker (ndr:0130 — corpus root is a runtime config/CWD concern, not a schema concept); `ndr init` scaffolds it:

```toml
ledger = "./decisions"     # required; relative paths resolve against this file's directory, ~/ expands
project = "my-repo"    # optional; plain-string project name for atoms in this repo
```

A personal catch-all ledger is just a `.ndr.toml` higher up the walk (e.g. at `~`, pointing wherever that corpus lives). A present-but-broken `.ndr.toml` fails loudly rather than silently falling back.

### Output contracts

- **Briefs (read verbs)** are pinned by ndr:0136: title + ledger-relative basename, labels/decision line, conviction, body gist, `Lineage:` chain, `References:` block, and a `Drift:` line prepended when the seed was superseded. Skills present this output **verbatim** — never reconstruct it. The `## Revisit if` section is included in the head file readers pull; briefs stay terse.
- **Capture results** are pinned by ndr:0146: exit 0 prints `{id, path, superseded, advisories}` on stdout; exits 1/2/3 print a JSON error on stderr and never populate stdout. Consumers branch on the exit code before parsing.
- **Errors** (ndr:0154): corpus-wide verbs skip malformed atoms with a stderr warning — `ndr doctor` is the dedicated surface that reports them; targeted reads (`resolve <id>`) fail hard. A non-zero exit is surfaced to the user, never swallowed.
- **Doctor reports** (ndr:0152): `ndr doctor --json` emits `{scanned_atoms, ledger, taxonomy_checked, issues{chain_integrity, status_coherence, taxonomy, binds_stale, context_section, missing_fields, frontmatter_body_drift, malformed}, repair_candidates, repairs_applied, summary}`. Exit codes: 0 healthy/repaired, 1 findings present, 3 repair write failure.

## Capture flow

`/capture-decision` is invokable from any chat where decisions landed. The skill itself is a thin orchestrator; the work happens in a pipeline of focused subagents plus the deterministic CLI write path:

```
in-skill scan ──► user confirms candidates ──► ndr-drafter ──► ndr-reviewer ──► ndr capture ──► summary
```

1. **Scan.** Skill scans the current conversation for atomic decisions. Atomic = one chosen path with one set of consequences. Bundled candidates (e.g. "use FastAPI + Postgres") get split. **For long sources** (pasted transcript, file, PR thread), the skill invokes the `ndr-extractor` subagent instead of scanning inline; the extractor returns structured candidates with supporting quotes.
2. **Detect supersession intent.** The skill watches for revising signals — intent words ("revises", "supersedes", "instead of"), or a candidate that contradicts a decision named in chat / `informed_by:` context. Candidates with revising signal are tagged so Step 3 can ask the user what's being superseded.
2.5. **Worthiness pass.** Atomicity (Step 1) checks shape; this checks grain. The three-question rubric in `references/worthiness.md` (named alternative? future-revisitable? rationale outlives the code site?) tags each candidate as `ndr-worthy`, `borderline`, or `not-ndr` with a suggested routing alternative (code comment, CLAUDE.md gotcha, rule file). This is a soft prompt surfaced to the user in Step 3, not a hard gate — the user always has the final say.
3. **Confirm candidates.** Each candidate is presented as a one-line summary. User confirms titles, drops candidates, names predecessors for revising signals, and routes any `borderline`/`not-ndr` tags. Refusal-to-proceed is structural: if revising intent is present and the user neither names a predecessor nor confirms "this is fresh", the skill stops.
4. **Labels preflight.** Skill suggests 1-4 `labels:` per candidate from `<ledger>/.taxonomy/labels.yaml`. Unknown values trigger a "use existing or add new?" prompt; "add new" appends to the YAML file before drafting. `ndr capture` re-validates — this preflight is friendly UX, not the structural gate.
5. **Delegate composition.** Skill invokes the `ndr-drafter` subagent with confirmed candidates. The drafter returns `{frontmatter, body, missing_fields}` per atom. **The drafter never touches disk and never assigns IDs** — the body heading stays as `# PLACEHOLDER — <title>`. If `missing_fields` is non-empty, the skill prompts the user, fills the gap, and re-invokes the drafter. Drafts live in memory.
6. **Review.** Skill invokes `ndr-reviewer` with `{mode: "pre-persist", drafts: [...]}`. The reviewer's load-bearing checks are atomicity (one chosen path, one set of consequences) and body shape (fixed section order, single-altitude plain prose, no callouts). It also runs soft mechanical checks (frontmatter completeness, labels, status). Verdict is `pass` or `fail` with structured issues. Mechanical issues may be auto-fixed and re-reviewed; load-bearing failures route back to the drafter or to user edits.
7. **Persist.** `ndr capture` is **single-atom** — the skill loops accepted drafts, piping each as JSON on stdin via quoted heredoc. The draft schema:

   ```json
   {
     "frontmatter": { "title": "...", "status": "current", "decision_date": "...", "project": "...", "derived_from": [], "informed_by": [], "supersedes": [], "superseded_by": [], "conviction": "...", "labels": [], "binds": [] },
     "body": "\n# PLACEHOLDER — <title>\n\n## Decision\n...\n\n## Scope\n...\n\n## Commitments\n...\n\n## Revisit if\n...\n\n## Context\n...\n\n## Why\n...\n\n## Alternatives\n..."
   }
   ```

   Optional top-level keys: `vault_decisions` (per-draft ledger override) and `supersedes` (overrides the frontmatter field). The CLI:
   - Validates required fields, enums, and `labels:` against `labels.yaml` (hard gate).
   - Assigns a 6-char lowercase Crockford base32 id via CSPRNG (ndr:0144) and patches the `# PLACEHOLDER —` heading to `# <id> —`.
   - Writes `<ledger>/<id>-<kebab-title>.md`. Always single-file — one altitude per section keeps length manageable inside the file.
   - On non-empty `supersedes:`, performs two-write supersession (see below).
   - Exit codes: `0` success (result JSON on stdout), `1` validation, `2` supersession conflict, `3` mid-transaction half-state (errors on stderr).
8. **Two-write supersession.** When `supersedes: [X]` is non-empty, `ndr capture`:
   - Writes the successor first.
   - Patches each predecessor: `status: superseded`, appends the successor's plain id to `superseded_by: []`.
   - Refuses if the predecessor is already `superseded` by a *different* successor — exits `2` with a conflict report; manual resolution needed.
   - On patch failure mid-transaction, reports the half-state (which writes succeeded, which are pending) and exits `3`. No silent partial writes.
9. **Summarize.** Skill prints a compact summary to the main context: ids written, files patched (with status flips), and any advisories. One line per file.

### Why this shape

The pipeline split is deliberate:

- **Skill = scope detection + user interaction.** The skill owns "what is this conversation about?" because the conversation context is already loaded; sending it to a subagent costs tokens and adds latency.
- **Subagents = focused composition.** Each subagent has one job (extract, draft, review) and isolated context. The reviewer cannot accidentally rewrite the draft; the drafter cannot accidentally write to disk.
- **`ndr capture` = determinism.** Id assignment, taxonomy enforcement, and the supersession transaction must not depend on LLM judgment. The CLI is the only path that touches disk — typed, tested (`bun test` in `~/Projects/ndr`), and easy to reason about under failure.

## Read flow

The read side has two entry points, one CLI, and one synthesis worker:

| Entry point | Driven by | Use when |
| --- | --- | --- |
| `/decisions <ref-or-topic>` | user-supplied topic or `ndr:` ref | The user (or another agent) already knows the topic — "what did we decide about X?", "resolve `ndr:0011`" |
| `/ground [scope]` | active code work — cwd, file path, area phrase | Before substantive edits or before delegating to a coding subagent (junior-dev / senior-dev / tech-lead) — "ground me in the NDRs for this area" |
| `@ndr-reader` | both skills, and any agent with Agent-tool access | Free-text/fuzzy scopes only: derives queries, runs the CLI, ranks, synthesizes across heads in isolated context. Read-only |

**Structured references go straight to the CLI.** When the argument parses to an atom-id or a label, the skill runs `ndr resolve` itself and presents the brief verbatim — one subprocess call replaces the old multi-hop agent inference (ndr:0129). `@ndr-reader` is dispatched only when the scope is fuzzy enough to need search, ranking, or cross-head synthesis.

### Resolution by grain

`ndr resolve` dispatches on the reference shape:

- **atom-id** (`0011` legacy 4-digit, or `k3m9xq` 6-char base32) — loads the atom, walks `superseded_by:` to the head, prints the head brief. If the seed was superseded, a `Drift: seed <id> superseded → head <id>` line is prepended — **this is what makes reading drift-safe.**
- **label** (`<label>`) — lists all `status: current` heads carrying that label; `--verbose` expands to full briefs.

### Revisit conditions

CLI briefs stay terse; the `## Revisit if` section lives in the head file as plain bullets — no callouts (ndr:0136 — they belong to interactive reading). When a head's revisit conditions plausibly matter to the work at hand, the skill or reader `Read`s the **head** file (path from the brief's basename) and surfaces them. Heads are safe to read directly — the chain has already been walked; it is *seed* atoms that must never be read as a shortcut.

### Fallbacks

- Structured ref errors (non-zero exit) are surfaced verbatim; a 6-char token that misses as an atom-id may be retried as free-text search.
- Free-text with zero hits: one retry with broader terms, then "no decisions matched \<topic\>". Don't fabricate.
- If no topic argument is given, the skill prompts for one.

## Grounding flow

`/ground [scope]` is the active-work entry point. Where `/decisions` waits for a user-supplied topic or `ndr:` reference, `/ground` detects scope from whatever the orchestrator already knows about the current task and pulls relevant heads proactively — typically just before substantive code edits or before delegating to a coding subagent.

```
scope detection (skill) ──► ndr CLI query (or @ndr-reader for fuzzy scopes) ──► brief surfaced ──► (optional) folded into delegation prompt
```

### Why this is separate from `/decisions`

The two skills share the CLI and the reader but differ in who supplies the scope and what shape the answer takes:

| Aspect | `/decisions` | `/ground` |
| --- | --- | --- |
| Scope source | user argument (`$ARGUMENTS`) | cwd, `.ndr.toml` project, recently edited files, area phrase |
| Activation | user types it, or user asks a topic-shaped question | orchestrator about to do or delegate substantive code work in a tracked project |
| Output emphasis | one brief — answer the question | one or more briefs + `ndr:` reference strings ready to paste into a delegation prompt |
| Quiet on empty | optional "no matches" line | mandatory — one line, no nag |

### Skill responsibilities

1. **Detect scope.** `pwd` / `git rev-parse --show-toplevel`, the repo's `.ndr.toml` `project` key if present, `$ARGUMENTS`, and recently-edited files in conversation context. Do NOT load atoms.
2. **Query.** Structured signal → direct CLI call (`ndr resolve` / `ndr current --label` / `ndr search`); fuzzy scope → dispatch `@ndr-reader` with the canonical Intent / Constraints / Input / Output-shape payload.
3. **Present.** Inline (1–2 heads) or batched table (3+). Surface assumption callouts from head files when the edit plausibly trips them — those are the load-bearing signal that prior reasoning may be tripping.
4. **(Optional) Hand off.** If the orchestrator is about to dispatch `junior-dev` / `senior-dev` / `tech-lead`, append the `ndr:` reference strings from the brief to the delegation prompt so the subagent has stable identifiers without needing to query the ledger itself.

### Why skill + agent split (not just an agent)

Subagents don't see the skills list. The orchestrator does — its always-visible reminder block carries each skill's frontmatter description. That's the primary "Claude knows when to invoke this" mechanism. An agent alone, with no skill, would have a much weaker activation path: agent descriptions are only visible to agents that have Agent-tool access *and* are actively scanning. The skill provides the trigger surface; the agent provides the isolated context for fuzzy-scope work. This is the same shape `librarian:meeting-followup` + `librarian:vault-reader` use.

## Audit flow

Two complementary audits, both CLI-backed (deterministic detection) with LLM-facing interpretation in agents (ndr:0152):

| Surface | Question | Mechanical layer | LLM layer |
| --- | --- | --- | --- |
| `/drift-check` → `@ndr-drift-auditor` | does the code still match the decisions? | `ndr current --verbose` enumerates heads | semantic code-vs-decision compare; three resolutions per divergence |
| `@ndr-curator` | is the corpus itself healthy? | `ndr doctor --json` (+ `--fix`) runs every check | grouping, severity ranking, next actions |

### Drift check

```
scope + ledger resolution (skill) ──► @ndr-drift-auditor: ndr current --verbose ──► Read head files ──► compare vs diff ──► punch list
```

- The skill resolves the diff scope (never silently defaulted) and the ledger (`.ndr.toml` walk-up; error if none), and passes both to the agent.
- The agent enumerates via `ndr current --verbose` — heads-only filtering and the supersession walk happen in-process; the agent never re-filters.
- Full bodies (Decision / Scope / Commitments / `## Revisit if` conditions) come from `Read`ing head files — briefs carry only the gist (ndr:0136). Heads are safe to read; seeds are not.
- The compare itself — does this diff violate a Decision, trip a `Revisit if:` condition, invalidate a Commitment — is LLM work and stays in the agent.
- Output: per-atom divergences, three labeled resolutions each (amend / supersede / revert). Read-only; the human ratifies via `/capture-decision` or a code edit.

### Corpus health

```
@ndr-curator: ndr doctor --json [--fix] ──► interpret findings ──► health report
```

- Every check definition lives in the CLI: chain integrity, status coherence, taxonomy, binds stale, context section, missing fields, frontmatter/body drift, malformed files. The agent never re-implements one.
- `--fix` repairs exactly one class — missing `superseded_by:` back-links — idempotently. Everything else is human work, and the report says which kind.
- Malformed atoms are doctor's surface (ndr:0154): bulk-read verbs skip them to keep result sets usable; doctor reports them so nothing stays invisible.
- The agent's value-add is interpretation: grouping by class, severity ranking (supersession-primitive damage first), concrete next actions.

### Division of labor

Deterministic detection belongs in the CLI — typed, tested, one implementation (ndr:0152). Judgment stays in the agents: "does this diff contradict that decision?" (drift-auditor) and "what should a human fix first?" (curator). If a check seems missing from doctor, the agent says so in its report rather than hand-rolling it against the ledger.

## Reference convention

External code, READMEs, design docs, and vault notes that need to point at NDRs use the `ndr:` prefix with two resolvable grains:

| Form | Example | Resolves to | Use when |
| --- | --- | --- | --- |
| **atom-id** | `ndr:0011`, `ndr:k3m9xq` | the exact atom, frozen | documenting why something was built (historical anchor) |
| **label** | `ndr:monorepo-shape` | all `status: current` atoms carrying that label | current governance matters; you want the live atom(s), not the one that was current at write-time |

Both grains resolve with `ndr resolve '<ref>'` (strip the `ndr:` prefix). Legacy 4-digit ids are frozen (ndr:0144); new atoms get 6-char base32 ids.

### Why two grains

References are bi-temporal: a writer may mean "the atom that justified this code" (historical) or "the decision that currently governs this code" (live). Forcing one reference form to do both jobs is what makes `ADR-NNNN` style refs go stale on supersession. The two grains let the writer name intent at write-time, and `ndr resolve` resolves the appropriate atom(s) at read-time.

## Opting a repo into NDR coverage

NDR coverage is per-repo and opt-in, with two complementary artifacts:

1. **`.ndr.toml` at the repo root** — the machine-readable marker. Pins the ledger (and optionally the project name) so every `ndr` invocation from inside the repo resolves against the right corpus. This is what the CLI and skills consume.
2. **A grounding rule at `.claude/rules/ndr.md`** — the behavioral marker. Claude Code auto-loads it at session start (same priority as CLAUDE.md), telling the orchestrator to run `/ground` before substantive code work. This is what makes grounding *happen*; the TOML alone changes where queries land, not whether they fire. A standalone rule file (rather than a CLAUDE.md append) keeps idempotency a plain existence check and leaves the repo's main memory file untouched.

`ndr init` scaffolds both, plus the ledger directory and a starter `.taxonomy/`:

```sh
cd <repo>
ndr init                          # repo-local ./decisions ledger
ndr init --ledger ~/some/ledger   # or point at a shared ledger
```

It is idempotent — existing artifacts are skipped (`--force` rewrites `.ndr.toml` only; taxonomy files are never overwritten). The grounding rule and taxonomy seeds are embedded in the binary, so init works on machines without the plugin's vault content.

The grounding rule covers:

- That decisions for this repo live as atoms with a plain `project: <this-repo>` value.
- When to invoke `/ground` (substantive edits, before delegating to a coding subagent) and when to skip (typo fixes, comment-only).
- Treating returned decision heads as ground truth — no re-deriving from READMEs / ADRs / code comments.
- The `ndr:` reference convention for pointing at decisions from code.
- When to invoke `/capture-decision` at end of chat.

Why opt-in: not every repo has NDR coverage, and pulling decision context for repos that don't would be noise. Running `ndr init` is also intentional — opting in records a per-repo commitment to consult the decision corpus.

## Why this shape

- **Atomic decisions** (one per artifact) make supersession work cleanly per-part. Bundling defeats the supersession primitive.
- **The CLI owns the walk** — supersession-awareness lives in-process (ndr:0129), so every consumer gets drift-safety from one tested implementation instead of N prompt-encoded ones.
- **Walk to head** is the load-bearing piece — the whole system is "not just yet another markdown notes folder" because resolution always lands on the head.
- **Refuse-to-write supersession protection** keeps the primitive from depending on discipline. Refusal is structural, not advisory.
