# Rigging a generated mesh without stretched clothes

A generator hands over one fused skin: the coat is welded to the legs, the sleeves to the hands. Automatic
weights cannot tell clothes from body, so a raised arm pulls the coat and the chest with it. These four steps
fix that. `<skill-dir>` is the blender-models folder.

## 1. Read the joints off a grid

```sh
blender -b --python <skill-dir>/scripts/render_views.py -- character.blend out --views front,side --grid 0.05
```

Read the joint positions off the two pictures (the grid lines are 5 cm apart, every fifth one heavier) and
write `joints.json`, in metres, for a model facing -Y with z up. Its left is +x:

```json
{"joints": {"hips": [0, 0, 0.66], "spine": [0, 0, 0.74], "chest": [0, 0, 0.85], "neck": [0, 0, 0.97],
            "head": [0, 0, 1.01], "head_top": [0, 0, 1.15],
            "shoulder_L": [0.135, 0, 0.95], "elbow_L": [0.21, 0, 0.79], "wrist_L": [0.285, 0, 0.65], "hand_L": [0.31, 0, 0.6],
            "hip_L": [0.07, 0, 0.635], "knee_L": [0.075, 0, 0.34], "ankle_L": [0.075, 0, 0.055], "toe_L": [0.075, -0.115, 0.02]},
 "extra_bones": [{"name": "ClothFront", "head": [0, -0.07, 0.61], "tail": [0, -0.135, 0.34], "parent": "Hips"},
                 {"name": "ClothBack", "head": [0, 0.07, 0.61], "tail": [0, 0.135, 0.34], "parent": "Hips"}]}
```

- Right-side joints are mirrored from the left when left out.
- Bones get the Mixamo names (`Hips`, `Spine`, `LeftArm`, `LeftForeArm`, `LeftUpLeg`…), so engines that map
  humanoids by name need no setup, and Mixamo clips fit.
- Long cloth below the hips gets two bones of its own, front and back, as children of `Hips`.
- An animal or a vehicle lists its bones directly: `{"bones": [{"name", "head", "tail", "parent"}]}`.

Draw the joints as dots on the renders and check them before any bone exists: a shoulder joint 3 cm too high
stretches the whole sleeve.

## 2. Tag the parts, and cut what only touches

```sh
blender -b --python <skill-dir>/scripts/tag_parts.py -- character.blend joints.json regions.json --render out
```

Every vertex is tagged with the body part of the nearest bone. `regions.json` corrects that by position:

```json
{"reach": {"arm_*": 0.055, "hand_*": 0.065},
 "regions": [{"name": "coat", "z": [0.3, 0.79], "from": ["torso", "leg_*"]}],
 "split": [["hand_*", "coat"], ["arm_*", "coat"], ["leg_*", "coat"]]}
```

- **`reach`** is how thick a limb is, measured from its bone. Without it, the side of a coat hanging next to an
  arm is nearer to the arm bone than to the spine, gets tagged as arm, follows the arm and tears.
- **`regions`** claim clothing and props by box (`x`, `y`, `z` ranges) from the parts named in `from`. Tag by
  position and not only by colour: a dark patch of coat mistaken for the scarf follows the scarf and leaves a
  hole in the back.
- **`split`** lists pairs that only touch. The mesh is cut along their border, because while a hand and a coat
  share vertices, nothing can stop one dragging the other.

Look at `parts_front.png` and `parts_back.png` before going on. Every stripe of the wrong colour is a tear
later.

A cut has no faces behind it. While the two parts stay close nobody sees it; when a leg swings far under a
tabard, a gap can show at the cut. Cut only where cloth lies over something that moves on its own.

## 3. Bind, then set the weights by rules

```sh
blender -b --python <skill-dir>/scripts/rig_rules.py -- character.blend joints.json rules.json
```

It builds the skeleton, binds with automatic weights (if those fail on a mesh with holes, it binds a
voxel-remeshed copy and copies the weights back), then applies `rules.json`:

