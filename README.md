# ndr

Capture and resolution tooling for nested decision records.

See [CONTEXT.md](./CONTEXT.md) for the domain language and intent of the project.

## Status

First CLI slice landed: `ndr resolve <atom-id>` walks supersession to the head
and prints a structured brief. Slug + topic grains, `ndr search`, and `ndr capture`
follow in JUN-173 and beyond.

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
