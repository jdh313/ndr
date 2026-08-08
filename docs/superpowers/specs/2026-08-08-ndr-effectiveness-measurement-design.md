# Measuring NDR effectiveness

**Status:** living planning document — actively being fleshed out. Not yet a
committed implementation spec.
**Started:** 2026-08-08

## Purpose

Decide whether ndr earns its keep, and use the same evidence to direct future
enhancements.

Priorities, in the operator's stated order:

1. **Is ndr earning its keep at all?** An honest verdict on the practice: does
   capturing decisions change behaviour enough to justify the capture cost?
2. **Do agents actually obey heads?** When `/ground` returns a head, does the
   work that follows respect it, or does the agent re-derive from code?
3. **Which atoms are dead weight?** Atoms never read, labels never used, chains
   that never resolve.
4. **Which feature to build next?** Rank the backlog by evidence.

(1) and (2) are close to the same measurement. (3) and (4) fall out of the
instrument built for them as byproducts.

## What counts as a win

Five accepted win events:

- **Prevented re-litigation** — a settled question came back up and the head
  ended it in one turn.
- **Correct-by-default output** — grounded work matched the head without
  correction, where ungrounded work would plausibly have violated it.
- **Drift caught before it shipped** — divergence surfaced while still cheap.
- **Recall git/memory could not give** — rationale plus rejected alternatives
  that commit messages, code comments, and memory did not contain.
- **Coherent accretion** — new decisions build on prior ones instead of
  contradicting or duplicating them.

Only *drift caught* is directly observable in a log. *Coherent accretion* is
measurable from ledger structure alone. The other three are counterfactual —
they assert what would have happened without the head — which is why the design
centres on ablation rather than on counters.

## Deployment being measured

**Personal use is the primary case.** The tool is built in spare time,
primarily for its author; if it is not useful there, it is not worth pursuing.
Work use is a corroborating second case that adds a non-author human reader.

Personal corpus, as of 2026-08-08 (8 initialised ledgers, 277 atoms / 254
current):

| Ledger | Current / total | Supersession events |
|---|---|---|
| `Projects/ndr` | 60 / 72 | 12 |
| `Projects/homelab` | 57 / 62 | 5 |
| `Projects/lifeops` | 51 / 55 | 4 |
| `Projects/agentforge` | 44 / 44 | 0 |
| `Projects/cc-marketplace` | 23 / 23 | 0 |
| `Projects/radar` | 12 / 13 | 1 |
| `dotfiles` | 7 / 8 | 1 |
| `Projects/home-pipeline` | 0 / 0 | 0 |

Work: one shared ledger, two operators (Jacob and Andrew).

Evidence available before building anything: 772 Claude Code transcripts
locally, 148 of them in ndr-repo project directories.

## Framing constraints

These shaped the design and should not be re-derived.

**Atoms are primarily written and reviewed by coding agents, not humans.**
This is the single most important fact about the deployment.

- *It dissolves author contamination.* The agent that writes an atom loses its
  context at session end. Every later read is by a fresh agent with no memory
  of authoring it, so nearly every read is already a cross-reader event.
- *It replaces that confound with a worse one: free compliance.* An agent
  honouring a head it would have satisfied anyway — because surrounding code
  implies it, or it is simply the obvious choice — scores as a win and means
  nothing. **Raw compliance rate is therefore close to worthless as a metric.**
  The real quantity is *counterfactual surprise*: would output have differed
  without the atom?
- *It makes the counterfactual cheap.* Agents are replayable. A held-out A/B
  design, prohibitively expensive with human subjects, costs an afternoon of
  build time here.

**n is small and the operator is the tool's author.** Dozens of episodes, not
thousands. Any design reporting percentages will over-claim. The honest output
form is an evidence dossier of episodes with counts attached, not a dashboard.

**Naive transcript grepping is poisoned.** The skill registry naming
`ndr:ground`, `/decisions`, and `ndr-reader` is injected into every session's
system prompt — 706 of 772 transcripts "mention" grounding by text match. All
signal must come from `tool_use` events, never text matches.

**Andrew is the entire external validity for the work case.** They did not
build ndr and do not carry its rationale. Their read/comply/ignore behaviour is
worth disproportionately more than the author's.

## Architecture

Six sources, ordered by evidential weight.

### 1. Ablation replay — the ROI verdict

Take a real past grounding episode. Check the repo out at that episode's SHA.
Re-run the same task twice: once with the atom in context, once with it
stripped. Have a judge compare both outputs against the head. Repeat across
~30–50 episodes.

