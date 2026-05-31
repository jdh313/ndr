# ndr

Capture and resolution tooling for nested decision records.

See [CONTEXT.md](./CONTEXT.md) for the domain language and intent of the project.

## Status

Scaffolding only — no functionality yet.

## Layout

```
src/
  cli/        Commander entry points
  domain/     Atom, ledger, supersession types
  ports/      ReadPort, WritePort interfaces
  adapters/   Backend implementations (file-system ledger, etc.)
```

## Development

```sh
bun install
bun test
bun run lint
bun run format
bun run typecheck
```
