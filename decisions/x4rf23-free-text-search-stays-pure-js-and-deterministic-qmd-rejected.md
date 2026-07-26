---
id: "x4rf23"
title: Free-text search stays pure-JS and deterministic; qmd rejected
status: current
decision_date: 2026-06-09
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - tooling
  - read-side
binds:
  - src/adapters/markdown/adapter.ts
  - src/ports/read.ts
supersedes: []
superseded_by: []
derived_from:
  - https://linear.app/junglelan/issue/JUN-191/investigate-qmd-as-the-ndr-search-backend
informed_by: []
---

# x4rf23 — Free-text search stays pure-JS and deterministic; qmd rejected

## Decision

ndr's free-text search stays in-process and pure JavaScript. qmd is rejected as a
search backend. The naive substring filter behind `searchFreeText` remains the
shipped behavior until deterministic ranking replaces it inside the same port.

## Scope

- Binds: the `searchFreeText` port and its markdown-adapter implementation.
- Does not bind: which pure-JS ranker eventually lands — hand-rolled BM25 and a
  vetted library are both open at implementation time.

## Commitments

- Any search backend must survive `bun build --compile` into a single binary — no
  native addons, no model weights fetched at runtime.
- Search results stay deterministic; the CLI's tests assert exact membership, and
  a ranked backend may only add ordering assertions.
- No persisted index artifact alongside the git-tracked ledger — atoms are read
  fresh per query.

## Revisit if

- A ledger reaches thousands of atoms and users report concept-recall failures
  (finding atoms by concept rather than exact words).
- ndr stops shipping as a compiled single binary.

## Context

- `searchFreeText` is a case-insensitive `.includes()` filter over every atom held
  in memory — no ranking, fuzzy matching, or relevance ordering.
- It backs both `ndr search` and the free-text `@ndr-reader` lane.
- ndr ships as a `bun build --compile` single binary symlinked into `~/.local/bin`;
  its runtime dependencies are three pure-JS packages.
- Ledgers run from ~50 atoms in this repo to 100+ and growing in work projects.
- CLI tests assert exact search membership, and the rest of the CLI is
  deterministic end to end.
- qmd requires the native `node-llama-cpp` addon plus three GGUF models fetched
  from HuggingFace at runtime into `~/.cache/qmd`.
- No prior decision governed search behavior; this is the first.

## Why

The distribution constraint decides it before corpus size gets a vote. Native
addons and GB-class model blobs downloaded at first run cannot be bundled into a
compiled single binary, so adopting qmd would mean abandoning the install story
that `bun run install:bin` depends on — a cost the search surface is nowhere near
large enough to justify.

Corpus size then confirms the same call from the other direction. At hundreds of
atoms the realizable win is *ordering*, not *recall*: the atoms are already all in
memory and every one is scanned, so nothing is being missed — the results are just
unranked. Semantic and hybrid retrieval solve a recall problem that only appears
at thousands of documents.

Determinism is the third reinforcement. LLM query-expansion and reranking would
force a flag gate and a separate test strategy for one lane of an otherwise
fully deterministic CLI, whereas a fixed scoring formula drops into the existing
test model unchanged.

## Alternatives

- **qmd (`@tobilu/qmd`)** — rejected: native `node-llama-cpp` plus runtime-downloaded
  GGUF models break the compiled-binary install; wants to own the corpus rather
  than sit behind the port; nondeterministic rerank.
- **Raw SQLite FTS5 via `bun:sqlite`** — rejected: carries the same persisted-index
  lifecycle cost as qmd without buying the semantic capability.
- **Orama** — deferred: pure-JS, BM25 with optional vectors, so it sidesteps the
  native/compile problem entirely. This is the semantic escalation path if the
  revisit condition ever fires.
- **MiniSearch / FlexSearch** — deferred: both are viable zero-dep in-memory
  rankers; the choice between them and a hand-rolled BM25 belongs to the
  implementation, not here.
