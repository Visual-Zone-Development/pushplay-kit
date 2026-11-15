---
name: pixel-art
description: Make polished, consistent pixel art for a game in any engine, from 32–64 px chibis to detailed 96–128 px heroic figures (winged knights, angels, kings with folds, feathers, armour, trims and fire), covering characters and creatures in 4 or 8 directions with walk, run, idle, attack, cast, jump, hurt and death animations, terrain tiles, 16-tile transitions, maps and props, and UI chrome (panels, buttons, bars, slots, dialogue boxes), at the quality of modern pixel-art generators. The rules (one spec, hue-shifted ramps, outlines, clusters, anti-aliasing, whole-number scaling) hold for sprites made in any art tool; it also ships a JavaScript canvas toolkit (pixelforge.js models a character once and renders every direction and frame, plus tiles.js, pixelui.js, props.js, a showcase page and a pixel font) that bakes PNG sprite sheets any engine can load. Use for "pixel art", "make it look like PixelLab", "8-directional sprites", "sprite sheet", "walk cycle", "tileset", "top-down RPG look", "pixel UI", or any 2D game using pixel art. Pairs with model-asset / animate-asset for workflow, art-direction for the whole-screen look.
---

# Pixel art

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the APIs, the screen size, the checks and how to finish a change. Pixel art needs whatever draws it to use whole-number scales and nearest-neighbour filtering. `<skill-dir>` is the folder this file is in.

This is a craft skill. Sections 1–10 are the rules of good pixel art and hold in every engine and every art
tool (Aseprite or any pixel editor). The toolkit that automates them is JavaScript for canvas and sits under
*In a web game* at the end; **the sprite sheets it bakes are PNG files with a JSON layout, which any engine
can load**, so a non-web project can still bake with it or draw by hand to the same rules.
**model-asset** and **animate-asset** give the workflow (reference, breakdown, rounds, STYLE.md).

The quality bar is modern generator output (PixelLab-style): chibi characters at 32–64 px that read
instantly, identical style in all 8 directions, smooth 6–8-frame cycles, terrain with clean transitions,
and UI that matches. Three things get you there:

1. **One spec for the whole game** (size, view, light, outline, shading, palette), written down and never
   varied per asset.
2. **Pixel rules applied to every pixel** (ramps, bands, outlines, cleanup), by a tool or a checklist, not by eye.
3. **One source per asset** (a model rendered to every direction and frame, or one master file per character
   in the art tool), so nothing drifts.

## 1. The spec: decide once, write it in STYLE.md

Add this under *Look* in the game's `STYLE.md` (create it from `<skill-dir>/../model-asset/STYLE.template.md`):

```md
## Pixel spec
- **Game resolution:** 320×180 native, ×4 / ×6 to the screen (whole-number scaling, nearest-neighbour)
- **View:** low top-down (20°) | high top-down (35°) | side | isometric: one for the whole game
- **Tile:** 16 px. **Character canvas:** 48 px (hero 64), character ≈ 70 % of canvas height
- **Directions:** 8 for the player and fighters, 4 for NPCs
- **Light:** top-left-front, fixed to the screen, for sprites, tiles and UI bevels alike
- **Outline:** selective (sprites) | black | none (tiles)
- **Shading:** medium (4-step ramps) for sprites, basic (3) for tiles and UI
- **Palette:** ≤ 32 colours; ramps per material listed below; hero colour = <#hex>
```

