---
name: to-design
description: "Decide how the system will meet an outcome before it is built: drivers, the shape that exists, options from named patterns, a recorded decision, review by another model, and the scenarios that become checks. Use when a change introduces or changes a building block, an interface, ownership of state, a runtime interaction, an external dependency or an interface surface, when take-task composes a feature's planning, or when the user asks for a design; never for a small bug or a trivial change."
---

# To design

The spec says what is being built and where its behaviour will be checked;
this skill says how the system will do it, before code is written. The
method and the standards are [`references/design.md`](references/design.md),
beside this file; the stage the step belongs to, and when it is skipped, is
the protocol's [life cycle](references/lifecycle.md). This file holds the
step, its timing and its trigger only.

This project's **backlog integration** should have been provided to you: how
its gate is run, how its tracker is driven, where its vision and charters
live. The project's agent doc points at it; follow the pointer before you
write anything. If there is none, tell the user to run
`/setup-shady2k-skills`, and leave the backlog as it is until then. The
protocol (levels, lanes, the horizon, what a clean gate is) is
[`protocol.md`](protocol.md), beside this file.

Everything the owner reads follows the protocol's [**Speaking to the
owner**](references/speaking.md).

## 1. Decide whether design is owed

By [`references/design.md`](references/design.md)'s **Design runs when the
shape changes**, skipped by the life cycle's **Tailoring is the rule**, the
reason said where the work is planned. Read the change against the code before deciding: a change
described as small may change the shape anyway, and one described as large
may not. Where the owner asks for a design the step runs; what they asked
for does not widen the scope it decides on.

## 2. Gather the drivers and the inventory

Read the spec's scenarios and seams, the product requirements the outcome
serves, the project's standing quality scenarios and constraints, and the
code and documents of the area the change lands in. The drivers come before
any option, by design.md's **Drivers before options**, each traced to the
outcome frame the protocol's [**The outcome frame comes before the work is
specified**](references/lifecycle.md) establishes; the inventory of
what exists comes before any option too, by **Inventory before options**.
Each constraint carries where it comes from, by **Drivers before options**:
the frame's users and platforms, a record, the owner, a standard or a law. A
limit of the machine, the harness or the tools this work runs on is not a
constraint of the product: where it bites, the owner hears it as a consequence
with the ways out. What is material and unknown goes to `brainstorming`,
`to-research` or `to-prototype`, never into a guess. The frame and its drivers
are put to the owner here — the frame found where it is already stated, and
one recommendation per missing part — and what they answer is what the options
are drawn against.

## 3. Draw the options, choose, record

Options and choice by **Options from named patterns** and **The choice is
recorded where it will be read again**: through `model-domain` where the
project keeps decision records, with the views the decision turns on drawn
or updated beside it. The options offered stand on the state of the practice,
by the protocol's
[**A proposal starts from the state of the practice**](references/deciding.md),
whose architectural case design.md's **Options from named patterns** is. What the
owner must decide — only a quality attribute traded for another, by **The
owner hears only the trade** — is asked here, one question at a time, with
its mechanism; the rest is decided and recorded alone. The chosen direction
goes to the owner for confirmation before the record is written at length and
before the review, not after: a review of a direction they have not seen
argues about somebody's unconfirmed frame. Where they replace the frame, the
options are drawn again from it, and every number, limit and timeout carried
from the replaced mechanism is re-derived from the new one or marked as
inherited with its source, by **The choice is recorded where it will be read
again**.

## 4. Review before building

By **Review before building**, whose first question is validation and not
consistency: does the design serve the outcome frame, the decisions the owner
has given and the product reason behind the work? A frame mismatch — or a
frame the owner has never confirmed — is the review's blocking finding and
goes back to them; no fix round runs before it is settled, and a round that
would only add mechanism to an unconfirmed frame is not run. Where no other
model can be reached from this harness, the review is self-review against the
scenarios: the record says so, and the run's report to the owner names it
among what it cannot judge for itself.

## 5. Hand the design to the stages

Every automatable scenario becomes an executable check, by **Scenarios
become checks**. Where the step was called on a written spec, its Decisions
section is updated first, to record what the design decided; then return to
the caller the decision records, the views that changed, and the checks the
stages must carry. When the request includes
execution or decomposition, continue with `to-stages`, naming each check
beside the task that will run it; otherwise name `to-stages` as the next
step, with what the design has already settled.
