# Comic halftone

A starting point, not a rulebook: the game's own references and `STYLE.md` win.

Printed comics: black ink, flat colour and dots. Loud and graphic, it suits action, humour and any game that
tells its story in panels.

## Reads as

- **Black ink lines that swell**, heavier on the side away from the light.
- **Flat colour** with no gradients.
- **Shade made of dots** that grow toward the dark side.
- **Print furniture:** a panel frame, a speech balloon, motion lines.

## Shapes and materials

Ink on paper. Shapes are bold and simplified; the line does the modelling. The paper can be off-white
(`#f4ecd6`) for an older print feel.

## Palette

Four to six flat, saturated colours plus black and white. Ink is a near-black (`#111` or `#1c1a20`). Example:
sky dots `#58c6ff` on `#e9f8ff`, grass `#58c04a`, hero `#5fd35a`, red `#ff2e2e`, yellow `#ffe14d`.

## Light and shading

One light. Shade is only ever **dots or a solid black shape**, never a gradient:

- Dots sit in offset rows. The pitch is about 0.6–1 % of the screen width, and at least 4 px on the smallest
  target or the dots turn to grey mush.
- Dot radius grows with darkness, from nothing at the mid-tone to about 0.42 of the pitch at the darkest edge.
- Where shade would be darker than about 40 % coverage, switch to solid black ("spotting").
- Skies and flat backdrops can use larger dots that shrink toward the horizon.

Gloss is a hard white shape, not a soft glow.

## Surface and finish

The dots are the surface. A panel border and gutters frame the view. Cost is low if dots are stamped from a
few pre-made tiles (one per radius step); drawing thousands of circles every frame is not.

## Characters and props

- **Line weights** as a share of the screen width: characters 0.7–0.9 %, props 0.4–0.55 %, details 0.3–0.4 %.
  A line that swells and tapers beats a constant one; the cheap version is drawing the silhouette twice, the
  second time offset down and away from the light.
- **Faces stay clean:** no dots on eyes, mouths, letters or other small features. Dots belong on big forms.
- **Keep every detail a line or a shape:** roof tiles, planks, bark and grass are ink strokes; windows get a
  hard glint.
- **Action is drawn:** motion lines behind a moving thing, small arcs beside a wave or a shake.

## Motion

Effects on twos (12 a second). Impact frames (a flash or an inverted frame for two frames, skipped when the
game's reduced-flash setting is on), speed lines and lettered sound effects. Decide whether dots stick to the
object or to the screen, and keep to it.

## UI and type

Panels with gutters, speech balloons with tails for dialogue, caption boxes for narration. Bold italic comic
capitals for lettering.

## Pitfalls

- Dots too small for the screen.
- Gradients creeping in.
- A constant, mechanical line.
- Dots on faces.
- Each object using its own dot grid at a different angle.

## Variants

- **Manga:** black and white only, screentone in two or three densities, heavy speed lines.
- **Pop art:** bigger dots, three colours and black, thick outlines.
- **Noir:** mostly black spotting with white rim shapes and one accent colour.

## STYLE.md block

```md
## Scene look: comic halftone
- **Reads as:** swelling black line, flat colour, dot shade, panel furniture
- **Materials:** ink and flat colour on <white | off-white> paper
- **Palette:** <4–6 flat colours>; ink <#hex>
- **Light:** <direction>; shade = dots from mid-tone, solid black past 40 %; hard white gloss
- **Finish:** dot pitch <px> (≥ 4 px on the smallest target); panel frame <px>
- **Line / edge:** characters <px>, props <px>, details <px>; heavier away from the light
- **Motion:** effects on twos; impact frames; dots stick to <object | screen>
```

## In a web game

`comic()` in `toolkit/styles2d.js`: silhouette strokes drawn twice with an offset, flat fill, then dots drawn
inside a clip of the shape with a radius taken from the position across the shape's bounds. In a game, build
the dots as a few repeating pattern tiles and fill with them.

Technique sources: ink and halftone approach from
[illodev/drawn-by-code](https://github.com/illodev/drawn-by-code) (`style-comic`); dot pitch and coverage from
[MengTo/Skills](https://github.com/MengTo/Skills) (`illustration-halftone-line`).
