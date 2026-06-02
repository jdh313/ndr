# ndr

Capture and resolution tooling for nested decision records.

See [CONTEXT.md](./CONTEXT.md) for the domain language and intent of the project.

## Status

Library surface only — no CLI subcommands yet. `ndr resolve` and `ndr capture`
land in follow-up tickets.

The library exports:

- `Atom`, `AtomId`, `Slug`, `Reference`, `Ledger` — domain types (`src/domain/`).
- `ReadPort`, `WritePort` — backend interfaces (`src/ports/`).
- `MarkdownLedgerAdapter` — first concrete adapter, reads/writes a directory
  of `<id>-<kebab-title>.md` files. Parse pipeline is fence split → eemeli/yaml
  → Zod; see `ndr:0134`.

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
