# Clips as code, checks and export

`<skill-dir>` is the blender-models folder.

## 1. Write clips on the rig they will play on

A clip copied onto a rig with a different rest pose breaks the legs. So clips are written against this rig's
own rest pose, as scripts:

- **Every frame starts from the rest pose.** A pose is a list of moves from it ("swing the left thigh 20°
  forward", "turn the head 30° about the up axis"), in the same form `pose_test.py` uses.
- **Limits on every joint:** knees and elbows bend one way; a wrist turns at most about 60°, each spine bone
  about 30°, the head about 70° to either side.
- **Loops close:** the last frame repeats the first.
- **Decide the frame rate once** (30 a second is a good default) and the length of each clip in frames.
- **For an action,** list the key poses first (guard, wind-up, strike, follow-through, guard), render them
  front and side, and get a yes before filling in the frames between. Weapons are children of the hand bone.

`example_clips.py` writes an idle and a walk this way and is meant to be copied:

```sh
blender -b --python <skill-dir>/scripts/example_clips.py -- character.blend
```

Its walk is built from where the feet must be, not from joint angles. A planted foot travels straight back
along the floor at a constant speed; a lifted foot follows an arc back to the front; the hips ride over the
planted leg at the height an almost straight leg allows. The thigh and knee angles are then solved from the
foot's position (two bones in a plane), and the foot is turned back level. Cloth bones swing with the thighs.
The script prints the speed the game must move the character at.

Build walks this way. A walk written as hand-tuned joint curves passed on a long-legged test figure and failed
on a short, stocky knight: late in each swing his foot cleared the floor by under a centimetre, and the check
rightly called it sliding. With IK available in the engine, pin the feet there as well.

## 2. Check every clip by numbers

```sh
blender -b --python <skill-dir>/scripts/check_clips.py -- character.blend --speed walk=0.95 --once attack
```

Per clip it prints, and marks as a failure when over the limit:

- **Foot slide:** how far each foot travels along the ground while planted. For a clip that walks on the spot
  and is moved by the game, give that speed with `--speed <clip>=<metres a second>`; a planted foot must then
  move backward at exactly that speed.
- **Lowest point** of the mesh: it must stay above the floor.
- **Hip height range,** to compare with what the clip is meant to do.
- **Loop difference:** how far the last frame is from the first. `--once <clip>` marks a clip that is not a loop.

A pose that passes every number can still look wrong: render a strip of frames and look, as animate-asset says.

## 3. Export and read it back

```sh
blender -b --python <skill-dir>/scripts/export_game.py -- character.blend out/character
```

It writes `character.fbx` and `character.glb` with the mesh, the skeleton and every clip, then imports each
into an empty scene and prints its bone count, triangle count, height and clip names. If those are not what
went in, the engine will not get them either.

- FBX is written with **Apply Transform off** and **Add Leaf Bones off**, at scale 1. Apply transforms on the
  mesh before rigging (`clean_mesh.py` does); applying them in the exporter is known to break rigged meshes.
- Bones need scale 1 and no rotation at rest, the root at the origin, and no skin weight on a root helper bone.

## 4. Into the engine

The project's rules and its engine's own documentation decide. These notes come from the source article and
were not tested here:

- **A web game (three.js, Babylon.js):** load the GLB; **character-models** covers loading, clips and the toon
  look.
- **Unity:** import as Humanoid for a biped (the Mixamo bone names map by themselves), Generic for anything
  else with a root bone you name. Tick Loop Time on looping clips; the file does not carry it.
- **Roblox:** import as a custom rig. Keep helper bones with no weights (weapon sockets) by leaving "zero
  influence bones" on. At most four bones per vertex. Texture size 1024 is the safe choice.
- **Any engine:** put a 1 m probe cube in the file and measure it after import. Importers change the scale of
  a whole file more often than they say.
