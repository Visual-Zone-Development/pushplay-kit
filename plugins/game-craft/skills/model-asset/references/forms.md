# Build forms, not primitives

How to build a subject so it looks designed, in any style and any engine. An art style can only work on what is
there: give it an ellipse and it draws a styled ellipse. Read this before blocking out anything that is drawn
or modelled in code, and use it as a checklist for assets made in an art tool.

These are habits, not a house style. Proportions, the level of detail and what gets exaggerated come from the
game's `STYLE.md` and its references.

## Four rules for every object

1. **No bare primitive.** A circle, a box, a sphere or a cylinder is a starting point: taper it, flare it,
   round it, lump it or cut it. If someone can name the primitive an object was made from, it is not finished.
2. **Three or more overlapping parts.** A mailbox is a post, a box with a rounded top, a side face, a slot and
   a flag. Parts overlap or sit into each other; they do not merely touch.
3. **Thickness wherever something would be a sheet.** A roof is a slab that overhangs, a hat has a brim, a door
   sits in a frame, a sign has an edge.
4. **A darker trim and one accent.** Every object has a base colour, a darker edge or trim colour, and one
   small accent that contrasts (a red flag, a gold buckle, a lit window).

## The shape vocabulary

The same handful of shapes builds almost everything. Each has a 2D and a 3D form.

| Shape | In 2D | In 3D | Use it for |
|---|---|---|---|
| **Tapered limb** | a capsule that is wider at one end | a tube that narrows, with rounded ends | arms, legs, fingers, tails, branches, handles |
| **Shaped body** | an outline wider at one end (pear, bean, wedge) | cross-sections of different sizes joined into one skin | torsos, heads, hulls, bottles, trunks |
| **Hand or foot** | a palm with finger bumps fanned around a direction | a flattened palm with tapered fingers and a pad at each tip | hands, paws, webbed feet, claws |
| **Cluster** | the outline of several overlapping circles | several lumps of different sizes pushed together | foliage, clouds, bushes, smoke, hair, rocks |
| **Band** | a strip of even width along a line | a thin tube or strip along a curve | straps, belts, trims, ropes, roof edges |
| **Slab** | a shape with a second, darker shape showing its edge | a thin box or extruded outline | roofs, shelves, steps, signs, cards |
| **Soft box** | a rectangle with rounded corners | a box with rounded edges | bags, crates, furniture, machines |
| **Frame** | a lighter shape with a smaller, darker shape inside | a surround standing proud of an inset panel | windows, doors, screens, panels |
| **Lump** | an outline with a few shallow bumps | a surface pushed in and out by noise | stones, clay, organic things, worn edges |
| **Detail line** | a stroke | a thin strip, a groove, or a line in a texture | mouths, planks, tile rows, bark, seams |

## Recipes

Starting lists. Leave parts out when the size or the style cannot show them (see *What to drop first*).

**A character or creature**
- A shaped body, not a ball: decide where it is widest. No neck on cute characters; the head is as wide as the
  body or wider.
- Limbs that taper, each ending in a hand or foot with fingers or toes. Leave a gap between an arm and the body
  somewhere so the silhouette is not one lump.
- A pose: one arm doing something (waving, holding, pointing). A symmetrical figure standing straight looks
  like a diagram.
- Eyes built in layers: white, iris, pupil set a little toward where it looks, one catchlight in the same place
  in both eyes, and a lid over the top. Eyes sit about 60 % of the way up the head and are larger than life.
- A mouth as a line with corners, plus whatever the style adds (cheeks, nostrils, brows).
- One accessory that says who this is (a cap with a brim and a badge, a satchel with a flap and a buckle), and
  the thing that holds it on (a strap, a belt).
- A marking or two on the skin, fur or clothes (spots, a belly patch, a stripe).

**A tree or plant**
- A trunk that flares at the root, narrows upward and leans or curves a little.
- Two or three branches leaving the trunk partway up, reaching into the foliage.
- Foliage as five to eight clusters of different sizes: some behind the trunk and darker, some in front, the
  top ones lighter. Each cluster is shaded as its own ball.
- One or two gaps where the sky or a branch shows through.
- Something small for colour or scale: fruit, blossom, a bird, a knot in the bark.

**A building**
- Walls on a base (a stone plinth or foundation a little wider than the walls).
- A roof that is larger than the body: it overhangs, has visible thickness, and has rows (tiles, shingles,
  planks) and a ridge.
- A trim where roof meets wall (a barge board or fascia) and a shadow under the eaves.
- Windows as frame, glass, bars and a sill. Glass is darker than the wall by day and the brightest thing by night.
- A door as frame, door, planks or panels, a handle and a step. The door is at least three quarters of the
  height of the character who uses it.
- One thing that breaks the box: a chimney with a cap, a porch, a dormer, a flower box, a lean-to.
- A second visible side when the camera allows, so it is a volume and not a front.

**A prop**
- The four rules above, then one detail that shows use: a slot, a hinge, a handle, a worn corner, a label.

**Ground and scenery**
- A path has an edge and something on it (stones, ruts, planks). Grass is tufts placed in clumps, with bare
  areas between. Distant layers get a few small shapes on the horizon for depth.
- Every mark needs a cause. Scattered noise is not detail.
- Anything that comes in dozens (houses in a street, fence panels, crates) is one generator with parameters and
  a seed, not dozens of models. Change a rule once and every copy follows.

## What to drop first

When an object is small on screen, or the style is coarse (pixel art, voxels, low resolution), remove in this
order: surface markings, detail lines, trims and frames, fingers and toes, then secondary parts. Keep the
silhouette, the pose, the eyes and the accessory until last. A feature smaller than the style's smallest unit
(a pixel, a cube, a line width) is left out or made bigger, never drawn at half size.

## Check it

- Fill the object with one colour: does the silhouette still say what it is and what it is doing?
- Name the primitives. If "an ellipse", "a box" or "a triangle" describes any whole part, shape that part.
- Count the parts and find the trim and the accent.
- Measure the joins: every part touches or passes into the part it is attached to. A gap of a few millimetres
  reads as a floating part at play size. Where the tool can measure it, check it by number.
- Look at it next to the reference and at play size, as *Render and compare* describes.

## In a web game

- **Canvas 2D:** the art-styles toolkit's [forms2d.js](../../art-styles/toolkit/forms2d.js) has the 2D
  vocabulary as functions that return outlines (`capsule`, `paw`, `unionOutline`, `blob`, `band`, `archRect`,
  `roundRect`, `curve`), and [scene2d.js](../../art-styles/toolkit/scene2d.js) is a worked example that builds
  a character, a tree, a cottage and a mailbox from them.
- **three.js:** [forms3d.js](../../art-styles/toolkit/forms3d.js) has `loftGeo` (shaped body), `limbGeo`
  (tapered limb), `roundedBox` and `lumpy`, and [model3d.js](../../art-styles/toolkit/model3d.js) builds the
  same scene from about 200 parts. The threejs-models toolkit's `sculpt.js` adds plates, horns, shells and
  painted textures, and a rig for crowds.

## In Blender

The **blender-models** skill builds props from a parts list with sizes, checks every join by number, and has a
worked building generator; it also cleans, rigs and exports characters that start from a generated mesh.
