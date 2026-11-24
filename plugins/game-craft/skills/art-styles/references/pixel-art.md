# Pixel art

A starting point, not a rulebook: the game's own references and `STYLE.md` win.

Art made of visible, deliberate pixels. This sheet is the short version; the
[pixel-art skill](../../pixel-art/SKILL.md) is the full method, with a toolkit that renders characters in every
direction and frame.

## Reads as

- **One pixel grid**, scaled up by a whole number with no smoothing.
- **Hue-shifted ramps:** shadows lean blue-violet, highlights lean yellow.
- **A selective outline:** dark only where an object meets what is behind it.
- **Clusters, not noise:** every pixel belongs to a shape.

## Shapes and materials

Pixels on a fixed grid. Decide one spec for the whole game (native resolution, view, tile and character size,
light, outline, shading steps, palette) and never vary it per asset.

## Palette

At most about 32 colours for the game. Every material is a ramp of three to five steps; reuse ramps across
assets. The darkest step is for lines. Example leaf ramp from shadow to light: `#193c3e` → `#a5de5f`.

## Light and shading

Top-left, fixed to the screen. Three or four steps per material; never darken with black. Glass is the darkest
value on a wall.

## Surface and finish

No filters. Ground is mostly one calm tone with sparse tufts: **every mark needs a cause** (a siding line, a
streak under a sill, a tuft), never filler noise. Whole-number scaling only.

## Characters and props

- **Character:** the silhouette must read when filled solid black; leave 1–3 px between an arm and the body.
  Cute proportions put the head as wide as the body or wider, with no neck. Eyes by head height: a 16 px head
  takes a 2×2 eye, 24 px takes 3×3, 32 px takes 5×4. One catchlight pixel at the upper left of the pupil, the
  same in both eyes; a pupil one pixel off centre avoids a dead stare. One accessory anchors the design.
- **Tree:** the crown is three to five bundles, each shaded once (rim, body, shade), lighter at the top-left;
  8–10 highlight patches; edges notched by 1–3 px; one or two gaps showing sky. The trunk has bark stripes, a
  root flare and a ground shadow.
- **Building:** volumes first, then a roof slightly larger than the body, then openings, light and texture.
  Shingle rows offset by half a shingle; a one-pixel overhang; a two-row eave shadow on the wall. A window has
  a frame, panes, a sill one pixel wider with a shadow row under it, and a glint on two of four panes. A door
  has a frame, planks, a handle and a step, and is at least three quarters of the character's height.

## Motion

Few, held frames: 4–8 per cycle. Positions snap to whole pixels. Rotation and scaling are drawn as frames, not
done by the engine.

## UI and type

Pixel panels, buttons and bars on the same grid and light; a pixel font at whole multiples of its design size.

## Pitfalls

- Mixed pixel sizes on one screen.
- Smoothing or fractional scaling.
- Pillow shading (dark at every edge, light in the middle).
- Black outlines on tiles and backgrounds.
- Noise used as texture.

## Variants

- **1-bit:** two colours; ordered dithering for every value; outlines carry the shapes.
- **HD pixel art:** 96–128 px figures with five-step ramps and anti-aliased curves.
- **8-bit:** 16 px tiles, 16 colours or fewer, three colours per sprite.

## STYLE.md block

Use the *Pixel spec* block from the pixel-art skill; add:

```md
## Scene look: pixel art
- **Reads as:** one grid at ×<n>, hue-shifted ramps, selective outline, clusters
- **Finish:** none; calm ground, sparse tufts; whole-number scaling
- **Line / edge:** selective, darkest ramp step; one step lighter on the lit side
```

## In a web game

`pixel()` in `toolkit/styles2d.js` is a small demonstration: it rasterises the scene's shapes at 320×200 into a
map of shape ids, colours each pixel from a three-step ramp by its position in the shape, and outlines only
where an object meets something behind it. For real assets use the pixel-art skill's `pixelforge.js`.

Technique sources: character, tree and building rules from
[with-pebbly/aseprite-ai-artist](https://github.com/with-pebbly/aseprite-ai-artist); "no filler noise" from
[crsolver/claude-pxl](https://github.com/crsolver/claude-pxl).
