# ndr

## VCS

This repo uses **git**, not jj. It was previously jj-colocated; `.jj` was
removed on 2026-07-04. Use `git` commands directly (`git status`, `git log`,
`git commit`, etc.) — this overrides the global default of jj.

Branch workflow is documented as a tracked project rule in
`.claude/rules/branch-workflow.md`.

## CLI development

Runtime is **Bun**. `ndr` on PATH is a compiled binary (`dist/ndr`, symlinked to
`~/.local/bin/ndr`) — **not** the source. Editing `src/` leaves the installed
`ndr` stale until you rebuild.

- `bun run install:bin` — rebuild `dist/ndr` + refresh the symlink. Run after any
  `src/` change before invoking `ndr`.
- `bun run src/cli/bin.ts <args>` — run the CLI from source (uncommitted changes
  included) without rebuilding; use for smoke tests.
- `bun test` (full suite) · `bunx tsc --noEmit` (typecheck).
