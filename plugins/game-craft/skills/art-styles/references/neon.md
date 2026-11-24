# Neon

A starting point, not a rulebook: the game's own references and `STYLE.md` win.

Light on darkness: glowing lines, hot colours, a hum of bloom. It suits racers, shooters, rhythm and arcade
games, and anything set at night.

## Reads as

- A **near-black world**.
- **Lines of light**, each drawn as a wide faint glow and a thin bright core.
- **Two or three hot hues**, with white only at the hottest points.
- **Bloom and scanlines** over the whole frame.

## Shapes and materials

Glass, chrome and light. Objects are outlines with dark fills, so nearer objects hide the lines of farther
ones. A faint tint inside each shape, fading downward, makes it read as lit glass and not as wire.

## Palette

Background `#07000f` to `#2a0838`. Hues: magenta `#ff2bd6`, cyan `#00f0ff`, yellow `#fff200`, green `#39ff88`,
orange `#ff8a00`. Give each family of objects one hue (the hero one, hazards another, scenery a third) so the
colour itself is information.

## Light and shading

There is no shading; the line is the light. Draw every line twice or three times: a wide pass at about four to
five times the core width and 20–25 % strength, the bright core, and optionally a near-white centre. Add the
passes together (additive blending). Real light sources (windows, eyes, screens, signs) are filled, glowing
shapes.

## Surface and finish

- **Bloom:** a blurred copy of the frame added back at about 45 %; the blur is about 1 % of the screen width.
- **Scanlines:** one dark line in every three, at about 22 %.
- **Floor:** a perspective grid; a striped sun or a gradient sky behind.

Cost: a blur per glowing object per frame is expensive on an integrated GPU. Draw the two-pass line (cheap), or
bake each object's glow into a sprite, and run bloom once at half resolution. The fallback is no bloom at all:
the two-pass lines still read as neon.

## Characters and props

- **Drop the small stuff:** spots, pebbles, tiny flowers and mortar lines turn into a blob of glow. Keep the
  silhouette and three to five inner lines per object.
- **Leave gaps:** two lines closer than about three core widths merge into one glow.
- **Eyes and windows are lit shapes**, the brightest things on the character and the building.
- **The built form still matters:** a neon outline of a ball is a circle; limbs, fingers, a roof overhang and
  window frames are what make the outline worth looking at.

## Motion

Trails behind fast things, pulses on the beat, a rare flicker (never constant, and off when reduced flash is
on). Lines can draw themselves on as an object appears.

## UI and type

Thin-line frames with a glow, all capitals, a technical or geometric face.

## Pitfalls

- A grey or blue background that is not dark enough.
- Too many hues.
- Filled bright shapes everywhere: that is flat vector with a dark theme.
- A blur on every object every frame.
- Detail lines too close together.

## Variants

- **Vector CRT:** one phosphor colour (green, amber or white), line art only, heavier bloom, a dark vignette, a
  slight flicker. Old arcade vector displays.
- **Synthwave:** gradient sky, striped sun, grid floor, magenta and cyan.
- **Night city:** dark painted shapes with only signs and windows lit.

## STYLE.md block

```md
## Scene look: neon
- **Reads as:** near-black world, two-pass glowing lines, <2–3> hot hues, bloom and scanlines
- **Materials:** glass and light; dark fills hide lines behind
- **Palette:** background <#hex>; hero <#hex>, hazards <#hex>, scenery <#hex>
- **Light:** the line is the light; lit shapes for <windows, eyes, signs>
- **Finish:** bloom <strength, blur> at half resolution; scanlines <1 in 3 at 22 %>
- **Line / edge:** core <px>, glow <4–5×> at 20–25 %; gap ≥ 3 core widths
- **Motion:** trails, pulses; flicker rare and off with reduced flash
```

## In a web game

`neon()` in `toolkit/styles2d.js`: each shape is filled dark, tinted through a clip, then stroked wide and thin
with `globalCompositeOperation = 'lighter'`; bloom is the canvas drawn onto itself through a blur filter. Avoid
`shadowBlur` per object per frame; bake glows with the canvas2d-assets toolkit's `bake()`.

Technique sources: multi-pass glow as in [web.dev's canvas text effects](https://web.dev/articles/canvas-texteffects).
