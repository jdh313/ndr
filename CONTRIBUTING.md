# Contributing

Thanks for looking. The short version:

1. **Branch from `main`, PR into `main`.** Nothing is committed to `main`
   directly — it only receives merges (see
   `.claude/rules/branch-workflow.md`).
2. **Conventional commits.** `bun install` sets `core.hooksPath` to
   `.githooks/`, so `commit-msg` runs commitlint locally; CI enforces the same
   rules. Types drive release-please, so `feat:` / `fix:` / `feat!:` matter.
3. **Run the gates before pushing:** `bun test`, `bun run lint`,
   `bun run format:check`, `bun run typecheck`.
4. **Never hand-edit `marketplaces/`.** It is compiled output; edit
   `MARKETPLACE.yaml` / `plugins/ndr/` and recompile through the pinned
   AgentForge (recipe in [CLAUDE.md](CLAUDE.md#plugin-metadata-ownership)).
   CI fails on drift.
5. **Decisions live in `decisions/`.** If your change picks between real
   alternatives, capture it as an atom (`ndr capture`, or `/capture-decision`
   with the plugin) and reference it as `ndr:<id>` in the PR.

Layout, development commands, and build notes are in the
[README](README.md#contributing).
