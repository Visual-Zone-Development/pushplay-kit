---
name: piecewise
description: Build a request that bundles several changes to a game piece by piece - explain the plan back, split it into small jobs, each with its own check (a test, screenshots of every variant, a playtest), run them one at a time, and stop for the owner's sign-off after any job they need to see or feel. Use when a request holds three or more separate changes (a playtest feedback list, "do all of these", a multi-part feature, a design doc's milestones), or the user says "break this up" or "one piece at a time". Not for a single change (just make it) or for deciding what the game is (use design-doc or game-design).
---

# Piecewise

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide how a change is built, checked and finished.

One big request, many small **jobs**. Each job is planned, built and **checked** on its own, so when something is wrong, one job goes back, not the whole pass. "Done" means the job's check ran and you hold its **evidence**. Nothing else counts as done.

## 1. Explain it back

Restate the request as a short plan: what changes, what stays, the order, and anything you'd do differently from how it was asked. Ask the owner to confirm. Done when the owner has said go (a plan they already approved in this conversation counts).

## 2. Split it into jobs

Write each job as a small ticket:

```
## <n>. <outcome, in plain words>
What to build: <one visible outcome>
Blocked by: <job numbers, or none>
Check: proven | seen | felt
Acceptance: <what the check must show>
Status: todo
```

Keep each job to one visible outcome, small enough for one fresh session. Give every job exactly one **check kind**:

| Check | Use for | Evidence |
|---|---|---|
| **proven** | rules, numbers, logic, timing | a test that failed before and passes after |
| **seen** | anything on screen: models, hands, HUD, effects, layout | screenshots of every **variant** it touches |
| **felt** | feel, difficulty, fun | the owner's playtest, or bot runs (the `playtest` skill) plus the owner's notes |

**Variants** are every case the change reaches: each weapon or character, each input, each team, each screen size, every state (zoomed and not, start, middle and end of an animation). A seen check that shows one variant of five is one-fifth of a check.

Order the jobs: proven ones first (they're quick and unblock the rest), then seen, then felt, with blockers before what they block. Save the list as `jobs.md` wherever the project keeps plans (a scratch folder that isn't shipped with the game is fine) and show it. If the project uses an issue tracker, offer to file the jobs there. Done when every job has a check kind and an acceptance line its check can pass or fail.

## 3. Run one job at a time

For each job, in order:

1. **Build it** the way the project's rules say, test first for a proven job. When the conversation is already long or the job is large, hand it to a fresh helper agent if you can start one, with a brief: the job's ticket, the files involved, and the check it must pass.
2. **Check it.** Run the check and collect the evidence. For a seen job, cover every variant at the states the job names. Where a value can be worked out two ways (a predicted position against the rendered one), compare them in code.
3. **Gate it.**
   - **Proven:** the test passes, so mark the job done in `jobs.md` and go on.
   - **Seen or felt:** show the evidence and stop for the owner's OK. Their feedback reopens this job only. Fix it and show it again.

A job is done when its check has passed and, for seen and felt jobs, the owner has signed it off. Keep going until every job in `jobs.md` is done or the owner stops the pass.

## 4. Close the pass

Record it in `DESIGN.md` (the Changelog, and any section the pass changed). Report a table of the jobs with each one's check kind, evidence and status. List any job whose check couldn't run as **unchecked**, with the reason and what the owner should try.

Run the project's checks and finish the change the way its rules say.
