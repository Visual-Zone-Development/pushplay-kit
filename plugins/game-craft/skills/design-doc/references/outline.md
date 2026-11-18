# Design doc outline

The sections of a full design doc, in the order to walk them. Each section
starts from the matching part of the brief template
([DESIGN.template.md](../../game-design/references/DESIGN.template.md)) where
there is one, and goes further. **Done** is the line that has to hold before
you ask for the section's sign-off.

At the top of the doc, keep the pitch, *Status: draft / approved*, the
version, and a contents list linking each section.

## 1. Pitch and player fantasy

- One-line pitch: what you do and why it's fun.
- **Player fantasy:** who the player gets to be and what they get to do ("a
  courier who outruns storms on a hand-built glider").
- The moment the owner pictures, in their own words.
- **Done:** the owner says the pitch and fantasy are the game they picture.

## 2. Pillars and non-goals

- **Three pillars:** short phrases that every feature must serve ("every
  fight is readable", "one more run"). For each, a question to ask of a new
  feature ("can a new player tell why they died?").
- **Non-goals:** what the game is deliberately *not* ("no crafting", "not a
  story game", "no online play in v1"). This is where scope creep gets
  stopped.
- **Done:** three pillars, at least three non-goals, and the owner agrees a
  feature that serves no pillar gets cut.

## 3. Players, platforms and inputs

- Audience, player count and mode (solo, local, online), target devices and
  the inputs gameplay supports, session length. Use the platform and input
  questions in [kickoff.md](../../game-design/references/kickoff.md).
- **Done:** every *required* kickoff topic has an answer, and none of them
  is assumed.

## 4. Fun targets and core loop

- The primary fun target and up to two secondary ones, mapped from the
  owner's own words ([framework.md](../../game-design/references/framework.md)).
- The core loop at three timescales (seconds, minutes, across sessions),
  each as *verb → challenge → reward → growth*.
- The **30-second fun test:** what the core verb alone, in an empty room,
  should feel like.
- **Done:** each fun target names the mechanic or feedback that delivers it.

## 5. A new player's first ten minutes

A step-by-step story of a first session, from launch to the moment they're
hooked: what's on screen, what they press, what they learn, what surprises
them, where they fail first and what makes them retry. This is where hidden
assumptions come out ("wait, how do they learn to dash?"). Every step uses
only what's in v1.
- **Done:** the owner reads it and recognises their game, with no step left
  as "somehow".

## 6. Rules and mechanics

- The 8 formal elements, each decided on purpose.
- Each verb: its input, what it does, its starting numbers (these go in
  the game's `TUNING` object when it's built), and how it feels.
- Win, lose and score; failure and retry; difficulty and its curve.
- Enemies or opponents and their behaviour, when the game has them.
- **Done:** someone could build a grey-box version from this section alone.

## 7. Content and structure

- Modes, levels, maps or runs: how many for v1, how they are made (by hand
  or generated), and how they escalate.
- Progression: what carries over between sessions, unlocks, and the reason
  to come back.
- Story, characters and setting, if any, at the depth the game needs.
- **Done:** v1's content is listed by name or by rule, with counts.

## 8. Look and sound

- Art direction: style, palette, proportions, references with what to borrow
  from each, and a mock of one key screen.
- Sound: the feel of the effects, music style, and the sounds every action
  needs.
- **Done:** a mock or reference board the owner approved, and the palette
  written down.

## 9. Interface

- HUD contents and placement, menus and their flow, onboarding, results
  screens, settings and accessibility options.
- **Done:** every screen in the first ten minutes (section 5) is listed with
  what it shows.

## 10. Tech and assets

- Engine or framework, and why. Rendering budget per target device. Online
  architecture, if any.
- Where each kind of asset comes from (made in code, made by hand, found or
  bought, AI-generated) and its licence (the `game-assets` skill).
- **Done:** every asset type has a source, and every cost the owner would pay
  is named and approved.

## 11. Scope, milestones and definition of done

- **v1 / later / never.** v1 is the core loop plus about three systems.
- **Milestones**, each a playable step with a check: grey-box core verb,
  core loop, first content, look and sound, polish, release.
- The definition of done, tailored from
  [definition-of-done.md](../../game-design/references/definition-of-done.md).
- **Done:** each milestone has something the owner can play or see, and
  everything not in v1 is under *later* or *never*.

## 12. Risks and open questions

- **Risks:** what might not work or might not be fun, and the cheapest way to
  find out (often a prototype).
- **Open questions:** each with who decides it and what would settle it.
- **Done:** every *(assumed)* item in the doc is confirmed or listed here.

## Decision log

One line per decision: date, decision, why, alternatives turned down. Add to
it whenever a section is signed off or changed later.

## Changelog

What changed in the game, version by version, as in the brief template.
