# Architecture and design

Part of the set's protocol, whose core is `protocol.md`: the same in every
project, and it wins over a project's restatement.
How a design is made, compared and reviewed before code is written, and
what is kept of it. The method is Attribute-Driven Design (SEI ADD 3.0).
Each standard is named once below, at the rule that uses it; elsewhere the
rules are cited by name. `to-design` carries the step; `to-spec`,
`take-task`'s review and `brainstorming` cite this file's rules.

**Design runs when the shape changes.** A design step is made when a change
introduces or changes a building block, an interface, the ownership of
state, a runtime interaction, an external dependency or an interface
surface. A small bug and a trivial change make none of those and skip the
step by the life cycle's **Tailoring is the rule**; a change that makes one
of them runs it however small it looks, because the shape is what the next
ten changes build on.

**Drivers before options.** The design is driven by three things, gathered
before any option is drawn: the functional requirements the change serves;
quality attribute scenarios — a stimulus, the condition it arrives under,
the response, and a measure — the project's standing ones and the work's
own, with ISO/IEC 25010:2023's categories read as the list of what might be
missing; and the constraints, technical, organisational and legal, the
design must accept. A scenario without a measure is a wish, not a driver.

**Inventory before options.** Before any option, read what exists: the
building blocks and the state each owns, the interfaces between them, the
runtime interactions the change would touch, the design-system components
and the patterns already in use. This is [building.md](building.md)'s
**Find before writing** and **One surface per capability** applied to the
design before code: a new block beside one that could serve says why the
existing one cannot.

**Options from named patterns.** At least two options are built from named
patterns and tactics, not from habit: the patterns of enterprise
application architecture (PoEAA) and of integration (EIP, and POSA) for
structure and messages, the stability and operations tactics of Release
It!, the twelve factors for deployment, STRIDE and OWASP ASVS where
security is a driver, WCAG 2.2 and W3C design tokens where an interface is.
Each option is evaluated against the scenarios on steady state, growth,
failure, security and operability — what it does all day, at ten times the
load, when a part of it fails, and what it costs to operate. Among them is
at least one that rejects the assumption the others share, by
[deciding.md](deciding.md)'s **A design decision comes with its
mechanism**.

**The choice is recorded where it will be read again.** The chosen design
goes into a decision record, MADR's fields: context and problem, decision
drivers, considered options, the decision and its consequences — each
rejected option with the reason it lost, each assumption with what would
invalidate it. The builder's convenience — fewer moving parts, easier to
test, one client assumed — is not a reason: it prices the next week against
the scenarios, and the scenarios win. The views the decision needs are
drawn or updated where the project keeps its architecture (arc42's layout,
C4's levels, under 42010's contract), never all of them: the views this
decision turns on, and elsewhere what the change made false, by the
protocol's **What describes the present is kept true**.

**Review before building.** A different model reviews the design in ATAM's
manner before code is written: the scenarios are walked
against the chosen design, and the findings are its sensitivity points —
the decisions the important scenarios turn on — its trade-offs, the
qualities exchanged for each other, and its risks, what could still fail
with the scenario that shows it. The pillars of a well-architected system —
cost, reliability, operations, performance, security — are prompts for what
the scenarios did not cover, not a second checklist. Findings change the
design or are answered with evidence, and the review converges as a stage
review does: blocking findings fixed on their own diffs, the rest as
comments, no third round. Where no other model can be reached from this
harness, the review is self-review against the scenarios, and the record
says so.

**Scenarios become checks.** Every quality attribute scenario a machine can
judge becomes an executable check — a fitness function, run with the
project's other checks — and is handed to `to-stages` as a task's
criterion, so the attribute is owned by a check and not by hope. The
scenarios that cannot be automated are named with who will judge them and
how, by [deciding.md](deciding.md)'s **A claim reaches only as far as its
evidence**.

The same scenarios are what the system is guarded by in use: what is
logged, measured and alerted on comes from them, built with the feature
and not after it, and each alert carries its runbook — one page of what to
check first and how to stop the failure it fires on. Where the product has
users, an alert a person answers is held to a service level as Google
SRE's define them: an objective for the scenario, a measure over the
indicator it is judged by, and an error budget; what is owed once the
budget is spent — making the service more reliable first, building nothing
new on it — is the design's own trade, decided before it becomes an
emergency.

**The owner hears only the trade.** By [deciding.md](deciding.md): what
reaches the owner is a quality attribute traded for another — speed against
clarity, cost against resilience — with its mechanism, its options and what
each costs; patterns, structure, views and the record's form are the
agent's own work.
