---
name: art-direction
description: Give a game in any engine a cohesive, polished look across the whole screen, not one asset at a time, through a material vocabulary (paper and ink, painted gouache, neon glass…), value and palette structure, textured backgrounds, UI that looks like part of the world (parchment cards, brush-stroke headers, ink-blot prompts), a typography pairing, lighting and atmosphere, and one finishing pass that ties every layer together. Ships a JavaScript surface toolkit for canvas (texture.js), whose recipes are also described in words for other engines, and an OFL serif font. Use for "make it look like <screenshot>", "it looks flat / generic / like a tech demo", "make it prettier", "art pass", "polish the visuals", "the menus look plain", or the visual-polish milestone of a new game. Pairs with model-asset for individual assets.
---

# Art direction

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the APIs, the screen size, the performance budget, the checks and how to finish a change. `<skill-dir>` is the folder this file is in.

This is a craft skill: the method below holds in any engine. The bundled toolkit is JavaScript for canvas; a
project built with anything else takes the *surface recipes* (section 3) as descriptions and builds them with
its own textures, shaders or art tool.

The asset skills (model-asset, animate-asset) make one thing look right; this skill makes **the whole frame** look like one deliberate
world. Games that look striking in a screenshot nearly always win on four things, in this order:

1. **One material vocabulary.** Everything on screen is visibly *made of something*, and it's the same few
   things (paper + ink + paint; brushed metal + glass + neon; felt + wood + chalk). Flat default fills are
   what make a game look like a tech demo.
2. **Value and palette structure.** A clear lightest-to-darkest plan, a calm background, and **one hero
   colour** that contrasts with it (often its complement: a red cape on teal, an orange ship on navy).
3. **UI that belongs to the world.** Menus are objects in the setting (a torn parchment card, a carved plate,
   a hologram), not grey boxes. Typography is chosen: a display face plus a small-caps label style.
4. **Atmosphere and finish.** Light direction, shadows under things, depth (vignette, fog, parallax), and
   one overlay (grain, paper, scanlines) across *everything*, which glues the layers into one image.

Detail comes last; it never rescues a frame that fails these four.

## 0. Read the game and capture where it is

- `DESIGN.md` (fun targets, art direction, palette) and `STYLE.md` if there is one.
- Capture the screens that matter at play size, the way model-asset's *Render and compare* says: title, gameplay
  after ~20 s, pause, game over, any custom screen, at the resolution of each target the game ships on. Use the
  engine's screenshot or headless render if the project has one, a screenshot from the project's checks, or ask
  the user for screenshots. Captures go to the scratchpad, never the repo.

## 1. Get a reference and break it down

Ask the user for screenshots of the look they want (another game, a trailer frame, concept art). They're
for looking at in the conversation only: **never commit them**, and never copy another game's art, logo or
characters. Take its *principles*. Write a look breakdown:

| Question | Example (a storybook RPG character screen) |
|---|---|
| What is everything made of? | painted gouache background, parchment card, ink brush strokes, cloth on the character |
| Values: lightest / darkest, where? | lightest = parchment and white tunic (the focus); darkest = ink; background mid-dark |
| Palette: background, hero colour, accents | teal wash; one red (cape, selected row); ochre pattern; ink black |
| Surface scale | big soft brush dabs on the background, fine grain on paper, fibres only up close |
| Pattern / culture | large faded stepped-fret motif: says "world" without competing |
| Type | elegant serif display ("Make your hunter"); tiny letter-spaced small caps for labels |
| UI as object | torn-edge card with drop shadow; brush-stroke header bar; ink-blot button prompts |
| Light and framing | soft top-left key light; character fills the left half, menu the right |

Then write the game's **Scene look** into `STYLE.md` (create it from
`<skill-dir>/../model-asset/STYLE.template.md` if missing). Add this section under *Look*:

```md
## Scene look
- **Materials:** <the 2–4 things everything is made of>
- **Values:** <lightest = …, darkest = …, background sits at …>
- **Hero colour:** <#hex> on <background #hex>; used only for <player, selection, goals>
- **Surfaces:** <wash / paper / grain settings, seeds>; overlay <grain at 0.18 overlay>
- **Type:** display <font, size>, labels <font, small caps, tracking>, body <font>
- **UI objects:** <panel = torn paper card, header = brush stroke, prompt = ink blot>
- **Light:** <direction, warm/cool, shadow colour>
```