| Setting | Options and when |
|---|---|
| **Native resolution** | The target screen ÷ a whole number, per target: **320×180** fills 720p at ×4, 1080p at ×6 and 4K at ×12 (desktop, TV); **320×200** fills a 16:10 handheld at ×4; a phone held in the hand wants chunkier pixels (240×135 or 160-high portrait) so a 1-px feature is still visible. Where the division isn't whole (1280 ÷ 3 = 426.67), use the largest whole scale that fits and letterbox or show a little more world. Never mix pixel scales on screen (a ×3 sprite next to ×4 tiles looks wrong at once). |
| **Scaling** | Draw the world at native size and scale the finished frame up by a whole number with **nearest-neighbour** filtering (no smoothing, no mipmaps, no texture compression that blurs). Positions snap to whole native pixels; rotation and non-integer zoom are baked into frames or avoided. |
| **Character size** | 32 px canvas (crowds, small units), 48 (default), 64 (hero, close camera). Smallest readable feature is 1 px; a 32-px character's face is 2 eye pixels and nothing else. |
| **View** | *side* (platformers), *low top-down* 20° (action RPG, combat: you see faces), *high top-down* 35° (world maps, farming: you see more ground), *isometric* (tactics, builders). Props, characters and tiles must all use the same one. |
| **Outline** | *selective* (default, modern: darkest ramp step of the neighbouring colour, one step lighter on the lit top/left edge), *black* (retro, best on busy backgrounds), *none* (tiles and backgrounds, so sprites pop against them). |
| **Shading** | *flat* (2 steps), *basic* (3), *medium* (4), *detailed* (5 plus a checker dither only at band edges). More steps need more pixels: 32 px sprites stay at basic or medium. |

## 2. Colour and pixel rules

- **Ramps, not tints.** Every material is a ramp of 3–5 colours: shadows shift hue toward blue-violet and
  lose a little saturation, highlights shift toward warm yellow; near-greys (white cloth, steel, silver hair)
  get cool blue-violet shadows. Never darken by mixing with black or grey.
- **The darkest step is for lines** (outlines, inner lines, the crack between two parts); shading uses the
  others.
- **Limited palette.** Reuse ramps across assets (the same leather on boots, belts and chests); ≤ 32 colours
  for the game is a good target. List the ramps in STYLE.md.
- **Value hierarchy.** Characters have the highest contrast and the most saturated colour (the hero's
  colour appears nowhere else). Ground tiles are mid-value and low-contrast; backgrounds lower still.
- **Small flat marks** (eyes, catch-lights, buttons, emblems) never get outlines or inner lines (otherwise
  every eye gets a dark ring).
- **Clean lines.** Along a curve the run lengths change steadily (1, 1, 2, 3, not 1, 3, 1, 2); no doubled
  corners, no orphan pixels.
- **Anti-aliasing by hand, sparingly.** One in-between colour from the same ramp, 1–2 px long, on the inside of
  curves and diagonals. None on the outer edge (the background changes), none at 32 px, never from a blur or a
  smooth-scaling filter.

## 3. Characters

Build each character **once** from one source and derive every direction and frame from it. Rules:
- **Silhouette first.** At ×1 the character must read from its outline alone: big head (chibi: 2.2–2.6
  heads tall; heroic: 3–4), one distinctive shape (cape, hat, hair spikes, weapon), and limbs at least 3 px thick.
- **Exaggerate what identifies it.** Weapons as long as the torso, hats as wide as the shoulders, hair bigger
  than real. What's realistic at 48 px is invisible.
- **Face:** match the reference's face style (section 8). At this size a face is a handful of deliberate pixels;
  count them in the reference (eye size and spacing, catch-light or not, mouth or not). It must stay readable
  in every front and side direction.
- **Same light in every direction:** the light is fixed to the screen (top-left), never to the character.
- **Asymmetric characters** (a sword in one hand) need all 8 directions drawn; only mirror west from east for
  symmetric ones.
- **Team colours:** keep one accent material for the team or variant colour, so recolours are one change.
- **Hitbox honesty:** the hitbox matches the body, not the cape or weapon reach.
- **Check at ×1 and ×4**, on the game's real ground tile, next to the other characters. Fix silhouette and
  size before colour and detail.

## 4. Animation

| Animation | Frames | fps | Key poses |
|---|---|---|---|
| idle | 4 | 5 | 1-px breathe bob, arms drift; nothing else moves |
| walk | 8 | 10 | contact (lowest, legs apart) → passing (highest), arms opposite legs, 1-px bob, cape trails |
| run | 8 | 13 | forward lean, knees high, forearms bent, 2-px bob, both feet off the ground at passing |
| attack | 6 | 12 | anticipation (wind-up, ≥ 2 frames) → strike (1 frame) → follow-through → recover |
| cast | 6 | 10 | arms rise, hold at the top 2 frames, release |
| hurt | 3 | 10 | snap back on frame 1, ease back |
| jump | 6 | 10 | crouch → stretch up → tuck at the apex → land crouch |
| death | 6 | 8 | stagger, fall backward, settle; hold the last frame |

