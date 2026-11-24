# Storybook gouache

A starting point, not a rulebook: the game's own references and `STYLE.md` win.

Painted illustration on paper, with an ink line: the look of a picture book. Warm, tactile and forgiving, it
suits fantasy, adventure and anything cozy or narrative.

## Reads as

- A **painted wash** with visible brush dabs behind everything.
- **Paper grain inside every shape**, not only in the background.
- A **wobbly ink line** that changes width as it goes.
- **One hero colour** (often a red) used only where the player should look.

## Shapes and materials

Gouache, paper and ink, plus cloth on characters. Shapes are soft and rounded; edges are a little uneven (a
wobble of about 0.2 % of the screen's short side). Detail is drawn with the ink line, not modelled.

## Palette

Muted earths and greens at a saturation of about 0.3–0.5, a teal or sage wash for sky, and one vermilion that
appears only on the hero, the selection and goals. Ink is a warm near-black (`#2a2018`); paper is cream
(`#f3e7cc`). Example: wash `#4e8c8a` → `#a9cdb9` → `#e8dcb5`, ground `#9fae6a`, hero `#89b05a`, red `#c8372d`.

## Light and shading

Every rounded form gets an **off-centre radial gradient**: its centre 44 % across and 32 % down the form, its
radius about three quarters of the form's larger side, running light → base at 0.5 → dark at 0.82 → darkest at
the rim. On top, short dabs of a second tone: lighter dabs on the lit half, darker on the far half, at about
16 % opacity. Shadows are warm brown, never grey.

## Surface and finish

- **Wash:** two to four tones pushed around by low-frequency noise, with a few hundred soft dabs.
- **Paper:** a paper texture multiplied into each painted shape at about 35 %.
- **Finish:** one grain overlay over the whole frame at about 0.18, and a warm vignette at about 0.4.

All of it is baked once; per frame the game draws images. art-direction's *Surface recipes* describe each.

## Characters and props

- **Line:** the silhouette of each object gets a heavier ink line (about 1.5 times the inner line), drawn as two
  jittered passes whose width varies from about half to one and a half times the nominal width. Inner lines are
  thinner. Tile rows, planks, bark and grass are single ink strokes.
- **Eyes:** a cream ring; a pupil shifted toward what the character looks at by about a fifth of the eye's
  radius; one catchlight and a small second dot opposite it.
- **Proportions:** a head as wide as the body or wider; blush at about 60 % opacity; small hands and feet with
  the fingers suggested, not counted.
- **Scenery:** foliage as overlapping clusters, each with its own gradient; buildings slightly crooked.

## Motion

Lines must not shimmer by accident: give every asset a fixed seed so its wobble is the same each frame. Idle
characters breathe; UI eases in with a small overshoot. For a hand-animated feel, re-roll the wobble on purpose
at 6–8 times a second, and stop it when the game's reduced-motion setting is on.

## UI and type

Menus are objects from the same desk: a torn-edge parchment card, a brush-stroke header, an ink blot behind a
button prompt. A literary serif for titles, small caps with letter spacing for labels.

## Pitfalls

- Clean, perfect vector edges.
- Grey shadows.
- The hero colour used on scenery.
- Paper texture on the background only, so characters look pasted on.
- A line of constant width.

## Variants

- **Ink wash:** paper and black ink only. Tone is ink diluted with water: far ground at 0.15–0.2 strength,
  middle ground 0.35–0.4, figures 0.85–1. Contours are broken, dry-brush strokes, never a continuous wire. Leave
  most of the paper empty. One vermilion, reserved for the subject or a seal.
- **Cozy hand-drawn:** warm pastels, a brown line with more wobble, soft violet-brown drop shadows under
  everything, flowers and tufts in the grass, a rounded display face.
- **Map paper:** parchment, ink line art with hatching on the shaded side, colour only as faint washes
  (15–40 %), a dashed red route, hand-lettered italic labels. For strategy maps and world screens.

## STYLE.md block

```md
## Scene look: storybook gouache
- **Reads as:** painted wash, paper grain in every shape, wobbly ink line, one red
- **Materials:** gouache, paper, ink, cloth
- **Palette:** muted <hues>; wash <#hex → #hex>; hero colour <#hex> only on <hero, selection, goals>; ink <#hex>
- **Light:** off-centre radial gradient per form (centre 44 % / 32 %); warm brown shadows; dabs at 16 %
- **Finish:** paper multiplied at 35 %; grain overlay 0.18; warm vignette 0.4
- **Line / edge:** ink, silhouette 1.5× inner, width varies 0.5–1.5×; seeded wobble
- **Motion:** breathing idles; UI eases with overshoot; <no boil | boil at 6–8 per second>
```

## In a web game

`storybook()` in `toolkit/styles2d.js`: the wash is built per pixel once, each shape is filled with `gouache()`
(the radial gradient), dabbed, then the paper canvas is drawn over it with `globalCompositeOperation =
'multiply'`, then `inkLine()` strokes it. The art-direction toolkit's `texture.js` has production versions of
the surfaces (`wash()`, `paper()`, `paperCard()`, `brush()`, `inkBlot()`, `grainTile()`).

Technique sources: form gradient, eyes and proportions from [MengTo/Skills](https://github.com/MengTo/Skills)
(`illustration-grainy-gouache`); ink-wash rules from [illodev/drawn-by-code](https://github.com/illodev/drawn-by-code) (`style-sumi-e`).
