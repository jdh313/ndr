# Taxonomy

`labels:` is a finite, hand-edited list. Each atom carries 1-4 labels. The capture
skill validates every write against the list and refuses unknown values.

## Why finite

At ~50-200 decisions/year (personal scale), enforced taxonomy is more reliable
than embedding-distance matching. The cost of mis-grouping later is real — finding
a decision by `label:` six months later only works if the label was the same value
six months earlier.

Labels replace the old two-axis `area` + `topic` split (plus the `tags` overflow).
Two rigid single-valued axes forced misclassification — `area` went lumpy to
uselessness (one value covered most of the corpus) while real overflow
classifications leaked into `tags`. One flat multi-valued axis fixes both.

## Files

- `<ledger>/.taxonomy/labels.yaml` — the single label list.

A flat YAML list of strings. 1-4 values per decision.

## Where the live values live

**Current truth:** `<ledger>/.taxonomy/labels.yaml` — sibling to the atoms in
whichever ledger is resolved. Mutable; grows over time.

**Install-time seeds:** `ndr init` writes a starter `labels.yaml` embedded in the
binary; `/ndr-bootstrap` copies `plugins/ndr/assets/taxonomy/labels.yaml` into the
ledger. Both are frozen seeds — drift between seed and live taxonomy is expected
and correct.

This reference doc deliberately does NOT list current values. A static table here
would drift the moment a real `/capture-decision` invocation grows the taxonomy,
and any agent reading the snapshot would silently second-guess valid values.
Always read the ledger's `labels.yaml` for current truth. Read it with
`ndr labels` (never `ndr areas` / `ndr topics` — those commands are gone).

## Growth rule

Adding a value is explicit. The capture skill prompts:

> "`<value>` is not in `labels.yaml`. Use existing (`a`, `b`, `c`, …) or add new?"

Choosing "add new" appends the value to `labels.yaml` and commits the change.
**Friction is the feature** — silent acceptance is how taxonomies drift.

## Drift-prevention rules

- **Don't rename existing values.** A rename invalidates every prior decision that
  used the old name. If a value name turns out wrong, write a decision about it,
  then do the rename as a deliberate corpus-wide migration.
- **Don't add overlapping values.** If `tooling` and `substrate` start blurring,
  write a decision about whether to merge them, don't quietly add a third
  overlapping value.
- **Don't add catch-alls.** "other" or "misc" defeat the point.

## When the bootstrap is wrong

The bootstrap was chosen at install time to fit a generic starter set. It will be
wrong for some real decisions. The expected pattern: discover the gap during a real
`/capture-decision` invocation, decide on the new value, add it, and capture the
new value as a (small, low-altitude) decision so the choice survives.