Rules:
- **Every frame comes from the same source**, so proportions never drift; only the pose changes.
- **Anticipation and impact:** the frame before a hit is the most extreme pose; the hit frame is held
  (game-feel: hit-stop 2–4 frames) and the effect (slash arc, dust) is a separate small sprite.
- **Secondary motion** (cape, hair, tail) lags the body by about a frame and overshoots.
- **Sub-pixel animation:** for motion smaller than a pixel (breathing, a slow sway), keep the outline still
  and move the shading: shift a highlight or a ramp step one pixel along the form.
- **Stride matches speed:** pixels moved per walk cycle ≈ the distance between the feet at contact × 2, or
  feet slide (animate-asset). Snap positions to whole pixels when drawing.
- **Hold frames** read better than more frames: 6 strong poses beat 12 in-betweens at this size.
- Flashes on hit (white for 2 frames) are skipped when the game's reduced shake / flash setting is on.

## 5. Environments

(Pixel terrain specifics. For environment design in general, any camera and style, plus autotiling, scattering,
levels as text and backdrops, use the **environments** skill alongside this one.)

- **Clusters, not noise.** Texture is made of deliberate 2–4-px groups (a blade of grass is a light pixel
  over a dark one; a pebble is 1–2 px with a shadow). Per-pixel random noise reads as static.
- **No visible repetition.** Nothing periodic at tile size (it becomes a grid across the map): solid tiles
  come in 3–4 variants that share the base and differ in small clusters, placed by a hash of the cell.
- **Transitions are 16-tile corner sets** (Wang): the boundary wobbles, never a straight diagonal, and meets
  exactly at tile edges. The upper terrain gets a 1-px dark rim on its south/east side; water gets a light
  foam lip.
- **Tiles: no outline, basic shading, lower contrast than sprites.** Characters must pop off the ground.
- **Props use the same view, light and outline** as the characters. Sort props and characters by the y of
  their feet each frame.
- **Scale relations:** a door is ~1.3× character height, a tree 2–3×, a chest ½. Keep a scale line in STYLE.md.
- **Layers:** ground → ground decals (paths, flowers) → shadows → props and characters (y-sorted) →
  overhead (tree canopies, roofs) → weather and UI.
- **Animated tiles** (water, lava, torches): 3–4 frames at 4–6 fps.
- **Side view:** 2–4 parallax background layers, each lower contrast and closer to the sky colour than the
  one in front.

## 6. UI

- **Same pixel scale as the game.** UI chrome is drawn at native size and scaled with everything else.
- **Light from the top-left:** light bevel top/left, dark bottom/right, 1-px dark outline, cut corners.
  Pressed = bevels swapped and sunk 1 px.
- **Text at full resolution:** draw text after scaling the native layer, with a pixel font at a whole multiple
  of its design size, aligned to the scaled pixel grid. Smallest text per target follows the project's rules
  (as a guide: about 3 % of the screen's short side on a handheld or a TV across the room, 4 % on a phone,
  2 % in a desktop window). Bundled: **Pixelify Sans** (400, 700; OFL; `toolkit/fonts/`, `.woff2`); credit it.
- **Focus is visible without hover:** the focused button changes colour *and* gets a marker (controller and
  keyboard players have no hover). Prompts still come from the game's input-prompt helper (never literal key names).
- **Bars** show a lighter "just lost" segment that drains after a short delay; ticks every 10–25 % help
  reading at a glance.
- **Icons are 16–24 px**, with no ground shadow, in one fixed view and direction for every icon.
- **Spacing:** margins and gaps in multiples of 4 native px; one panel material per screen; the hero colour
  only for the focus state and important numbers.

## 7. High detail (96–128 px heroic figures)