Yields a direct per-atom answer to "did this atom change what got built."
Also makes atom *format* A/B-testable — single-altitude prose vs. the old
callout shape, full body vs. Decision+Commitments only, one head vs. five —
which serves priority (4) directly.

Cost: ~1 day build, tokens per run.

### 2. Transcript telemetry

**Not a new build** — extend the existing `cc-marketplace` Langfuse hook, which
already tails transcripts and emits backdated per-turn spans (see *Available
tooling → Transcript parsing*). Runs locally, emits spans and aggregate scores — no prompt text leaves the machine, so it is safe to
share. Measures read volume, head-returned rate, **atom age at read**, and
which atoms are never read at all.

*Atom age at read* is retained as a durability measure rather than a
contamination control: if value concentrates in old atoms, ndr is doing a job
memory cannot. If nearly every read is of an atom under two weeks old, it is
functioning as a scratchpad.

Build this **second** — it feeds the ablation harness a real episode sample
instead of a hand-picked one.

Cost: ~2 hrs to add ndr-specific span attributes and scores to a hook that
already works, rather than ~4 hrs to build an extractor from scratch.

### 3. Reference graph

Scan `ndr:` references in commit messages, PR descriptions, and code comments;
join them to atom authorship. These are a durable, attributable trace of a read
that changed output, and `.claude/rules/ndr.md` already mandates them.

At work this yields the cross-person read graph. Plausibly ships as an `ndr`
subcommand rather than a one-off script.

Cost: ~3 hrs.

### 4. Ledger git history

Capture rate, capture latency after the deciding conversation, supersession
rate, and whether anyone ever amends another operator's atom. No participation
cost; the data already exists.

Cost: ~1 hr.

### 5. `ndr-reviewer` verdicts

Atoms are agent-reviewed at capture, producing a quality score at write time.
Correlate that score against measured usefulness from source 1. Answers whether
the reviewer predicts anything — if it does not, the quality gate is ceremony.

Verdicts are **not persisted** — nothing in `src/domain` records them, and
`ndr-reviewer` is dispatched as a blocking one-shot whose result lives only in
the session transcript. That is recoverable rather than lost: the reviewer runs
on the common capture path for every atom, so its verdicts are extractable by
source 2 and need no new instrumentation.

Note the path asymmetry when interpreting results — fresh atoms are
persist-then-audit, revising atoms are review-then-persist. Only revising atoms
have a verdict that gated the write; a failing verdict on a fresh atom did not
prevent it existing.

Cost: folds into source 2.

### 6. Andrew check-ins

Three fixed questions asked in existing meetings, logged to a dated note.
Covers the two things artifacts cannot see: re-litigation, and heads that were
silently ignored.

Cost: ~5 min per meeting.

## Early findings, visible before building anything

- `home-pipeline` has an initialised ledger with **0 atoms** — opted in, never
  used. Adoption friction, measurable.
- `agentforge` (44/44) and `cc-marketplace` (23/23) have **never had a single
  supersession**. Supersession is ndr's core primitive and its differentiator
  from write-once ADRs. Where it never fires, ndr is an ADR folder with better
  tooling. This may be fine, or may be the central finding.
- `ndr` (12 events) and `homelab` (5) do supersede, so the primitive fires in
  practice. What distinguishes those repos is worth knowing.

## Data boundaries

A hard constraint, not a preference. Three tiers:

| Tier | Subject | What may leave the machine |
|---|---|---|
| **A — raw** | Jacob, personal repos | Full turn content to the personal Langfuse. Status quo. |
| **B — derived only** | Jacob, work repos | Counts, ages, and verdicts. **No prompt text, no code, no tool parameters, no atom titles or bodies.** Computed locally; upload only if permission is granted, and only the aggregate. |
| **C — none** | Andrew | Nothing automated, ever. Not realistically negotiable. |

### Opt-in telemetry in the `ndr` CLI — promising, NOT decided

**Open, deliberately.** Two things are settled: telemetry in the CLI would be
opt-in, and it would be content-free. Everything else below is a sketch.

In particular the CLI does **not** replace the Langfuse hook — the two are
complementary, and the hook may well earn a place alongside it. Nothing here
rules it out. Do not read the "spine / verdict layer" framing as a chosen
architecture; it is one candidate split, recorded so it can be tested.

Revisit after experimentation, not before.

Confirmed 2026-08-08: the Langfuse hook is **not** installed on the work
machine, so no boundary was crossed. The tiering below is forward-looking.

Rather than bolt redaction onto a transcript hook, put opt-in telemetry in the
`ndr` CLI. This maps the data boundary onto a **component boundary** instead of
a config flag, which is strictly safer:

