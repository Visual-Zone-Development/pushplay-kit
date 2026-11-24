---
name: art-styles
description: Give a game in any engine a named art style, with one style sheet per look that says what the style is made of and how characters, props and scenery are built in it. Twelve sheets so far, six 2D (lit vector, storybook gouache with ink wash and cozy hand-drawn variants, comic halftone, watercolour, neon with a vector CRT variant, pixel art) and six 3D (low-poly, toon or cel, claymation with felt and toy variants, papercraft, voxel, PS1-era retro), plus a template for writing a sheet for any style that is not listed. Ships a JavaScript lineup that draws one scene in every style on canvas and three.js, as worked examples. Use for "make it papercraft / claymation / voxel / PS1 style / comic book / watercolour", "what art styles can I pick", "pick a look for my game", "change the art style", or the art-style question when a new game is planned. Pairs with art-direction for the whole-screen method, model-asset for building each asset and pixel-art for pixel art in depth.
---

# Art styles

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the APIs, the screen size, the performance budget, the checks and how to finish a change. `<skill-dir>` is the folder this file is in.

This is a craft skill. A **style sheet** describes one look in words that hold in any engine: what it reads as,
what things are made of, how light behaves, how characters and props are built, what the finishing pass is, and
what makes it look fake. The code that goes with a sheet is under *In a web game* at the end of the sheet and of
this file; a project in another engine takes the rules and builds them with its own shaders, materials and art tools.

**A sheet is a starting point, never a fence.** The user's references and the game's `STYLE.md` win over any
sheet. Change a sheet's numbers, mix two sheets, or write a new one: what matters is that the game ends up with
*one* written-down look that every asset follows.

## 1. Pick the style

- If the request names a style, match it to the table below. If it names none, offer two or three that suit the
  game's genre, camera and target device, each with one line on why, and ask the user (with a question tool if
  you have one). A reference screenshot beats any name: break it down with **art-direction** and use the
  closest sheet for the parts the reference does not show.
- Check the cost column against the weakest device the game ships on before promising a style.

| Style | 2D / 3D | Suits | Extra GPU cost | Sheet |
|---|---|---|---|---|
| **Lit vector** | 2D | arcade, platformers, puzzle, UI-heavy games | low | [lit-vector.md](references/lit-vector.md) |
| **Storybook gouache** | 2D | fantasy, adventure, cozy, narrative | low | [storybook.md](references/storybook.md) |
| **Comic halftone** | 2D | action, superheroes, humour, visual novels | low | [comic-halftone.md](references/comic-halftone.md) |
| **Watercolour** | 2D | calm exploration, nature, story games | low (baked) | [watercolour.md](references/watercolour.md) |
| **Neon** | 2D | racers, shooters, rhythm, arcade | low to medium (bloom) | [neon.md](references/neon.md) |
| **Pixel art** | 2D | RPGs, platformers, tactics, action | low | [pixel-art.md](references/pixel-art.md) |
| **Low-poly** | 3D | exploration, racing, builders, anything on weak hardware | low | [low-poly.md](references/low-poly.md) |
| **Toon / cel** | 3D | character-led action and adventure | low to medium (outlines) | [toon.md](references/toon.md) |
| **Claymation** | 3D | cozy, comedy, puzzle, small dioramas | medium (soft shadows, bump) | [claymation.md](references/claymation.md) |
| **Papercraft** | 3D | story games, puzzle, strategy on a tabletop | medium (soft shadows, blur) | [papercraft.md](references/papercraft.md) |
| **Voxel** | 3D | builders, sandboxes, roguelikes, tactics | low to medium (cube count) | [voxel.md](references/voxel.md) |
| **PS1-era retro** | 3D | horror, racing, platformers, nostalgia | low | [ps1-retro.md](references/ps1-retro.md) |

Looks that are a variant of a sheet, and where to find them:

| Look | Where |
|---|---|
| Ink wash, cozy hand-drawn, map paper | *Variants* in [storybook.md](references/storybook.md) |
| Flat (unlit) vector, clean modern | *Variants* in [lit-vector.md](references/lit-vector.md) |
| Vector CRT (one-colour line art) | *Variants* in [neon.md](references/neon.md) |
| Felt and knit, glossy toy plastic | *Variants* in [claymation.md](references/claymation.md) |
| Grim, horror, night, fog | a **mood**, not a style: section 4 |

## 2. Apply the sheet

1. **Read the whole sheet.** *Reads as* lists the three or four things that make the style recognisable: if the
   game has those, it is in the style; without them, no amount of detail gets it there.
2. **Write it down.** Copy the sheet's *STYLE.md block* into the game's `STYLE.md` (create it from
   `<skill-dir>/../model-asset/STYLE.template.md` if missing) and fill it in for this game: its palette, its
   light direction, its sizes. Set *Style* in `DESIGN.md`'s art direction to the style's name.
3. **Build one hero asset and one piece of scenery first**, with **model-asset**, following the sheet's
   *Characters and props*. Get those two right, with the user's yes, before making the rest.
4. **Then the whole frame**, with **art-direction**: background, UI as an object in the world, type, the
   finishing pass. The sheet's *Surface and finish* and *UI and type* say what those are in this style.
5. **Motion** follows the sheet's *Motion* (frame rates, what moves on twos, what wobbles), with **animate-asset**.
6. Render and compare in rounds, as art-direction and model-asset describe. Judge against the sheet's *Reads as*
   and *Pitfalls* as well as the reference.
7. Run the project's checks and finish the change the way its rules say.

Whatever the style, keep these true:

