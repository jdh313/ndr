// Templates embedded in the binary so `ndr init` is self-contained on any
// machine — no vault or plugin-asset reads (plain TS constants rather than
// `import ... with { type: "text" }` to keep `bun build --compile` simple).

// Generic starter taxonomy. Deliberately small — repo owners edit to taste,
// and `ndr capture` hard-gates on these values (ndr:0153), so growing the
// lists is an intentional act.
export const AREAS_SEED = `# Areas — the "what is this decision about" axis.
# Finite list, hand-edited. \`ndr capture\` refuses unknown values.
# To add: edit this file (friction is the feature — prevents drift).
- architecture  # system shape, framework, runtime composition, DI
- process       # how decisions get made / written / read
- scope         # what's in vs out (MVP, pilot, team-product)
- substrate     # storage and retrieval medium
- tooling       # what we use to make / store / read them
`;

export const TOPICS_SEED = `# Topics — the "which slice of the area" axis.
# Finite list, hand-edited. \`ndr capture\` refuses unknown values.
# To add: edit this file (friction is the feature — prevents drift).
- ci-strategy   # CI platform, gates, caching, trigger conventions
- deployment    # how things ship / run / migrate
- framework     # backend/frontend framework choice
- read-side     # context-loading, retrieval, supersession resolution
- repo-shape    # monorepo vs split, package layout
- write-side    # capture, materialization, schema enforcement
`;

export function ndrTomlTemplate(ledger: string, project: string): string {
  return `ledger = ${JSON.stringify(ledger)}\nproject = ${JSON.stringify(project)}\n`;
}

// Project rule written to `.claude/rules/ndr.md` — Claude Code auto-loads it
// at session start with the same priority as CLAUDE.md, so the grounding
// behavior fires without bloating the repo's main memory file. Idempotency is
// just file existence; no in-content marker needed.
export const NDR_RULE = `---
description: NDR coverage — ground coding work in the decision ledger before substantive edits.
---

# NDR coverage

This repository is tracked by the \`ndr\` plugin. Engineering decisions
that govern this codebase live as atomic markdown files in the decision
ledger pinned by this repo's \`.ndr.toml\`, with a
\`project: [[<this-repo>]]\` frontmatter link.

### When the orchestrator should ground itself

Before substantive code work in this repo — refactors, new features,
schema changes, dependency swaps, or delegating to a coding subagent —
invoke \`/ground\` to surface the current decision heads relevant to the
active area.

Skip grounding for: typo fixes, comment-only changes, single-line
adjustments, or work on areas with no NDR coverage.

### Treat returned decisions as ground truth

When \`/ground\` (or \`/decisions\`) returns a head, treat that head as the
current state. Do not re-derive current state from older artifacts —
README snippets, ADR-style docs in \`docs/\`, code comments, or commit
messages — once a head exists for the topic. The supersession walk is
canonical.

### Pointing at decisions from code

Use \`ndr:\` references in code comments, commit messages, and PR
descriptions. Three resolvable grains:

- \`ndr:0042\` — frozen atom-id; "this code exists because of decision
  0042" (historical anchor).
- \`ndr:#auth-substrate\` — slug; follows supersession to the live atom.
  Use when you mean "whatever decision currently governs auth substrate".
- \`ndr:auth/substrate\` — \`area/topic\` pair; resolves to all current
  atoms in that taxonomy slot. Use when the whole area governs the call
  site.

The \`/decisions\` skill (and \`@ndr-reader\` agent) resolve all three.

### Capturing new decisions

When a decision lands in conversation — a choice between alternatives
with a stated rationale — invoke \`/capture-decision\` at end of chat to
record it. The capture skill scans the conversation, drafts atomic
candidates, asks for confirmation, and writes the file with valid
frontmatter and a hybrid-altitude body.
`;