For portraits, bosses, character select, units in a tactics game or any sprite shown large: the look of
hand-painted 96–128 px sprites (winged knights, angels, kings) rather than chibis. Rules on top of the chibi ones:

- **Size and proportion:** figure 96–128 px tall in a 128–160 px cell; proportions, limb thickness and face
  treatment come from the reference (section 8). Keep negative space between arms and body: bulk reads as a
  blob at this size.
- **Ramps of 6–8 steps per material, 40–64 colours per sprite**, each material using its full value range:
  metal from near-black reflections to a near-white specular, cloth with deep fold shadows, skin with a warm
  shadow and a rim.
- **Line art everywhere:** a 1-px dark line where any two materials meet and where parts overlap, plus the
  dark outline (lit top/left edge one step lighter). This is what makes hand-made sprites look crisp; without
  it, detailed shading looks blurry.
- **Surface patterns on every large surface:** folds (gowns, robes, cloaks), individual feathers, hair
  strands, armour bands, scales, fur, wear, wood grain; trims on hems, sleeves and shields. A large flat area
  is the first thing that looks unfinished.
- **Complex silhouettes:** wings are many separate narrow feathers with gaps (coverts, secondaries and fanned
  primaries); crowns have points, capes flare, weapons are long and readable.
- **Small details survive:** eyes, brows, gems and emblems are placed last as whole pixels, never averaged away.
- **Effects** are pixels from their own ramps, never blurred: flame (heat → dark red … white core),
  sparkles, glow with an ordered-dither falloff. They hide behind the body where it is in front.
- **Pose with intent:** weight on one leg, head turned slightly, hands doing something. A stiff T-pose wastes
  the detail.
- **Ship baked PNG sheets** with a small layout file (cell size, directions, animation rows), never frames
  rendered at game start.

**Where this stops.** Primitives and patterns get to well-lit, consistent, detailed sprites in every
direction and frame. The very best hand-made or generated sprites still add things a model doesn't have:
harp strings, filigree, facial expression, cracks, painterly highlights placed one pixel at a time. For a
hero shot at that level, use the user's own sprites (or ones they generate with a pixel-art
generation tool), and use one consistent source for everything that has to match them in
every direction and animation: same size, view, ramps, outline and light.

## 8. Faces and anatomy: match the reference

The skill doesn't define how faces or bodies look: every game takes them from its own references. What
stays fixed is construction: how to build a head and body so that **any** style holds up in every direction
and frame. So, for each game:

### 8.1 Measure the reference

Ask the user for reference sprites or portraits in the style they want, ideally at the size the game will use.
Never commit them or copy their art; measure them. Zoom to ×4–8 and count pixels:

| Measure | What to record |
|---|---|
| **Scale** | sprite height in px; head height in px (the unit for everything else); heads tall |
| **Body** | shoulder and hip width in heads; limb thickness in px at the thickest and at joints; how much anatomy shows (simple tapered limbs or visible muscle masses); hand treatment (mitten, fist block, fingers); pose (stiff and iconic, or contrapposto) |
| **Head shape** | width ÷ height; jaw (pointed, round, square); chin; brow ridge; nose as a shape or only paint; ears visible |
| **Eye line and spacing** | eye height as a fraction of the head (from the chin); distance between eyes in eye-widths |
| **Eyes** | size in px; one dark shape or white + iris (+ pupil); catch-light; upper-lid line (thickness, colour); lower lid; lashes or a winged corner |
| **Brows** | present? thickness in px; length; arch or straight; colour (hair or line colour) |
| **Nose** | none, a single shadow pixel, a bridge highlight, nostrils, an outlined shape |
| **Mouth** | none, a 1-px line (length), two-tone lips, a shadow beneath |
| **Line colour** | facial lines in black, a dark skin tone or a coloured line; same as the outline or not |
| **Skin shading** | how many skin tones on the face; shadow shape (soft gradient or hard cel step); where the highlight sits (cheek, nose, forehead); blush |
| **Hair** | big simple shapes, clumps or strands; hairline height; how it frames the face |

Write the result into the game's `STYLE.md`:

