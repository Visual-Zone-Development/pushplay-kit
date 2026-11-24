# Voxel

A starting point, not a rulebook: the game's own references and `STYLE.md` win.

A world made of small cubes on one grid. It suits builders, sandboxes, roguelikes and tactics, and anything
where the world can be dug, stacked or broken.

## Reads as

- **Everything sits on one cube grid.**
- **One cube size** for everything near the camera.
- **Flat colour per cube**, with a little variation from cube to cube.
- **Darker corners:** ambient occlusion where cubes meet.

## Shapes and materials

Matte cubes. Pick the cube size first: each cube should cover at least two to four screen pixels at play size,
and a character should be 16 to 32 cubes tall. Far scenery may use cubes four to six times larger. Objects stay
aligned to the grid and turn in quarter turns; a moving character may turn freely, but nothing is ever scaled.

## Palette

Choose the palette before modelling: for each material a base, a shadow about 30 % darker and a highlight
about 30 % lighter. Vary each cube's lightness by about ±6 %. Example: grass `#5fae4a`, leaves `#3f9a46`,
roof `#cf4f3c`, wall `#f3e3c3`, hero `#6cc84a`, path `#e3c084`.

## Light and shading

A sky light and one sun, with crisp shadows. Ambient occlusion matters more than in any other style: without
it, flat cubes of one colour merge. For each corner of a cube face, darken by how many of the three neighbouring
cubes are solid. The cheap version: darken a cube by 5–6 % for each solid neighbour in the ring above it.

## Surface and finish

None. Cost is the cube count: draw only cubes with an open side, merge flat runs into larger quads for a
static world, and store the occlusion in the cube's colour instead of computing light for it.

## Characters and props

- **Design the hero on the grid.** Sampling a smooth model into cubes is fine for scenery, but it turns a face
  into speckles. Place the hero's cubes on purpose.
- **Proportions:** at 16 cubes tall, head 4–5, body 5–6, legs 6–7, arms 1 wide. At 32 tall, head 8–10. Heads
  1.5–2 times realistic, hands 1.5 times.
- **Limbs** are at least two cubes thick if they sit on a diagonal or animate, or they break into dots.
- **Features are painted, not modelled:** a mouth is a row of dark cubes on the surface; a belly, a strap or a
  stripe is a recolour. Eyes are a block of white (2×2 up to 4×4) with a pupil and one catchlight cube in the
  same corner of both eyes.
- **Tree:** a trunk two or three cubes wide with extra cubes at the root, and foliage as overlapping lumps.
- **Building:** roof steps are the shingle rows; windows are set in by one cube; trims are one cube of another
  colour.
- **Leave out** anything thinner than a cube (window bars, door planks, blades of grass).

## Motion

Characters move as whole poses or as rigid groups turning at joints, with hops and bobs. No smooth bending.
Things break into loose cubes.

## UI and type

Chunky pixel type and bevelled blocks.

## Pitfalls

- Two cube sizes in one object.
- Details smaller than a cube, leaving speckles.
- No ambient occlusion.
- Cubes so small the model reads as a rough mesh.
- Stretched or scaled cubes.

## Variants

- **Chunky:** characters 8–12 cubes tall with huge heads.
- **Micro-voxel diorama:** very small cubes, a narrow lens and a tilt-shift blur.
- **Voxel with pixel textures:** each cube face carries a small pixel-art texture.

## STYLE.md block

```md
## Scene look: voxel
- **Reads as:** one cube grid, one cube size, flat colour with variation, dark corners
- **Materials:** matte cubes of <size>; hero <16–32> cubes tall; far scenery ×<4–6>
- **Palette:** per material base / shadow −30 % / highlight +30 %; ±6 % per cube
- **Light:** sky light and sun, crisp shadows; occlusion <per corner | ring above, 5–6 %>
- **Finish:** none
- **Line / edge:** none; nothing thinner than one cube
- **Motion:** whole poses or rigid groups at joints
```

## In a web game

`voxel()` in `toolkit/styles3d.js`: scenery is sampled from the low-detail model by casting a ray down each
grid column; the frog is placed cube by cube in `voxFrog()`. Cubes are one `InstancedMesh` with `setColorAt()`
carrying material colour, variation and occlusion.

Technique sources: palette-first workflow and proportions from
[omer-metin/skills-for-antigravity](https://github.com/omer-metin/skills-for-antigravity) (`skills/voxel-art`);
corner occlusion after [0fps](https://0fps.net/2013/07/03/ambient-occlusion-for-minecraft-like-worlds/).
