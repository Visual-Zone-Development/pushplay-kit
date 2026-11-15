# Laying a game out for phones and tablets

How to make a game comfortable on a phone or a tablet, in any engine: which way up, where thumbs
go, what the system covers, how big things must be, and what happens when the screen locks. The
project's own rules decide the logical resolution and the scaling layer; this guide says what to
do with them. The [touch-controls](../SKILL.md) skill covers the on-screen controls themselves.
Everything up to *In a web game* holds for any engine; that last section has the browser's way.

## Pick a logical space

A game draws in a fixed logical space and scales it to the window. A space made for a wide
handheld or a desktop window (16:10 or 16:9) already suits a **tablet in landscape**. A phone
needs a choice:

| Space | For | Shown on |
|---|---|---|
| **Portrait**, 9:16 (e.g. 720×1280) | one-handed phone games: tappers, stackers, endless runners, puzzles, cards | a phone held upright, a tablet upright |
| **Landscape**, 16:9 (e.g. 1280×720) | two-thumb phone games: platformers, shooters, racers, anything with a stick | a phone or tablet held sideways, and (with bars or a little extra view) handhelds and desktop windows |

Sizes in this guide are in millimetres where a finger is involved, with px for those spaces (a
720 short side) on a phone, where 1 mm ≈ 10 px. The [touch-controls](../SKILL.md) skill has the
conversion for other screens.

Which one?

- **Portrait** when the game is played with one thumb, the action is vertical (falling,
  climbing, stacking, a lane runner) or it's turn-based (cards, puzzles, words). Portrait games
  are the ones people play standing in a queue.
- **Landscape** when the game needs a stick and buttons, a wide view (a side-scroller, a racer,
  a twin-stick arena), or it should also feel at home on a handheld and a tablet with a
  controller. A 16:9 game letterboxes slightly on a 16:10 screen and fills a 16:9 window exactly.
- A game that already exists in a wide space is usually closest to **landscape**: most of the
  work is moving the HUD out of the thumbs' way and raising text sizes.
- **Both** means laying every screen out twice and swapping when the window turns. That's more
  work and rarely worth it; pick one unless the design really plays both ways.

## Fill the screen

Phones are not all the same shape (19.5:9, 20:9, 4:3 tablets). A fixed space letterboxes: on a
20:9 phone a 720×1280 game loses about a sixth of the height to bars. Bars in the game's
background colour are acceptable; never white, never transparent.

Better for a phone game: treat the logical size as the **smallest** space and let it grow to the
screen's shape, never stretched. A 720×1280 minimum becomes 720×1604 on a 412×918 phone,
720×1560 on a 360×780 one, 983×1280 on a 768×1024 tablet. Then:

- Read the live width and height every frame (or on resize); never cache them. Anchor the HUD
  and buttons to the edges and the safe-area insets, centre titles on the live centre, and place
  menus from the current size.
- Keep what decides difficulty inside the minimum space: a taller phone may see further ahead,
  a tablet more to the sides, but never get wider gaps or slower hazards. Fill the extra room
  with background (stars, sky, floor), never with things that change the game.
- Touch positions and on-screen controls follow the live size too.

The game must draw edge to edge (under the notch and the home bar) and stop the system scrolling
or zooming under the thumbs; how is the platform's business.

## Safe areas

Phones draw into the notch or camera cut-out and under the home indicator. **Use the platform's
safe-area insets**: every phone platform and most engines report how much of each edge the system
covers. Convert them to game units with the same scale as everything else.

The values change when the phone turns (the notch moves to a side in landscape) and are zero on
a handheld or a PC. Read them every frame or on resize, never once at load.

Rules:
- Nothing the player **reads or taps** goes inside a safe inset: score, timer, prompts, pause
  button, menu items. Backgrounds and the world may extend under them.
- On top of the insets keep the usual margin: important HUD ≥ 32 px from the edge of the
  *safe* area, so `x = safe.left + 32`, not `x = 32`.
