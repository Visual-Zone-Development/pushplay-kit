---
name: blender-models
description: With Blender run from scripts and no window, take a 3D model for a game in any engine from a reference to an engine-ready GLB or FBX. Props, buildings and vehicles are built in code from a parts list with sizes; characters and creatures start from an image-to-3D generator's mesh and are cleaned, split into parts, rigged with weight rules so clothes do not stretch, given clips written as code, and exported. Ships Blender Python scripts for each step (measuring renders, assembly check, cleanup, part tagging, rig and weight rules, pose test, clip check, export) and a self-test. Use for "make a 3D model of", "model this prop in Blender", "rig this character", "the clothes stretch when it moves", "turn my concept sheet into a game character", "clean up this Meshy / Tripo / generated model", "make buildings for my city", "export to Unity / Roblox / GLB". Not for models built in three.js code (threejs-models) or for bringing a finished model file into a three.js game (character-models).
---

# 3D models with Blender scripts

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the APIs, the budgets, where files go, the checks and how to finish a change. `<skill-dir>` is the folder this file is in.

This is a stack skill: it is about Blender, driven from Python with no window. What it produces is a
GLB or FBX, so it serves a game in any engine. The workflow around it (reference, breakdown, render and compare
in rounds, `STYLE.md`) is **model-asset**'s; what makes a subject look designed is in model-asset's
[forms.md](../model-asset/references/forms.md); the look is the game's style sheet (**art-styles**).

## Setup

- **Blender**, either the application (run `blender -b --python <script> -- <arguments>`) or the `bpy` Python
  package (`pip install bpy`, then `python <script> <arguments>`). Every script here runs both ways. Say in the
  project's `AGENTS.md` how Blender is started on this machine.
- **No screen needed.** Renders use the Cycles renderer on the CPU, which works on a server or in CI. On a
  machine with a GPU, set `BLENDER_RENDER_ENGINE=BLENDER_EEVEE` for faster pictures.
- **Keep every step as a script and its inputs as files** (`parts.json`, `joints.json`, `regions.json`,
  `rules.json`) in the project, so any step can be run again after a change. A model edited by hand is lost the
  next time the pipeline runs.
- Check the install: `python <skill-dir>/scripts/selftest.py <scratch folder>` runs the whole pipeline on test
  models in about two minutes and prints PASS or FAIL per check.

## 1. Pick the route by the object

| The object | Route | Why |
|---|---|---|
| Something you could measure with a ruler: props, weapons, furniture, vehicles, buildings | **Code** ([props.md](references/props.md)) | Exact sizes, few triangles, parts you can change by number. Free. |
| Many of one kind: a street, a forest of crates | **A generator script** ([props.md](references/props.md)) | One rule change fixes every copy. |
| Something you would sculpt: characters, creatures, organic shapes | **An image-to-3D generator**, then cleanup and rigging here ([characters.md](references/characters.md)) | Code copies an organic shape from a picture badly: a coded character comes out as a toy robot. |
| Something a pack already has | **game-assets** | Finding beats making. |

A stylised character made of simple forms (a mascot, a low-poly animal) can still be built in code, with
model-asset's forms.md. The moment it needs anatomy or folds of cloth, use a generator.

## 2. Props and buildings in code

The short version; [props.md](references/props.md) has the detail.

1. **Get a reference you can measure:** flat, straight-on views at one scale, no perspective and no shadows. A
   perspective concept sheet cannot be measured, so every coordinate is a guess and the parts float.
2. **Write the numbers before any geometry:** a `parts.json` with every part's position, size, colour and the
   part it attaches to. Show it to the user and wait for a yes. A wrong number costs one line here and a
   rebuild later.
3. **Build one part at a time,** in a fresh session per part for anything with more than a few parts: a brief
   for the whole prop re-renders everything on every fix and fills the context with pictures. Cap it at three
   fix rounds per part, then stop and show.
4. **Check the assembly by numbers,** not only by eye:
   `check_assembly.py` prints the gap between each part and the part it attaches to (it must be 0), each part's
   size against the list, and the triangle count against the budget.
5. **Buildings, fences and anything in bulk come from a generator script** with parameters and a seed, as
   `buildings.py` shows. Never send them to an image-to-3D generator.

## 3. Characters from a generator

The short version; [characters.md](references/characters.md), [rigging.md](references/rigging.md) and
[clips.md](references/clips.md) have the detail.

1. **Draw the sheet for the generator:** front, side and back, straight-on, the same height, arms away from
   the body, legs apart, **empty hands**. Anything held melts into the hand and cannot be cut out again.
2. **Generate,** with every view in the slot of the side it shows. Say what it will cost and get a yes before
   any paid call (game-assets has the rules and the licences).
3. **Clean the mesh before any bone:** `clean_mesh.py` turns and scales it, puts the feet on the floor, merges
   doubled vertices, reports holes and loose parts, and decimates to the budget with a crowd copy.
4. **Tag the parts and cut what only touches:** `tag_parts.py`. A generator hands over one fused skin: the coat
   is welded to the legs and the hands to the coat. Look at the flat-colour picture before going on.
5. **Read the joints off a grid render** (`render_views.py --grid 0.05`) into `joints.json`.
6. **Bind, then set the weights by rules:** `rig_rules.py`. The rules say which bones each part may follow.
7. **Pose and measure:** `pose_test.py` prints the longest stretched edge and how far each part moves per pose.
   Fix the tags and rules, run again, at most three rounds, then show what is left.
8. **Write clips as code on this rig** and check them by numbers: `check_clips.py` (foot slide, the floor,
   whether loops close).
