---
name: model-asset
description: Create, rebuild or change a visual asset for the game in this repo — a character, creature, vehicle, building, prop, pickup, effect, tile or UI element — to match a reference or art direction, in any rendering style (2D canvas shapes, pixel-art sprites, SVG, 3D, or the user's own files). Covers the game's STYLE.md, reference breakdown, silhouette and proportions, block-out, detail, render-and-compare rounds, and one focused change to an existing asset with before/after renders and nothing else touched. Use for "make a <thing>", "redo the <thing>", "match this reference", and edits such as "tweak", "recolour", "make the X bigger", "fix the Y on the Z". For motion use animate-asset; also load canvas2d-assets for 2D games or threejs-models for 3D models built in three.js code.
---

# Model an asset

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the APIs, the screen size, the checks and how to finish a change. `<skill-dir>` is the folder this file is in.

Quality comes from one discipline: **work from a reference and compare renders against it every round.**
Never "improve" from memory alone. This skill is the workflow; *how* to draw or build the thing depends on
the game's rendering, so pair it with an engine skill when one exists:

| Game renders with | How-to |
|---|---|
| 2D canvas: vector shapes, pixel art, sprite sheets, SVG | **canvas2d-assets** skill (style, animation and sprite toolkit, asset gallery) |
| three.js, models built in code | **threejs-models** skill (rig, sculpting toolkit, asset viewer) |
| three.js with model files (GLB) | [3d.md](../threejs-models/references/3d.md) → *Models*, [assets.md](../game-design/references/assets.md) |
| Cover / key art (SVG) | edit the SVG; render it with the project's own art check, or use the script below |

For one small change to an asset that already exists ("make the sword bigger", "darker red on the armour"), read
section 0, then go to *Changing one existing asset*. **animate-asset** (motion) shares the game's `STYLE.md`.

## 0. Read the game first

- `DESIGN.md`: what the game is, its camera and scale, what the player must read at a glance (hazards,
  pickups, enemies). An asset that looks great but reads wrong in play is wrong.
- `STYLE.md` (create it from `STYLE.template.md` next to this file if the game has none): palette, shape
  language, proportions, shared materials, animation timing, and the asset catalogue. Every choice you make
  follows it; every new rule you establish goes into it.
- How the game currently draws assets: reuse its conventions (one function or file per asset, shared palette,
  existing helpers). Don't introduce a second way of drawing things.

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
3. **Pose / orientation**: how it sits in the game's camera (side-on platformer, top-down, ¾ isometric, 3D).
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

Render the asset where you can see it clearly. Options, best first:
- a **gallery page** in the game folder (e.g. `gallery.html`) that draws one asset by query string:
  `?asset=<id>&view=<…>&anim=<…>&frames=<n>&scale=<…>&compare=<id2>`, and sets `document.title = 'ready'` when done.
  Keep it out of the shipped build (Vite only bundles `index.html`; otherwise use the project's ignore list).
  canvas2d-assets ships one for 2D (`gallery.html`) and threejs-models one for 3D (`viewer.html`).
- the game itself (`index.html`), reaching the right screen with keys.

`scripts/shot.mjs` (next to this file) renders any of these to PNG:

```sh
node <skill-dir>/scripts/shot.mjs <game-dir> <scratch>/round1 \
  "gallery.html?asset=hero&scale=4|hero-big.png" \
  "gallery.html?asset=hero&scale=1|hero-play-size.png" \
  "index.html|in-game.png|keys=Enter|wait=2500"
```

Run it from the project root. `<game-dir>` is the game's folder relative to it (`.` for a game at the root, or e.g.
`games/my-game`); add `|size=WxH` to a shot of the game to match its logical resolution. It needs Playwright: it uses the
project's copy, or the package folder named in the `PW_MODULE` env var, and says what to install when it finds neither.

Each round:
1. Render the same views as the reference, **plus the asset at play size, in the game**.
2. Write down the **top 5 differences**, biggest first (silhouette > proportions > big parts > colours > detail).
3. Fix them, re-render, repeat until what's left is small detail (3–5 rounds is normal).
4. Show the user before/after (and the reference side by side) with the remaining gaps stated honestly.

Renders go to the scratchpad or a temp folder, never into the repo.

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
2. **Find where it is drawn:** STYLE.md's catalogue, or search the code for its id. If it is tangled with other
   assets, isolate it first, as a separate step that changes nothing visible and that the user agrees to.
3. **Capture "before"** with the section 5 commands: the asset alone and in the game, plus a frame strip if
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
