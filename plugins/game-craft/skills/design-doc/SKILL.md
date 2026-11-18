---
name: design-doc
description: Write a full design document for a game by walking its owner through it one section at a time - player fantasy and pillars, what it is not, the core loop, a new player's first ten minutes, rules, content, look, sound, interface, tech, scope and milestones, risks - in rounds of questions with a recommended answer each, a sign-off per section and a decision log, until the doc says what they actually want. Use for "write a full design doc" or "GDD", "help me work out what my game is", "interview me about my game", or before a big build where a short brief isn't enough. Not for a quick brief before a small game (use game-design).
---

# Design doc

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the tools, the target devices and how a change is finished.

The goal is **shared understanding**: what the owner pictures when they close their eyes and play it. The doc is where that understanding gets written down, section by section, each one signed off. A short brief (the `game-design` skill) is enough for a small game. Use this skill when the game is big, the owner is unsure what they want, or the build will run over many sessions or people.

The output is `DESIGN.md` in the game's folder: the sections of [outline.md](references/outline.md), built on the brief template in [DESIGN.template.md](../game-design/references/DESIGN.template.md). For a large game, keep `DESIGN.md` as the summary and put long sections in `design/<section>.md`, linked from it. It's a plain Markdown file, so it works with any tool, and anyone can publish or share it however they like.

## 1. Read what exists

Read any existing `DESIGN.md`, notes, mood boards and references the owner has given, and the code if the game already exists. For an existing game, draft every section from the code first and ask only about the gaps. Done when you can list what's already settled and what isn't.

## 2. Listen, then play it back

Ask one open question first, and let them talk: *"Tell me about the game. What's the moment you picture when you imagine playing it?"* Follow it with:
- the games, films, books or feelings it comes from
- who it's for and where they play it
- what would disappoint them if it were missing

Then **play it back** in three sentences: the pitch, the **player fantasy** (who you are and what you get to do), and the feeling. Done when the owner says "yes, that's it". Otherwise, ask what's off and play it back again.

## 3. Walk the sections

Take the sections of [outline.md](references/outline.md) in order. Each one says what it decides and when it's done. For each section:

1. **Draft first** from what you already know, so the owner reacts to something concrete instead of facing a blank page.
2. **Ask in rounds.** Ask every question whose prerequisites are already settled. A question that depends on an answer still open goes in a later round. Number the questions and give 2–4 options each, with **your recommended answer first**, worded so that "yes" accepts it. Ask with a question tool if you have one, otherwise in chat. There's no limit on rounds: a section is finished when its done line holds, not when you've asked enough questions.
3. **Probe vague words.** "Fun", "fast", "deep", "like X" and "cool" each hide a decision. Ask which part of X ("the movement, the loot, the look?"), offer two concrete versions to choose between, and ask for an example moment.
4. **Show rather than ask** wherever a picture settles it faster: a palette, a mock of the screen or the HUD, reference clips, a map sketch. When it's about feel, a tiny prototype helps (the `prototype-sprint` skill).
5. **Look up facts yourself:** what an engine can do, a licence, a platform's rules. Only decisions go to the owner.
6. **Never decide silently.** Something you fill in yourself is marked *(assumed)* and listed when you show the section. An item the owner can't decide yet goes into **Open questions**, with what would settle it.

Use [framework.md](../game-design/references/framework.md) for the fun targets, the 8 formal elements and the core loop, [genres.md](../game-design/references/genres.md) for the genre's usual loop and controls, [inspiration.md](../game-design/references/inspiration.md) for what to borrow from reference games, and [kickoff.md](../game-design/references/kickoff.md) for the platform and input questions.

## 4. Sign off each section

Write the section into the doc, show a short summary of it with its assumptions, and ask **Approve / Change**. Feedback reopens that section only. Record every decision in the **Decision log**: the date, the decision, why, and the alternatives turned down. Done when the section is approved and every assumption in it is confirmed or moved to Open questions.

## 5. Read it through together

When every section is approved:
- **Check it holds together:** every feature serves a pillar; every fun target has a mechanic or feedback behind it; the first ten minutes use only what's in v1; v1 is the core loop plus about three systems at most, as in the `game-design` skill's *Scope*. Raise each mismatch as a question.
- **Play the whole game back in a minute:** the pitch, the pillars, the first ten minutes and the v1 scope.

Done when the owner confirms the playback is the game they picture. Then set *Status: approved*.

## 6. Hand it on

- **Building it:** turn the milestones into jobs with the `piecewise` skill, so each piece is built and checked on its own.
- **A direction still open:** prototype it (the `prototype-sprint` skill) and come back to the section.
- **Later changes:** each one starts by reading `DESIGN.md` and ends by updating it: the section it touched, the Decision log and the Changelog.

Run the project's checks and finish the change the way its rules say.
