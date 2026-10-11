---
name: refine-practices
description: "Hold a retrospective over the work since the last one: read the run records, findings, reviews, corrections and transcripts, review the project's active practices against what actually happened, turn repeated errors into fixes for their class, and land the accepted fixes in one change. Use when the user asks for a retrospective or agrees to a proposed one; it starts only on the owner's request or agreement."
---

# Refine practices

A **retrospective** over the work since the last one. It reads what happened,
finds the errors that repeated, and turns each class into its strongest fix:
removing the cause, a check that catches the class, or a practice every agent
reads. Its practices live in `docs/practices/`, one file per practice, plus
one line in the agent doc.

This project's **backlog integration** should have been provided to you: how
its gate is run, how its tracker is driven, where its vision and charters
live. The project's agent doc points at it; follow the pointer before you
write anything. If there is none, tell the user to run
`/setup-shady2k-skills`, and leave the backlog as it is until then. Read
[`protocol.md`](protocol.md), including its setup-version check.

Everything the owner reads follows the protocol's [**Speaking to the
owner**](references/speaking.md).

## 1. When it runs

It starts only on the owner's request or agreement, never on its own. It is
tracked work of its own, by the protocol's
[**Tracked work**](references/keeping.md): the item its work is filed under
dates when it ran, so the next retrospective reads from there, and where none
has run before, everything the records hold is read and that is said. When
`to-milestone` plans the next milestone as the current one ends, it offers
the retrospective first and plans what follows it after the retrospective is
held. A project that never runs `to-milestone` hears it from `ask-shady2k`,
once about five features have closed since the last retrospective. And at
any time on request. When offered, say roughly how long it takes in agent
time, and that it is an estimate, by the protocol's
[**Estimates**](references/running.md).

## 2. Gather the signals

A retrospective session opens with the picture of where the work stands, by
the protocol's [**The session opens with the picture**](references/running.md),
then reads everything since the last one. Gather only, judging nothing yet:
the classes are named, not the culprits.

- The forecast against what the work actually spent, by phase. How the work
  went is kept on the items, by the protocol's [**How the work went is kept
  on the item**](protocol.md), and the run script
  ([`runs.mjs`](runs.mjs), run with `node` from this skill's folder over the
  adapter's export, in the format of [`time-format.mjs`](time-format.mjs))
  prints it the same from every machine: `report` and `pace` for how past
  runs went and how long work really takes here, and
  `progress --item <feature or milestone>` for where each stands now. The
  ledger beside it ([`ledger.mjs`](ledger.mjs)) reads this machine's sessions
  whole, which is where a closed run's transcript is looked through.
- The findings filed since then and the lanes they landed in, and every
  item that was reopened.
- The review findings, both accepted and rejected.
- The owner's corrections: where they fixed or overruled what the agents did.
- Repeated loops in the closed features' session transcripts: a failure met
  more than once, an edit made, reverted and made again. Where the project
  agreed to Jev, a question over a transcript is put to it and only a sure
  answer is taken, by the protocol's [**Its answer is taken only where it is
  sure**](references/judging.md); what it is unsure of, read yourself.

## 3. Review the active practices first

Every active practice is judged against the evidence gathered. A retired
practice is kept with its reason and not judged again; it is where a new
proposal is checked first, so a class already retired is not filed again.

- **Wrong**: its class recurred although the practice was applied; it is
  changed into one that can.
- **Obsolete**: its cause is gone; retired with the reason, beside the work
  that removed the cause.
- **Useless**: its class did not appear for two retrospectives, and the
  practice was never applied meanwhile.
- **Conflicting**: it contradicts another practice, the agent doc, or the
  set's rules. Which one survives is the owner's choice.
- **Absorbed**: a check, or the change that removed the cause, now covers
  what the practice said. Retire it to that check or change.

## 4. Propose fixes for the repeated errors

The errors gathered in section 2 that recurred are judged by the set's
[**A repeated failure is fixed as its class, not as its
cases**](references/keeping.md):

- A class needs occurrences in at least two different features. A failure
  seen once is a finding, filed where it was found.
- Describe it as a class, with its mechanism: why the action looked
  reasonable to the agent that took it. Never as the cases; each case goes
  into the practice record's Evidence field.
- The strongest fix wins: removing the cause, filed as backlog work through
  `to-backlog`, over a check, over a written practice.
- Where the fix is a written practice, write it from the protocol's template
  `templates/practice.md`, which setup installs, one file per practice under
  `docs/practices/`, and one line in the agent doc, by
  the protocol's [**A lesson that outlives the work is kept where every
  agent reads**](references/keeping.md). The practice record's shape is the
  template's, and it is not restated here.
- A fix of the set itself, a practice its own skills should carry, goes to
  its author through `report-to-shady2k`.

A proposal that would put the active practices over the budget that rule sets
is made together with a named candidate to retire: the number, and how it is
changed, belongs to the rule and to the agent doc beside it, not to this step.

## 5. One batch to the owner

Take everything from sections 3 and 4 to the owner in one message, by
[**Come with the material**](references/deciding.md): each reviewed practice
with its verdict and what retiring or keeping it changes, each class with
its fix and the alternatives it beat, each item with a recommendation and
what accepting it changes. The owner's time is spent once, on worked
material, by the protocol's [**The owner's time is the scarce
one**](references/running.md). Each proposal carries its proposal's
mechanism, by the protocol's [**A design decision comes with its
mechanism**](references/deciding.md): the class, why the fix is the
strongest one, and what evidence stands behind it. A proposal with a real
conflict — which of two practices survives, or a budget raised — is asked
on its own, and one such question at a time; everything else is accepted
as a batch or changed by named items.

## 6. Land the accepted fixes in one change

The accepted items land in one change under tracked work: practice files
and agent doc lines together, the filed cause removals and checks beside
them in the same push. Run the gate before publishing, by the protocol's
[**The gate is clean**](protocol.md), and fix its errors before anything
leaves this machine.

Report by [**Summarize; never assign reading**](references/speaking.md):
what was kept, retired with its reasons, and newly written, and what to do
next, by [**End with the next step**](references/speaking.md).
