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

**atom**
A single decision record: one chosen path with one set of consequences. The atomic unit in a ledger.

**binds**
Frontmatter list of glob patterns naming the files/paths a decision governs. `ndr doctor` flags a `binds` entry whose glob no longer matches anything tracked in the repo (`binds_stale`) as a signal the decision's scope may have gone stale.

**capture**
Record a decision as an atom in a ledger. The user/agent-facing write verb. A higher-level operation than file `write` — includes validation, ID assignment, two-write supersession (successor written first, then each predecessor patched) with advisories, and taxonomy enforcement.
_Avoid_: write (as user-facing verb), record, commit, log

**conviction**
Frontmatter enum (`strong` | `tentative` | `arbitrary`) recording how strongly a decision is held. A signal for supersession judgment — read by humans and the plugin's skills, not enforced by the CLI. Required at capture, with no default.

**current**
The frontmatter status value indicating an atom is live (not `superseded`, not `retracted`). Identifies heads by status; `head` identifies them by topology.
_Avoid_: active, live, head (as synonym)

**drift**
Divergence between a frozen reference (atom-id grain) and the current head of its supersession chain. Surfaced as signal when `resolve` on an atom-id finds `status: superseded`.

**grain**
Resolution mode of an `ndr:` reference. Two grains: atom-id (`ndr:0042`) and label (`ndr:<label>`).

**head**
The terminal atom of a supersession chain (no `superseded_by` pointing out). Structural — defined by the graph topology. Always also `status: current` in a well-formed ledger.
_Avoid_: latest, tip, current (as synonym)

**labels**
Frontmatter list (1–4 values) naming what a decision is about (e.g. `substrate`, `tooling`). Constrained by `<ledger>/.taxonomy/labels.yaml`; `ndr capture` hard-gates on unknown values. The single taxonomy axis — replaced the two-level area/topic split.
_Avoid_: tags, area, topic

**ledger**
A single ID space of decision atoms; the unit a backend adapter wraps. Tooling operates over one or more.
_Avoid_: corpus, vault, store, registry

**lineage**
Walk the supersession chain from a given atom to its head. The explicit graph operation.
_Avoid_: history, chain (as verb), trace

**resolve**
Follow an `ndr:` reference to its target(s). Behavior varies by grain: atom-id → one frozen atom (surface drift if superseded), label → every current head carrying that label.
_Avoid_: lookup, find, get

**search**
Free-text query against atom content. No structured reference, no grain semantics — distinct from `resolve`.
_Avoid_: query, grep

**supersession**
Replacement of one atom by another, recorded structurally via frontmatter pointers — successor's `supersedes:` names predecessor; predecessor's `status:` flips to `superseded` and `superseded_by:` gains the successor.

**taxonomy**
The on-disk vocabulary that constrains `labels:` values. A YAML list at `<ledger>/.taxonomy/labels.yaml`. Enforced as a hard gate at capture time.
