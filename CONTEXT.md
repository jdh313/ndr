# ndr

Capture and resolution tooling for nested decision records.

The canonical term for each concept in ndr — reach for these words in code, docs,
and atoms. An _Avoid_ line lists synonyms we deliberately don't use; it is
binding, not a style note.

## Language

### Model

**atom**
A single decision record: one chosen path with one set of consequences. The atomic unit in a ledger.

**atom-id**
An atom's permanent identifier, frozen at capture and never reassigned. Two encodings coexist and are both accepted forever: 6-character lowercase Crockford base32 (minted at capture) and 4-digit legacy ids predating the scheme change.
_Avoid_: slug, key, number

**current**
The `status` value indicating an atom is live. Identifies heads by status; `head` identifies them by topology.
_Avoid_: active, live, head (as synonym)

**drift**
Divergence between a frozen reference (atom-id grain) and the current head of its supersession chain. Surfaced as signal when `resolve` on an atom-id finds `status: superseded`.

**grain**
Resolution mode of an `ndr:` reference. Two grains: atom-id (`ndr:0042`) and label (`ndr:<label>`).

**head**
The terminal atom of a supersession chain (no `superseded_by` pointing out). Structural — defined by the graph topology. Always also `status: current` in a well-formed ledger.
_Avoid_: latest, tip, current (as synonym)

**ledger**
A single ID space of decision atoms. Tooling operates over one or more.
_Avoid_: corpus, vault, store, registry

**status**
Frontmatter enum recording an atom's lifecycle: `current`, `superseded`, or `retracted`. Distinct from `ndr status`, the CLI's repo-wiring report — see Flagged ambiguities.

**supersession**
Replacement of one atom by another, recorded structurally via frontmatter pointers — successor's `supersedes:` names predecessor; predecessor's `status:` flips to `superseded` and `superseded_by:` gains the successor.

**taxonomy**
The on-disk vocabulary that constrains `labels:` values — a YAML list at `<ledger>/.taxonomy/labels.yaml`, enforced as a hard gate at capture.

### Frontmatter fields

**binds**
Frontmatter list of glob patterns naming the files/paths a decision governs. Advisory — a routing signal, never an exclusive filter and never a status input.

**conviction**
Frontmatter enum (`strong` | `tentative` | `arbitrary`) recording how strongly a decision is held. Advisory: it sets the bar a supersession must clear, but gates nothing.

**derived_from**
Frontmatter list of free-form references to the raw source a decision came out of — a spec path, mull note, ticket, or session log. Any string is accepted; unvalidated.
_Avoid_: source, origin, from

**informed_by**
Frontmatter list of atom-ids naming decisions that shaped this one without being replaced by it. Carries no supersession semantics — unlike `supersedes:`, it leaves those atoms `current`.
_Avoid_: related, references, see-also

**labels**
Frontmatter list (1–4 values) naming what a decision is about (e.g. `substrate`, `tooling`). The single taxonomy axis.
_Avoid_: tags, area, topic

**project**
The owning scope of a decision. Every atom has exactly one; there is no cross-project tier.
_Avoid_: repo, scope, owner

### Operations

**capture**
Record a decision as an atom in a ledger — the user/agent-facing write verb, as opposed to a plain file `write`.
_Avoid_: write (as user-facing verb), record, commit, log

**lineage**
Walk the supersession chain from a given atom to its head. The explicit graph operation.
_Avoid_: history, chain (as verb), trace

**resolve**
Follow an `ndr:` reference to its target(s). Behavior varies by grain: atom-id → one frozen atom (surface drift if superseded), label → every current head carrying that label.
_Avoid_: lookup, find, get

**search**
Free-text query against atom content. No structured reference, no grain semantics — distinct from `resolve`.
_Avoid_: query, grep

## Flagged ambiguities

**`status` and `current` each name two different things.**
`ndr status` is a CLI verb reporting how ndr is wired up in this repo; `status:` is the frontmatter lifecycle enum. `ndr current` is a CLI verb listing heads; `status: current` marks a single atom live. The two CLI verbs are unrelated to each other, and neither is the frontmatter concept of the same name.

Resolution: all four names are kept as-is. In prose, disambiguate by form — write `ndr status` / `ndr current` for the verbs and `status:` / `status: current` for the frontmatter. Bare `status` and `current` mean the frontmatter concepts.
