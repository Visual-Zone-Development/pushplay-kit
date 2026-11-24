# Toon / cel

A starting point, not a rulebook: the game's own references and `STYLE.md` win.

3D that looks drawn: hard bands of shade and a dark outline. It suits character-led action and adventure.

## Reads as

- **Hard shading bands**, two or three, with no soft gradient between them.
- **Dark outlines** that keep the same width on screen near and far.
- **Saturated, flat colour.**
- **Coloured shadows**, never grey.

## Shapes and materials

Smooth, rounded forms with clean silhouettes. Surfaces are flat colour; texture is saved for faces and emblems.

## Palette

Bright mid-tones under a soft sky. The shadow band is the base colour times about 0.72, pulled toward violet;
the highlight band is about 1.25 times. The outline is a dark tint (`#232447`), not black. Example: sky
`#6ec6ff` → `#fff6d8`, ground `#78c26a`, hero `#6ddc5a`, roof `#ff8a5b`, accent `#ff6b6b`.

## Light and shading

One key light. The lit amount is cut into steps: for three bands, at about 0.51 and 0.785; for two bands, one
step. A rim light on the lit side (strongest where the surface turns away from the camera) and a small hard
highlight are optional. Ambient light at about 0.4 keeps the shadow band colourful. Lamps and windows are flat
unlit colour.

## Surface and finish

The outline is the finish. Two ways to get it:

- **Inverted hull:** draw each outlined object again, inside out, pushed outward along its normals, in the
  outline colour. Push by about 0.4 % of the distance to the camera so the line stays the same width on screen.
  This needs smooth normals: a hard-edged box splits open at its corners, so round its edges or average its
  normals.
- **Edge detection:** one full-screen pass that draws a line where depth or object id changes.

Cost: the hull doubles the draw calls of outlined objects; the edge pass costs one full-screen pass. The cheap
fallback is to outline only the hero and things the player can use.

## Characters and props

- **Outline whole objects and their main parts**, not pupils, cheeks, window bars or grass.
- **Faces:** big eyes with an iris, a pupil and a catchlight; lids as separate shells; a mouth as a line. Keep
  the shadow shape on a face simple.
- **Foliage:** each lump shades like one ball. Make lumps slightly irregular (about 5 % of their radius).
- **Buildings:** thick roof slabs, trims and frames give the outline something to draw; a plain box gets four
  lines and looks empty.

## Motion

Smooth is fine. For an animated-film feel, pose characters on twos (12 a second) and leave the camera smooth.

## UI and type

Bold shapes with the same outline colour; a heavy rounded display face.

## Pitfalls

- A soft gradient between bands (the step texture is being smoothed).
- Outlines that gap at hard edges.
- Outlines that become thick blobs far away.
- Grey shadows.
- Outlines on the ground and on every tiny part.

## Variants

- **Anime:** two bands and a rim light, painted sky, hair and cloth with their own highlight shapes.
- **Comic 3D:** dots in the shadow band (see the comic halftone sheet).
- **Soft toon:** a wide, smooth step for a gentler look.

## STYLE.md block

```md
## Scene look: toon
- **Reads as:** <2 | 3> hard bands, constant-width dark outline, saturated colour, coloured shadows
- **Materials:** flat colour; texture only on <faces, emblems>
- **Palette:** <hues>; shadow = base × 0.72 toward violet; outline <#hex>
- **Light:** key <direction>; steps at <0.51, 0.785>; ambient 0.4; rim <on | off>
- **Finish:** outline by <inverted hull | edge pass>, <0.4 % of distance | px>; on <which objects>
- **Line / edge:** no outline on <tiny parts, ground>
- **Motion:** <smooth | characters on twos>
```

## In a web game

`toon()` in `toolkit/styles3d.js`: `MeshToonMaterial` with a `gradientMap` that is a tiny data texture using
nearest filtering (the steps), and an outline `ShaderMaterial` drawn with `side: THREE.BackSide` that moves each
vertex along its view-space normal by a share of its depth. The character-models skill's `toon.js` has a fuller
version for rigged characters.

Technique sources: ramp thresholds from [xymeow/three-anime-style](https://github.com/xymeow/three-anime-style);
light, rim and highlight terms from Roystan's toon shader ([IronWarrior/UnityToonShader](https://github.com/IronWarrior/UnityToonShader));
constant-width hull as in three.js `OutlineEffect`.
