---
name: accessibility-audit
description: Audit and improve the accessibility of the game in this repo — colourblind-safe visuals, readable text and text size, reduced shake and flash, control remapping, hold and mash alternatives, one-handed play, difficulty and assist options, audio cues with visual equivalents — then fix what's missing. Use for "make it accessible", "colourblind mode", "remap buttons", "my kid can't beat it", "add an easy mode / assist mode", or before calling a game finished.
---

# Accessibility audit

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the settings, input and save APIs, the logical resolution, the checks and how to finish a change. Check the *Accessibility* items in [definition-of-done.md](../game-design/references/definition-of-done.md). Every option below is an item on the game's Settings screen, saved with its other settings; the code lives in the game, never in shared files the project says not to edit.

## 1. Audit
Go through the game with the checklist below and mark each row pass / fail / n/a. Capture a screenshot of every screen (the project's checks, the engine's own way to capture a frame, or ask the user for them). For the colour row, view each screenshot in greyscale and through a colour-blindness simulation for deuteranopia, protanopia and tritanopia (any image editor, or the tools at the end): everything that matters must still be told apart.

| Area | Must be true |
|---|---|
| Colour | No information carried by hue alone: friend vs. foe, matching colours, danger zones also differ in **shape, icon, pattern or brightness**. Readable in greyscale |
| Text | At least the minimum for each target screen in the `game-ui` skill's size table (phone in the hand, handheld, desktop window, TV across the room), strong contrast (≥ 4.5:1 against what's behind it), scaled by the game's text-size setting (up to at least 150 %), nothing clipped at the largest size |
| Motion | The game's reduced shake / flash setting removes shake, full-screen flashes and strobing (nothing flashing more than 3 times a second) |
| Controls | No mashing, no long holds without a toggle option, no chords, no precise timing windows below ~100 ms without an assist; every action has a prompt from the game's input-prompt helper (never a literal key name) |
| Remapping | Gameplay actions can be moved to other buttons (see below) |
| One-handed | Optional: can the game be played with the stick + one face button, or the d-pad + one button? On a phone: can it be played with one thumb (everything in the bottom third, tap or swipe instead of stick + buttons, or a left-handed mirror of the controls)? |
| Touch (phone and tablet) | Every tap target and on-screen button at least the size the `game-ui` table and the `touch-controls` skill give (7 mm and 9 mm) and inside the safe area; nothing needs two fingers at once unless the game is two-thumb by design; holds have a toggle; nothing depends on hover or a long press alone ([phone-layout.md](../touch-controls/references/phone-layout.md)) |
| Difficulty | A way through for a less experienced player: a difficulty choice or assists |
| Audio | Every important sound cue has a visual equivalent (an off-screen enemy sound also shows an edge marker) |
| Time | No timer the player can't pause; reading text is never timed |
| Pause | Pause is always available and fully freezes the game |

## 2. Fixes, all as saved Settings items
If the game has no settings store yet, a small one is enough: one object with defaults, saved with the game's settings (wherever the project keeps saved data) on every change and read back at startup, falling back to the defaults when the saved copy is missing or unreadable.

- **Colourblind palette:** a choice (*Default / Deuteranopia / Protanopia / Tritanopia / High contrast*) that swaps the palette the game draws with; plus permanent shape or pattern differences, which help everyone.
- **Remapping:** keep a game-level action map (jump → south face button, dash → west face button, shoot → right trigger) and read gameplay only through it, by action name. Offer one choice per action listing the free gameplay buttons (face buttons, bumpers, triggers). Never offer the pause button, system buttons or chords. Prompts are built from the action map too, so they follow the remap, and keyboard keys map to the same action names.
- **Hold to toggle:** a toggle that turns hold actions (charge, aim, sprint) into press-on / press-off.
- **One-handed and touch options** (phone layouts): a *Left-handed* toggle that mirrors the on-screen stick and buttons; a *One-thumb* scheme where it fits the game (auto-run or auto-fire plus a single tap or swipe); a *Button size* choice (normal / large, large being 1.3×) for the on-screen controls; and no gesture that needs two fingers at once unless the design is two-thumb.
- **Assists:** game speed (70–100%), extra health, aim assist strength, auto-fire, skip a level after N failures, invincibility for a story or kids mode. Name them neutrally ("Assist"), never shaming ("Baby mode").
- **Visual cues for sound:** edge arrows or icons for important off-screen sounds.
- **Text:** raise contrast with a panel behind HUD text; wrap long lines at the largest text size.

## 3. Verify and record
1. Re-run the checklist; every row passes or is n/a with a reason.
2. Every new Settings item works with controller, keyboard, mouse and touch, saves, and survives a restart of the game. For a phone layout, also test the largest text size and button size on a phone (or a phone-sized view) with touch only: nothing overlaps the thumb zones or the safe areas.
3. Tick the *Accessibility* items in DESIGN.md's Definition of done and add a Changelog line. Tell the user which options exist and where (Settings, from the title or pause).
4. Run the project's checks and finish the change the way its rules say.

## In a web game
- **Settings store:** `localStorage`, under a key that starts with the game's id, written on every change and read back at startup inside `try / catch` (storage can be blocked or full).
- **Greyscale without leaving the game:** a debug mode that draws the canvas with `ctx.filter = 'grayscale(1)'`, or CSS `filter: grayscale(1)` on the canvas element. Browser DevTools can also emulate the three colour-vision deficiencies on the live page (the Rendering panel's vision-deficiency emulation).
- **Screenshots and phone sizes:** a short headless-browser script against the project's dev server; DevTools device mode at about 390×844 or 844×390 with touch on for the phone rows.
