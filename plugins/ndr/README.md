# ndr — Nested Decision Records

A Claude Code plugin for capturing engineering decisions as **atomic markdown
files** with explicit lineage and **supersession-aware reading**, so
cross-session decision drift becomes structurally visible rather than something
you rediscover in hindsight.

All corpus operations route through the **`ndr` CLI** that lives in this repo —
the CLI walks supersession chains in-process, owns id assignment and the
supersession write transaction, and resolves the ledger per-repo via
`.ndr.toml`. The skills are thin orchestration over it. For the CLI, the library,
and the shared ledger/config model, see the [repo-root README](../../README.md).

## What it does

| Skill | Trigger | Behavior |
| --- | --- | --- |
| `/capture-decision` | Manual, at end of a chat | Scans the conversation for atomic decisions, drafts each, asks the user to confirm, pipes each accepted draft to `ndr capture` for the deterministic write |
| `/decisions <topic>` | Manual, when the user has a topic or `ndr:` ref in hand | Structured refs resolve with one `ndr resolve` call (drift surfaced automatically); free-text dispatches `@ndr-reader` for search + synthesis |
| `/ground [scope]` | Before substantive code work, or before delegating to a coding subagent (junior-dev / senior-dev / tech-lead) | Infers scope from CWD / `.ndr.toml` / file path / user phrase, queries the CLI (or `@ndr-reader` for fuzzy scopes), returns a brief plus `ndr:` reference strings the delegating prompt can paste in |
| `/drift-check [scope]` | Manual, or offered by `spec-flow:close` before archiving | Walks current heads, compares each against a chosen diff scope (working tree / branch range / commit range / full repo), surfaces divergences with three resolutions per item — amend, supersede, revert |
| `/ndr-bootstrap` | Once per machine after plugin install | Copies the seed decision atoms and the initial taxonomy YAML into the author's Obsidian vault at `~/Loose Ends/` (currently hardcoded). Idempotent |

## Install

The plugin requires the `ndr` binary on PATH — skills hard-error without it.
Clone the repo and build it (`bun run install:bin`), then add the marketplace
from GitHub:

```
/plugin marketplace add jdh313/ndr
/plugin install ndr@ndr
/ndr-bootstrap
```

After install:
- Decisions live as `<ledger>/<id>-<kebab-title>.md` — one atom per file, always
  single-file. The ledger resolves per-invocation (see the [root README](../../README.md)
  for the resolution order); `ndr status` reports which source won.
- New atoms get 6-char base32 ids assigned by `ndr capture`; legacy 4-digit ids
  are frozen.
- Each atom uses a **single-altitude body**: fixed sections (Decision, Scope,
  Commitments, Revisit if, Context, Why, Alternatives) in plain markdown, each
  written once at the length it deserves — no callouts.
- Taxonomy (`labels:`) lives at `<ledger>/.taxonomy/labels.yaml`.
  `ndr capture` validates against this list.

## Per-repo config

`ndr init` opts a repo in — it scaffolds `.ndr.toml`, the ledger directory with a
starter `.taxonomy/`, and the grounding rule in `.claude/rules/ndr.md`
(auto-loaded by Claude Code at session start), all idempotently. The config and
ledger-resolution model are documented in the [root README](../../README.md); the
grounding rule is what makes `/ground` fire before substantive code work in a
tracked repo. See `references/workflow.md#opting-a-repo-into-ndr-coverage`.

## Plugin layout

```
plugins/ndr/
├── PACKAGE.yaml               # canonical definition; plugin.json is generated
├── README.md                  # this file (not shipped in the payload)
├── skills/
│   ├── capture-decision/      # write-side (persists via `ndr capture`)
│   ├── decisions/             # read-side, user-driven (resolves via `ndr resolve`)
│   ├── ground/                # read-side, active-work grounding for coding agents
│   ├── drift-check/           # code-vs-decision coherence (on-demand)
│   ├── interrogate-decision/  # deep pre-capture deliberation
│   ├── migrate-ledger/        # one-time, retirable format migration
│   └── ndr-bootstrap/         # one-time vault content install
├── agents/
│   ├── ndr-curator.md         # corpus health
│   ├── ndr-drafter.md         # atom drafting
│   ├── ndr-drift-auditor.md   # code-vs-decision walk + compare
│   ├── ndr-extractor.md       # candidate extraction from long sources
│   ├── ndr-migrator.md        # body reshaping for the format migration
│   ├── ndr-reader.md          # free-text search + synthesis over the ndr CLI
│   └── ndr-reviewer.md        # pre-write atom validation
├── hooks/
│   ├── hooks.json             # SessionStart
│   └── check-cli-version.sh   # flags an outdated ndr binary
├── assets/                    # installed by /ndr-bootstrap
│   ├── decisions/             # seed atoms
│   ├── taxonomy/labels.yaml
│   └── project-snippet/
├── references/                # static schema + workflow docs + template
│   ├── frontmatter-schema.md
│   ├── taxonomy.md
│   ├── workflow.md
│   └── decision-single.md
└── assets/                    # vault content the bootstrap skill installs
    ├── decisions/             # seed atoms — A–H meta-chain (0001-0008) plus reference-addressability resolution (0049-0051)
    └── taxonomy/
        └── labels.yaml
```

The CLI itself lives in this repo's `src/` (Commander entry points, domain
types, markdown ledger adapter) — see the [root README](../../README.md).

## Conventions

- **Atomic decisions.** One chosen path, one set of consequences. Bundled
  decisions get split.
- **Supersession-aware reading.** When a decision is revised, the old artifact
  stays, gets `status: superseded` + a `superseded_by:` pointer; the successor
  carries `supersedes:`. Resolution always lands on the head — `ndr resolve`
  walks the chain and surfaces drift.
- **Single-altitude body.** Fixed sections in plain markdown; content written
  once per section; no callouts.
- **Required frontmatter.** `ndr capture` refuses to write if any required field
  is missing (`title`, `status`, `decision_date`, `author`, `conviction`,
  `project`, `labels`; `supersedes:` presence-required). Ids are assigned
  by the CLI, never by the drafter.
- **Finite taxonomy.** `labels:` are validated against
  `<ledger>/.taxonomy/labels.yaml`. New values require an explicit add —
  friction is the feature.
- **Project-scoped decisions.** Every decision has a plain-string `project:`
  field naming the repo it governs.
- **Reference convention.** Two grains: atom-id (`ndr:0042`, historical anchor;
  resolve walks to head) and label (`ndr:<label>`, all current heads carrying
  that label). See `references/workflow.md#reference-convention`.

See `references/frontmatter-schema.md`, `references/taxonomy.md`, and
`references/workflow.md` for the full spec.

## Notes

- The seed atoms in `assets/decisions/` are ndr's own decision history — the A–H
  meta-chain (0001-0008) plus the reference-addressability resolution
  (0049-0051). Installing them gives you a working corpus from day one.
- The plugin and CLI are co-located on purpose: every skill is built on the CLI,
  so keeping them in one repo makes their co-evolution atomic. (An earlier
  standalone copy hosted in `cc-marketplace` is deprecated.)

## Decisions behind this design

Resolve any of these with `ndr resolve <id>`:

- `ndr:0129` — skills route every NDR operation through the CLI.
- `ndr:0144` — atom ids are locally generated 6-char base32; legacy 4-digit ids
  are frozen.