```md
## Face and body style (from <reference, described in words>)
- Scale: sprite 110 px, head 15 px (7.3 heads); shoulders 1.9 heads, limbs 4 px / joints 3 px
- Head: oval 0.85 wide; soft jaw; small nose shape; ears hidden by hair
- Eyes: on 0.52 of head height, 1 eye-width apart; 2×1 px dark with 1 px white at the inner side, no catch-light;
  1 px lid line in the outline colour
- Brows: 2 px, straight, hair colour; Nose: 1 shadow px; Mouth: 2 px line, dark skin tone
- Skin: 4 tones, soft shadow on the far cheek, highlight on the near cheekbone; no blush
- Hair: 3–4 big clumps, hairline at 0.8 of head height
```

### 8.2 Render and compare

1. Render at the reference's head size, in the same direction, next to the reference.
2. List the top 5 differences, biggest first: head and hair silhouette > landmark positions > how each
   feature is built (pixel count, whites, lines) > colours > small detail.
3. Change the style values, re-render, repeat (3–5 rounds). Then check every direction and a portrait.
4. Update STYLE.md with the final values so every later character uses them.

### 8.3 Construction rules (any style)

- **The head is one smooth shape;** only features that must stay crisp (nose, ears) break it. Hair is a few
  big masses (cap, fringe, sides, back, falls), not planks.
- **Shading on skin uses smooth falloffs** unless the reference shows hard cel shadows; hard-edged patches
  read as creases when the head turns. Nothing pokes past the silhouette.
- **Limbs are overlapping masses, not tubes.** Joints are narrower than the masses either side of them, and
  bend one way. Shoulders slope into the neck, and torsos are wider than deep. Arms hang from just inside
  the ribcage edge. How much of this shows is a style measurement; that it's built this way isn't.
- **Poses:** contrapposto unless the reference is deliberately stiff or iconic.
- **Expression** (smile, brow tilt, gaze) is separate from style and changes per frame or portrait.

## 9. Workflow

