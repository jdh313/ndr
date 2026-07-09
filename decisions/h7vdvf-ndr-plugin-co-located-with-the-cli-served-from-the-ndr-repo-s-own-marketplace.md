---
id: "h7vdvf"
title: ndr plugin co-located with the CLI, served from the ndr repo's own marketplace
status: current
decision_date: 2026-06-04
author: Jacob Hoehler
conviction: tentative
project: ndr
labels:
  - tooling
  - deployment
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by:
  - "0129"
  - "0147"
---

# h7vdvf — ndr plugin co-located with the CLI, served from the ndr repo's own marketplace

## Decision

The Claude Code plugin (skills `/decisions`, `/ground`, `/capture-decision`, `/drift-check` + agents) lives in `~/Projects/ndr/plugins/ndr`, served from that repo's single-plugin marketplace (`ndr@ndr`); the cc-marketplace copy is deprecated in place and is no longer the enabled source.

## Commitments

- Exactly one Claude Code plugin named `ndr` may be enabled at a time; if both are enabled simultaneously, `ndr@ndr` is the live source.
- cc-marketplace's `ndr` entry stays frozen at v0.6.1, deprecated in place (banner + `[DEPRECATED]` descriptions) rather than deleted.
- The single-plugin marketplace ships bare, with no automated validation or sync machinery — accepted for now given single-plugin scale.

## Revisit if

- The ndr repo is no longer checked out on the target machine — co-location's benefit depends on that.

## Context

- Post-JUN-175, every CLI surface change has a skill-side consumer: skills call `ndr resolve`, `ndr capture`, and `ndr search` directly.
- Pre-JUN-175, the skill and CLI were loose peers — a CLI change could land without a corresponding skill update, without immediate breakage.
- Keeping the plugin in a separate repo (cc-marketplace) means brief-format changes, exit codes, and stdout shape each require a coordinated two-repo commit.
- JUN-176 (moving atoms into the ndr repo) was already moving in the same direction.
- cc-marketplace's validation and sync automation exists for that marketplace but was deliberately not replicated here.

## Why

Co-location makes CLI-skill co-evolution atomic: one commit in `ndr/` covers both the CLI change and its skill-side adaptation, eliminating the sync step a split-repo setup requires now that every CLI surface change has a skill-side consumer. The cc-marketplace copy is deprecated in place rather than deleted, preserving history and allowing rollback without a force-push. JUN-176 completes the same direction of travel. The single-plugin marketplace deliberately does not replicate cc-marketplace's validation/sync machinery — that overhead is only worth it at scale.

## Alternatives

- **Stay in cc-marketplace** — rejected: the existing output contracts (ndr:0136, ndr:0146) make the cross-repo coupling safe but not cheap; each CLI surface change still requires a second commit in a second repo.
- **Move instead of copy** — rejected: a destructive move rewrites cc-marketplace history and leaves no paper trail of the plugin's prior state; copy + freeze + deprecation banner preserves that history in place.
