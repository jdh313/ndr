# Taxonomy

`area:` and `topic:` are finite, hand-edited lists. The capture skill validates every write against them and refuses unknown values.

## Why finite

At ~50–200 decisions/year (personal scale), enforced taxonomy is more reliable than embedding-distance matching. The cost of mis-grouping later is real — finding a decision by `area:` six months later only works if `area:` was the same value six months earlier.

The Bases view renders the current taxonomy as a visible reference, so "I forgot my own tag names" stays manageable.

## Files

- `taxonomy/areas.yaml` — the *what is this decision about* axis.
- `taxonomy/topics.yaml` — finer-grained, within an area.

Both are flat YAML lists of strings. One value per decision (not lists).

## Where the live values live

**Current truth:** `<ledger>/.taxonomy/{areas,topics}.yaml` — sibling to the atoms in whichever ledger is resolved. Mutable; grows over time.

**Install-time seeds:** `ndr init` writes a starter taxonomy embedded in the binary; `/ndr-bootstrap` copies `plugins/ndr/assets/taxonomy/{areas,topics}.yaml` into the vault ledger. Both are frozen seeds — drift between seed and live taxonomy is expected and correct.

This reference doc deliberately does NOT list current values. A static table here would drift the moment a real `/capture-decision` invocation grows the vault taxonomy, and any agent reading the snapshot would silently second-guess valid values. Always read the vault YAML for current truth.

## Growth rule

Adding a value is explicit. The capture skill prompts:

> "`<value>` is not in `taxonomy/topics.yaml`. Use existing (`a`, `b`, `c`, …) or add new?"

Choosing "add new" appends the value to the relevant `*.yaml` and commits the change. **Friction is the feature** — silent acceptance is how taxonomies drift.

## Drift-prevention rules

- **Don't rename existing values.** A rename invalidates every prior decision that used the old name. If a value name turns out wrong, write a decision about it, then do the rename as a deliberate corpus-wide migration.
- **Don't add overlapping values.** If `tooling` and `substrate` start blurring, write a decision about whether to merge them, don't quietly add a third overlapping value.
- **Don't add catch-alls.** "other" or "misc" defeat the point.

## When the bootstrap is wrong

The bootstrap was chosen at install time to fit the A–H meta-chain only. It will be wrong for some real decisions. The expected pattern: discover the gap during a real `/capture-decision` invocation, decide on the new value, add it, capture the new value as a (small, low-altitude) decision so the choice survives.
