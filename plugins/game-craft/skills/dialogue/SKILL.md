---
name: dialogue
description: Write the story and the words for the game in this repo, and build the system that shows them — a short story bible (one-line premise, tone, cast, a beat per act), story beats between levels, an intro and an ending, character barks during play, names for items, enemies, levels and titles, and NPC conversations with branching choices, conditions and remembered flags, character voices matched to the game's references, portraits and moods, voice blips, and a dialogue box that works with controller, keyboard, mouse and touch and matches the art style. Ships a readable script format and runner (dialogue-script.js), the box (dialogue.js) and a script linter (lint.mjs). Use for "add a story", "write an intro", "give it characters", "add dialogue / cutscenes", "NPCs should talk", "add conversations / choices", "branching dialogue", "character barks", "an ending", "name the enemies / items", "make the characters sound different", "the text is flat / boring / too long", or the Narrative or Fantasy fun target of a game. For translation use localization.
---

# Dialogue

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the input, settings,
save and audio APIs, the screen size, the checks and how to finish a change. This skill is for the game's
words: its story, what characters say to the player and to each other, the choices the player makes, and
the system that shows them. `<skill-dir>` is the folder this file is in.

The skill doesn't impose a writing voice. Each game's voice comes from its own references, the same way
its faces and art do. What stays fixed is the craft: structure, choices, length for a small screen, and a
system that works with every input.

## 1. Story first

Story serves the play: one line of setup, then let the player do it
([framework.md](../game-design/references/framework.md)). Read the game's `DESIGN.md` (fun targets, theme,
tone, art style). If it has a *Story* section, stay inside it; if not, write this story bible there first:

- **Premise:** one sentence (who you are, what you want, what's in the way), shown on the title or first screen.
- **Tone:** one or two words (silly, earnest, eerie, cozy) with an example line.
- **Cast:** 1–4 characters, each with a name, one trait and a way of talking (section 3 expands these).
- **Shape:** a beat per act (setup → escalation → crisis → climax → ending), matched to the game's levels or
  waves (the pacing table in [level-design](../level-design/SKILL.md)).
- **Vocabulary:** in-world names for the game's things ("parcels", not "points"; "the Hollow", not
  "level 3"). Items, enemies, levels, the title and the game-over line take their names from here.

A game that only wants a few NPC lines still gets the premise, tone and cast.

## 2. Match the voice

Ask the user what the dialogue should sound like: games, films or books it should feel like, or a few sample
lines of their own. Then measure the reference instead of copying it:

| Measure | What to record |
|---|---|
| **Line length** | typical words per line; one sentence a box or several |
| **Register** | plain, formal, archaic, slangy, technical; contractions or not; swearing or not |
| **Humour** | none, dry, absurd, punny; roughly how often (every line, every scene, rarely) |
| **Rhythm** | short exchanges or speeches; interruptions (`—`), trailing off (`…`), pauses |
| **Narration** | none (all spoken), stage directions (`: The forge hisses.`), or a narrator voice |
| **Choices** | full sentences the hero says, intent tags (`[Lie]`, `Ask about the sword`), or tone icons |
| **Address** | names, titles, nicknames; how NPCs talk to the player |
| **Density** | lines per conversation; how much is optional |

Write it into DESIGN.md under *Story* as **Dialogue voice**, with three example lines in that voice.
Every script follows it, and every review checks against it.

## 3. Character voice sheets

One short entry per speaking character, also in DESIGN.md:

```md
- **Brom** (blacksmith): wants to retire; hides that his hands shake. Short, grumpy sentences, no
  contractions when angry, calls everyone "lad". Never says please. Voice: low (130 Hz), square.
  Moods: neutral, grumpy, happy, sad. Sample: "Shop's closed." / "That old thing? Not for sale."
```