## 2. Make the big moves, in order of impact

Change one layer at a time and re-capture the same screens after each.

1. **Palette and values.** Re-map existing colours to the plan. **Squint test:** blur the screenshot (a blur
   radius of about 1/160 of its width, 8 px at 1280) and desaturate it, or view it at 25 %; the player and the selected menu
   item should be the first things you see.
2. **Background surface.** Replace flat fills with a baked surface from section 3 (a painted wash, paper), a
   motif stamped at low alpha (0.25–0.35) for culture, and a vignette.
3. **UI as an object.** Panels become the world's material (a torn paper card with a drop shadow, a carved
   plate), headers sit on a brush stroke, button prompts on an ink blot. Keep the game's menu system for
   behaviour and restyle its items, with the selection in the hero colour. Prompts still come from the game's
   input-prompt helper, never literal key names.
4. **Typography.** A display face (see *Fonts*), small caps with letter spacing for labels, italics for flavour
   lines. Smallest text as a share of the screen's short side, times the game's text-size setting, as a starting
   point when the project's rules give no number: a phone held in the hand ≈ 4 %, a handheld ≈ 3 % (24 px at
   800 high), a TV across the room ≈ 3 %, a desktop window ≈ 2 %.
5. **Light and depth.** 2D: one light direction in every asset's shading, a soft ground shadow under
   characters, parallax background layers, ambient particles (dust, leaves, embers) at low count. 3D: toon or
   painted shading with coloured shadows and a rim light, plus fog in the haze colour.
6. **Finish.** One tileable grain texture over the whole frame, 3D view and HUD included, blended as an
   overlay at ~0.12–0.2 opacity.
7. **Motion.** UI eases in (150–300 ms, ease-out or a small overshoot), idle characters breathe, selected
   rows nudge. A still frame should look good; a moving one should feel alive.

## 3. Surface recipes

Each is a texture made once (at load, or ahead of time in an art tool) and drawn as an image after that. Seed
all randomness so a surface looks the same every run. The names are the ones the toolkit and the look table use.

| Recipe | How it is built |
|---|---|
| **wash** (gouache, watercolour) | 2–4 palette tones, darkest to lightest, pushed around by low-frequency noise; a few hundred soft, visible brush dabs about 5 % of the screen wide; fine grain on top |
| **paper** (parchment, sketchbook) | base colour; low-frequency mottling toward a darker tone (~18 %); around a hundred thin fibres; fine grain; darker toward the edges |
| **paper card** | paper clipped to a rectangle with a rough, torn edge (inset up to ~5 px, new offset every ~7 px), over a soft dark drop shadow |
| **brush stroke** | 20–30 thin bristle lines along a path, ends tapered over the first and last quarter, about a third of the bristles broken by gaps (dry brush) |
| **ink blot** | a solid blob whose radius wobbles ~18 %, plus about 5 splatter dots |
| **stamp** | one motif repeated on a grid with ~8 % position jitter, opacity 0.25–0.35, some copies faded: large, few and faint |
| **vignette** | radial darkening from 55 % of the radius outward, strength ~0.45 |
| **grain** | a 256 px tileable noise tile for the finishing overlay |

Bake fine-detail surfaces at twice the logical size on high-density screens; a full-screen wash can stay at 1×
(it is soft anyway). Per frame, only draw the baked images, text, moving things and the one grain overlay.

### Optional: painted surfaces with the user's own image key

If the project has an image-generation tool and the user has set a key for it, painted
backgrounds, terrain textures, key art and detailed props can also be generated, with the Scene look as
the style prompt. Follow the tool's cost rules: never spend the user's money without a yes. Tell
the user the cost first and wait for them to agree, then generate 2–3, look at the results,
tell them the cost of the rest and ask again before generating it. Bake them like any surface and keep
the recipe versions as fallbacks. With no key, skip this; the recipes alone reach the target quality.

## Fonts

