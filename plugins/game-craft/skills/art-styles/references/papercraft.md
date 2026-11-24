# Papercraft

A starting point, not a rulebook: the game's own references and `STYLE.md` win.

A world cut from card and stood up on a table. It suits story games, puzzles and tabletop strategy.

## Reads as

- **Everything is card:** flat sheets with visible thickness and a darker cut edge.
- **Printed, matte colour** with no shine.
- **A low, warm side light** throwing soft shadows from one layer onto the next.
- **A miniature:** a narrow lens and blur at the top and bottom of the frame.

## Shapes and materials

Card and paper. Thickness is 1.5–3 % of the hero's height. A cut edge is the face colour at about half
brightness. Faces carry a faint paper fibre. Cards are never perfectly aligned: tilt each by a degree or two.

Things are built in a few ways, and a scene uses several:

- **Layered flats:** a picture cut into parts and stacked. Big parts step forward by about 1.2 % of the hero's
  height, small ones by about 0.3 %, so every layer casts a small shadow.
- **Slotted cross:** two cards pushed through each other at right angles, the main one turned about 24° from
  the camera. For trees, posts and signs.
- **Box fold:** walls, gable ends and a roof card. For buildings and crates.
- **Prop card:** a flat figure with a second card standing behind it at a right angle to hold it up.
- **Flat on the ground:** paths, water and rugs are cards lying on the base board.

## Palette

Chosen for the game: a muted ground and a few contrasting accents, at a saturation of about 0.55–0.75.
Example: sky `#a9d3dc`, ground `#7fb062`, roof `#cf5c43`, wall `#f2e2c4`, hero `#74b956`, cap `#d9443a`.

## Light and shading

A warm key light, low and from the side, at strength 3; a cool fill from the front at a quarter to a third of
that; a sky light at about 0.4–0.55. Shadows are soft and take the world's colour (amber on warm ground, lilac
on snow). Shading is matte.

## Surface and finish

A tilt-shift blur: a sharp band across 36–45 % of the frame's height, blurring toward the top and bottom
(12–18 px at 1080 lines). A narrow lens, 24–32°, looking down at the table. Cost: soft shadows and one blur
pass are medium. Fallback: a soft dark blob under each card and the blur at half resolution.

## Characters and props

- **Character:** never one card. A layered flat of 10–20 cards (body, belly, each limb, each eye part, hat,
  bag), leaning on a prop card. The head is about 1.3 times natural size. Limbs are their own cards, pivoting
  at a point just outside the body's outline so nothing cuts through anything when it moves. The hero is
  0.4–0.5 the height of the tallest common prop.
- **Tree:** a slotted cross. The crown has five to seven lobes on a short, fat, tapered trunk, with lighter
  lobes and fruit glued on the front card.
- **Building:** a box fold. The roof is its own card and overhangs by about a fifth of the wall width; shingle
  rows are glued strips; windows are a frame card with a pane card on top; a chimney is a small folded box.

## Motion

Cards hinge, slide and pop up; they do not stretch or bend smoothly. A card that rises overshoots by 8–15 %
and settles. Walking is a rock from side to side with limbs swinging at their pivots.

## UI and type

Paper tags, labels on string, stamped or handwritten type, a slab serif.

## Pitfalls

- Planes with no thickness: they read as flat sprites.
- Any gloss.
- Light from the front: no shadows between layers, so it looks like a flat drawing.
- Perfectly aligned cards.
- Black shadows.

## Variants

- **Paper theatre:** only layered flats at a few depths, seen from the front. For side-scrollers.
- **Cardboard:** brown corrugated card, marker lines, visible tape.
- **Origami:** folded facets with no print.
- **Pop-up book:** scenes that unfold from an open spread.

## STYLE.md block

```md
## Scene look: papercraft
- **Reads as:** card with thickness and dark cut edges, matte print, low warm side light, miniature blur
- **Materials:** card <1.5–3 %> of hero height; edges = face × 0.5; faint fibre
- **Palette:** muted ground <#hex>; accents <#hex …>
- **Light:** warm key 3 from <side>; cool fill <0.8–1.1>; sky <0.4–0.55>; soft shadows tinted <#hex>
- **Finish:** tilt-shift, sharp band <36–45 %>; lens <24–32°>
- **Line / edge:** cut edges only; cards tilted 1–2°
- **Motion:** hinge, slide, pop up with <8–15 %> overshoot; no stretch
```

## In a web game

`papercraft()` in `toolkit/styles3d.js`. A card is an `ExtrudeGeometry` of an outline with two materials: one
for the faces, a darker one for the sides. `collage()` stacks 2D parts into a layered flat; the tree adds a
second collage rotated 90°; the cottage is ordinary box geometry in the paper material. `tiltShift()` in
`core.js` blurs a copy of the frame and masks it to the top and bottom.

Technique sources: structures, light ratios, edge darkening and tilt-shift from
[xikhar/papercraft](https://github.com/xikhar/papercraft), which goes much further on full dioramas.