```json
{"max_influences": 4, "fade": 0.04, "rules": [
  {"part": "torso",  "deny": ["*ForeArm", "*Hand"]},
  {"part": "coat",   "only": ["Hips", "Spine", "Spine2", "Cloth*", "*UpLeg"]},
  {"part": "head",   "only": ["Head", "Neck", "Spine2"]},
  {"part": "hand_L", "only": ["LeftHand"]}, {"part": "hand_R", "only": ["RightHand"]}]}
```

- `deny` takes bones away from a part; `only` leaves just the listed ones. Patterns use `*`.
- **Deny bones that have no business on a part** (a hand bone on a coat, an arm bone on a belt). **Do not deny
  the bone on the other side of a part's own joint:** the torso needs the upper arm at the shoulder, and the
  head needs the top of the spine at the neck. Denying those tears the joint.
- **A rule fades in** over `fade` metres from the border of a part. On the border the automatic weights stay,
  so two connected parts do not tear where they meet. Parts that were cut apart have no border between them, so
  nothing leaks across a cut.
- **At most four bones per vertex** (`max_influences`), then the weights are scaled to add up to 1. Engines
  skin with four. Where five bones met, the cut can leave a small step.
- **Rigid things get one bone.** A boot, a helmet or a shield should not bend: `{"part": "foot_L", "only":
  ["LeftFoot"]}` keeps the sole from dipping through the floor when the shin tilts.
- **No vertex is left on no bone.** Automatic weights miss a few vertices on most generated meshes (67 of
  10,169 on the test knight). The script puts each on its nearest bone and prints the count. Left alone, an
  exporter invents an extra bone for them, and the bone count read back after export is one too many.
- Never smooth weights across two tagged parts afterwards: smoothing leaks the hand bone back into the coat
  and pulls a spike out of it. Smooth only inside one part, around shoulders, elbows and knees.

Keep the three files. Rerunning the script rebuilds the skeleton and every weight from them.

## 4. Pose and measure

```sh
blender -b --python <skill-dir>/scripts/pose_test.py -- character.blend out --report poses.json
```

Five poses by default: arms up 90°, arms forward 60°, a step with each leg, head turned 60°. For each it
prints:

- the **longest stretched edge** against the rest pose (1.0 is unchanged) and the 95th percentile;
- **how far each part moves** on average. A coat that travels when only the arms move is following them;
- the **ten worst vertices**, each with its part and the bone that moves it most. That pair names the fix: a
  coat vertex led by `LeftHand` needs a rule or a cut; an arm vertex tagged `coat` needs a `reach` or a region.

Fix the tags and rules, run `tag_parts.py`, `rig_rules.py` and `pose_test.py` again, three rounds at most, then
show the user the pictures and the numbers that are left. `rig_rules.py --no-rules` binds without the rules,
to compare against.

What rules cannot fix: a generated mesh has no spare geometry in the armpit, so large shoulder turns stretch
the upper arm whatever the weights. Keep shoulder motion in clips near the rest pose, or accept it.

What to expect, measured on a generated knight with a tabard and a belt with pouches (20,000 triangles):

| Pose | As delivered | Cut apart | Cut apart, with rules |
|---|---|---|---|
| Step forward: how far the tabard and belt move | 2.6–2.9 cm | 1.8–2.2 cm | 0.35–0.5 cm |
| Arms up 90°: longest stretched edge | 7.1× | 5.5× | 5.5× |
| Step forward: longest stretched edge | 2.5–2.7× | 3.4–5.6× | 2.3–3.4× |

Read it as: the rules stop the cloth following the legs; cutting helps the shoulders; and a cut can raise the
worst edge in one pose, which the rules then pull most of the way back. The armpit stays the worst place.

Cloth that no longer follows the legs hangs still, and a leg then walks through it. Give the cloth bones their
own motion in each clip: `example_clips.py` swings `ClothFront` with the leading thigh and `ClothBack` with the
trailing one.
