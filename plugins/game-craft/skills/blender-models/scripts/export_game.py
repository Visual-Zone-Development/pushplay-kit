"""Export the rigged model for a game engine, then read it back to prove what was written.

    blender -b --python export_game.py -- model.blend out/character [--report report.json]

Writes out/character.fbx and out/character.glb with the mesh, the skeleton and every clip. FBX is
written with Apply Transform off and Add Leaf Bones off, at scale 1: apply transforms on the mesh
before rigging (clean_mesh.py does), not in the exporter. Each file is then imported into an empty
scene and its bone count, triangle count, height and clip names are printed.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy

import common


def summary(path):
    common.load(path)
    rig = common.armature()
    parts = [m for m in common.meshes() if any(mod.type == "ARMATURE" for mod in m.modifiers)] or common.meshes()
    lo, hi = common.bounds(parts)
    return {"file": os.path.basename(path), "bones": len(rig.data.bones) if rig else 0, "triangles": common.triangles(parts),
            "height_m": round(hi[2] - lo[2], 3), "clips": sorted(a.name.split("|")[-1] for a in bpy.data.actions)}


def main(argv):
    common.load(argv[0])
    base = os.path.abspath(argv[1])
    os.makedirs(os.path.dirname(base), exist_ok=True)
    mesh = next(o for o in common.meshes() if o.name == "model")
    rig = common.armature()
    common.activate(mesh, rig)
    bpy.ops.export_scene.fbx(filepath=base + ".fbx", use_selection=True, add_leaf_bones=False, bake_space_transform=False,
                             global_scale=1.0, bake_anim=True, bake_anim_use_all_actions=True, bake_anim_use_nla_strips=False,
                             object_types={"ARMATURE", "MESH"})
    bpy.ops.export_scene.gltf(filepath=base + ".glb", use_selection=True, export_animations=True, export_animation_mode="ACTIONS")
    report = [summary(base + ".fbx"), summary(base + ".glb")]
    for row in report:
        print("  ", row)
    if "--report" in argv:
        common.write_json(argv[argv.index("--report") + 1], report)
    return report


if __name__ == "__main__":
    main(common.args())