- **The CLI is the chokepoint for every read.** `resolve`, `current`, `search`,
  `lineage`, `show`, `capture` all pass through it.
- **It is content-free by construction.** The CLI never sees prompt text or
  source code, so tier B is its *default output*, not a filter someone has to
  remember to apply. A redaction bug in a transcript hook leaks raw chat; the
  equivalent bug here cannot, because the data was never in the process.
- **It computes in-process what the transcript side can only infer**: which grain
  was used, supersession chain depth, whether the head differed from the seed
  (i.e. drift, observed at the moment it happens), atom age at read, and how
  many heads a query returned.
- **It works under tier C.** Andrew would hold a local log they may choose to
  share an aggregate from — or not. Tier C becomes "tier B if they ever opt in"
  rather than a permanent blind spot.

Design constraints for it:

- Default **off**. Explicit enable, per-ledger, in `.ndr.toml` or a global
  config — never a bare env var that a plugin install could set.
- Local sink by default (JSONL or SQLite under `~/.ndr/` or beside the ledger).
  Upload is a separate, later, explicit choice.
- `ndr telemetry show` (or similar) must print exactly what has been recorded,
  so the claim "content-free" is verifiable rather than trusted.
- Salted-hash atom ids at work ledgers, mapping stays local.
- Self-identify the caller from the ambient `CLAUDE_*` environment where
  available, so reads can be attributed to `/ground` vs `/decisions` vs a human
  at a shell.

**What it cannot do — the reason it is a spine and not the whole instrument:**

1. **It cannot see compliance or counterfactual surprise.** It knows an atom was
   read; it cannot know whether the work that followed honoured it. That is the
   load-bearing metric for priorities (1) and (2), and it needs turn content —
   available only on the transcript side, and only under tier A.
2. **It cannot see reads that did not happen.** An agent that skipped grounding
   entirely emits nothing. Absence is invisible from inside the tool; the
   transcript and OTel sides do see it.
3. **It cannot see rule violations.** Agents are forbidden from `Read`-ing atom
   files directly, and that violation is exactly worth measuring — but a direct
   file read never touches the CLI.

So the revised split is: **CLI telemetry is the spine** (cheap, content-free,
all three tiers, gives the read graph and the ROI denominator); **transcript
telemetry is the verdict layer** (raw, tier A only, supplies the judge). Source
2's cost drops again, and the tier-B redaction filter described above is no
longer needed for most metrics.

Worth capturing as an ndr atom in this repo once decided — a telemetry-in-the-
tool decision is precisely the kind of commitment the ledger exists to hold.

### Live issue to verify first

`plugins/langfuse/hooks/langfuse_hook.py` has **no repo scoping, no allowlist or
denylist, and no redaction**. It tags spans with `cwd:<basename>` and a
`user_id`, and ships every turn from every session in every directory to
`LANGFUSE_BASE_URL`. If the plugin is enabled on the work machine, raw work
transcripts are already being uploaded to a personal Langfuse instance. Confirm
whether it is enabled there before any further design work; if it is, that is a
disclosure question, not a roadmap item.

Whatever this design adds, tier separation has to be a **property of the hook**
— a per-repo sink and redaction policy resolved from `cwd` or the `.ndr.toml`
in scope — rather than a convention someone remembers to follow.

### The move that makes tier B still useful: judge at the edge

Nearly every metric in this design is a count, an age, or a verdict — not
content:

- Read volume, head-returned rate, atom age at read, dead-atom lists,
  supersession rate, capture latency: all derived numbers.
- Compliance and counterfactual-surprise verdicts are **labels produced by a
  judge**. Nothing requires that judge to run in the cloud.

So: run the judge locally against raw turns, and ship only its verdict. Raw
content never crosses the boundary, and tier B loses almost none of the
analytical power of tier A. The ablation harness (source 1) must likewise be
runnable with a local sink when its subject is work code.

Residual caveat: atom **ids and titles** are themselves work IP. Tier B should
key metrics by a salted hash of the atom-id, with the mapping staying local —
so an uploaded aggregate reads "atom `a3f2` was read 5 times at a median age of
94 days" and nothing more.

### Requirement this imposes

Tiers A and B must emit the **same schema**, or personal and work results will
not be comparable and the two-case design collapses into one case. Build tier B
as a sink swap plus a redaction filter on a shared emitter — never as a second
implementation.

### What Andrew's tier costs the design

Tier C means the work-side read signal rests entirely on the check-ins (source
6) and the reference graph (source 3) — and the reference graph is computed
inside the work repo from `ndr:` refs already in its git history, so it never
needs to leave. That reduces work-side evidence to structured anecdote plus a
commit-derived read graph. Acceptable: personal use is the primary case, and
Andrew's contribution was always going to be qualitative.