- A **want** (what they're after in the conversation) and a **secret or pressure** give every line a reason.
- **Speech habits** make characters distinguishable without names: sentence length, favourite words,
  words they never use, how they ask and refuse. Cover the speaker name and check you can tell who's talking.
- **Moods** list the portrait expressions the art needs (`Brom (grumpy): …` picks the grumpy portrait).
- **Voice** sets the blip pitch and timbre (`voiceBlip`), so each character sounds different even without audio files.

## 4. Writing a conversation

- **One purpose per conversation:** a quest, a clue, a relationship beat, a laugh. Write it down first.
- **Enter late, leave early.** No greetings and goodbyes unless they say something about the character.
- **Every line does a job:** it moves the purpose forward, shows character, or sets up a choice. Cut the rest.
  First drafts are usually 30 % too long.
- **Exposition through want and conflict:** the smith refuses to sell the sword, and *that's* how we learn it's
  special. Never "As you know…".
- **Subtext:** characters rarely say exactly what they feel. Let the mood, the portrait and what they avoid
  say it.
- **React and remember.** NPCs respond to what the player did (flags such as `~ set helpedMira`) with short
  callback lines. That's cheaper than branching and feels far more alive.
- **One line, one box.** A line must fit the dialogue box without running to a second page, at the game's
  largest text size. Work the maximum out once from the box (lines in the box × characters that fit across
  it at that size), record it in *Dialogue voice* and pass it to `lint.mjs` as `--max-chars`. The toolkit's
  default box holds three lines of about 45 characters at that size, hence the linter's default of 140; a
  two-line box holds about 90.
- **Small-screen budget:** no more than about 4 lines in a row without a choice (`lint.mjs` checks this
  too); a conversation is under a minute unless the player keeps choosing to ask.
- **Every line has a speaker** the player can see: a portrait, a name plate or a colour.
- **Read every line aloud** in the character's voice. If it's awkward to say, rewrite it.

## 5. Choices

- **2–4 options** that are different **intents**, not the same answer in three tones (unless tone is the
  point of the game, per the voice).
- **Short:** under about 40 characters. Put the detail in the reply, not the option.
- **Curiosity is never punished:** "ask about" options are `[once]` in a hub and always return, and there's
  always a way out (`Leave`).
- **Consequences show soon:** a choice that matters gets a reaction line now and a callback later. A choice
  that doesn't matter should still get a distinct reply.
- **Gated options** (`[if gold >= 50]`) appear only when available; don't show options the player can't pick
  unless seeing them is the point.
- **No timed choices** unless the game has a setting to turn the timer off (accessibility).
- **No typed text:** if the player names something, offer a list picked with stepped up / down.

## 6. Structure patterns

Keep branching manageable. Trees that split at every choice explode; these don't:

- **Hub and spoke:** a question hub of `[once]` topics plus `Leave`, returning to the hub after each answer.
  Most NPC conversations.
- **Branch and bottleneck:** choices split for a few lines, then rejoin. Story scenes.
- **Gates:** `if` blocks and `[if …]` options read flags the game or earlier conversations set.
- **State, not trees:** remember outcomes in variables and react to them later, instead of writing separate
  versions of everything after.

```
=== smith
if not metBrom:
    Brom (grumpy): Shop's closed.
    ~ set metBrom
else:
    Brom: You again.
>> smith_hub
=== smith_hub
-> Ask about the sword [once]
    Brom: That old thing? {w} Not for sale.
    ~ set askedSword
    >> smith_hub
-> Buy the sword [if askedSword and gold >= 50]
    ~ set gold -= 50
    ~ emit give sword
    Brom (happy): Finally, a customer.
-> Leave
    Brom: Shut the door behind you.
    >> end
```

## 7. Barks and beats

Prefer the lightest form that does the job; a bark during play beats a cutscene.

- **Barks** are one short line above a character's head ("They're behind us!"), with no box and no input,
  shown for 1.5–2.5 s and rate-limited so they don't spam. Keep them as data (lines per trigger and
  speaker) next to the scripts.
- **Story beats** between levels (the intro, a turn in the plot) are nodes with no choices, played in the
  same box: `=== intro`, `=== after_level_3`. A beat is 1–3 boxes, never blocks play for long, and skip takes
  the player past the whole beat.
- **Remember which beats were seen** (`~ set sawIntro` in the node, checked before the game starts it) so
  repeat runs skip them. If the story matters, add a "Replay story" item to a menu.
- **The ending** is a real screen: a closing line, then the results, then the credits (with the names from
  `assets/CREDITS.md`, if the game has one).

## 8. The script format

Full reference at the top of `toolkit/dialogue-script.js`. In short:

