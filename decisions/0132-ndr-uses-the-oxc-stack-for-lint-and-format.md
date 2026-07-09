---
id: "0132"
title: ndr uses the Oxc stack for lint and format
status: current
decision_date: 2026-06-01
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - lint-format
binds: []
supersedes: []
superseded_by: []
derived_from:
  - "JUN-170 — Scaffold repo: bun init, deps, lint/format"
informed_by:
  - "0128"
---

# 0132 — ndr uses the Oxc stack for lint and format

## Decision

Bet on the Oxc ecosystem for code quality: Oxlint (`oxlint@1.68`) for linting and Oxfmt (`oxfmt@0.53`) for formatting — both standalone npm dev-deps, both replaced together if the ecosystem bet is ever unwound.

## Commitments

- CI and pre-commit hooks run `oxlint` and `oxfmt --check src/` (scoped to src/ so the byte-exact markdown ledger fixtures under test/fixtures/ are not reformatted, JUN-180, 2026-06-04); no eslint or prettier invocation.
- `.oxlintrc.json` (typescript + import plugin categories, default rules) is the sole lint config artifact; Oxfmt runs config-less, so code style is whatever Oxfmt produces with no `.prettierrc` to maintain.
- A future ecosystem swap moves both tools together and touches only CI config, the two dev-deps, and `.oxlintrc.json` — isolated to the tooling layer, no domain or adapter changes.

## Revisit if

- A required lint rule (accessibility, framework-specific, or custom org rule) has no Oxlint equivalent — at which point the whole ecosystem layer moves, not just the linter.

## Context

- ndr:0128 commits to Bun as the runtime.
- The Oxc project (oxc-project/oxc) is Rust-based, sub-second on small repos, and built with the same "JS tooling rebuilt in Rust" philosophy that underlies Bun.
- The JUN-170 scaffold ticket originally suggested ESLint + Prettier.

## Why

Picking Oxc as a unit keeps the code-quality layer coherent and swappable. Choosing Oxlint and Oxfmt together is one ecosystem bet, not two independent tool picks: if a reason to leave Oxc ever materializes (a load-bearing ESLint-only plugin, or Biome pulling ahead on TypeScript coverage), both tools move together to whatever replaces them. Mixing — say, Oxlint + Prettier — would break the coherence of the bet and produce a hybrid that belongs to neither ecosystem.

## Alternatives

- **ESLint + Prettier** — deferred: the JUN-170 ticket's original suggestion and the broadest-ecosystem choice, but ESLint's plugin breadth is overhead rather than leverage at ndr's scale, the startup cost is felt on every save, and no plugin gap exists today that would tip the balance.
- **Biome** — passed over: also Rust-based and also a single-ecosystem bet (the closest rival framing), but Oxc's TypeScript lint rule set was more complete at scaffolding time and Oxfmt's output is closer to Prettier's style; Biome is the natural revisit target if Oxc rule coverage stalls.
