---
name: screen-shapes
description: Make a PushPlay game fill every screen it is played on, with no black bars and nothing cut off or unfair, and check it. Covers a Steam Deck (16:10), a TV, monitor or docked handheld (16:9, 4K), an ultrawide (21:9), a laptop (3:2), an iPad or Android tablet (4:3 and in between) and a phone in either orientation. Measures the game at each shape with screenshots, then switches it to fitCanvas's fill, lays the HUD and menus out from the real edges, and keeps what decides difficulty inside the minimum space. Use for "black bars on my TV", "it's letterboxed", "fill the screen", "support widescreen / ultrawide / iPad", "does it work on a TV", the check's "has bars at the sides" note, or before calling a game finished.
---

# Screen shapes

Follow the `pushplay-rules` skill (*Screens and scaling* in [screens.md](../pushplay-rules/references/screens.md)). `pushplay` is the command the `pushplay-rules` skill gives you. `<skill-dir>` is the folder this file is in.

The same build plays on a Deck, a TV, a tablet and a phone. A game that draws a fixed 1280×800 frame and centres it shows bars on every one of those but the Deck: 96 px down each side of a 1920×1080 TV, 64 px top and bottom on an iPad. The goal is **no bars, nothing cut off, and the same game everywhere**: a bigger or differently shaped screen may show more of the world, never an easier or harder one.

For a JavaScript game on the runtime files, steps 2 and 3 are code. For an engine export, see *Engines* below; the measuring and the definition of done are the same.

## 1. Measure

Start the game with `pushplay dev <id>` in the background, then:

```sh
node <skill-dir>/scripts/shapes.mjs http://localhost:5173/ --out <scratch-dir>/shapes \
  --at "pause=window.__game.state.screen='paused'" --at "settings=window.__game.state.screen='settings'"
```

It opens the game at each shape (below), prints `✓ fills` or `✗ bars left 96px, right 96px`, the drawing space fit.js gave it (`space 1422×800 (fill, min 1280×800)` or `(fixed)`), and saves a screenshot per shape and screen. `--only tv,ipad` narrows it; add an `--at` for every screen that can be reached from the debug hooks (title, play, pause, settings, game over, level select, shop, lobby). Exit code 1 means some shape has bars.

