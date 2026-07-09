---
id: '0132'
title: ndr uses the Oxc stack for lint and format
status: current
decision_date: '2026-06-01'
author: "Jacob Hoehler"
conviction: strong
project: '[[ndr]]'
derived_from:
- "[[JUN-170 — Scaffold repo: bun init, deps, lint/format]]"
informed_by: []
labels:
- framework
- lint-format
supersedes: []
superseded_by: []
---
# 0132 — ndr uses the Oxc stack for lint and format

## Decision

Bet on the Oxc ecosystem for code quality: Oxlint (`oxlint@1.68`) for linting and Oxfmt (`oxfmt@0.53`) for formatting — both standalone npm dev-deps, both replaced together if the ecosystem bet is ever unwound.

## Why

Oxc is the Rust-based, Bun-aligned ecosystem for JS/TS tooling; picking it as a unit keeps the code-quality layer coherent and swappable.

> [!info]- Full reasoning
> ndr:0128 commits to Bun as the runtime. The Oxc project (oxc-project/oxc) is the natural counterpart: Rust-based, sub-second on small repos, and developed with the same "JS tooling rebuilt in Rust" philosophy that underlies Bun. Choosing Oxlint and Oxfmt together is not two independent tool picks — it is a single ecosystem bet. If a future reason to leave Oxc materializes (e.g., a load-bearing ESLint-only plugin, or Biome pulling ahead on TypeScript coverage), both tools move together to whatever replaces them. Mixing — say, Oxlint + Prettier — would break the coherence of the bet and produce a hybrid that belongs to neither ecosystem. The concrete tools: `.oxlintrc.json` at repo root with typescript and import plugins, default rules; Oxfmt runs config-less.

## Alternatives

ESLint + Prettier (JS-native toolchain) — deferred; Biome (rival Rust monolith) — considered and passed over.

> [!info]- Why they lost
> - **ESLint + Prettier:** The JUN-170 ticket's original suggestion and the broadest-ecosystem choice. ESLint's plugin surface is its selling point; at ndr's current scale that breadth is overhead, not leverage. Startup cost is felt on every save; no plugin gap exists today that would tip the balance.
> - **Biome:** Also Rust-based and also a single-ecosystem bet — the closest rival framing. Oxc's TypeScript-specific lint rule set was more complete at the time of scaffolding, and Oxfmt's output is closer to Prettier's style, which lowers the friction of adoption. Biome is the natural revisit target if Oxc rule coverage stalls.

## Assumptions

`no-esonly-plugin-needed`

> [!warning]- no-esonly-plugin-needed
> No load-bearing lint rule requires a plugin that exists only in the ESLint ecosystem.
>
> - **Current state:** active — default typescript+import rules cover current codebase
> - **Revisit if:** a required rule (accessibility, framework-specific, or custom org rule) has no Oxlint equivalent, at which point the whole ecosystem layer moves, not just the linter

## Consequences

Sub-second lint and format on every save · Rust-based toolchain coherent with Bun runtime · ESLint and Prettier absent from the dependency graph · two config artifacts: `.oxlintrc.json` (lint) and none (Oxfmt is config-less).

> [!info]- Detail
> - CI and pre-commit hooks run `oxlint` and `oxfmt --check`; no eslint or prettier invocation.
> - `.oxlintrc.json` enables `typescript` and `import` plugin categories with default rules; it is the sole lint config artifact.
> - Oxfmt is intentionally config-less — code style is whatever Oxfmt produces, with no `.prettierrc` to maintain or argue over.
> - Future ecosystem swap (to Biome or back to ESLint+Prettier) touches CI config, the two dev-deps, and `.oxlintrc.json` — isolated to the tooling layer, no domain or adapter changes required.