1. Write the Pixel spec (above). Show the user a reference (their screenshot, or the toolkit's showcase) and confirm.
2. Build the hero; render 8 directions at ×1 and ×4; fix silhouette and proportions (model-asset rounds:
   export or capture the sheet at ×1 and ×4 on the real ground tile).
3. Add animations; lay each out as a strip; check timing in the game.
4. Terrain, transitions, props; then UI.
5. **Bake, never render per frame** (sheets, tile sets, the static map, UI panels); per frame only draw images.
6. Update STYLE.md (spec, ramps, catalogue) and add a Changelog line to DESIGN.md.
7. Run the project's checks (look at any screenshot they produce) and finish the change the way its rules say.

## 10. Review checklist (every asset, at ×1 and ×4)

- [ ] Reads from silhouette alone at ×1, on the real background
- [ ] Same size, view, light, outline and shading as everything else (STYLE.md spec)
- [ ] Colours come from the ramps; no pure black except in a black-outline style; no grey shadows
- [ ] No orphan pixels, no pillow shading (light following the outline instead of the light direction), no
      banding staircases (parallel bands that echo the outline)
- [ ] Eyes and decals clean (no rings); face visible in front and side directions
- [ ] Animation: anticipation before hits, no drifting proportions, feet don't slide, loops have no pop
- [ ] Tiles: no grid repetition across a 20×12 map; transitions meet at tile edges
- [ ] UI: focus visible without hover; text at or above the target's minimum size and crisp; bevels match the light
- [ ] Faces and bodies match the STYLE.md face and body style (compared side by side with the reference at
      its size); smooth head, no creases or lumps, nothing poking past the silhouette, joints bend correctly
- [ ] High detail: line art between materials, every large surface patterned or trimmed, full value range per
      material, silhouette has gaps and points (no blobs), eyes survive at ×1, effects occluded correctly

## Limits and options

- Two tiers: 32–64 px chibi sprites, and 96–128 px detailed figures baked to PNG ahead of time (section 7). Pick
  one per game, or chibi for the world and detailed for portraits and bosses, and record it in the Pixel spec.
- For a hero portrait or key art beyond what models reach, ask the user for sprites (credit them) and keep
  everything else matched to them.
- **If you have a pixel-art generation tool** (PixelLab, say),
  generate with it and apply this skill's spec and checklist to its output so it matches the rest
  of the game: same canvas size, view, outline, shading and palette.
- **In another engine:** import the PNG sheets with filtering set to nearest and no compression, slice them by
  the layout file, and set the camera or viewport to a whole-number scale of the native resolution.

## In a web game: the JavaScript canvas toolkit

In `toolkit/` next to this file. Copy the files you need into the game (next to its main script, or `src/` in a
bundled game). Draw with `imageSmoothingEnabled = false` and the game's scaling layer at whole-number scales.
To see the bar, serve the toolkit (`cd <skill-dir>/toolkit && python3 -m http.server 8765`) and open
`showcase.html` (`?section=chars|anims|world|ui|hd|anatomy`); rendered with Playwright it's the fastest way to
compare your output. Colours: `ramp(base, steps)` builds the hue-shifted ramps; `decal: true` marks small flat marks.

### Characters and animation (`pixelforge.js`)

```js
import { character, sheet, render, ANIMS, DIRS8, dirFromVector } from './pixelforge.js'
const hero = character({ hair: 'spiky', cape: true, weapon: 'sword', shield: true,
  colors: { hair: '#e8e2d0', top: '#3d6fb6', bottom: '#3b3550', accent: '#c0392b' } })
const s = sheet(hero, { size: 48, scale: 1, view: 'low top-down', dirs: DIRS8, anims: ['idle', 'walk', 'attack'] })
// draw: const [sx, sy] = s.frame(dir, 'walk', i); ctx.drawImage(s.canvas, sx, sy, 48, 48, x - 24, y - 43, 48, 48)
```

The builders and examples (`character`, `figure`, `props.js`) lean fantasy only because they are examples:
the same primitives build sci-fi soldiers, modern people, robots, vehicles, ships, animals and abstract
pieces. Write a `model()` for whatever the game needs, in its measured style.

`character(spec)` covers humanoids (hair: short / spiky / bob / long; beard; hats: hood / wizard / helmet;
cape; weapons: sword / staff / axe; shield; `heads` for proportions; `build` for slim to stocky). For
anything else (creatures, mounts, robots, monsters), write a `model({ bones, parts, materials })` from
ellipsoids, capsules and boxes; `props.js` has a slime, tree, rock, bush, chest and item icons to copy.

`character(spec)` covers humanoids (hair: short / spiky / bob / long; beard; hats: hood / wizard / helmet;
cape; weapons: sword / staff / axe; shield; `heads` for proportions; `build` for slim to stocky; `face` for the
measured face; `accent` as the team material). For anything else (creatures, mounts, robots, monsters), write a
`model({ bones, parts, materials })` from ellipsoids, capsules and boxes; `props.js` has a slime, tree, rock,
bush, chest and item icons (`potion`, `coin`, `swordIcon`, rendered with `shadow: false`) to copy.

New animations are new entries in `ANIMS` (`{ frames, fps, loop, pose(phase) }`); creature templates sit next to
the creature (`SLIME_HOP`). Drive secondary bones from the phase shifted back (see `cape` in `walk`);
`showcase.js` → `anims()` renders strips. Baking at startup, measured on a desktop: 48 px × 8 directions × 18
frames ≈ 0.3 s; a 64-px hero with all 47 frames ≈ 0.8 s (about twice that on a handheld). Draw the title first,
then bake a few frames per tick or each animation the first time it's needed, so nothing freezes.

### Tiles (`tiles.js`) and UI (`pixelui.js`)

```js
import { TERRAIN, wang, buildMap, noiseCorners } from './tiles.js'
const set = wang(TERRAIN.water(), TERRAIN.grass(), { size: 16 })        // 16 transition tiles + variants
const corners = noiseCorners(40, 25, { cell: 5, threshold: 0.45, seed })  // or from a level string
const ground = buildMap(set, corners)                                       // bake once, blit each frame
```

`variants` gives the 3–4 solid-tile variants; `TERRAIN.water(base, frame)` animates. UI chrome is drawn at
native resolution with the same light as the sprites; load Pixelify Sans like any `FontFace`:

```js
import { panel, button, bar, slot, speech, CHROME } from './pixelui.js'
panel(g, 8, 8, 140, 100, CHROME.wood())          // g = the 320×200 canvas
button(g, 20, 20, 116, 18, focused === 0 ? 'focus' : 'idle')
bar(g, 10, 10, 80, 9, hp / maxHp, { color: '#d9453b', lag: shownHp / maxHp, ticks: 5 })
```

### High detail (`hd.js`, `figure.js`, `fx.js`, `bake.mjs`)

```js
import { renderHD, sheetHD } from './hd.js'
import { figure, standPose, holdPose } from './figure.js'
import { flame } from './fx.js'
const knight = figure({ outfit: 'plate', wings: { span: 2.7, height: 3 }, sword: true, hair: 'swept',
  colors: { feather: '#ab927a', featherDark: '#82695a', cloth2: '#4a5470' } })
const r = renderHD(knight, { size: 160, dir: 'south', pose: standPose(), points: ['swordBase', 'swordTip'] })
flame(r.canvas, r.points.swordBase, r.points.swordTip, { t, height: 16, width: 3.2, occlude: r })
```

- Each pixel is shaded from 3×3 samples with key light, sky fill, rim light, specular on metal and occlusion
  in crevices, plus surface patterns; the averaged light is snapped to a 7–8-step ramp, which places the
  in-between colours on curves that pixel artists add by hand.
- Options: `lineArt: true` (default); patterns `folds`, `feather`, `strands`, `bands`, `scales`, `fur`, `worn`,
  `grain`; `trim: { mat: 'gold' }`; `decal` materials win the downsample; effects `flame`, `sparkles`, `glow`
  take `occlude: r`; poses `standPose()`, `holdPose()`.
- **Bake ahead:** a 160-px frame takes ~0.3 s, so a full sheet takes minutes. Put a bake page in the game's
  `tools/` (kept out of the build) that sets `window.__bake = [{ name, canvas, meta }]` and
  `window.__bakeDone = true`, then run `node <skill-dir>/bake.mjs . tools/bake.html assets/sprites` from the game
  folder (it needs Node and Playwright, and says what to install if it can't find it). It writes
  `assets/sprites/<name>.png` and `.json` (cell size, directions, animation layout): load them like any sprite
  sheet, in this game or in any other engine. User-supplied sheets load with canvas2d-assets' `loadSheet`.

### Faces and construction

Convert the section 8.1 pixel measurements to head units (`px ÷ head height in px`) and set them:

- **Detailed figures:** `figure({ face: {...} })` takes the keys of `FACE_DEFAULTS` in `figure.js`: eye line
  and spacing; eye size, whites, iris, pupil, catch-light, lid, lower lid, flick and crease; brow gap,
  thickness, taper, length and arch; socket shading; nose marks; mouth position, width, line and lips; blush;
  head shape (jaw, chin, brow ridge, nose shape, ears). `null` or `0` leaves a feature out. The defaults are
  neutral placeholders, not a target. Body measurements go to `heads`, `build`, `body` and `muscle`.
- **Chibi sprites:** `character({ face: { eyeY, spacing, w, h, shine, mouth } })` in head radii. Expression:
  `smile`, `browTilt`, `gaze`.
- If the reference does something the controls can't express, extend `facePainter` (a new feature reads
  the style object, never hard-coded values), or paint it with a part's `paint` hook.
- Heads and hair are a `blob` (ellipsoids melted together with blend radius `k`; small `k` for nose and ears).
  Skin and cloth use `wrap` lighting; marks that should get no line art (blush, lips, freckles) use
  `blend: true`. Positive z rotation lifts a left (…L) limb away from the body, negative z a right one.
- **Portraits:** the same figure at `scale: 4`, `view: 'side'`, `shadow: false`, with `ground` set to frame the
  head (see `anatomy()` in showcase.js; `showcase.html?section=anatomy` shows three face styles on one model).
  Each takes about 1 s, so bake them to PNG with the sheets.
