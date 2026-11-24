# PS1-era retro

A starting point, not a rulebook: the game's own references and `STYLE.md` win.

The look of mid-1990s console 3D, flaws included. It suits horror, racing, platformers and anything nostalgic,
and it is cheap to render.

## Reads as

- **Low resolution**, scaled up with hard pixels.
- **Wobbling geometry:** vertices snap to a coarse grid as things move.
- **Textures that swim** and warp with the camera.
- **Banded, dithered colour** and **fog close by**.

## Shapes and materials

Few polygons and small textures. A prop is 50–400 triangles, a character 200–800. Textures are 32–128 px, drawn
by hand, with light and detail painted into them. Bodies have six to eight sides.

## Palette

Slightly muddy colours under a fog colour. Each channel has 32 levels, so gradients band, and the dither
pattern hides the bands. Example: fog `#8fa3b3`, grass `#588c3a`, wall `#decaac`, roof `#be4634`, hero `#6ebe46`.

## Light and shading

Light is worked out at each corner of a polygon and blended across it, with no highlights and no real shadows.
A dark blob under a character stands in for its shadow. Lit signs and windows ignore the light.

## Surface and finish

- **Resolution:** render at about 320×240, or a third to a quarter of the screen, and scale up by a whole
  number without smoothing.
- **Vertex snap:** after projecting a vertex to the screen, round its position to a grid about half as fine as
  the render resolution.
- **Affine textures:** blend texture coordinates in a straight line across the screen, without perspective
  correction. Large polygons warp badly, so split big surfaces (a ground plane into 16–24 segments a side).
- **Textures:** nearest filtering, no mip-maps.
- **Colour:** reduce to 5 bits per channel with a 4×4 ordered dither.
- **Fog:** from about 5–6 units to 13–26, in the background colour.

Cost is lower than a modern look: fewer pixels and simple shading.

## Characters and props

- **Faces are painted on:** eyes and mouth are part of the texture, or a few flat polygons.
- **Limbs are separate rigid pieces** that overlap at the joints, with no bending skin.
- **Keep the silhouette built:** a tapered body, limbs, a roof with overhang and a chimney still matter; the
  style removes smoothness, not design.
- **Scenery:** tiling textures with brick, plank and grass patterns; trees as a few lumps with a leaf texture.

## Motion

The wobble shows whenever the camera or an object moves. Animation at 15–20 poses a second suits it. Offer a
setting to calm the wobble (a finer snap grid), and use it when reduced motion is on.

## UI and type

Bitmap type and flat coloured boxes, on the same pixel grid as the world or deliberately crisp on top: choose
one.

## Pitfalls

- Smoothed textures or a smoothed upscale.
- Modern lighting: real shadows, glossy highlights.
- Wobble so strong it is hard to look at.
- Very large polygons near the camera.
- Smooth 60-pose animation.

## Variants

- **Retro horror:** dense fog, near-black, film grain, a very short view distance.
- **Smooth retro:** blurred textures, no wobble, perspective-correct mapping, for the look of later consoles.
- **Handheld retro:** 256×192, hard pixels, no dither.

## STYLE.md block

```md
## Scene look: PS1-era retro
- **Reads as:** low resolution, wobbling vertices, swimming textures, dithered colour, close fog
- **Materials:** <32–128 px> hand-drawn textures, nearest filtering; props <50–400> tris, characters <200–800>
- **Palette:** <hues>; fog <#hex>; 5 bits per channel
- **Light:** per-corner light, no highlights; blob shadows
- **Finish:** render <320×240>, ×<n> scale; snap grid <160×120>; affine textures; 4×4 dither; fog <near–far>
- **Line / edge:** none
- **Motion:** <15–20> poses a second; wobble setting <on | calm>
```

## In a web game

`ps1()` in `toolkit/styles3d.js`, a `ShaderMaterial`. In the vertex shader:
`clip.xy = floor(clip.xy / clip.w * res) / res * clip.w` snaps to the grid, and passing `vec3(uv * clip.w, clip.w)`
then dividing in the fragment shader gives affine mapping. The frame is rendered small, read back, reduced to 5
bits per channel with a Bayer matrix, and drawn scaled up with `imageSmoothingEnabled = false`. A custom shader
does no colour-space conversion: keep its colours and textures in display space.

Technique sources: shader recipe from
[MenacingMecha/godot-psx-style-demo](https://github.com/MenacingMecha/godot-psx-style-demo); affine mapping
explained by [Daniel Ilett](https://danielilett.com/2021-11-06-tut5-21-ps1-affine-textures/); budgets from
[arjun988/blender-skills](https://github.com/arjun988/blender-skills) (`lowpoly-style`).