**Look at every screenshot**, not only the verdicts. Filling is half of it: on each shape, check that nothing is cut off at an edge, the HUD sits in the real corners (not floating where 1280×800's corners were), menus are centred, full-screen dims and backgrounds reach every edge, and text is still readable.

| Shape | CSS size | 1280×800 game | 720×1280 phone game | 1280×720 phone game |
|---|---|---|---|---|
| Steam Deck, Legion Go | 1280×800 | 1280×800 | 2048×1280 | 1280×800 |
| TV, monitor, docked handheld, 4K | 1920×1080 | **1422×800** | 2275×1280 | 1280×720 |
| Ultrawide 21:9 | 2560×1080 | **1896×800** | 3034×1280 | 1706×720 |
| Laptop 3:2 | 1440×960 | 1280×853 | 1920×1280 | 1280×853 |
| iPad 11" | 1180×820 | 1280×889 | 1841×1280 | 1280×889 |
| iPad 4:3 | 1024×768 | **1280×960** | 1706×1280 | 1280×960 |
| Phone, landscape | 844×390 | 1731×800 | 2770×1280 | 1558×720 |
| Phone, portrait | 390×844 | 1280×2770 (asks to turn) | 720×1558 | 1280×2770 |

The space each game gets with fill (the minimum it asked for, grown to the screen's shape). The bold rows are where a fixed 1280×800 game shows bars.

## 2. Fill: the drawing space follows the screen

In a game on the runtime files (refresh them first with `pushplay update-runtime`: `menu.place()` and `settingsScreen.place()` need kit v20):

1. `fitCanvas(canvas, { w: 1280, h: 800, letterbox, fill: true })`. The size you pass becomes the **minimum** (`fit.minW` × `fit.minH`); `fit.w` × `fit.h` grow to the screen's shape, one unit the same size both ways, never stretched. Keep `input.attach(canvas, 1280, 800)`: input follows the live size by itself.
2. Make the size live: `let W = fit.w, H = fit.h`, and keep the minimum as constants (`MIN_W`, `MIN_H`). Search the game for literal `1280`, `800`, `640`, `400` and every use of the old `W` / `H`, and decide for each one which of the three below it is.
3. Write one `layout()` that reads `fit.w` / `fit.h` and places everything that depends on the shape, call it once and from `fit.onResize(layout)`. The new starters (`pushplay new-game`) do exactly this; copy their shape.

Each thing on screen is one of three kinds:

- **Pinned to an edge or corner:** score, health, timers, minimap, the pause button, on-screen touch controls, button prompts. Place them from `0`, `W`, `H` and `fit.safe` (`W - fit.safe.right - 88`), never from 1280×800's corners. On a TV that's what makes it look native.
- **Centred:** titles, menus, dialogs, the settings screen, cards to draft, results. Keep their 1280×800 layout and centre it: `menu.place({ x: W / 2, y: H / 2 + 20 })`, `settingsScreen.place({ x: W / 2 })`, or draw a block inside `ctx.translate((W - MIN_W) / 2, (H - MIN_H) / 2)`. Anything that hit-tests its own rectangles (custom buttons, cards, arrows) must subtract the same offset from `input.pointer`, or keep its rectangles in screen units.
- **Covering everything:** backgrounds, the world, starfields, grids, dims behind pause, flashes, fades. Draw them over the whole `W` × `H` (`ctx.fillRect(0, 0, W, H)`), not 1280×800.

## 3. Keep it the same game

What decides difficulty or fairness stays inside `fit.minW` × `fit.minH`, so a TV or ultrawide player sees more, never gets more:

- **A camera over a big world** (twin-stick, platformer, top-down): the view grows (Hor+ on a TV, more height on a tablet). Keep spawn distances, "just off screen" spawns and aggro ranges measured from the 1280×800 middle of the view, not its live edges, or a TV player gets enemies spawning further away. Clamp the camera so a view bigger than the world centres the world.
- **One fixed screen** (arena, puzzle board, single-screen platformer, breakout): the play area stays `MIN_W` × `MIN_H` in the middle; the extra room is background and decoration (extend the floor, the sky, the walls' art), never playable space.
- **Locked rooms** (a boss arena "one screen big", a camera that locks): lock to the 1280×800 box, centred in the view.
- **Online:** the world is in shared units (`MIN_W` × `MIN_H`) for everyone; the host never uses its own `W` / `H`. Each player draws the world centred on their own screen, with the HUD on their edges. Two players on a phone and a TV play the same match.
- **Party (on a TV):** the TV is the whole game, so fill matters most there; the phones are `controller.html` and lay themselves out.
- **Ultrawide:** with fill, a 32:9 monitor would see 2844 units across. If that reveals too much, cap the playable view (for example at 21:9: 1866 wide for an 800-tall space) and draw background beyond it, with no bars.
- **Portrait phone game on a TV or Deck:** with fill, the space is very wide (2275×1280 on a TV) and the 720-wide play area sits in the middle: draw the world or a designed backdrop across the rest, and pin the HUD to the real edges or keep it beside the play area. Supporting both orientations with `"any"` is the other way (the `mobile-port` skill).

Text and targets: keep the rule sizes from screens.md in game units (24 px text, 32 px from the edges for important HUD in a 800-tall space; 32 px text in a phone space). They scale with the screen's height, which is what reads across a room on a TV; don't shrink the UI on wider screens, and don't scale it by width.

3D: render at `fit.w` × `fit.h` (`renderer.setSize(fit.w, fit.h, false)` in `fit.onResize`), set `camera.aspect = fit.w / fit.h` and keep the vertical field of view, so wider screens see more to the sides.

Pixel art with `integer: true`: the integer scale leaves a few spare pixels; with fill they become extra world instead of bars.

## Engines

A game exported from an engine fills by the engine's own setting, then follows the same three kinds and the same fairness rules:

- **Godot:** Project Settings → Display → Window → Stretch: Mode `canvas_items`, Aspect `expand`. Anchor the HUD to its corners with Control anchors; centre menus with a full-rect container.
- **Unity:** Canvas Scaler *Scale With Screen Size*, reference 1280×800, Match = 1 (height) in landscape; anchor HUD elements to their corners; the camera keeps its vertical size (orthographic size or vertical FOV) so wider screens see more; `Screen.safeArea` for phones.
- **GameMaker, Love2D, others:** scale by height (`scale = screenHeight / 800`), set the view width to `screenWidth / scale`, and draw the HUD from the real edges.

Then measure the export the same way with `shapes.mjs` on the build's `index.html`.

## When it isn't the game

The launcher fills any screen with its own layout, but it can only use the picture it is given:

- **A Steam Deck docked to a TV** runs non-Steam shortcuts at 1280×800 unless the shortcut's Game Resolution is set to Native (in Steam: the PushPlay shortcut → ⚙ → Properties → General). Until then the launcher and every game show bars however well the game fills.
- **A PC from Big Picture:** the launcher opens fullscreen; from the desktop it opens a window and the game fills that window.
- **An iPad mirrored to a TV** mirrors the iPad's whole 4:3 screen, so the TV shows bars around it whatever the game does.

## 4. Done when

- `shapes.mjs` prints `✓ fills` for every shape and every captured screen, and you looked at each screenshot: nothing cut off, the HUD in the real corners, menus centred.
- `pushplay check <id>` no longer notes "has bars at the sides" and passes every pass it passed before.
- At 1280×800 the game looks exactly as it did.
- On a TV and an iPad, enemies, spawns, boss rooms and the board are the same as on the Deck (compare a frame of play at each).
- A touch tablet still plays: the on-screen controls sit on the real edges (run the `input-walkthrough` skill's touch setup at an iPad size if the game takes touch).
- The design brief (`DESIGN.md`) says which screens the game was checked on.
