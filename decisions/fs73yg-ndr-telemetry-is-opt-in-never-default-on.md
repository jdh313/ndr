---
id: "fs73yg"
title: ndr telemetry is opt-in, never default-on
status: current
decision_date: 2026-08-08
author: Jacob Hoehler
conviction: strong
project: ndr
labels:
  - discipline
  - tooling
binds: []
supersedes: []
superseded_by: []
derived_from: []
informed_by: []
---

# fs73yg — ndr telemetry is opt-in, never default-on

## Decision

Any telemetry ndr collects about its own use is opt-in. It is off until the
operator turns it on, and it never becomes default-on for the sake of better
measurement.

## Scope

- Every telemetry surface ndr grows, present or future.
- The `ndr` CLI itself, should it record its own invocations.
- Any Claude Code hook or OpenTelemetry exporter that reports ndr use.
- All of the above at once — the mechanism is undecided, and this binds
  whichever one is chosen.

## Commitments

- Telemetry is disabled unless explicitly enabled, per ledger.
- Enablement is an explicit configuration act (`.ndr.toml` or a global ndr
  config), never a bare environment variable that a plugin or install script
  could set on the operator's behalf.
- The local sink is the default. Uploading anywhere off-machine is a separate,
  later, explicit choice.
- Whatever is recorded must be inspectable on demand, so that claims about what
  ndr collects are verifiable rather than trusted.

## Revisit if

- ndr acquires operators who are not also its authors, adoption cannot be
  measured any other way, and those operators ask for default-on collection.

## Context

- ndr is being evaluated for whether it earns its keep.
- That evaluation requires knowing how often decisions are actually read and
  whether reads change what gets built.
- The cheapest way to obtain that data is to collect it by default.
- The tool runs on a personal machine where raw capture is acceptable and a
  work machine where it is not.
- A third operator will not upload anything at all.

## Why

A tool whose purpose is to make decisions legible cannot itself quietly watch
its user. The credibility of the ledger rests on the operator trusting what it
records and why; silent collection undermines exactly the property the tool
exists to provide.

The practical case is as strong as the principled one. Default-on collection
only has to be wrong once — on a work machine, in a repo whose atom titles are
company IP — to be a disclosure problem rather than a configuration mistake.
Opt-in makes that failure impossible by construction instead of by remembering
to configure an exclusion. Defaults are the only setting most installations
ever have, so the default is the real policy.

Measurement being inconvenient is not on its own a reason to revisit this.

## Alternatives

- **Default-on with an opt-out** — rejected: the industry norm, and the shape
  the existing Langfuse hook already has once installed, but it inverts who
  bears the cost of a mistake and the mistake is unrecoverable, since data
  already sent cannot be unsent. It would also have made the recent question of
  whether that hook was active on the work machine a live disclosure incident
  rather than a five-second check.
- **Default-on for personal ledgers, opt-in for work ledgers** — rejected:
  matches the actual risk profile, but makes safety depend on correctly
  classifying every ledger, and a misclassified ledger fails silently in the
  unsafe direction.
