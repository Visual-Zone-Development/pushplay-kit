"""Pose the rig and measure where the mesh tears.

    blender -b --python pose_test.py -- model.blend out_dir [--poses poses.json] [--report report.json]

For each test pose it prints the longest stretched edge compared with the rest pose (1.0 = unchanged),
the 95th percentile, how far each tagged part moves on average, and the ten worst vertices with the
bone that moves each most. Edges under a quarter
of the typical edge length are left out, because slivers give huge ratios nobody can see. It renders every
pose from the front and the side. The default poses suit a biped with Mixamo bone names: arms up 90
degrees, arms forward 60, a step with each leg, head turned 60. Your own poses:
    [{"name": "reach", "moves": [{"bone": "LeftArm", "toward": [0, -1, 0], "degrees": 60},
                                 {"bone": "Head", "about": [0, 0, 1], "degrees": 40}]}]
"toward" swings a bone toward a world direction; "about" turns it around a world axis.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Matrix, Vector

import common
import metrics
from tag_parts import read_parts

UP, FORWARD, BACK = (0, 0, 1), (0, -1, 0), (0, 1, 0)
POSES = [
    {"name": "arms_up_90", "moves": [{"bone": "LeftArm", "toward": UP, "degrees": 90}, {"bone": "RightArm", "toward": UP, "degrees": 90}]},
    {"name": "arms_forward_60", "moves": [{"bone": "LeftArm", "toward": FORWARD, "degrees": 60}, {"bone": "RightArm", "toward": FORWARD, "degrees": 60}]},
    {"name": "step_left", "moves": [{"bone": "LeftUpLeg", "toward": FORWARD, "degrees": 35}, {"bone": "RightUpLeg", "toward": BACK, "degrees": 20}]},
    {"name": "step_right", "moves": [{"bone": "RightUpLeg", "toward": FORWARD, "degrees": 35}, {"bone": "LeftUpLeg", "toward": BACK, "degrees": 20}]},
    {"name": "head_turn_60", "moves": [{"bone": "Head", "about": UP, "degrees": 60}]}
]


def rest(rig):
    for bone in rig.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()


def move(rig, step):
    """Turn one pose bone around its head: toward a world direction, or about a world axis."""
    bone = rig.pose.bones.get(step["bone"])
    if not bone:
        return False
    if "toward" in step:
        axis = (bone.tail - bone.head).normalized().cross(Vector(step["toward"]).normalized())
        if axis.length < 1e-6:
            return True
    else:
        axis = Vector(step["about"])
    turn = Matrix.Translation(bone.head) @ Matrix.Rotation(math.radians(step["degrees"]), 4, axis.normalized()) @ Matrix.Translation(-bone.head)
    bone.matrix = turn @ bone.matrix
    bpy.context.view_layer.update()
    return True


def positions(mesh):
    evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    return [mesh.matrix_world @ v.co for v in evaluated.data.vertices]


def main(argv):
    common.load(argv[0])
    mesh = next(o for o in common.meshes() if o.name == "model")
    rig = common.armature()
    out = argv[1]
    poses = common.read_json(argv[argv.index("--poses") + 1]) if "--poses" in argv else POSES
    edges = [tuple(e.vertices) for e in mesh.data.edges]
    parts = read_parts(mesh) if "part" in mesh.data.attributes else None
    groups = {g.index: g.name for g in mesh.vertex_groups}
    rest(rig)
    base = positions(mesh)
    rest_lengths = [(base[a] - base[b]).length for a, b in edges]
    typical = sorted(rest_lengths)[len(rest_lengths) // 2]
    keep = [i for i, r in enumerate(rest_lengths) if r >= typical * 0.25]  # decimated meshes have slivers: skip them
    edges, rest_lengths = [edges[i] for i in keep], [rest_lengths[i] for i in keep]
    report = []
    for pose in poses:
        rest(rig)
        if not all([move(rig, step) for step in pose["moves"]]):
            print(f"  {pose['name']}: skipped, a bone is missing")
            continue
        now = positions(mesh)
        worst, index, p95 = metrics.stretch(rest_lengths, [(now[a] - now[b]).length for a, b in edges])
        per_vertex = {}
        for (a, b), r in zip(edges, rest_lengths):
            ratio = (now[a] - now[b]).length / r if r > 1e-9 else 1
            for v in (a, b):
                per_vertex[v] = max(per_vertex.get(v, 1), ratio)
        bad = []
        for v in sorted(per_vertex, key=per_vertex.get, reverse=True)[:10]:
            weights = sorted(((g.weight, groups[g.group]) for g in mesh.data.vertices[v].groups), reverse=True)
            bad.append({"vertex": v, "stretch": round(per_vertex[v], 2), "bone": weights[0][1] if weights else None, "part": parts[v] if parts else None})
        motion = {}
        if parts:  # how far each part moves on average: a coat that travels when only the arms move is following them
            for v, part in enumerate(parts):
                total, count = motion.get(part, (0.0, 0))
                motion[part] = (total + (now[v] - base[v]).length, count + 1)
            motion = {part: round(total / count, 4) for part, (total, count) in motion.items()}
        row = {"pose": pose["name"], "worst_stretch": round(worst, 2), "p95_stretch": round(p95, 3), "part_motion_m": motion, "worst_vertices": bad}
        report.append(row)
        print(f"  {pose['name']}: longest stretched edge x{row['worst_stretch']}, 95% of edges under x{row['p95_stretch']}; worst at {bad[0] if bad else None}")
        if "--no-render" not in argv:
            for view in ("front", "side"):
                common.render(os.path.join(out, f"pose_{pose['name']}_{view}.png"), view, [mesh], size=512)
    rest(rig)
    if "--report" in argv:
        common.write_json(argv[argv.index("--report") + 1], report)
    return report


if __name__ == "__main__":
    main(common.args())