## Available tooling

Researched 2026-08-08. Existing infrastructure: Langfuse self-hosted on the
homelab; a `phoenix` MCP server is also already wired into the session.

### Claude Code native OpenTelemetry — the largest finding

Claude Code ships OTel export behind `CLAUDE_CODE_ENABLE_TELEMETRY=1`. It
covers most of source 2 forward-looking with near-zero build:

- `claude_code.tool_result` / `claude_code.tool_decision` carry `tool_name` and
  `tool_use_id`. With `OTEL_LOG_TOOL_DETAILS=1` they also carry `skill_name`
  (Skill tool), `subagent_type` (Agent/Task tool), and `bash_command` /
  `full_command` (Bash tool).
- **Because ndr is a CLI, every read is a Bash call and the command string
  contains the atom-id or label.** `ndr resolve 0102` is captured verbatim.
  Atom-level read counts therefore come for free — no ndr-side instrumentation
  needed to know *which* atom was read, by which skill, in which session.
- `prompt.id` correlates every event from one user prompt, which is a ready-made
  episode boundary for the ablation sample.
- `session.id`, `user.id`, `user.email` give per-operator attribution — this
  covers Andrew without touching their transcripts, if they opt in.
- `claude_code.cost.usage` carries `skill.name`, `agent.name`, `model`,
  `query_source`, and `effort` attributes. That yields the **ROI denominator**:
  what grounding and capture actually cost in tokens and dollars.
- `claude_code.commit.count` and `claude_code.lines_of_code.count` are
  coarse outcome proxies.

Caveats:

- Prompt content and tool parameters are **redacted by default**.
  `OTEL_LOG_USER_PROMPTS=1` and `OTEL_LOG_TOOL_DETAILS=1` are needed for the
  useful fields. On the work machine those events also carry `user.email` and
  `organization.id`, so shipping them to a personal homelab needs deliberate
  thought before it is switched on.
- Metrics export on a 60s interval, logs on 5s.

### Langfuse fit — a real mismatch, with a clean split

Langfuse ingests **traces** over OTLP (HTTP/protobuf only; no gRPC). Claude
Code emits OTel **logs/events**, not traces — so Claude Code telemetry does not
land in Langfuse without a collector-side transform. This is a known gap
discussed in the Langfuse repo, not a configuration error.

**This gap is already routed around** by the existing hook (see *Transcript
parsing* below), which writes spans through the Langfuse SDK instead of the OTel
pipeline. It matters only for the metrics Claude Code's OTel exports that the
hook does *not* reconstruct — chiefly `claude_code.cost.usage` with its
`skill.name` / `agent.name` attributes, the ROI denominator. Those still need a
second sink or a transform.

The **Claude Agent SDK**, by contrast, emits real OTel traces and has a
documented, native Langfuse integration. That splits the stack cleanly along
lines the design already wanted:

- **Ablation replay (source 1)** → build the harness on the Claude Agent SDK,
  trace it into Langfuse, and use Langfuse **Datasets + Experiments** as the
  store and comparison layer. Experiments became a first-class concept in
  Langfuse in April 2026: immutable, comparable run snapshots with built-in
  LLM-as-a-judge evaluators and side-by-side A/B comparison. This is exactly the
  shape of the with-atom / without-atom arms, and it means no bespoke result
  storage or diffing code.
- **Everyday Claude Code telemetry (source 2, forward)** → needs either an OTel
  collector transforming logs into spans, or a different sink. Prometheus +
  Grafana, SigNoz, or ClickHouse all take it directly. Reference
  implementations exist (`ColeMurray/claude-code-otel` is a packaged
  Grafana/Prometheus stack for exactly this).

### Evaluation frameworks, if Langfuse's built-in judges are not enough

- **promptfoo** — assertion-based, YAML, zero cloud dependencies, runs local.
  Best fit if the judge rubric ends up as concrete assertions rather than
  graded scores. Note it was acquired by OpenAI in March 2026.
- **DeepEval** — pytest-native, typed metric objects, 60+ metrics, graded
  scores with explanations. Best fit if the rubric is a score with rationale,
  and it would sit naturally beside the existing `bun test` discipline only if
  a Python sidecar is acceptable.
- **Inspect AI** — registry-style, strong on ablation-style experimental design.
- The commonly recommended split is a lightweight framework for CI gating plus
  a platform for annotation and regression tracking. Langfuse already fills the
  platform half, so only the gating half is an open choice — and it may not be
  needed at all for a one-off study.

