# Runtime mappings

NDR's `skills/`, `agents/`, references, and assets are the canonical workflow
bodies. The Claude and Codex manifests are thin native adapters; do not fork
substantive instructions by runtime.

| Intent | Claude Code | Codex |
| --- | --- | --- |
| Repository guidance | `CLAUDE.md` | Applicable `AGENTS.md`; non-conflicting `CLAUDE.md` facts are supporting documentation |
| Invoke a skill | Slash command or `Skill(ndr:skill)` | Installed `ndr:<skill>` skill, or its shared `SKILL.md` procedure while composing within NDR |
| Named role | Registered `@ndr-*` agent | Bounded runtime subagent using `agents/ndr-*.md` as its procedure, with explicit inputs, deliverable, and done criteria |
| Follow-up to a role | Agent follow-up | Runtime message or follow-up task to the spawned subagent |
| User adjudication | `AskUserQuestion` | Structured input when available; otherwise one concise question and wait |
| Workflow tracking | `TodoWrite` | Runtime plan/checklist |

## Shared-path adapter

Claude expands `${CLAUDE_PLUGIN_ROOT}` in shared bodies. In Codex, interpret it
as the installed NDR plugin root: locate the active `SKILL.md`, then use its
parent's parent as the root. Resolve `references/` and `assets/` from that root.
Do not infer NDR atom content by reading a ledger file directly; the `ndr` CLI
remains the read and write boundary.

## Safety and integrations

- `ndr capture` remains the sole atom writer. Preserve the fresh/revising
  review ordering, taxonomy gate, and CLI exit-code handling in
  `capture-decision`.
- Read-only skills (`decisions`, `ground`, `drift-check`, and
  `interrogate-decision`) remain read-only. A drift recommendation never writes
  an atom without the capture workflow and user approval.
- `migrate-ledger` and `ndr-bootstrap` are explicit-only; their local
  `agents/openai.yaml` policies enforce that in Codex.
- `ndr-extractor` may read non-NDR vault material. In Claude it can use
  `mcp__obsidian-mcp__read_multiple_notes`; in Codex use an equivalent connected
  Obsidian app/MCP operation matched by capability and schema. If unavailable,
  say so and offer a local source-path fallback or pause. Never substitute web
  search/model memory, install integrations without approval, or ask for
  credentials.
- The Claude SessionStart hook remains Claude-native. Codex performs the same
  `ndr`-on-PATH preflight stated in each skill; it does not load Claude hooks.
