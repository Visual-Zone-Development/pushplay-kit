# Props, vehicles and buildings in code

For anything you could measure with a ruler. `<skill-dir>` is the blender-models folder.

## 1. A reference you can measure

A typical concept sheet shows the object in perspective, with shadows, and its views disagree with each
other. An agent can look at that picture but cannot measure it, so it guesses coordinates and parts end up
floating. Ask the user (or an image tool, with their yes) for views made for measuring:

- one view per picture: side, front, top; exactly straight-on, no perspective;
- a plain background, flat colours, no shadows and no reflections;
- the same scale in every view, nothing cut off at the edges.

If all the views are on one sheet, cut it into one file per view first. If a view is missing, ask for the
missing size in words ("the stock is 5 cm wide") instead of inventing it.

## 2. Numbers before geometry

Read the views and write `parts.json` before modelling anything. One entry per part:

```json
{"name": "mailbox", "budget_tris": 2000, "parts": [
  {"name": "post", "type": "box", "at": [0, 0, 0.36], "size": [0.075, 0.075, 0.72], "colour": "#6b4a30", "attach": null},
  {"name": "body", "type": "box", "at": [0, 0, 0.78], "size": [0.24, 0.38, 0.14], "colour": "#3d6fb6", "attach": "post"},
  {"name": "lid", "type": "cylinder", "axis": "y", "sides": 14, "at": [0, 0, 0.85], "size": [0.24, 0.39, 0.24], "colour": "#3d6fb6", "attach": "body"}]}
```

- Metres. The origin is the centre of the base. The front faces -Y. `at` is the centre of the part; `size` is
  its finished width, depth and height.
- `attach` names the part this one is fixed to. Every part but one has it: that is what the assembly check tests.
- Show the list to the user and wait for a yes. They can see a wrong proportion in a list of numbers.
- Follow model-asset's forms.md while writing it: three or more parts per object, thickness where something
  would be a sheet, a darker trim and one accent. A list with one box in it is a box.

`build_parts.py` builds boxes, cylinders, tapers (`"top": 0.8`) and extruded side outlines (`"type":
"outline"`, with `points` traced from the side view) straight from the list. A part it cannot express gets its
own small script that adds an object with the part's name; the rest of the pipeline only needs the names.

## 3. One part per session

Build a prop with more than a few parts one part at a time, each in a fresh session: read `parts.json`, build
the one part, render it next to the reference from the same view, list the differences in centimetres, fix,
render again. Three rounds at most, then stop and show the user what is left.

A single brief for a whole prop re-renders everything on every fix, and the pictures pile up in the context
until the session runs out. Keep renders at 768 px. Simple parts (barrels, boxes, planks) can go to a smaller,
cheaper model if the project uses one; outlines and joints are worth the stronger one.

For an outline traced from a picture: threshold the view, trace the contour, simplify it to about 30 points,
and put the points in the part's entry.

## 4. Check the assembly by numbers

```sh
blender -b --python <skill-dir>/scripts/check_assembly.py -- prop.blend parts.json
```

- **Gap to the attached part** must be 0: the two surfaces touch or pass into each other. The check measures
  the real surfaces, not their boxes. A floating part is reported with its distance.
- **Size** of each part against the list, within 2 mm.
- **Triangles** against `budget_tris`.

Then render front, side and three-quarter views and look. Two faults the numbers do not catch: two parts
sharing one face plane (it shows as black or flickering patches: move one by 2 mm), and a part that is the
right size in the wrong place (compare with the reference).

Export with modifiers applied (`build_parts.py --glb`, or `export_game.py` for a rigged model).

## 5. Bulk scenery from a generator script

For buildings, fences, street furniture and anything else that comes in dozens, write a generator instead of
single models: one function per type, with its sizes, storeys, roof type and colour as parameters, openings
placed by rule, and a seed for variety. `buildings.py` is a worked example:

```sh
blender -b --python <skill-dir>/scripts/buildings.py -- out_dir --count 10 --seed 3
```

It writes one GLB per variant and a picture of them in a row. Change a rule once and every building follows.

Do not send buildings or street props to an image-to-3D generator. It returns an almost square footprint, so a
bus or a fence stretched back to its real length goes flat, and its textures come out noisy where flat colour
was wanted.
