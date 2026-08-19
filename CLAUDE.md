# ndr

## VCS

The maintainer works in **jj**, colocated with git, so agent instructions
here use `jj` commands (`jj st`, `jj log`, `jj describe`, `jj new`,
`jj bookmark set`, `jj git push`). Plain `git` works fine on a fresh clone —
nothing in the repo blocks it; the maintainer's own local tooling rejects
`git` and points at the `jj` equivalent, but that lives outside this repo.

Two jj-specific gotchas:

- `jj describe` writes a message onto the **current** working-copy change; it
  does not advance it. Follow with `jj new` or the next edits land in the same
  change.
- If commits are SSH-signed through an agent (the maintainer uses 1Password),
  a locked agent fails with `Signing error … failed to fill whole buffer` —
  unlock the agent and re-run; nothing is lost.

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

The compiled plugin `version` fields are the one exception to the
never-hand-edit rule above, and only because a machine writes them:
release-please carries `json` `extra-files` entries for
`.claude-plugin/marketplace.json`, `marketplaces/claude/.claude-plugin/marketplace.json`,
`marketplaces/claude/plugins/ndr/.claude-plugin/plugin.json`, and
`marketplaces/codex/plugins/ndr/.codex-plugin/plugin.json`, so the version bump
lands in the Release PR itself instead of failing the `marketplace` drift gate.
That gate still recompiles and compares on every PR, so it remains the enforcer
if the updaters ever diverge from the compiler. Add a new compiled manifest
carrying a plugin `version`? Add it to `release-please-config.json` too.

The marketplace-level `metadata.version` in the root and Claude marketplace
manifests is **not** the plugin version — it comes from `MARKETPLACE.yaml` and
is deliberately outside the jsonpaths above.

Recompile after any change under `plugins/`:

```sh
# one-time: download the pinned compiler binary (version + sha256 are
# AGENTFORGE_VERSION / AGENTFORGE_SHA256 in .github/workflows/ci.yml)
curl -fsSLO "https://github.com/jdh313/agentforge/releases/download/v<AGENTFORGE_VERSION>/agentforge-linux-x64"
echo "<AGENTFORGE_SHA256>  agentforge-linux-x64" | sha256sum -c
chmod +x agentforge-linux-x64

./agentforge-linux-x64 compile MARKETPLACE.yaml --out marketplaces
```

Any `agentforge` already on your PATH (a dev build, a different tag) is
**not** the pinned compiler — using it can produce output CI rejects.

The Claude marketplace root is `marketplaces/claude`, not the repo root. Adding
the marketplace does not install the plugin — removing a marketplace uninstalls
its plugins, and re-adding does not bring them back:

```
/plugin marketplace add /path/to/your/ndr-checkout/marketplaces/claude
/plugin install ndr@ndr
```