`toolkit/fonts/` has **EB Garamond** (400, 600, 400 italic; latin; SIL OFL, licence in `OFL.txt`) as `.woff2`:
the storybook / literary / fantasy serif. An engine that can't read `.woff2` takes the TTF or OTF of the same
font from its own project instead. Credit it in the game's credits file ("EB Garamond, The EB Garamond Project
Authors, SIL OFL 1.1"), bundle only the weights used, and make sure the font is loaded before the first text
is drawn. Pick by mood: serif for fantasy and storybook, a geometric sans for sci-fi and UI-heavy games, a
rounded display face for cozy and kids' games. If the project's key art can only use certain fonts, pick the
closest one there for the title.

## Look recipes

Starting points for any genre (fantasy, sci-fi, modern, abstract); the game's references always win. Record the one you pick in STYLE.md and adapt it. More presets (pixel art, neon, low-poly…)
are in [art-directions.md](references/art-directions.md).

| Look | Materials | Palette idea | Built from |
|---|---|---|---|
| **Storybook paper & ink** (fantasy RPG, adventure) | gouache wash, parchment, ink, cloth | teal or sage wash, one red/vermilion hero colour, ochre pattern, ink black | wash + stamped fret motif + paper card + brush stroke + ink blot, a literary serif, grain overlay |
| **Painted gouache** (cozy, exploration) | thick paint, soft light | warm mid-tones, a saturated complementary accent | wash for sky and ground layers, soft dab-shaded assets, vignette |
| **Ink wash / sumi-e** (action, samurai, mythic) | rice paper, black ink, one red seal | paper `#efe9dc`, ink, a single red | paper, brush strokes for terrain and slashes, red ink-blot seals for UI |
| **Cartographer** (strategy, tactics, exploration) | map paper, ink lines, wax seals | parchment, faded blue water, red routes | paper full screen, brush-stroke routes, stamps for hatching or forests, paper-card panels |
| **Neon / synthwave** (racers, shooters, rhythm) | glass, chrome, light | near-black, two hot complementary neons | city or grid backdrop layers (**environments**), glow drawn twice (wide translucent + thin bright), scanline or grain overlay |
| **Lit vector** (arcade, space, shooters) | enamel shapes, ink edges, nebula or sky | dark cool backdrop, one saturated hero colour, one glowing accent | three-tone shading from one light, ink edge, baked additive glow, wash-style backdrop, vignette |
| **Clean modern** (puzzle, sports, casual, UI-heavy) | flat surfaces, soft shadows | one brand colour + neutrals | flat fills, generous spacing, one soft drop shadow, a geometric sans |
| **Grim / horror** (survival, roguelike, mystery) | stone, rust, fog | desaturated darks, one sickly or blood accent | heavy vignette, fog haze, grain overlay, light pools as the only bright areas |
| **Pixel art** (RPG, action, tactics, platformers) | pixels on a fixed grid, hue-shifted ramps | per the game's pixel spec | the **pixel-art** skill (characters, animations, tiles, UI) |
| **Anime toon 3D** (character-led 3D games) | cel-shaded skin and cloth, painted sky | soft sky, coloured shadows, one hero colour | stepped shading with coloured shadows, rim light and outlines, a wash or painted-sky backdrop, the storybook UI above |

## 4. Render and compare, in rounds

Same as model-asset, but for whole screens:
1. Capture the same screens as the reference **and** your *before* shots, at the game's real resolution on each
   target (and at 2× pixel density where a target has it).
2. List the **top 5 differences**, biggest first: values > palette > surfaces > UI objects > type > detail.
3. Fix, re-capture, repeat (3–5 rounds is normal). Show the user before / after with the reference.
4. Check readability at play: gameplay must still be readable at a glance. Textures sit *behind* the play
   layer at low contrast, and the danger / pickup / player colours from STYLE.md stay distinct.

## 5. Finish

- Match the project's key art (store image, icon, title art) to the new look, drawn from the same art source.
- Measure frame time on gameplay with the overlay on (**performance-pass** if it drops below the target frame
  rate on the weakest target).
- Add a Changelog line to DESIGN.md and update STYLE.md's Scene look.
- Run the project's checks (look at any screenshot they produce) and finish the change the way its rules say.

