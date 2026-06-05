---
id: "h7vdvf"
title: ndr plugin co-located with the CLI, served from the ndr repo's own marketplace
status: current
decision_date: 2026-06-04
aliases: []
project: '[[ndr]]'
derived_from: []
informed_by:
  - "[[Decisions/0129-ndr-is-cli-primary-with-a-library-underneath-skills-rewir\
    e-to-call-ndr-resolve]]"
  - "[[Decisions/0147-ndr-v1-installs-by-symlinking-the-bun-compiled-binary-int\
    o-localbin]]"
supersedes: []
superseded_by: []
area: tooling
topic: deployment
impacts: []
revisit_triggers:
  - a second plugin lands in the ndr repo (validation automation becomes worth
    replicating)
  - the plugin needs to ship to machines without the ndr repo checked out
reversibility: medium
tags:
  - decision
---

# h7vdvf — ndr plugin co-located with the CLI, served from the ndr repo's own marketplace

## Decision

The Claude Code plugin (skills `/decisions`, `/ground`, `/capture-decision`, `/drift-check` + agents) lives in `~/Projects/ndr/plugins/ndr`, served from that repo's single-plugin marketplace (`ndr@ndr`); the cc-marketplace copy is deprecated in place and is no longer the enabled source.

## Why

After the JUN-175 rewire every CLI surface change has a skill-side consumer — co-location makes that co-evolution atomic.

> [!info]- Full reasoning
> Pre-JUN-175, the skill and CLI were loose peers; a CLI change could land without a corresponding skill update without immediate breakage. Post-rewire, the skills call `ndr resolve`, `ndr capture`, and `ndr search` directly, so brief format changes, exit codes, and stdout shape all have skill-side consumers. Keeping the plugin in cc-marketplace means every such change requires a coordinated two-repo commit. Co-locating eliminates that sync step: one commit in `ndr/` covers the CLI change and its skill-side adaptation together.
>
> JUN-176 (atoms moving into the ndr repo) completes the same direction of travel. cc-marketplace's validation and sync automation was deliberately not replicated — the single-plugin marketplace ships bare because that machinery is only worth the overhead at scale.
>
> The cc-marketplace copy is deprecated in place (banner + `[DEPRECATED]` descriptions, version frozen at 0.6.1) rather than deleted, to preserve history and allow rollback without a force-push. Only one enabled plugin named `ndr` may exist at a time.

## Alternatives

Stay in cc-marketplace relying on output contracts (ndr:0136, ndr:0146) to hold the seam (rejected — correct but loses atomic co-evolution) · move instead of copy (rejected — copy + deprecation preserves cc-marketplace history in place)

> [!info]- Why they lost
> - **Stay in cc-marketplace:** The ledgered output contracts make cross-repo coupling *safe* but don't make it *cheap*. Each CLI surface change still requires a second commit in a second repo. Acceptable at low churn; increasingly friction-heavy as the CLI stabilizes.
> - **Move (not copy):** A destructive move rewrites cc-marketplace history and leaves no paper trail of what the plugin looked like before the split. Copy + freeze + deprecation banner lets anyone reading cc-marketplace understand what happened without needing to chase commits.

## Consequences

Plugin and CLI changes are one commit · cc-marketplace carries a frozen, deprecated `ndr` entry at 0.6.1 · no validation/sync automation in the new marketplace

> [!info]- Detail
> - Co-location is only an improvement while the ndr repo is checked out on the target machine; see revisit trigger on portability.
> - The bare single-plugin marketplace has no automated validation. This is intentional for now — the overhead isn't justified for one plugin.
> - Exactly one Claude Code plugin named `ndr` should be enabled. If both are enabled simultaneously, the enabled source is ambiguous; the `ndr@ndr` entry should be the live one.