- The pause button sits in the top corner, inside the safe area, ≥ 7 mm (72 px). On a phone in landscape the top corners are reached with the index fingers, which is
  fine for pause; it's wrong for anything pressed during play.
- Typical sizes, in game units: a portrait notch takes about 90 px at the top and the home
  indicator about 60 px at the bottom; in landscape the cut-out takes about 70 px on one side.
  Don't hard-code these; read the insets.

## Thumb zones

A phone is held, not propped up, so the thumbs cover part of the screen and can't reach all of
it. Lay the screen out in three bands.

Portrait, one hand or two:

```
┌───────────────────────────┐  ← top inset (notch)
│  HUD: score, timer, lives │  read-only, ≥ 32 px text
│  (nobody taps up here)    │
├───────────────────────────┤
│                           │
│        the game           │  the action; nothing to press
│                           │
│                           │
├───────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░ │  easy reach: taps, swipes,
│ ░░ left   ░░░░   right ░░ │  on-screen controls, menu's
│ ░░ thumb  ░░░░   thumb ░░ │  main items
│ ░░░░░░░░░░░░░░░░░░░░░░░░░ │
└───────────────────────────┘  ← bottom inset (home bar)
```

Landscape, both hands:

```
┌──────┬─────────────────────────────────────┬──────┐
│ safe │  HUD top-centre        pause ▢ (7mm)│ safe │  ← notch is on one side
│      ├─────────────────────────────────────┤      │
│ ░░░░ │                                     │ ░░░░ │
│ ░░L░ │            the game                 │ ░R░░ │  thumbs cover ~35 mm on
│ ░░░░ │                                     │ ░░░░ │  each side, lower two-thirds
│ stick│                                     │ a b  │
└──────┴─────────────────────────────────────┴──────┘
```

- **Easy reach** (shaded): the bottom third in portrait, the lower two-thirds of each side in
  landscape, about 35 mm (320 px) wide. Put everything the player presses during play here: the virtual
  stick on the left, buttons on the right (see [touch-controls](../SKILL.md)).
- **The game** sits where thumbs don't cover it. The hero and the next threat must be visible
  with two thumbs on the screen; anything that spawns under a thumb is unfair.
- **HUD** goes at the top, read-only, inside the safe area. The pause button is the only tap
  target up there.
- Menus: in portrait, stack items vertically in the lower two-thirds (the first item at about
  y = 560 of 1280, not at the top); in landscape, centred is fine. Every item is ≥ 7 mm (72 px)
  tall with ≥ 12 px between items so a thumb can't hit two.

## Text and tap sizes

A phone is small and held in a moving hand, so it needs the biggest text of any target relative
to its screen. The figures for every target (phone in the hand, handheld, desktop window, TV) are
in the `game-ui` skill's size table; the phone row, for a space with a 720 short side:

| | Phone |
|---|---|
| Body and HUD text | ≥ **32 px** (4.5 % of the short side) |
| Headings | ≥ 44 px (6 %) |
| Tap target (menu items, pause) | ≥ **7 mm** (72 px) |
| On-screen gameplay buttons | ≥ **9 mm** (96 px), 2 mm (20 px) apart |
| HUD margin | 32 px from the edge of the **safe** area |

All sizes still multiply by the game's text-size setting; test the largest setting for overlaps.
Text at 32 px is the floor; 40 px reads comfortably. On a tablet the same millimetres are fewer
px, so the controls take less of the screen: keep the physical size, don't scale them up.

## What phones can't do

- **No hover, no cursor, no right-click.** Anything shown on hover must be shown always or on
  tap. A controller's "back" button has no touch equivalent: every menu a player can leave needs
  a visible **Back** item, and during play a back or cancel action needs an on-screen button.
- **No keyboard.** Don't ask for typed text during play, and build key hints with the game's
  input-prompt helper so they don't name keys the player doesn't have.
- **Precision is poor.** A fingertip covers 7–10 mm (70–100 px) and hides what's under it. No
  tiny targets, no pixel-precise drags; snap drags to a grid or to targets, and offset dragged
  objects above the finger so the player can see them.
