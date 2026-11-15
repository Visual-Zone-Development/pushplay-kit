---
name: model-asset
description: Create, rebuild or change a visual asset for a game in any engine or language, whether a character, creature, vehicle, building, prop, pickup, effect, tile or UI element, to match a reference or art direction, in any rendering style (shapes drawn in code, pixel-art sprites, vector art, 3D models, engine scenes, or the user's own files). Covers the game's STYLE.md, reference breakdown, silhouette and proportions, block-out, detail, render-and-compare rounds, and one focused change to an existing asset with before/after renders and nothing else touched. Use for "make a <thing>", "redo the <thing>", "match this reference", and edits such as "tweak", "recolour", "make the X bigger", "fix the Y on the Z". For motion use animate-asset; a canvas 2D game also loads canvas2d-assets, a three.js game threejs-models.
---

# Model an asset

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the APIs, the screen size, the checks and how to finish a change. `<skill-dir>` is the folder this file is in.

Quality comes from one discipline: **work from a reference and compare renders against it every round.**
Never "improve" from memory alone. This is a craft skill: the workflow is the same in every engine. *How* to
draw or build the thing, and what "render it" means, depends on where the asset lives:

| The asset is | Build it with | "Render it" means |
|---|---|---|
| Drawn in code (shapes, procedural sprites, shaders) | the game's own drawing conventions | a viewer scene or page that draws one asset by id, captured |
| A sprite or sprite sheet made in an art tool (Aseprite, Krita…) | the art tool; the engine only imports it | export a PNG at ×1 and at a whole-number zoom, plus the frames laid out in a strip |
| A scene or prefab in the engine's own format (Godot `.tscn`, Unity prefab…) | the engine's editor or its text format | a small viewer scene that instances it alone on a neutral background, captured |
| A model file (GLB, FBX, `.blend`) | a modelling tool; code does shading, lighting and import settings | the modelling tool's render or the engine viewer scene, from the views below |
| Vector art, key art (SVG or similar) | edit the file | rasterise it at the sizes it is shown at |
| Canvas 2D or three.js (web) | the **canvas2d-assets** or **threejs-models** skill; model files in three.js: [3d.md](../threejs-models/references/3d.md) → *Models*, [assets.md](../game-design/references/assets.md) | their gallery and viewer pages, see *In a web game* |

For one small change to an asset that already exists ("make the sword bigger", "darker red on the armour"), read
section 0, then go to *Changing one existing asset*. **animate-asset** (motion) shares the game's `STYLE.md`.

## 0. Read the game first

- `DESIGN.md`: what the game is, its camera and scale, what the player must read at a glance (hazards,
  pickups, enemies). An asset that looks great but reads wrong in play is wrong.
- `STYLE.md` (create it from `STYLE.template.md` next to this file if the game has none): palette, shape
  language, proportions, shared materials, animation timing, and the asset catalogue. Every choice you make
  follows it; every new rule you establish goes into it.
- How the game makes assets now (code, sprite files, engine scenes, model files): reuse its conventions (one
  function, file or scene per asset, shared palette and materials, existing helpers). Don't introduce a second way.

## 1. Get the reference (user-provided only)

- Ask for screenshots, concept art or a sketch, ideally several angles/poses and one at play size. If there is
  none, describe the target in words and get a yes before building (or, if the user said to go ahead, state the
  description as an assumption and record it in STYLE.md).
- **Never commit reference images** (they are usually someone else's art). Look at them in the conversation; copy a
  file to the scratchpad only if you need it for a side-by-side. What the reference shows is recorded **in words** in
  STYLE.md's catalogue and in your breakdown.

## 2. Write the breakdown before building

1. **Silhouette**: the 3–5 shapes that make it recognisable at play size, biggest first.
2. **Proportions**: in a unit that fits the asset (head-heights for characters, body lengths for creatures and
   vehicles, tiles for buildings), checked against STYLE.md's table.
3. **Pose / orientation**: how it sits in the game's camera (side-on, top-down, ¾ isometric, 3D).
4. **Parts list** with materials or colours, mapped to STYLE.md's palette and shared parts.
5. **Detail split**: what is shape (geometry, outline) and what is painted/texture (lines, highlights, emblems).
6. **Gameplay reads**: what it must communicate (team, danger, hitbox size, facing, state) and how.

## 3. Block out, check the silhouette

Build only the big shapes, at the size the game shows them, and render them **at play size and zoom** next to the
reference and next to the assets it will appear with. Fix proportions and readability now; detail never rescues a
wrong silhouette or an asset that's the wrong size for its hitbox.

## 4. Detail

- Exaggerate per STYLE.md: what's small vanishes at play size, so make key features bigger than feels right.
- Reuse shared colours, outlines, materials and parts; add an asset-only piece only when nothing shared fits.
- Paint light in (highlights on top, shadow below, a dark line where parts meet) in the game's shading style.
- Keep the visual footprint honest to the collision shape: players must be able to trust what they see.

## 5. Render and compare, in rounds

**What to capture**, every round, with the same views and settings each time:
- **The asset alone** on a neutral background (mid-grey, or the game's own background colour), at the size it
  appears in play (×1) and enlarged by a whole number (×3–4) so faults show.
- **The asset in context:** in the running game, at the game's real resolution and camera, next to the assets it
  appears with. Play size differs per target: check the smallest one the game ships on (a phone in the hand or a
  handheld shows it physically smaller than a desktop window; a TV across the room loses fine detail the same way).
- **Several views or frames where it matters:** the reference's angle plus a straight-on view; front, three-quarter,
  side and the game camera for 3D; every facing for directional sprites; each state (idle, damaged, selected); a
  strip of frames if it moves.

**What to judge it against:** the reference, side by side at the same size; `STYLE.md` (palette, outline, light
direction, proportions table); and the **silhouette at play size** (fill it with one colour, or squint: it must
still be recognisable and say what it is for).

**Each round:**
1. Capture the views above.
2. Write down the **top 5 differences**, biggest first (silhouette > proportions > big parts > colours > detail).
3. Fix them, re-capture, repeat until what's left is small detail (3–5 rounds is normal).
4. Show the user before/after (and the reference side by side) with the remaining gaps stated honestly.

Captures go to the scratchpad or a temp folder, never into the repo.

**How to get the capture,** best first:
1. **A viewer in the project:** a small scene or page that shows one asset by id on a neutral background, with
   options for view, animation frame, scale and a second asset to compare. Build one if the game will have more
   than a few assets, and keep it out of the shipped build.
2. **The engine's own screenshot or headless render,** if the project has one: a command-line flag that writes
   frames, a screenshot call in a debug hook, an editor render, a test that saves an image. Use what the project's
   rules name; don't guess an engine's flags.
3. **The art or modelling tool's export or render,** for assets made there.
4. **Ask the user for a screenshot** of the game at the right moment, saying exactly which screen, zoom and state.

### In a web game

The viewer is a **gallery page** in the game folder (e.g. `gallery.html`) that draws one asset by query string:
`?asset=<id>&view=<…>&anim=<…>&frames=<n>&scale=<…>&compare=<id2>`, and sets `document.title = 'ready'` when done.
Keep it out of the shipped build (Vite only bundles `index.html`; otherwise use the project's ignore list).
canvas2d-assets ships one for canvas 2D (`gallery.html`) and threejs-models one for three.js (`viewer.html`).
The game itself (`index.html`) is the in-context view, reaching the right screen with keys.

`scripts/shot.mjs` (next to this file) serves a web game and renders any of these to PNG in headless Chromium:

```sh
node <skill-dir>/scripts/shot.mjs <game-dir> <scratch>/round1 \
  "gallery.html?asset=hero&scale=4|hero-big.png" \
  "gallery.html?asset=hero&scale=1|hero-play-size.png" \
  "index.html|in-game.png|keys=Enter|wait=2500"
```

Run it from the project root. `<game-dir>` is the game's folder relative to it (`.` for a game at the root, or e.g.
`games/my-game`); add `|size=WxH` to a shot of the game to match its logical resolution. It needs Node and Playwright:
it uses the project's copy, or the package folder named in the `PW_MODULE` env var, and says what to install when it
finds neither.

## 6. Finish

- Update STYLE.md: the catalogue row (file, reference in words, status) and any new shared rule.
- Check motion if it moves (animate-asset).
- Add a line to DESIGN.md's changelog.
- Keep the old version reachable while the user decides (e.g. `<id>Old`), then remove it.
- Run the project's checks (look at any screenshot they produce) and finish the change the way its rules say.

## Changing one existing asset

The user asks for one thing, one asset changes, and everything else stays exactly as it was. The request is the
reference, so sections 1–4 don't apply; a sweeping restyle is not this (do the full workflow, or agree a
STYLE.md change with the user).

1. **Pin down the target:** which asset and which part ("the axe head", "the coin's shine"). If the request is
   vague ("make it cooler"), offer 2–3 concrete options and let the user pick. If the change would break a
   STYLE.md rule or a gameplay read (size against hitbox, team or danger colour, facing), say so and ask whether
   to change the rule or the request.
2. **Find where it lives:** STYLE.md's catalogue, or search the code and asset folders for its id. If it is tangled with other
   assets, isolate it first, as a separate step that changes nothing visible and that the user agrees to.
3. **Capture "before"** the section 5 way: the asset alone and in the game, plus a frame strip if
   motion could be affected.
4. **Change only that asset's** code, data or file, and keep the old version beside it (`<id>Old`) until the
   user has seen before and after.
   - Shared things are off limits by default: palettes, materials, sprite parts, helpers and rigs are used
     elsewhere. If the change needs one, either fork it for this asset (a copy under the asset's own name) or ask
     the user, then re-render **every asset that uses it**, before and after.
   - No refactors, renames or tidying of unrelated code.
5. **Capture "after"** with the same views and parameters. The change must show **at play size**, nothing else may
   differ, and motion must still work. Two or three small rounds is typical. Show the user before and after side
   by side and say exactly what changed and what didn't.
6. **Finish** as in section 6, as a change of its own (one asset, one change) so it is easy to revert.

## Lessons so far

- Check a straight-on view every round, not only the reference angle: some faults only show from one side.
- Judge sizes at play zoom; things that read up close (faces, rivets) vanish in play, silhouettes and colour blocks don't.
- Painted detail reads better at small sizes than tiny shapes.
- Domes and spheres read as pillows; flatter plates with a rim read as armour.
