---
id: "75pwek"
title: One labels list replaces area, topic, and tags
status: current
decision_date: 2026-07-08
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - meta-chain
  - tooling
binds: []
supersedes:
  - cwe50d
superseded_by: []
derived_from:
  - docs/superpowers/specs/2026-07-08-atom-format-redesign.md
informed_by:
  - "0153"
---

# 75pwek — One labels list replaces area, topic, and tags

## Decision

A single `labels:` list of 1-4 values drawn from `<ledger>/.taxonomy/labels.yaml` replaces the `area`, `topic`, and `tags` fields, and the `ndr areas`/`ndr topics` commands become `ndr labels`.

## Commitments

- `<ledger>/.taxonomy/areas.yaml` and `topics.yaml` merge into one `labels.yaml`; `ndr capture` gates `labels:` against it.
- The CLI exposes `ndr labels`; the `--area`/`--topic` flags and the `ndr areas`/`ndr topics` commands are removed.
- Enforcement altitudes are preserved: hard gate at capture, advisory at doctor, hand-edited list where adding a value is a data edit, not a deploy.

## Revisit if

- The flat label space grows large enough that atoms need a second grouping dimension again.

## Context

- `area` and `topic` were two rigid single-valued axes; `area: tooling` covered 31 of 52 atoms, filtering nothing, while `topic` carried 18 distinct values.
- Real classifications that neither axis could express overflowed into `tags` (e.g. `meta-chain`, 12 atoms).
- The two-axis model forced misclassification and split the taxonomy across three fields and two files.

## Why

One multi-valued label set lets an atom carry the few tags that actually describe it, instead of being forced into one lumpy area plus one topic plus overflow tags. Merging the axes removes the misclassification pressure and collapses three fields and two taxonomy files into one. The enforcement altitudes are deliberately carried over from the prior taxonomy decision, so only the shape changes, not the friction model that keeps the vocabulary from drifting.

## Alternatives

- **Keep separate `area` + `topic` axes (and `ndr areas`/`ndr topics`)** — rejected: single-valued axes forced misclassification and overflow into `tags`, and `area` filtered 60% of the corpus into one bucket.
- **Free-form tags with no taxonomy file** — rejected: loses the capture-time gate that keeps the vocabulary from drifting.
