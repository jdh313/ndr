# ndr

Capture engineering decisions as small, linked markdown files so that when a
decision is later revised, the change is **structurally visible** instead of
something you rediscover in hindsight.

Every decision is a single file (an **atom**). When you revise one, the old
file stays put and gains a pointer to its replacement; reads always follow that
chain to the current version (the **head**). Pointing at a decision from old
code and landing on a superseded atom is called **drift** — surfacing it is the
whole point.

New to the vocabulary (atom, head, ledger, supersession, grain, drift)? See
[CONTEXT.md](./CONTEXT.md) for the glossary. The terms below are glossed on
first use.

## Installing

Two channels (ndr:0q443w), both needing only the git access you already have
to this repo:

```sh
# From source via Bun (requires Bun; runs the CLI straight from src/)
bun install -g git+ssh://git@github.com/jdh313/ndr.git

# Updating = re-run the same command (installs track main, which always
# matches the latest release)
```

Or download the compiled binary for your platform (`ndr-darwin-arm64`,
`ndr-linux-x64`, …) from the latest GitHub Release and put it on your PATH —
no Bun required.

Hacking on ndr itself? Use the Quickstart below instead (`bun run install:bin`
symlinks your local build onto PATH).

## Quickstart

```sh
# Build the CLI and link it onto your PATH (compiles src/cli/bin.ts -> dist/ndr,
# then symlinks it into ~/.local/bin)
bun run install:bin

# Opt a repo in: writes .ndr.toml, a ./decisions ledger, a starter taxonomy,
# and the grounding rule in .claude/rules/ndr.md. Idempotent.
ndr init

# Confirm how ndr is wired here (ledger, atom counts, taxonomy, grounding marker)
ndr status

# Read the decision that currently governs a topic
ndr resolve 0102
```

A **ledger** is one directory of decision atoms. Every `ndr` command resolves
which ledger to use in this order: `--ledger` flag > `NDR_LEDGER` env var >
the nearest `.ndr.toml` walking up from the current directory > an error
pointing you at `ndr init`. There is no built-in default ledger; a personal
catch-all is just a `.ndr.toml` higher up the walk (e.g. at `~`).

```toml
# .ndr.toml — written by `ndr init`
ledger = "./decisions"   # required; relative paths resolve against this file, ~/ expands
project = "my-repo"      # required; free-form (`ndr init` defaults it to the directory name)
```

Every atom's frontmatter follows one strict schema:

```yaml
---
id: "z7s9sq"          # locally-generated 6-char base32 (legacy atoms keep a 4-digit id)
title: okta becomes the identity substrate
status: current        # current | superseded | retracted
decision_date: 2026-07-08
author: Jacob Hoehler   # auto-filled from `git config user.name` at capture time
conviction: strong      # strong | tentative | arbitrary — how strongly the decision is held
project: my-repo        # plain string
labels:                 # 1-4 values, gated by <ledger>/.taxonomy/labels.yaml
  - substrate
binds: []                # globs this decision binds; `doctor` flags stale entries
supersedes: []
superseded_by: []
derived_from: []
informed_by: []
---
```

## Usage

```sh
# Resolve an atom id (legacy 4-digit or 6-char base32)
ndr resolve 0102

# Drift in action — atom 0070 was superseded, so the output names its head, 0102
ndr resolve 0070

# Point at a different ledger directory
ndr resolve 0049 --ledger ./test/fixtures/ledger

# Label grain — list every current head carrying a taxonomy label
ndr resolve framework --ledger ./test/fixtures/ledger

# --full — the resolved head's complete body (Decision / Scope / Commitments /
# Revisit if / Context / Why / Alternatives), not just the gist; still walks supersession
ndr resolve 0070 --full

# show — one specific atom's full raw markdown, frozen (no supersession walk).
# The only way to read a superseded atom's own body (e.g. an ndr:0042 anchor).
ndr show 0070 --ledger ./test/fixtures/ledger

# Free-text search across atom titles + bodies
ndr search okta

# Walk a supersession chain explicitly
ndr lineage 0070

# List current atoms, optionally filtered by label; --verbose expands to full briefs
ndr current --label framework
ndr current --label framework --verbose

# Any read verb takes --json for structured output (consumed by the skills/library)
ndr resolve 0070 --json
ndr current --json

# List the labels in the resolved ledger's taxonomy
ndr labels
ndr labels --json

# Capture a decision atom — draft JSON from a file or stdin. Prints the written
# {id, path, superseded, advisories}. author auto-fills from `git config
# user.name` when the draft omits it. Exit codes: 0 ok / 1 validation /
# 2 supersession conflict / 3 mid-write half-state.
ndr capture draft.json --ledger ./test/fixtures/ledger
echo "$DRAFT_JSON" | ndr capture --ledger ./test/fixtures/ledger