| Write | Means |
|---|---|
| `=== name` | a node (a conversation or part of one) |
| `Who (mood): text` / `: text` | a line (the mood picks the portrait) / narration |
| `-> text [if cond] [once]` + indented block | a choice; consecutive `->` lines form one set |
| `if cond:` / `elif cond:` / `else:` | conditions with `and`, `or`, `not`, `==` `!=` `<` `>` `<=` `>=` |
| `~ set flag` / `~ set gold -= 10` | variables (kept in the game's save) |
| `~ emit give sword` | an event the game handles: `on.give('sword')` |
| `>> node` / `>> end` | jump / finish |
| `$name`, `{w}`, `{w=0.6}`, `*word*`, `{shake}…{/shake}`, `{c=#hex}…{/c}` | variable, pause, emphasis, shake, colour |
| `… #id` at the end of a line or choice | a stable id for translations |

## 9. Build it into the game

The toolkit is two plain ES modules with no dependencies. They talk to the game through small objects the
game passes in; the full contract is at the top of `toolkit/dialogue.js`.

1. Copy `toolkit/dialogue-script.js` and `toolkit/dialogue.js` into the game (next to its main module, or
   `src/`). Put scripts in `dialogue/*.js` as `export default \`…\`` (they load offline everywhere).
2. **Runner:** `createRunner(script, { vars, on: { give, heal, … }, strings })`, then `.start('smith')`.
   `vars` is a plain object kept in the game's save data; save when a conversation ends, so choices persist.
3. **Box:** `createDialogueBox({ input, settings, prompts, portrait, blip, avoid: [PAUSE_BUTTON], style, width, height })`.
   - **`input`** is the game's input state or a thin adapter over it. The box reads four things:

     | Field | What the box expects |
     |---|---|
     | `pressed(name)` | true on the frame that button went down. It asks for `'a'` (confirm), `'b'` (skip) and `'select'` (log); pass `buttons: { confirm, skip, log }` if the game uses other names |
     | `navY` | −1 / 0 / +1: a stepped up / down with key repeat (d-pad, stick, arrows) |
     | `pointer` | `{ x, y, pressed }` in the canvas's logical units; `pressed` is true on the frame a click or tap went down |
     | `mode` | the device used last: `'touch'` and `'mouse'` show the Skip button, `'mouse'` gives hover; anything else (`'gamepad'`, `'keyboard'`) doesn't |

   - **`width`, `height`**: the game's logical resolution.
   - **`settings`** (optional): an object the box reads live for the game's text-size setting, the game's
     reduced shake setting and the text speed. The field names it looks for are in the contract.
   - **`prompts`** (optional): `(ctx, input, pairs, { x, y, align, size }) => void`, where `pairs` is
     `[[buttonName, label], …]`. Wrap the game's input-prompt helper in it so hints show the right icons for
     the device. Without it the box draws only its built-in "next" arrow.
   - While `talk.active`, update the box instead of gameplay. The game stays on its playing screen, and the
     pause button still pauses: don't call `talk.update` while paused.
   - **Style it like the game** with `style.panel(ctx, x, y, w, h, kind)`: a pixel-art panel (pixel-art skill's
     `pixelui.panel`), a parchment card (art-direction's `paperCard`), or whatever the game's UI uses. Also set
     `font`, colours and `nameColors`.
   - **Portraits** are a callback, so they come from the game's own art: baked portrait frames per mood
     (the pixel-art skill renders them from the same model as the sprite), sprites the user supplied, or
     none. `talking` is true while text types, for a mouth flap.
   - **Voices:** `voiceBlip(tone, { Brom: { freq: 130 }, Mira: { freq: 300, type: 'triangle' } })`, where `tone`
     is the game's tone generator, `({ freq, dur, type, gain }) => void` (see the game-audio skill).
4. **Controls** (built in): confirm, click or tap anywhere finishes the line, then advances. Skip
   fast-forwards to the next choice. The log button opens the log. Choices take stepped up / down and confirm,
   or a tap on the option, with hover highlight for the mouse. An on-screen Skip button appears for mouse and
   touch. Pass the game's pause button in `avoid` so tapping it doesn't advance the text.
5. **Settings:** the text-size and reduced shake / flash settings are honoured. Add a *Text speed* range
   (0.5–2, saved as `textSpeed`) to the game's Settings screen.
6. **Translation:** lines and choices have ids (`#id` or `node:line`). The localization skill fills `strings`.

## 10. Verify

1. `node <skill-dir>/lint.mjs dialogue/*.js --entry <nodes the game starts>` and fix every ✗.
2. Read every conversation, beat and bark on the target screen, at the largest text size too: nothing clipped,
   no line running to a second page.
3. Play each conversation and beat with controller, keyboard only, mouse only and touch: advance, skip, choose, log.
4. Pause mid-line and mid-choice; Restart and Quit to title mid-conversation and mid-beat: nothing replays
   wrongly, seen beats stay skipped, and flags only change when they should.
5. Check the voice: cover the names and read a scene. Can you tell who's speaking, and does it match the
   *Dialogue voice* in DESIGN.md?
6. Update DESIGN.md (*Story*, Changelog).
7. Run the project's checks and finish the change the way its rules say.

`toolkit/demo.html` shows the box in its four states (typing, markup, choices, log) with a stand-in input;
serve the `toolkit/` folder with any static server to open it.
