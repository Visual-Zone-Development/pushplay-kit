# Lit vector

A starting point, not a rulebook: the game's own references and `STYLE.md` win.

Clean shapes with a confident ink line and simple light. The workhorse 2D style: cheap to draw, readable at any
size, and it suits almost any genre.

## Reads as

- A **heavy line around each whole object** and thinner lines inside it.
- **Three tones** on every form, from one light that never moves.
- A **pale edge on the lit side** of each form.
- Flat, calm backgrounds that sit behind the play layer.

## Shapes and materials

Everything is a smooth enamel shape. Shape language carries meaning: round for friendly, angular for dangerous,
square for sturdy. Detail is one line's worth: a mouth, a row of roof tiles, three planks on a door. Texture is
left out.

## Palette

Four to six hues plus an ink colour and white. The ink is the darkest palette colour (a navy such as `#15183a`),
never pure black. The hero has the most saturated colour on screen; the background has the least contrast.
Example: sky `#3aa8f0`, ground `#4bb56c`, hero `#62d35a`, accent `#ff4f5e`, warm `#ffd38a`, ink `#15183a`.

## Light and shading

One light, usually top-left, for every asset and every frame. Each colour becomes a ramp of three: the base, a
light step (about 13 % lighter, hue pulled about 10° toward yellow) and a dark step (about 15 % darker, hue
pulled about 14° toward blue-violet). Never darken with grey or black. The tones can blend as a gradient across
the form or sit as hard bands; pick one for the game. Add a lit edge: a half-transparent white line, one inner
line wide, just inside the side facing the light. Round, wet or shiny forms get one soft gloss spot at 20–25 %
white, up and toward the light.

## Surface and finish

None needed. A sky gradient, and one lighter rim along the top of each ground layer so the layers separate.
There is no runtime cost beyond drawing the shapes.

## Characters and props

- **Line weight.** The inner line is about 0.6 % of the screen's short side (2.4 px at 400). The silhouette line
  around the whole object is 2.5 to 3 times that. Draw the silhouette line first for the whole object, then the
  parts on top, so parts of one colour do not show seams where they join.
- **What gets no outline:** pupils, catchlights, cheeks, spots, buttons, flowers. Outlining tiny things turns
  them into dots of ink.
- **Detail lines** (mouth, bark, tile rows, planks, window bars) are strokes: ink colour on the character, a
  dark version of the local colour on scenery so the hero stays the strongest read.
- **Smallest feature** that still reads is about 1 % of the short side. Make key features bigger than feels right.

## Motion

Squash and stretch, eases of 150–300 ms, a small overshoot on arrivals. Keep the line the same width when an
object scales: scale the shape, not the stroke.

## UI and type

Flat panels with the same ink line and one solid offset shadow. A rounded geometric sans for text and a heavier
display cut for titles.

## Pitfalls

- One line weight everywhere: it reads as clip art.
- Grey or black shading.
- Outlines on every tiny detail.
- A busy, high-contrast background competing with the play layer.
- Light direction changing between assets.

## Variants

- **Flat vector:** no shading and no inner lines; two tones at most; silhouettes do all the work. For minimal
  arcade and puzzle games.
- **Clean modern:** no outlines at all, one brand colour plus neutrals, one soft drop shadow, generous spacing.
  For puzzle, sports and UI-heavy games.
- **Bold pop:** a thicker outline and a solid extrusion stepped down and to the right of every shape.

## STYLE.md block

```md
## Scene look: lit vector
- **Reads as:** heavy silhouette line, thin inner lines, three tones from a top-left light, lit edge
- **Materials:** smooth enamel shapes; no texture
- **Palette:** <4–6 hues>; ink <#hex>, never black; hero colour <#hex>
- **Light:** top-left; ramps hue-shift warm in light, blue-violet in shade; <gradient | hard bands>
- **Finish:** none; sky gradient, lighter rim on ground layers
- **Line / edge:** inner <px>, silhouette <px> (2.5–3×); no outline on <tiny details>
- **Motion:** squash and stretch, 150–300 ms eases
```

## In a web game

`flatVector()` in `toolkit/styles2d.js`. Its passes, per object: stroke every part with the silhouette width;
then per part stroke the inner line, fill with the lit gradient (`ramp()` in `core.js` makes the three tones),
clip to the part and stroke a white line offset toward the shade side to leave the lit edge. The
[canvas2d-assets](../../canvas2d-assets/SKILL.md) toolkit's `createStyle()` and `shape()` do the same job for a
game's own assets.

Technique sources: line-weight hierarchy and shared outlines from
[MengTo/Skills](https://github.com/MengTo/Skills) (`illustration-outlined-cartoon`, `illustration-flat`, `illustration-bold-pop`).