## Lessons so far

- A single grain overlay across every layer does more for "one world" than any individual asset change.
- Patterns read as culture only when large, few and faded (alpha 0.25–0.35); small, busy patterns read as noise.
- Small caps with letter spacing instantly make a menu look designed; keep them at the minimum text size or above.
- Coloured shadows (warm skin → rosy shadow, white cloth → blue-violet shadow) beat grey shadows every time.
- A dark ink edge (the darkest palette colour, 2–4 px, filled before the colours) separates every sprite from
  any textured background and survives scaling down; a 1 px highlight on the edges facing the light finishes it.
- Things that rotate keep the world's light: draw the surface rotated, then the shading unrotated, clipped to
  the same outline.
- Keep one art source that the game, its key art and a contact sheet of every asset all draw from, so the art
  outside the game can't drift from the game (HUD icons rendered from the game's own models, for the same reason).

## In a web game: the JavaScript canvas toolkit

In `toolkit/` next to this file: `texture.js` implements every recipe in section 3 for canvas 2D. Copy it (and
the fonts you use) into the game folder (next to its main script, or `src/` in a bundled game). If the game
already has its own versions, extend those.

| Export | What it gives you |
|---|---|
| `surface(w, h, scale)` | offscreen canvas at 2× with ctx pre-scaled, `.draw(ctx, x, y)` |
| `wash(w, h, { colors, dabs, dabSize, seed })` | painted gouache / watercolour background |
| `paper(w, h, { color, dark, mottle, grain, fibres, edge })` | parchment / sketchbook surface |
| `paperCard(w, h, { pad, rough, … })` | torn-edge paper card with baked drop shadow (draw at x − pad, y − pad) |
| `brush(ctx, pts, { width, color, dry })` | dry-brush ink stroke (headers, underlines, slashes, map routes) |
| `inkBlot(ctx, cx, cy, rx, ry)` | ink blob with splatter (prompt backings, icons, stamps) |
| `stamp(ctx, w, h, motif, { cell, alpha, fade })` + `fret` | printed / painted repeating motif |
| `tornRect()`, `blot()` | the paths behind the above, for your own shapes and clipping |
| `vignette()`, `grainTile()` | depth and the finishing overlay |
| `noise2()`, `perPixel()`, `seeded()`, `mix()` | building blocks for your own surfaces (wood, stone, metal, cloth) |

- `demo.html` / `demo.js` is a reference screen built only from these (a storybook character select). Serve the
  folder (`cd <skill-dir>/toolkit && python3 -m http.server 8765`) and screenshot
  `http://localhost:8765/demo.html?t=2` (add `&scale=2` for DPR 2) with Playwright to see the target quality.
- **Capture:** `node <skill-dir>/../model-asset/scripts/shot.mjs <game-dir> <scratch>/before "index.html|title.png" "index.html|play.png|keys=Enter|wait=20000"`
  from the project root (`<game-dir>` is the game's folder, `.` for a game at the root).
- **Performance:** every `wash`, `paper`, `paperCard`, `stamp` and `brush` call is a bake: do it at startup or
  when content resizes, never per frame (`perPixel` touches every pixel). Per frame, blit the baked canvases and
  draw one grain `fillRect`. Bake at `scale: 2` for fine detail so it stays crisp at DPR 2.
- **Finish overlay:** a `grainTile()` pattern with `globalCompositeOperation = 'overlay'` at 0.12–0.2 alpha (on
  the HUD canvas in a three.js game, so it covers the 3D view too). Labels use `ctx.letterSpacing`.
- **Fonts:** copy the `.woff2` files to `assets/fonts/`, load with `new FontFace(...)` and wait for it before the
  first text draw (`demo.js` → `fonts()` shows how). Other OFL fonts: `npm pack @fontsource/<font>` and copy only
  the `latin` `.woff2` weights you use.
- **Related stack skills:** canvas2d-assets (`soft` shading for dab-shaded assets), the environments toolkit's
  `backdrop.js` (city and grid layers), and for three.js **character-models** (`toon.js`, a `wash()` canvas as
  the scene background).
