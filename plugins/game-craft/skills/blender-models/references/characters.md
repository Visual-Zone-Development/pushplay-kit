# Characters and creatures from a generator

For anything you would sculpt. A generator makes the shape; everything after it (cleanup, rig, weights, clips,
export) is done here, for nothing. `<skill-dir>` is the blender-models folder.

## 1. The sheet

Ask the user (or an image tool, with their yes) for a turnaround made for a generator:

- front, one side and back, straight-on, all the same height;
- an A-pose: arms away from the body at about 45°, legs apart;
- **empty hands.** No weapon, lantern or bag in a hand. Anything held melts into the hand and cannot be cut
  out again. Props go on their own sheet and are built in code or generated separately;
- a light plain background, flat even light, no shadows;
- the colour of every piece of clothing named in the request, so the views agree.

Image tools often draw the left view as a mirror of the right, so a strap or a weapon jumps sides. Send only
true views; leave a slot empty before sending a mirrored one.

**Check that the views agree before paying for the model.** Go through the sheet item by item (cape, straps,
pouches, which hand has the glove) and compare every view. A cape that is in the front view and missing from
the back view comes out as a mangled flap or as loose cords. Either regenerate the sheet, or remove the item
from the views that have it: clearing its colour to transparent, then dropping anything left that is thinner
than two pixels, is enough. Look at the edited views before sending them; a colour test that is too wide also
eats the leather belt.

## 2. Generate

Cut the sheet into one file per view, all the same height. A multiview generator takes up to four pictures in
named slots: front (required), left, back, right. **Put each view in the slot of the side it shows.** A side
view in the wrong slot can give the character a second face on the back of its head. After generating, render
the model from the front and the back and check which one has the face.

Which generator is the user's choice, and so is the money:

- **A paid service** (Meshy, Tripo and others). Tell the user what the call will cost and wait for a yes, as
  game-assets describes; record the task so a re-run never pays twice. As reported in November 2026, a textured
  multiview character on one such service cost about half a dollar, and failed tasks were not charged: check
  the current price before quoting it. Pay only for the generation: the retopology and auto-rig these services
  also sell are what the rest of this page does for free.
- **A local model** on the user's own graphics card (Hunyuan3D 2 is one). Free per model, slower, and softer
  in the face and hands on small cards. Check its licence for the user's country.

The licence of what comes out differs per service and per plan: game-assets' `references/sources.md` has the
table. To spend less: check the views before sending (a wrong view is a paid redo), and skip the texture for
background characters that will be painted flat in the engine.

Generators drop thin wires, text and logos. Build those in code and attach them.

What to expect back, from one run in November 2026 (a stylised knight on Meshy; prices and sizes change):
a three-view sheet from the service's own image tool for 6 credits, and a textured multi-image model for 30.
The model arrived as one mesh of 774,000 triangles in a 26 MB file with a single 2K texture, already facing
-Y (so `--turn 0`), about 1.9 units tall. Specks left in the views became small cords on the model.

## 3. Clean the mesh before any bone

```sh
blender -b --python <skill-dir>/scripts/clean_mesh.py -- model.glb character.blend \
  --turn -90 --height 1.15 --budget 20000 --crowd 3000 --render out
```

1. **Orient, scale, ground.** `--turn` is the turn about the up axis that makes it face -Y (many generators
   deliver models facing +X, which needs -90). `--height` is the height in metres in the game. Transforms are
   applied here, once, so the exporter never has to.
2. **Merge doubled vertices.** A seam whose two sides have their own vertices gets different weights on each
   side and tears open in motion. The script prints how many it merged and how many loose parts remain.
3. **Normals and faults.** It recalculates normals and counts open edges and zero-area faces (which render as
   white discs or black triangles).
4. **Budget.** It decimates to `--budget` triangles and makes a `--crowd` copy. Budgets depend on the target:
   the project's rules decide; as a start, 3,000 for a crowd member, up to 20,000 for a hero on weak hardware,
   more on a desktop. A crowd of full-detail models is the usual cause of a low frame rate.

It keeps UVs but does not bake: if the model has a texture, bake its colour (and a normal map) from the
original onto the decimated mesh as a separate step.

On that knight the script merged 72,825 doubled vertices, found one connected part and nine open edges, and
took 35 seconds to bring 774,000 triangles down to 20,000 with the texture intact.

Look at the three grid renders it writes. Boots pointing backward and a head tilted off the grid are easier to
fix now than after rigging.

Next: [rigging.md](rigging.md).
