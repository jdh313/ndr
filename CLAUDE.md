# ndr

## VCS

This repo uses **jj**, colocated with git. Use `jj` commands (`jj st`, `jj log`,
`jj describe`, `jj new`, `jj bookmark set`, `jj git push`), matching the global
default. A hook rejects `git` commands here and points at the `jj` equivalent.

`.jj` was removed on 2026-07-04 and later restored; this file claimed
git-only until 2026-08-09, so treat any older instruction to use `git`
in this repo as stale.

Two jj-specific gotchas:

- `jj describe` writes a message onto the **current** working-copy change; it
  does not advance it. Follow with `jj new` or the next edits land in the same
  change.
- Commits are SSH-signed via the 1Password agent. A locked agent fails with
  `Signing error … 1Password: failed to fill whole buffer` — unlock 1Password
  and re-run; nothing is lost.

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

## Plugin metadata ownership

`MARKETPLACE.yaml` and `plugins/ndr/PACKAGE.yaml` are the **only** maintained
sources of plugin and marketplace metadata. Everything under `marketplaces/` is
committed compiler output — registries, `plugin.json`, and copied bodies alike.
Never hand-edit a file under `marketplaces/`: the next compile republishes the
whole tree and silently discards the edit, and CI's `marketplace` job fails on
the drift.

Skills, agents, hooks, references, and assets stay maintained in place under
`plugins/ndr/`.

`plugins/ndr/PACKAGE.yaml`'s `defaults.version` is owned by release-please
(`extra-files`, `yaml` updater) and is never hand-edited — it feeds both
generated manifests, keeping the CLI and plugin versions in lockstep
(`ndr:nbyhyp`).

Recompile after any change under `plugins/`:

```sh
git -C ~/Projects/agentforge worktree add --detach /tmp/af-pin <pinned-sha>
bun run /tmp/af-pin/src/cli.ts compile MARKETPLACE.yaml --out marketplaces
```

The pinned SHA is `AGENTFORGE_REF` in `.github/workflows/ci.yml`. The
`agentforge` binary on PATH is a symlink into `~/Projects/agentforge/dist` and
is **not** the pinned compiler — using it can produce output CI rejects.

The Claude marketplace root is `marketplaces/claude`, not the repo root. Adding
the marketplace does not install the plugin — removing a marketplace uninstalls
its plugins, and re-adding does not bring them back:

```
/plugin marketplace add ~/Projects/ndr/marketplaces/claude
/plugin install ndr@ndr
```
