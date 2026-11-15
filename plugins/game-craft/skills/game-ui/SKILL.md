---
name: game-ui
description: Design the HUD, menus, onboarding and results screens of the game in this repo so they read on the target screen (a phone in the hand with its thumb zones and safe areas, a handheld, a desktop window, a TV across the room), work with controller, keyboard, mouse and touch, and match the game's art style — text and target sizes per screen, health and score display, input prompts, tutorials taught by doing, game-over tallies, level-select and upgrade screens. Use for "the HUD is cluttered / hard to read", "the text is too small on my TV", "players don't know what to do", "add a tutorial", "make the menus look better", "add an upgrade / shop / level-select screen", "my thumb covers the score".
---

# Game UI

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the menu, input-prompt and settings APIs, the logical resolution, the checks and how to finish a change. Read the game's `DESIGN.md` for the palette, font and fun targets.

## 1. Sizes for the target screen
What reads depends on how big the screen is and how far away it sits. Sizes are a fraction of the screen's **short side** (the height in landscape, the width in portrait); the px in brackets are for a logical space with a 720 short side (1280×720 or 720×1280), so multiply by *short side ÷ 720* for another.

| Target | Viewed from | Body and HUD text ≥ | Headings ≥ | Tap or click target ≥ | Margin from the edge ≥ |
|---|---|---|---|---|---|
| Phone in the hand | 30 cm | 4.5 % (32 px) | 6 % (44 px) | 7 mm, about 10 % (72 px) | 4.5 % (32 px), measured from the safe area |
| Handheld, 7–8 inch | 35 cm | 3.3 % (24 px) | 4.5 % (32 px) | 7 mm, about 7.5 % (54 px) | 4.5 % (32 px) |
| Desktop window | 60 cm | 2.5 % (18 px) | 4.5 % (32 px) | 4.5 % (32 px), for a mouse | 2.5 % (18 px) |
| TV across the room | 3 m | 4 % (29 px) | 6 % (44 px) | no pointer: the focused row ≥ 8 % tall (58 px) | 5 % (36 px), for overscan |

- A game that ships on several targets with one layout takes the **largest** figure among them in each column; otherwise switch the layout per target.
- Every text size multiplies by the game's text-size setting. Text contrast ≥ 4.5:1 against what's behind it.
- Touch targets are physical (a fingertip doesn't shrink with the screen): the `touch-controls` skill converts millimetres to the game's units and gives the larger size for on-screen gameplay buttons (9 mm).

## 2. Audit what's on screen
Capture every state (title, gameplay at 60 s, pause, game over) at each target's size and look at the images: use the project's checks or the engine's own way to capture a frame, or ask the user for screenshots. For each screen ask:
- Can I tell in **3 seconds** what to do and how I'm doing?
- Does every piece of text, target and margin meet the table's row for each target, at the default and the largest text-size setting?
- Does every prompt come from the game's input-prompt helper, never a literal "A" or "Space"?
- Is there a strip of button prompts along the bottom of any screen? Remove it. Is any prompt shown in touch or mouse mode? Remove it. Feedback the player needs mid-action (points won, a refused move) belongs over the thing they are looking at, not in a corner.
- Is anything there that the player doesn't need right now?
- Phone layout: with two thumbs on the screen (the shaded zones in [phone-layout.md](../touch-controls/references/phone-layout.md)), can I still see the hero, the next threat and the score? Is anything pressable in the top half besides the pause button?

## 3. HUD rules
- **One goal on screen.** Show only the resources the player acts on (health, score, timer, ammo). Everything else goes on the pause screen or an overlay on a secondary button (a map or scoreboard button).
- **Corners:** score top-left, secondary info top-right, and **no prompt row along the bottom**: a control is taught once, next to the thing it acts on, and never on touch or mouse. Keep one top corner clear for an on-screen pause button the size of a tap target: it's how mouse and touch players pause.
- **Phone layouts** ([phone-layout.md](../touch-controls/references/phone-layout.md)): the HUD is a read-only band at the top, inside the safe area; the bottom third (portrait) or the lower two-thirds of each side (landscape) belong to the thumbs and the on-screen controls, so no HUD there; a prompt, when one is needed at all, goes beside the thing it explains, never in a strip at the bottom edge or over a menu. Portrait menus start about 45 % of the way down so the items sit in reach; items a tap target tall, 12 px apart. Hide nothing behind hover.
- **TV:** nothing the player reads in the outer 5 %; no thin 1 px lines or fine detail in text; the focused item is obvious from 3 m (a filled highlight, not a thin outline).
- **Icons and bars over numbers** where possible (hearts, a health bar); numbers pop (scale 1.2 → 1 over 150 ms) when they change.
- **Diegetic hints:** a glow on the thing to interact with, an arrow to an off-screen objective.
- Colour is never the only signal: pair it with shape or icon (colourblind-safe).
- All sizes scale with the text-size setting; test at the largest setting that nothing overlaps.

## 4. Onboarding by doing
- Teach each action the first time it's needed, with an in-world prompt ("⟨confirm button⟩ to jump", the button name coming from the prompt helper) that disappears once the player has done it (remember that in the game's save data so returning players don't see it).
- Build prompt strings **every frame** so they switch when the player changes device.
- A safe first room or first wave where the verb can't fail.
- No text walls; one line, readable in 3 seconds.

## 5. Menus and extra screens
- Every menu (title, pause, settings, game over, level select, shop) goes through the game's menu system, so each one works with all four inputs. A good menu: moves with d-pad, stick, arrows and WASD with key repeat; chooses with the confirm button, Enter, click or tap; goes back with the back button or a visible Back item; highlights under the mouse; changes value items (toggles, sliders, choices) with left / right and with taps on arrows.
- A custom grid (level select, upgrade tree) does all of that itself: stepped navigation between cells, confirm to choose, back to leave, a click or tap on each cell, and a visible highlight.
- A pause menu players can predict: **Resume, Restart, Settings, Quit to title**, in that order. Name exits by where they lead.
- **Game over / results:** score tally that counts up, the best, "new best!" and a near-miss line ("2 away from your best"), retry on one press.
- Style menus in the game's palette and font: a panel shape, a highlight bar, a small easing on selection change. If the menu system only handles input and selection, draw the items yourself from its selected index.
- Show the cursor in every menu; hide it only during gameplay in mouse mode.

## 6. Verify
1. Every screen you touched with each input alone (controller, keyboard only, mouse only, touch), at each target the game ships on: the smallest and largest window or resolution it supports, and for a phone layout a real phone (or a phone-sized view) with touch only. Measure text, targets and margins against the table.
2. Text size at maximum: nothing clipped or overlapping.
3. Look at fresh screenshots of every state from step 2.
4. Update DESIGN.md (Changelog, tick *Screens and flow* items).
5. Run the project's checks and finish the change the way its rules say.

## In a web game
- Capture the states with a short headless-browser script that opens the project's dev server, drives the game to each state and saves a screenshot.
- Sizes to try: a large window (1920×1080), a 2× pixel ratio, and for a phone layout the browser DevTools device mode (about 390×844 or 844×390 at DPR 3, touch on). Device mode shows layout and sizes; thumbs on a real phone find the rest.
