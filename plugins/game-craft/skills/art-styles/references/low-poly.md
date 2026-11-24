# Low-poly

A starting point, not a rulebook: the game's own references and `STYLE.md` win.

3D reduced to visible facets and plain colour. It is the cheapest 3D style to draw and to make, runs well on
weak hardware, and suits exploration, racing and builders.

## Reads as

- **Visible facets:** every polygon is flat-shaded.
- **Plain colour**, no textures; neighbouring facets differ slightly.
- **Chunky, simplified forms.**
- **A soft world:** tinted sky light and fog the colour of the horizon.

## Shapes and materials

Matte, faceted solids. Spheres are 12 segments by 8, or an icosphere subdivided once or twice; cylinders have
six to eight sides. A prop is 50–500 triangles, a tree 200–800. Bevels are zero or one segment, never tiny
rounded edges. Give each object two to four materials: body, dark trim, highlight, accent.

## Palette

Saturated mid-tones. Each facet's lightness varies by about ±8 % around its material colour so the surface
shimmers instead of banding. Example: sky `#4fa3e0` → `#d9f1ff`, ground `#6ab04c`, leaves `#3f9e4d`, roof
`#eb4d4b`, wall `#f6e1b5`.

## Light and shading

A low sun, 15–30° above the horizon, so facets catch very different amounts of light. A sky light tinted cool
from above and warm from the ground. Crisp shadows. Fog that matches the horizon colour and starts beyond the
play area.

## Surface and finish

None. Give large ground areas a few gentle height changes away from where the player walks, so the ground has
facets too. Cost is the lowest of the 3D styles.

## Characters and props

- **Never a bare primitive.** An untouched sphere has identical facets and reads as a default object. Nudge the
  vertices of organic forms (foliage, rocks, clouds) by about 10 % of their radius; taper boxes by moving their
  top vertices; build bodies from cross-sections with six to eight sides.
- **Character:** tapered limbs of five or six sides, mitten or wedge fingers, eyes as a white facet with a dark
  pupil. Spend triangles on the head and hands.
- **Tree:** a trunk that widens at the root, two or three branches, and five to eight foliage lumps of different
  sizes. Branches leave the trunk 30–40 % of the way up at 60–70°.
- **Building:** chunky walls; the detail goes into the roof (slabs with overhang, a ridge cap), framed windows
  and a chimney cap.

## Motion

Snappy eases, bobbing and tilting. Rigid parts moving at joints suit the look better than skin that bends.

## UI and type

Flat rounded panels in the game's colours and a bold sans.

## Pitfalls

- Smooth shading on low geometry: it looks like melted blobs.
- Untouched primitives.
- Many small polygons: noise instead of facets.
- Detailed textures.
- One flat colour per object with no facet variation.

## Variants

- **Paper-white low-poly:** white geometry, all colour from light and sky.
- **Outlined low-poly:** facets plus a dark outline, toward toon.
- **Gradient low-poly:** each object textured with one soft gradient instead of a flat colour.

## STYLE.md block

```md
## Scene look: low-poly
- **Reads as:** flat-shaded facets, plain colour, chunky forms, horizon fog
- **Materials:** matte; <2–4> per object (body, dark trim, highlight, accent); no textures
- **Palette:** <hues>; ±8 % lightness per facet
- **Light:** sun at <15–30°>; sky light <cool #hex / warm #hex>; crisp shadows; fog <#hex> from <distance>
- **Finish:** none
- **Line / edge:** none; bevels 0–1 segment
- **Motion:** snappy eases; rigid parts at joints
```

## In a web game

`lowPoly()` in `toolkit/styles3d.js`. For each part: `toNonIndexed()`, nudge vertices by noise of their
position (so shared corners move together), write a colour per face, `computeVertexNormals()`, and render with
`MeshLambertMaterial({ flatShading: true, vertexColors: true })`.

Technique sources: face variation and sun angle from
[matinsizen/ai-3d-animator-skill](https://github.com/matinsizen/ai-3d-animator-skill); budgets from
[arjun988/blender-skills](https://github.com/arjun988/blender-skills) (`lowpoly-style`); branch angles from
[dgreenheck/ez-tree](https://github.com/dgreenheck/ez-tree).