# Mechanically migrate old-format atoms to the new schema (pass 1; idempotent).
# Pass 2 (body reshaping) is judgment work, not covered by this command.
ndr migrate --ledger ./test/fixtures/ledger --dry-run

# Corpus health checks — grouped human report, exit 1 when findings exist
ndr doctor --ledger ./test/fixtures/ledger
ndr doctor --json                 # structured report for machine consumers
ndr doctor --fix                  # repair missing superseded_by back-links (the one auto-fixable class)
```

A present-but-broken `.ndr.toml` fails loudly rather than silently falling
back. `ndr status` reports the unconfigured case instead of erroring.

## What works today

- **Reads** — `ndr resolve` handles both reference grains (atom-id and label),
  with `--full` for the head's complete body and `ndr show` for a single atom's
  frozen body without walking the chain. `ndr search`, `ndr lineage`,
  `ndr current`, and `ndr labels` round out the read verbs. Corpus-wide verbs
  skip a malformed atom with a warning; targeted `resolve <id>` still throws.
- **Writes** — `ndr capture` lands the full contract: schema + taxonomy
  validation, author auto-fill from `git config user.name`, two-write
  supersession (successor written first, then predecessors patched) with
  advisories for binds-narrowing and cross-author supersession, and
  locally-generated base32 ids. Reads a draft as JSON on stdin.
- **Health** — `ndr doctor` runs corpus checks over a ledger: chain integrity
  (including dangling/orphan refs), status coherence, taxonomy violations,
  stale `binds` globs, missing `## Context` sections, missing required fields,
  frontmatter/body drift, and malformed files. Read-only by default; `--fix`
  repairs missing `superseded_by` back-links idempotently.

## The library

The CLI sits on a small library you can import directly:

- `Atom`, `AtomId`, `Reference`, `Ledger` — domain types (`src/domain/`).
- `ReadPort`, `WritePort` — backend interfaces (`src/ports/`).
- `MarkdownLedgerAdapter` — the first concrete adapter; reads/writes a directory
  of `<id>-<kebab-title>.md` files. Its parse pipeline is fence split ->
  eemeli/yaml -> Zod.

## Plugin

A Claude Code plugin (skills `/decisions`, `/ground`, `/capture-decision`,
`/drift-check`, plus supporting agents) is co-located in `plugins/ndr/` and
served from this repo's own marketplace. The skills are thin orchestration over
this CLI.

```
/plugin marketplace add jdh313/ndr
/plugin install ndr@ndr
```

The plugin requires the `ndr` binary on PATH — build it from a clone with
`bun run install:bin` (the skills hard-error without it). See
[plugins/ndr/README.md](./plugins/ndr/README.md).

## Contributing

### Layout

```
src/
  cli/        Commander entry points
  domain/     Atom, ledger, supersession types
  ports/      ReadPort, WritePort interfaces
  adapters/   Backend implementations (markdown filesystem, ...)
plugins/
  ndr/        Claude Code plugin (skills + agents), served from
              .claude-plugin/marketplace.json at the repo root
```

### Development

```sh
bun install
bun test
bun run lint
bun run format
bun run typecheck
```

CI (GitHub Actions) runs the same gates — test, lint, `format:check`,
typecheck, plus a `bun build --compile` smoke — on every push and PR to `main`.

### Build & install

`ndr` ships as a single-file binary compiled by Bun. `bun run install:bin`
compiles `src/cli/bin.ts` to `dist/ndr` and symlinks it into `~/.local/bin`.
`bun run build` alone just emits `dist/ndr` (gitignored); because the install is
a symlink, a later `bun run build` updates the installed binary in place — no
re-link needed. Built and tested against Bun 1.3.x.

## Decisions behind this design

ndr documents its own design in its decision ledger. Resolve any of these with
`ndr resolve <id>` (a live demo of the tool working on itself):

- `ndr:0129` — skills and the library route every operation through the CLI, so
  supersession-awareness has one tested implementation.
- `ndr:0144` — atom ids are locally generated 6-char Crockford base32, not
  sequential; legacy 4-digit ids are frozen.
- `ndr:0134` — the markdown adapter's layered parse pipeline (fence split ->
  yaml -> Zod).
- `ndr:0136` — brief shape, drift placement, and basename sourcing.
- `ndr:h7vdvf` — the plugin is co-located with the CLI and served from this
  repo's own marketplace.
