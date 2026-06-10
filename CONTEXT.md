# ndr

Capture and resolution tooling for nested decision records.

This file fixes the project's vocabulary — the canonical term for each concept
in ndr, used consistently across the code, the docs, and the decision atoms
themselves. If you're contributing, reach for these words; if you're reading and
a term is unfamiliar, this is the place to look it up.

Each entry gives a definition and, where two concepts are easy to conflate, an
_Avoid_ line listing the synonyms we deliberately **don't** use (e.g. `head` and
`current` describe the same atom but from different angles, so we keep them
distinct). The _Avoid_ lines are shared naming discipline, not a private style
preference — sticking to one word per concept keeps search, code, and decision
history aligned.

## Language

**alias**
The frontmatter YAML field on an atom holding zero or more slugs. The mechanism by which slugs survive supersession — on supersession, the predecessor's aliases move to the successor.

**area**
Top-level taxonomy bucket for an atom (e.g. `substrate`, `tooling`, `architecture`). Constrained by `<ledger>/.taxonomy/areas.yaml`.

**atom**
A single decision record: one chosen path with one set of consequences. The atomic unit in a ledger.

**capture**
Record a decision as an atom in a ledger. The user/agent-facing write verb. A higher-level operation than file `write` — includes validation, ID assignment, slug/alias handover on supersession, and taxonomy enforcement.
_Avoid_: write (as user-facing verb), record, commit, log

**current**
The frontmatter status value indicating an atom is live (not `superseded`, not `retracted`). Identifies heads by status; `head` identifies them by topology.
_Avoid_: active, live, head (as synonym)

**drift**
Divergence between a frozen reference (atom-id grain) and the current head of its supersession chain. Surfaced as signal when `resolve` on an atom-id finds `status: superseded`.

**grain**
Resolution mode of an `ndr:` reference. Three grains: atom-id (`ndr:0042`), slug (`ndr:#slug`), topic (`ndr:area/topic`).

**head**
The terminal atom of a supersession chain (no `superseded_by` pointing out). Structural — defined by the graph topology. Always also `status: current` in a well-formed ledger.
_Avoid_: latest, tip, current (as synonym)

**ledger**
A single ID space of decision atoms; the unit a backend adapter wraps. Tooling operates over one or more.
_Avoid_: corpus, vault, store, registry

**lineage**
Walk the supersession chain from a given atom to its head. The explicit graph operation.
_Avoid_: history, chain (as verb), trace

**mint**
Assign a slug to an atom for use as a live-governance reference (alias-tracked across supersession). Lazy — invoked per-atom, only when the writer wants a stable slug ref. Distinct from ID assignment, which is automatic at capture.
_Avoid_: assign (for slugs), generate, coin

**resolve**
Follow an `ndr:` reference to its target(s). Behavior varies by grain: atom-id → one frozen atom (surface drift if superseded), slug → one alias-tracked head, area/topic → all current heads in scope.
_Avoid_: lookup, find, get

**search**
Free-text query against atom content. No structured reference, no grain semantics — distinct from `resolve`.
_Avoid_: query, grep

**slug**
Short kebab-case string acting as a stable, human-meaningful name for an atom (e.g. `substrate`, `monorepo-shape`). Lives in the atom's `aliases:` field; moves to the successor on supersession.

**supersession**
Replacement of one atom by another, recorded structurally via frontmatter pointers — successor's `supersedes:` names predecessor; predecessor's `status:` flips to `superseded` and `superseded_by:` gains the successor.

**taxonomy**
The on-disk vocabulary that constrains `area:` and `topic:` values. YAML lists in `<ledger>/.taxonomy/`. Enforced as a hard gate at capture time.

**topic**
Second-level taxonomy bucket nested under an area (e.g. `repo-shape`, `referencing`). Constrained by `<ledger>/.taxonomy/topics.yaml`.
