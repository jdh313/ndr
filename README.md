# ndr

Capture and resolution tooling for nested decision records.

See [CONTEXT.md](./CONTEXT.md) for the domain language and intent of the project.

## Status

The read API is complete: `ndr resolve` handles all three reference grains
(atom-id, `#slug`, `area/topic`), and `ndr search`, `ndr lineage`, and
`ndr current` round out the read verbs. Corpus-wide verbs skip a malformed atom
with a warning rather than aborting; targeted `resolve <id>` still throws.
`ndr capture` (the write verb) follows in a later slice.

The library exports:

- `Atom`, `AtomId`, `Slug`, `Reference`, `Ledger` — domain types (`src/domain/`).
- `ReadPort`, `WritePort` — backend interfaces (`src/ports/`).
- `MarkdownLedgerAdapter` — first concrete adapter, reads/writes a directory
  of `<id>-<kebab-title>.md` files. Parse pipeline is fence split → eemeli/yaml
  → Zod; see `ndr:0134`.

## Usage

```sh
# Resolve an atom id against the default ledger (~/Loose Ends/Decisions/)
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
```

Brief shape, drift placement, and basename sourcing are pinned by `ndr:0136`.

## Layout

```
src/
  cli/        Commander entry points
  domain/     Atom, ledger, supersession types
  ports/      ReadPort, WritePort interfaces
  adapters/   Backend implementations (markdown filesystem, ...)
```

## Development

```sh
bun install
bun test
bun run lint
bun run format
bun run typecheck
```