### Transcript parsing — already built and in production

`cc-marketplace/plugins/langfuse/hooks/langfuse_hook.py` (forked from
`langfuse/Claude-Observability-Plugin` v1.0.0) already does the work source 2
was budgeted for. It fires on the **Stop** hook, incrementally tails the
session transcript JSONL from a saved byte offset (`~/.claude/state/
langfuse_state.json`, with a lock file), groups rows into turns — user prompt →
assistant messages → tool results, deduped by `tool_use_id`, latest wins — and
emits **backdated Langfuse spans** per turn via `_start_backdated`.

Three consequences:

- **The third-party parser recommendation is moot.** A working, typed,
  incremental transcript parser with tool_use/tool_result pairing is already
  owned and running. Do not adopt `claude-code-transcripts` or equivalents.
- **The Langfuse trace/log mismatch is already solved.** The hook writes
  through the Langfuse SDK directly (`from langfuse import Langfuse,
  propagate_attributes`), producing real spans — it never touches Claude Code's
  OTel logs pipeline. No collector transform is needed for anything this hook
  covers.
- **Backdating means the retrospective pass is the same code path as the
  forward one.** `_start_backdated` sets explicit span start times, so replaying
  the 772 historical transcripts through the existing emitter would populate
  Langfuse with real history rather than requiring a separate analysis script.

The expansion needed for this design is therefore narrow: add ndr-specific
span attributes and scores rather than build an extractor. Candidates —

1. Detect `ndr` CLI invocations in tool_use blocks and tag the turn with the
   resolved atom-ids, the grain (atom-id vs label vs free text), and the
   invoking skill/agent.
2. Tag turns where `/ground` or `/decisions` fired, so grounded and ungrounded
   turns are separable in Langfuse.
3. Attach atom age at read as a span attribute, computed from ledger git
   history at emit time.
4. Emit `ndr-reviewer` verdicts as Langfuse **scores** on the capture turn —
   this is what makes source 5 free.

Coverage gap to check before relying on it: the hook subscribes only to `Stop`
and `SessionStart`. Whether every relevant turn survives to a `Stop` — sessions
killed, compacted, or abandoned mid-flight — needs verifying against the
offset/buffer recovery logic, which deliberately leaves the offset at the last
success on failure.

### Prior art worth reading

`SkillJuror: Measuring How Agent Skill Organization Changes Runtime Behavior`
(arXiv 2606.11543, released tooling at `zhiyuchen-ai/skill-juror`) is close to
this design's core question — it uses ablation over agent context artifacts to
isolate which organizational structure causally changes behavior. Also relevant:
`SWE-Replay` (arXiv 2601.22129) for replay-harness mechanics, and
`Agentic Harness Engineering` (arXiv 2604.25850) whose component ablation
found tools, middleware, and long-term memory each carry gains independently
while the system prompt alone regressed — a directly comparable finding shape.

*(These summaries are second-hand from abstracts and fetched PDFs; verify
methodology before borrowing it.)*

## Open questions

- How are ablation episodes sampled — random over all reads, stratified by atom
  age, or weighted toward substantive code tasks?
- What is the judge rubric for "output differed meaningfully"? Needs to be
  written before the harness is built, not after.
- Can the replay harness reliably reconstruct repo state at episode time?
  Transcripts record cwd; the SHA needs to be recoverable per episode.
- Does the transcript extractor belong in the shipped `ndr` CLI or in a
  throwaway analysis script? Shipping it means maintaining it.
- What is the decision rule? What result would actually cause ndr to be
  abandoned, versus narrowed to the repos where supersession fires?
- Is `OTEL_LOG_USER_PROMPTS=1` acceptable on the work machine, given the events
  carry `user.email` and `organization.id` and would ship to a personal
  homelab? If not, does `OTEL_LOG_TOOL_DETAILS=1` alone suffice — it still
  captures the `ndr` Bash commands, which is most of the signal.
- Transform Claude Code's OTel logs into Langfuse spans via a collector, or run
  a second sink (Prometheus/Grafana) for everyday telemetry and reserve Langfuse
  for the Agent SDK replay harness? The second is less work and less coupling.

## Deliberately rejected

- **Dashboards and percentage reporting.** n is too small; percentages
  over-claim.
- **Held-out A/B with human subjects.** Costs real work quality. Superseded by
  ablation replay, which measures the same thing against agent subjects.
- **Raw compliance rate as a headline metric.** Free compliance makes it close
  to meaningless where agents are the readers.
- **Mining Andrew's transcripts.** Consent burden without proportionate signal;
  the check-in questions cover the same ground.