- The key art, the title screen and gameplay use the **same palette and the same hero object**, drawn from one
  art source.
- The player's character has the **most saturated colour** on screen; enemies and hazards have their own danger
  colour; the background is the darkest or the least saturated layer.
- Text has strong contrast with what is behind it; check it at the smallest size the game is shown at.
- The chosen style, its palette and its font are recorded in `DESIGN.md` and `STYLE.md`, so later changes stay
  on style.
- Fonts are bundled with the game under an open licence and credited; never linked from another site.

## 3. What every style needs: built forms

The fastest way to make any style look cheap is to build its subjects from bare primitives: an ellipse for a
body, a blob on a stick for a tree, a box with a triangle on top for a house. The style then has nothing to
work on. Before styling anything, build the subject properly, the way model-asset's
[forms.md](../model-asset/references/forms.md) describes:

- **Characters** have a shaped body (not a ball), limbs that taper, hands and feet, eyes with a pupil and a
  catchlight, and one accessory that says who they are.
- **Trees** have a trunk that flares at the root, branches, and foliage in several clusters that are each shaded.
- **Buildings** have a roof that overhangs and has thickness, trims, framed windows, a door with a frame and a
  step, and a base.
- **Every object** is three or more overlapping parts, has a darker trim or edge colour and one accent, and has
  visible thickness wherever something would be a flat sheet.

Each sheet's *Characters and props* then says how that style treats those forms: which details it keeps, which
it drops, and what it exaggerates.

Code suits what could be measured with a ruler and stylised figures made of simple forms, like the toolkit's
frog. A character with anatomy or folds of cloth starts from an artist's file or a generated mesh instead: see
**blender-models** and **character-models**.

## 4. Mixing, moods and new styles

- **Mixing.** One base style, and at most one accent borrowed from another (a comic's speech balloons over a
  toon 3D world; a paper-card UI over a low-poly game). Never mix two shading models on the same kind of object,
  and never two pixel scales on one screen.
- **A mood** changes palette, light and atmosphere and keeps the style's forms and line. *Grim / horror* on any
  sheet: pull saturation down to a third, keep one sickly or blood accent, let light exist only in pools (a
  window, a lantern around the hero), add fog between depth layers, a heavy vignette and more grain. *Night*,
  *sunset*, *underwater* and *dream* work the same way. Record the mood in `STYLE.md` next to the style.
- **A style that is not listed.** Write its sheet. Copy
  [_sheet-template.md](references/_sheet-template.md) into the conversation, fill every section from the user's
  references (never from one game's art: take principles, not copies), build the hero asset and one piece of
  scenery, and put the finished sheet's block in `STYLE.md`. If the style would help other games too and this
  skill's folder is yours to edit, add the sheet here and a row to the table above.
- **A deeper skill for one style.** [external.md](references/external.md) lists other people's skills that go
  further on one style. Mention a fitting one to the user once, as an option. Install nothing without their yes.

## In a web game: the lineup toolkit

`toolkit/` next to this file draws **one scene in every style**: a frog mail-courier, a tree, a cottage and a
mailbox. It is the worked example behind each sheet, and its builders are meant to be copied into a game.

| File | Gives you |
|---|---|
| `forms2d.js` | 2D shape builders that return outlines as point lists: `capsule()` (tapered limb), `paw()` (hand or foot with fingers), `unionOutline()` (foliage, clouds), `blob()`, `band()` (straps, trims), `archRect()`, `roundRect()`, `curve()` |
| `scene2d.js` | The scene as about 150 shapes and detail lines with roles, groups and parts, plus the base palette and how detail colours derive from main ones |
| `styles2d.js` | `flatVector()`, `storybook()`, `comic()`, `watercolour()`, `neon()`, `pixel()`: each draws the scene by its sheet's rules |
| `forms3d.js` | three.js builders: `loftGeo()` (a body from cross-sections), `limbGeo()` (tapered limb with rounded ends), `roundedBox()`, `lumpy()` (noise displacement) |
| `model3d.js` | The same scene as about 200 shaped parts for three.js, at four detail levels |
| `styles3d.js` | `lowPoly()`, `toon()`, `clay()`, `papercraft()`, `voxel()`, `ps1()` |
| `core.js` | Seeded random, value noise, hue-shifted colour ramps, grain, vignette, tilt-shift |
| `lineup.html`, `lineup.js` | The lineup page: `?only=clay,pixel`, or `?one=toon` for one style full size. Sets `document.title = 'ready'` |

- **See it.** Serve the toolkit folder (`cd <skill-dir>/toolkit && python3 -m http.server 8765`) and open
  `http://localhost:8765/lineup.html`. The six 2D styles need nothing else. The six 3D styles need three.js
  next to the page: `npm install three` in a copy of the folder, or point the import map in `lineup.html` at the
  game's own copy. To capture it, use model-asset's `scripts/shot.mjs` with `lineup.html?one=<style>`.
- **Use it.** Copy `forms2d.js` or `forms3d.js` (with `core.js`) into the game and build the game's own subjects
  with them. Read the style's function in `styles2d.js` or `styles3d.js` for the order of passes, then write
  the game's version against its own renderer. The scene files are examples to read, not assets to ship.
- **Everything is seeded.** No style calls an unseeded random, so a surface, a wobble or a jitter looks the same
  every run and never "boils" unless the sheet asks for it.
- **Bake.** Every 2D style here is drawn once and kept as an image. In a game, bake backgrounds and static props
  at load and draw only moving things per frame (art-direction, *Surface recipes*).