9. **Export and read it back:** `export_game.py`.

## The scripts

All in `scripts/`. Each prints what it did and takes `--report <file.json>` where it measures something.

| Script | Does |
|---|---|
| `render_views.py model out_dir [--views front,side,back,34] [--size 768] [--grid 0.05]` | Straight-on pictures, with a measuring grid behind the model if asked |
| `build_parts.py parts.json out.blend [--glb f] [--render dir]` | Builds a prop from a parts list (boxes, cylinders, tapers, extruded outlines) |
| `check_assembly.py model.blend parts.json` | Gap to the attached part, size against the list, triangle budget. Exit status 1 on a failure |
| `buildings.py out_dir [--count 6] [--seed 1]` | Worked example of a generator: house, shop and tower variants |
| `clean_mesh.py model.glb out.blend --height 1.15 [--turn 90] [--budget 20000] [--crowd 3000]` | Orient, scale, ground, weld, report faults, decimate |
| `tag_parts.py model.blend joints.json [regions.json] [--render dir]` | Tags each vertex with a body part, claims clothing by region, cuts parts that only touch |
| `rig_rules.py model.blend joints.json [rules.json] [--no-rules]` | Skeleton, automatic weights, then the weight rules and the four-bone limit |
| `pose_test.py model.blend out_dir [--poses poses.json]` | Test poses: longest stretched edge, movement per part, worst vertices, pictures |
| `example_clips.py model.blend` | Worked example of clips as code: an idle and a walk whose planted feet do not slide |
| `check_clips.py model.blend [--speed walk=0.95] [--once attack]` | Foot slide, lowest point, hip range and loop closure per clip |
| `export_game.py model.blend out/name` | FBX and GLB with the safe settings, each read back and summarised |
| `selftest.py out_dir` | The whole pipeline on test models, with PASS or FAIL per check |

`metrics.py` and `skeleton.py` hold the maths and the bone tables with no Blender import; `metrics_test.py`
tests them with plain Python.

## Rules to put in the project's own `AGENTS.md`

Rules that never change belong in the project, so they are not repeated in every request. A starting block:

```md
# 3D model rules
- Blender runs as: <command on this machine>
- Units: metres. Origin at the base centre. Models face -Y in Blender. Engine forward: <axis>.
- Budgets: props <2,000> triangles; hero <20,000>; crowd copies <3,000>. Max <3> materials per prop.
- Bevel hard edges <2 mm>, 1 segment. Apply all transforms and modifiers before export.
- Renders: 768 px, straight-on, the same view as the reference, side by side with it.
- At most 3 fix rounds per part or per pose, then stop and show.
- No paid generation without the cost stated and a yes.
```

## When it breaks

| What you see | Cause | Fix |
|---|---|---|
| Prop parts float or sink into each other | The reference was in perspective, so sizes were guessed | Flat views and a parts list; `check_assembly.py` |
| Black or flickering patches on a prop | Two parts share the same face plane | Move one 2 mm, or make it 2 mm bigger |
| The session fills up while building one prop | One brief for the whole prop, big renders | One part per session, 768 px renders |
| A second face on the back of the head | A view was sent in the wrong slot | Each view in the slot of the side it shows |
| An extra tail or limb | The generator only saw the front | Send the back view too |
| A prop melted into the hand | The sheet showed the character holding it | Empty hands on the sheet; props on their own sheet |
| Thin wires, text and logos are missing | Generators drop them | Build those parts in code and attach them |
| White discs or black triangles on the mesh | Faces with no area or flipped normals | `clean_mesh.py` reports them; recalculate normals, delete zero-area faces |
| Clothes stretch when the arms move | The coat is tagged or weighted to arm bones | A `reach` for limbs in `regions.json`; a rule that denies arm bones on the coat |
| A spike pulls out of the coat | Hand and coat share vertices, or weights were smoothed across parts | Add the pair to `split`; never smooth across two parts |
| A tear where two parts meet | A rule at full strength on the border, or the upper arm denied on the torso | Keep the `fade`; deny only bones that are not neighbours of the part |
| A small step in the mesh after rigging | The four-bone limit dropped a fifth bone there | Simplify the weights near it (fewer cloth bones), or accept it if `pose_test.py` shows it is small |
| Head or hips tear when turning | A rigid part meets another bone's weights at a seam | Let the neck's neighbour bone through in the head rule; check with `pose_test.py` |
| Twisted knees in a clip | The clip was written for a rig with a different rest pose | Write clips on the rig they play on |
| Feet slide | The clip's foot speed does not match the speed the game moves the character | `check_clips.py --speed`; build the walk from the planted foot, as `example_clips.py` does |
| A foot dips through the floor mid-step | The knee is still bent when the leg is forward | Straighten the knee before the leg passes under the hips |
| The model is tiny or huge in the engine | The importer changed the scale | Put a 1 m probe cube in the file and measure it after import |

## Finish

- Record each asset in the game's `STYLE.md` catalogue, with its source (which script and inputs, which
  generator and task, which licence) and its triangle and bone counts.
- Credit generated and downloaded assets as **game-assets** says.
- Run the project's checks and finish the change the way its rules say.

Technique source: this pipeline follows Kensei's "Create 3D Game Models for Free" (15 steps),
<https://x.com/0xKense1/status/2118717647357395170>, rewritten and with our own scripts. Three things here go
beyond it and come from testing: limb `reach` when tagging, weight rules that fade in from a part's border, and
the three-way pose comparison in the self-test.
