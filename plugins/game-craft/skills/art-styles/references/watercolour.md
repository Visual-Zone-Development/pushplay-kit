# Watercolour

A starting point, not a rulebook: the game's own references and `STYLE.md` win.

Transparent paint on white paper. Soft and luminous, it suits calm exploration, nature and story games.

## Reads as

- **White paper showing** through and between the paint.
- **Soft, uneven edges**: no two edges of a wash are alike.
- **Pigment pooling** darker at the rim of a wash.
- A **loose pencil line** that does not quite follow the paint.

## Shapes and materials

Paint, water, paper and pencil. Shapes are simple and a little blurry; the eye fills in the rest. Only the
focal features (eyes, a letter, a door knob) stay crisp.

## Palette

Five to seven transparent pigments, kept light. Darks come from layering, never from black. Shadows lean
violet. Example: sky `#7cb8e0`, leaf `#5a9e56`, grass `#86b86a`, roof `#d0654c`, hero `#7cc35a`, paper `#fbf8f1`.

## Light and shading

Light is the paper. Paint **around** shapes: keep white paper under every foreground shape, then lay its wash.
A second, violet-leaning glaze in the lower far side of each form gives it weight. Highlights are bare paper.

## Surface and finish

Each wash is **many faint, differently deformed copies of the outline**, laid over each other:

1. Deform the outline once: split each edge at its midpoint and push the new point by a random amount (about
   2 % of the shape's size), then again at half that amount.
2. Draw 16 to 30 copies, each deformed again (2–5 % of the shape's size), each at 4–9 % opacity, darkening
   whatever is under them.
3. Add a thin, slightly blurred darker line along the edge (about 40 %) for the pooled rim.

Then paper texture under everything, sparse dark speckles for granulation, and the pencil line last. All of it
is baked into images; the game pays nothing per frame. Baking is the cost: budget it at load, a few assets a
frame.

## Characters and props

- **Soft where it can be, sharp where it matters.** Big forms get the full layered wash. Small, important
  details (pupils, catchlights, buttons) get three or four undeformed layers so they stay crisp.
- **Details become marks:** roof tiles, planks and bark are single darker strokes; foliage is overlapping
  washes that mix where they cross.
- **Pencil:** a thin grey line at about 40 % opacity with a small wobble, drawn over the paint.
- **A character still needs its built form** (limbs, hands, eyes): softness hides texture, not structure.

## Motion

Bake each frame's wash once. Re-rolling the deformation every frame makes the whole screen boil; if a
hand-painted shimmer is wanted, re-roll at 6–8 times a second and stop when reduced motion is on.

## UI and type

Paper cards with a deckled edge, a brushed label, a handwritten or humanist face.

## Pitfalls

- Opaque fills.
- Clean, hard edges everywhere.
- A black outline.
- Mud: many glazes of opposing colours over each other.
- A tinted background where white paper should be.

## Variants

- **Ink and wash:** a confident ink line, fewer and paler layers.
- **Wet on wet:** more blur, and neighbouring shapes bleed into each other.
- **Monochrome wash:** one pigment at several strengths.

## STYLE.md block

```md
## Scene look: watercolour
- **Reads as:** white paper, soft uneven washes, pooled rims, loose pencil
- **Materials:** transparent paint, paper, pencil
- **Palette:** <5–7 pigments>, light; shadows violet; paper <#hex>
- **Light:** paper is the light; paint around shapes; violet glaze on the far side
- **Finish:** <16–30> layers at <4–9 %> per wash; rim line 40 %; granulation; baked
- **Line / edge:** pencil at 40 %, loose
- **Motion:** <no boil | boil at 6–8 per second>
```

## In a web game

`watercolour()` and `deform()` in `toolkit/styles2d.js`. Each layer is a polygon fill with
`globalCompositeOperation = 'multiply'`; the rim uses a blurred stroke. Bake every asset to its own canvas
(the canvas2d-assets toolkit's `bake()`), never per frame.

Technique sources: layered deformed polygons after
[Tyler Hobbs](https://www.tylerxhobbs.com/words/a-guide-to-simulating-watercolor-paint-with-generative-art) and
[sighack](https://sighack.com/post/generative-watercolor-in-processing).