- **Timers lie after a background.** The frame loop stops while the app is hidden, so the first
  frame time after coming back can be seconds; clamp it to 1/20 s.
- **Notches and home bars** cover the edges (see *Safe areas*). The system may also keep a
  gesture on the very bottom edge, so a swipe starting there may not reach the game.
- **Performance** varies more than on a handheld console: a mid-range phone has three times
  the pixel density of a desktop screen. Cap the resolution the game renders at (twice the
  logical size is plenty); cap particles; no per-frame blur effects.
- **Orientation** can change mid-game. Lock it where the platform lets the app; otherwise a game
  laid out for one orientation shows a letterboxed view (or a "turn your phone" card) the other
  way up. It mustn't crash or lose the run.

## Screen lock and backgrounding

A phone call, a notification tap or the lock button sends the game to the background at any
moment. Every platform tells the app (a pause, focus-lost or hidden notification); handle it.

- The handler must land on the pause screen **and save**: the system may kill the game while
  it's hidden.
- Audio stops; start it again on the next input, not on return.
- **Never auto-resume.** The player comes back to the pause menu and presses Resume.
- Connections drop too: an online game's connection is suspended while hidden (see
  [online-netcode](../../online-netcode/SKILL.md) for reconnecting).

## Controllers on tablets (and phones)

A tablet with a Bluetooth controller is a handheld with a bigger screen: it's read like any
other controller. On its first press the active device becomes the controller, prompts
switch to button names and the on-screen controls hide.

- Don't tie gameplay to touch alone. A landscape phone game should play with a pad and a
  keyboard too.
- **Several pads on one tablet** is a valid couch for a [local-multiplayer](../../local-multiplayer/SKILL.md)
  game. The join screen must not assume player 1 has a keyboard; touch can't join as an extra
  player.
- When a pad is connected, the thumb zones stop mattering and the safe areas still do.

## Try it

A real phone first: menus by tap, play with thumbs, turn the phone, lock the screen mid-run and
come back, take a call if you can. Thumbs find problems that a mouse pointer in an emulator never
will. Without a phone, use the engine's device preview or simulator set to a recent phone (about
390×844 points at 3× density) and check the sizes against the table.

## In a web game

**Page setup.** `<meta name="viewport" content="width=device-width, initial-scale=1,
viewport-fit=cover">` to reach the edges of the screen, and `touch-action: none` on the canvas so
the page doesn't scroll or zoom under the thumbs.

**Safe areas.** The browser reports the insets as `env(safe-area-inset-top)` and its three
siblings (in CSS pixels; they need `viewport-fit=cover`). If the project's scaling layer doesn't
already give them in game units, read them from a probe element and convert:

```js
// <div id="safe" style="position:fixed; visibility:hidden; padding:
//   env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)">
const cs = getComputedStyle(document.getElementById('safe'))
const k = logicalWidth / canvas.getBoundingClientRect().width // CSS px → game units
const safe = { top: parseFloat(cs.paddingTop) * k, right: parseFloat(cs.paddingRight) * k,
  bottom: parseFloat(cs.paddingBottom) * k, left: parseFloat(cs.paddingLeft) * k }
```

**Backgrounding.** The page gets `visibilitychange` and `document.hidden` turns true; the browser
may discard the page while hidden. `requestAnimationFrame` stops, so clamp the first `dt`
(`Math.min(1/20, dt)`), and resume the audio context on the next input.

```js
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAndSave() })
```

**Other limits.** Cap the device pixel ratio the game renders at (2 is plenty) and keep
`shadowBlur` out of the loop. The Screen Orientation lock only works in fullscreen or an installed
app, so don't depend on it. Controllers arrive through the Gamepad API as on any device.

**Trying it.** Browser DevTools device mode (a recent phone preset, about 390×844 at DPR 3, touch
emulation on) for layout and sizes, and a fake screen lock from the console:

```js
Object.defineProperty(document, 'hidden', { value: true, configurable: true })
document.dispatchEvent(new Event('visibilitychange'))
```

For a real phone, serve the project's dev server on the local network and open the address on a
phone on the same Wi-Fi.
