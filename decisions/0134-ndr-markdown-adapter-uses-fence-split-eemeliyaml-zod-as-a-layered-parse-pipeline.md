---
id: "0134"
title: ndr markdown adapter uses fence-split → eemeli/yaml → Zod as a layered
  parse pipeline
status: current
decision_date: 2026-06-02
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - substrate
binds: []
supersedes: []
superseded_by: []
derived_from:
  - Mulling/2026-05-31_ndr-shape-and-storage
informed_by:
  - "0102"
  - "0128"
---

## Decision

The `ndr` markdown adapter parses atoms in three layers — a hand-rolled ~25-LOC fence splitter, eemeli/yaml's `Document` AST as the YAML engine, and Zod `safeParse` as the validation/type boundary. The Zod schema also derives the `Atom` TypeScript type via `z.infer` so there is no parallel TS interface.

## Why

Each layer has one job, and the alternative single-engine libraries are either unmaintained or skip the validation/type-derivation surface that ndr's atom-id grain depends on.

gray-matter (the obvious off-the-shelf frontmatter parser) is unmaintained and pins js-yaml 3.x, which silently coerces `id: "0042"` to integer 42 — destroying the atom-id grain. eemeli/yaml is actively maintained, zero transitive deps, and its `parseDocument()` returns a lossless AST whose Scalar nodes preserve `QUOTE_DOUBLE` type — `"0042"` round-trips structurally. Layering Zod on top means the schema is the single source of truth for both runtime validation and the static `Atom` type (`z.infer<typeof FrontmatterSchema>`), so no parallel interface drifts. The hand-rolled fence split is ~25 LOC because atoms are machine-generated — fence-in-body edge cases are out of scope.

## Alternatives

gray-matter (rejected) · Zod-without-engine (not a real alternative) · single-engine adapter with no Zod layer (rejected)

**gray-matter:** Silent integer coercion of `id: "0042"` would break atom-id round-trip on every write — destroys the atom-id grain by construction.

**Zod-without-engine:** Zod isn't a YAML parser. Not a real alternative; included only because someone might reach for it before realizing.

**Single-engine, no Zod layer:** Loses the `z.infer` type-derivation surface (forces a parallel hand-maintained `Atom` interface) and loses structured parse errors at the CLI boundary (`AtomValidationError` carrying file + Zod issue path).

## Assumptions

`atoms-are-machine-generated` · `zod-stays-source-of-truth-for-types`

All atoms in a ledger are written by the ndr CLI — no hand-edited fence weirdness, no comments-in-frontmatter.

- **Current state:** active — holds for the canonical ledger
- **Revisit if:** humans start editing atom files by hand and tripping fence edge cases (fence-in-body, comment preservation)

The codebase resists adding parallel hand-written TS interfaces for atom-shaped data; the `Atom` type stays `z.infer<typeof FrontmatterSchema>`.

- **Current state:** active — enforced by `z.infer` in `src/domain/atom.ts`
- **Revisit if:** schema validation moves to a different library that doesn't co-emit types (e.g. a runtime-only validator)

## Consequences

One YAML dep added (`yaml`) · Parse errors carry file path + Zod issue path · Write path must force `id` to `QUOTE_DOUBLE` and `[]` arrays to flow style for byte-stable round-trip

- `yaml@2.9.0` is now a runtime dep; zero transitive deps so the cost is contained.
- `AtomValidationError` surfaces `file` + `issues: { path, message }[]` for CLI rendering — much better than a stringified Zod error blob.
- The write path uses per-Scalar-node mutation (`node.type = Scalar.QUOTE_DOUBLE`) and per-Seq `flow = true` to keep the on-disk shape stable across captures.
