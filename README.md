# ndr

Capture and resolution tooling for nested decision records.

See [CONTEXT.md](./CONTEXT.md) for the domain language and intent of the project.

## Status

The read API is complete: `ndr resolve` handles all three reference grains
(atom-id — legacy 4-digit or 6-char base32 — `#slug`, `area/topic`), and
`ndr search`, `ndr lineage`, and `ndr current` round out the read verbs.
Corpus-wide verbs skip a malformed atom with a warning rather than aborting;
targeted `resolve <id>` still throws. `ndr capture` (the write verb) lands the
full capture contract: schema + taxonomy validation, vault-wide slug uniqueness,
three-write supersession with alias handover, and locally-generated base32 ids
(ndr:0144). It reads a draft as JSON on stdin and maps outcomes to exit codes
0 (ok) / 1 (validation) / 2 (supersession conflict) / 3 (mid-write half-state).
`ndr doctor` runs corpus health checks over a ledger (absorbing the
ndr-curator agent's mechanical sweep): bidirectional supersession integrity,
orphan refs, status coherence, alias drift, taxonomy violations, missing
required fields, frontmatter/body drift, and malformed files. Read-only by
default; `--fix` repairs exactly one class — missing `superseded_by`
back-links — idempotently. Exit codes 0 (healthy) / 1 (findings) / 3 (a
repair write failed).

The Claude Code plugin (skills `/decisions`, `/ground`, `/capture-decision`,
`/drift-check` + agents) is co-located in `plugins/ndr/` and served from this
repo's own marketplace (`ndr@ndr`, ndr:h7vdvf) — the skills route every NDR
operation through this CLI (ndr:0129). The cc-marketplace copy is deprecated.

The library exports:

- `Atom`, `AtomId`, `Slug`, `Reference`, `Ledger` — domain types (`src/domain/`).
- `ReadPort`, `WritePort` — backend interfaces (`src/ports/`).
- `MarkdownLedgerAdapter` — first concrete adapter, reads/writes a directory
  of `<id>-<kebab-title>.md` files. Parse pipeline is fence split → eemeli/yaml
  → Zod; see `ndr:0134`.

## Usage

```sh
# Initialize a repo for ndr: .ndr.toml, ./decisions ledger, starter
# .taxonomy/, and the grounding rule in .claude/rules/ndr.md. Idempotent.
ndr init

# Report how ndr is wired up here: ledger + source, atom counts, taxonomy,
# grounding marker. Never errors — reports "(none)" when unconfigured.
ndr status

# Resolve an atom id — ledger resolves as: --ledger flag > NDR_LEDGER env >
# .ndr.toml walk-up from CWD > error pointing at `ndr init`
ndr resolve 0102

# Drift signal — seed atom 0070 was superseded; output names head 0102
ndr resolve 0070

# Point at a different ledger directory
ndr resolve 0049 --ledger ./test/fixtures/ledger

# Slug grain — resolve a minted alias to its current head (no drift)
ndr resolve '#oxc-stack' --ledger ./test/fixtures/ledger

# Topic grain — list all current heads in an area/topic
ndr resolve substrate/substrate

# Free-text search across atom title + body
ndr search okta

# Walk a supersession chain explicitly
ndr lineage 0070

# List current atoms, optionally filtered; --verbose expands to full briefs
ndr current --area tooling
ndr current --area tooling --topic lint-format --verbose

# Any read verb takes --json for structured output (skills/library consumers)
ndr resolve 0070 --json
ndr current --json

# List the taxonomy axes for the resolved ledger
ndr areas
ndr topics --json

# Capture a decision atom — draft JSON from a file or stdin, prints the written
# {id, path, superseded, aliases_moved}. --ledger > NDR_LEDGER > vault_decisions.
ndr capture draft.json --ledger ./test/fixtures/ledger
echo "$DRAFT_JSON" | ndr capture --ledger ./test/fixtures/ledger

# Corpus health checks — grouped human report, exit 1 when findings exist
ndr doctor --ledger ./test/fixtures/doctor-ledger

# Structured report for machine consumers
ndr doctor --json

# Repair missing superseded_by back-links (the one auto-fixable class)
ndr doctor --fix
```

Brief shape, drift placement, and basename sourcing are pinned by `ndr:0136`.

A repo opts into a ledger with `.ndr.toml` at its root (`ndr init` scaffolds
it) — `ledger` (required; relative paths resolve against the file, `~/`
expands) and `project` (optional). `NDR_LEDGER` overrides the config for a
shell session (only `--ledger` beats it). No flag, env, or file anywhere up the
walk means an error; a broken file fails loudly instead of falling back.

```toml
ledger = "./decisions"
project = "[[my-repo]]"
```

## Plugin

```
/plugin marketplace add ~/Projects/ndr
/plugin install ndr@ndr
```

Requires the `ndr` binary on PATH (`bun run install:bin`) — the skills
hard-error without it. See `plugins/ndr/README.md`.

## Layout

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

## Development

```sh
bun install
bun test
bun run lint
bun run format
bun run typecheck
```

CI (GitHub Actions) runs the same gates — test, lint, `format:check`,
typecheck, plus a `bun build --compile` smoke — on every push and PR to `main`.

## Build & install

`ndr` ships as a single-file binary compiled by Bun. One command builds it and
links it onto your PATH:

```sh
# Compile src/cli/bin.ts → dist/ndr, then symlink it into ~/.local/bin
bun run install:bin
```

`bun run build` alone just emits `dist/ndr` (gitignored). The symlink means a
later `bun run build` updates the installed binary in place — no re-link needed.
The binary resolves its ledger per-invocation: `--ledger` flag, else the
`NDR_LEDGER` env var, else the nearest `.ndr.toml` walking up from the CWD,
else an error pointing at `ndr init`. There is no built-in default ledger — a
personal default is a `.ndr.toml` higher up the walk (e.g. at `~`). Built and
tested against Bun 1.3.x.
