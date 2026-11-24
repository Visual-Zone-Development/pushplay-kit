"""Check every clip by numbers.

    blender -b --python check_clips.py -- model.blend [--speed walk=1.2] [--once attack] [--report report.json]

For each action it prints: how far each foot slides while planted (--speed <clip>=<m/s> for a clip that
walks on the spot and is moved by the game), the lowest point of the mesh (it must stay above the floor),
the range of hip height, and how far the last frame is from the first (0 for a loop; --once <clip> marks
a clip that is not meant to loop). A failure is marked; a pose that merely looks wrong still needs eyes.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy

import common
import metrics

FLOOR_TOLERANCE = 0.01   # metres the mesh may dip under z = 0
LOOP_TOLERANCE = 0.002   # largest allowed difference between first and last frame of a loop
SLIDE_TOLERANCE = 0.03   # metres a planted foot may travel in one clip


def main(argv):
    common.load(argv[0])
    rig = common.armature()
    mesh = next((o for o in common.meshes() if o.name == "model"), None)
    speeds = dict(pair.split("=") for i, pair in enumerate(argv) if i and argv[i - 1] == "--speed")
    once = {argv[i + 1] for i, a in enumerate(argv) if a == "--once"}
    fps = bpy.context.scene.render.fps
    feet = [b for b in rig.pose.bones if b.name.endswith("Foot")]
    scene, report = bpy.context.scene, []
    for action in [a for a in bpy.data.actions if not a.name.startswith("_")]:
        rig.animation_data.action = action
        if getattr(action, "slots", None):
            rig.animation_data.action_slot = action.slots[0]
        start, end = (int(round(f)) for f in action.frame_range)
        tracks = {foot.name: [] for foot in feet}
        lowest, hips, poses = 1e9, [], []
        scene.frame_set(start)
        ankle_rest = {foot.name: min((rig.matrix_world @ foot.head).z, 1e9) for foot in feet}
        for frame in range(start, end + 1):
            scene.frame_set(frame)
            for foot in feet:
                p = rig.matrix_world @ foot.head
                tracks[foot.name].append((p.x, p.y, p.z))
            if "Hips" in rig.pose.bones:
                hips.append((rig.matrix_world @ rig.pose.bones["Hips"].head).z)
            if mesh:
                evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
                lowest = min(lowest, min((mesh.matrix_world @ v.co).z for v in evaluated.data.vertices))
            if frame in (start, end):
                poses.append([x for bone in rig.pose.bones for row in bone.matrix for x in row])
        # a foot counts as planted while its ankle is within 1 cm of the lowest it gets in the clip
        slides = {}
        for name, track in tracks.items():
            floor = min(p[2] for p in track) + 0.01
            slides[name] = round(metrics.foot_slide(track, floor, float(speeds.get(action.name, 0)), fps), 3)
        row = {"clip": action.name, "frames": end - start + 1, "foot_slide_m": slides, "lowest_point_m": round(lowest, 3) if mesh else None,
               "hips_range_m": [round(min(hips), 3), round(max(hips), 3)] if hips else None,
               "loop_difference": round(metrics.loop_difference(*poses), 4) if len(poses) == 2 else None, "failures": []}
        if mesh and lowest < -FLOOR_TOLERANCE:
            row["failures"].append(f"goes {-lowest * 100:.1f} cm under the floor")
        if action.name not in once and row["loop_difference"] is not None and row["loop_difference"] > LOOP_TOLERANCE:
            row["failures"].append("the last frame does not match the first")
        if any(s > SLIDE_TOLERANCE for s in slides.values()):
            row["failures"].append("a planted foot slides")
        report.append(row)
        print("  ", row)
    rig.animation_data.action = None
    if "--report" in argv:
        common.write_json(argv[argv.index("--report") + 1], report)
    return report


if __name__ == "__main__":
    main(common.args())
