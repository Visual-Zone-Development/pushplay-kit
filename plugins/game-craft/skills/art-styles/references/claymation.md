# Claymation

A starting point, not a rulebook: the game's own references and `STYLE.md` win.

Stop-motion clay: everything is hand-pressed and lit like a small film set. It suits cozy, comic and puzzle
games, and small scenes seen up close.

## Reads as

- **Lumpy forms:** nothing is perfectly round or straight.
- **Thumbprints and tool marks** that catch the light.
- **Soft studio light** with soft shadows.
- **Movement in steps**, not smooth.

## Shapes and materials

Modelling clay. Every part is a ball, a sausage or a slab that has been pressed. Parts push into each other and
overlap by 10–20 %, with a visible seam. Every edge is rounded (a bevel of 15–25 % of a box's smallest side).
Nothing is thinner than a finger could roll: about 3 % of the character's height.

## Palette

Clay colours: primaries taken down a little, on a warm backdrop. Example: backdrop `#f6c98e` → `#e9e2cf`,
ground `#7fb35a`, hero `#6fc24c`, roof `#d0603f`, wall `#f2dfb8`.

## Light and shading

A warm key light (about 3500 K, `#ffd9a8`) from the front and side, a soft sky light, and a cool rim from
behind. Shadows are soft. The surface is matte with a faint sheen: roughness about 0.58, no metal.

## Surface and finish

- **Lumps:** push every surface in and out with noise by 2–6 % of the part's radius (up to 7 % for foliage,
  about 2.5 % for small details), at a frequency of about two lumps across the part.
- **Thumbprints:** a bump texture of soft dents, concentric ridges around a few press points, and fine pores.
- **Finish:** grain at 0.035–0.05 and a vignette at about 0.3; a shallow depth of field if the budget allows.

Cost: soft shadows and a bump map on everything is medium. Fallback: build the lumps into the mesh, use one
shadow light, and drop the depth of field.

## Characters and props

- **Character:** a pressed-together body, limbs as tapered sausages, fingers as small rolls with a ball at the
  tip. Eyes are white balls with a flattened pupil disc (about 0.4 of the eye's radius) stuck on the front, and
  lids as separate half shells that rotate to blink. The mouth is a pressed-in strip, or a set of swapped shapes.
- **Tree:** a trunk rolled thicker at the base, and foliage as big uneven lumps pressed together.
- **Building:** slabs with thumbed edges; roof tiles as overlapping strips; window frames and a door frame as
  rolled strips stuck on.

## Motion

Poses change 12 times a second (on twos); the camera may move smoothly. Each step, shift the thumbprint texture
by a hair and vary the lumps a little, so the clay "boils". Mouths and eyelids swap between a few shapes. Stop
the boil when reduced motion is on.

## UI and type

Clay letters and buttons on a card backdrop, or paper labels pinned to the set. A rounded, hand-cut display face.

## Pitfalls

- Perfect spheres and boxes.
- Glossy plastic highlights.
- Smooth 60-frame animation.
- Sharp edges and thin parts.
- Even noise with no fingerprints: it reads as stone.

## Variants

- **Felt and knit:** no lumps. A knit-stitch texture on big forms, with stitch rows following the form; fuzzy
  felt elsewhere; a soft sheen at grazing angles; stitched seams and button eyes.
- **Toy plastic:** no lumps. Glossy clear-coated plastic in saturated colours, everything on a display base, a
  high camera and a tilt-shift blur.
- **Mixed craft:** clay characters on a set of cardboard, cotton-wool clouds and painted backdrops.

## STYLE.md block

```md
## Scene look: claymation
- **Reads as:** lumpy pressed forms, thumbprints, soft studio light, movement on twos
- **Materials:** clay; roughness 0.58; parts overlap 10–20 %; minimum thickness <3 % of hero height>
- **Palette:** <clay colours>; backdrop <#hex>
- **Light:** warm key <#hex>, sky light, cool rim; soft shadows
- **Finish:** lumps <2–6 %> of part radius; thumbprint bump; grain <0.04>; vignette <0.3>
- **Line / edge:** all edges rounded <15–25 %>
- **Motion:** poses on twos; boil <on | off>; swapped mouths
```

## In a web game

`clay()` in `toolkit/styles3d.js`: `lumpy()` from `forms3d.js` on every part, `MeshPhysicalMaterial` with
`roughness: 0.58`, `sheen: 0.25` and a canvas-drawn `bumpMap`, a warm directional light with
`PCFSoftShadowMap`, then grain and vignette on the 2D canvas. For poses on twos, step time with
`Math.floor(t * 12) / 12`.

Technique sources: lumps, material and light values from the open-source
[markldn/shaun-claymation](https://github.com/markldn/shaun-claymation) (take the techniques, not its
characters); short recipes in [matinsizen/ai-3d-animator-skill](https://github.com/matinsizen/ai-3d-animator-skill).
