"""Run the whole pipeline on test models and check the numbers. Needs Blender.

    blender -b --python selftest.py -- out_dir          (or: python selftest.py out_dir, with the bpy package)

Props: builds a mailbox from a parts list, checks the assembly, then moves one part and checks that the
gap is caught. Buildings: generates three variants. Character: builds a biped with a long coat, fuses it
into one shell by voxel remeshing (which is what an image-to-3D generator hands you), then cleans it,
tags its parts, and rigs it three ways (as delivered; with touching parts cut apart; cut apart and with
weight rules) to compare the pose tests. Then it writes and checks two clips, exports FBX and GLB and
reads them back. Exits with status 1 if a check fails.
"""
import math
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import bmesh
from mathutils import Vector

import build_parts
import buildings
import check_assembly
import check_clips
import clean_mesh
import common
import example_clips
import export_game
import pose_test
import rig_rules
import tag_parts

MAILBOX = {"name": "mailbox", "budget_tris": 2000, "parts": [
    {"name": "post", "type": "box", "at": [0, 0, 0.36], "size": [0.075, 0.075, 0.72], "colour": "#6b4a30", "attach": None},
    {"name": "base", "type": "box", "at": [0, 0, 0.02], "size": [0.2, 0.2, 0.04], "colour": "#8a8377", "attach": "post", "top": 0.8},
    {"name": "body", "type": "box", "at": [0, 0, 0.78], "size": [0.24, 0.38, 0.14], "colour": "#3d6fb6", "attach": "post"},
    {"name": "lid", "type": "cylinder", "axis": "y", "sides": 14, "at": [0, 0, 0.85], "size": [0.24, 0.39, 0.24], "colour": "#3d6fb6", "attach": "body"},
    {"name": "slot", "type": "box", "at": [0, -0.196, 0.84], "size": [0.14, 0.006, 0.018], "colour": "#1c2a44", "attach": "lid", "bevel": 0},
    {"name": "flag_arm", "type": "box", "at": [0.126, 0.05, 0.9], "size": [0.012, 0.014, 0.2], "colour": "#6b4a30", "attach": "body"},
    {"name": "flag", "type": "outline", "at": [0.132, 0.05, 0.94], "points": [[0, 0], [0.12, 0.03], [0, 0.06]], "width": 0.008, "colour": "#e8403a", "attach": "flag_arm", "bevel": 0}]}

H = 1.7  # the shell is built at this height, facing +X as many generators deliver it, then cleaned to 1.15 m
JOINTS = {"hips": [0, 0, 0.98], "spine": [0, 0, 1.1], "chest": [0, 0, 1.26], "neck": [0, 0, 1.44], "head": [0, 0, 1.5], "head_top": [0, 0, 1.7],
          "shoulder_L": [0.2, 0, 1.4], "elbow_L": [0.31, 0, 1.17], "wrist_L": [0.42, 0, 0.96], "hand_L": [0.46, 0, 0.88],
          "hip_L": [0.1, 0, 0.94], "knee_L": [0.11, 0, 0.5], "ankle_L": [0.11, 0, 0.08], "toe_L": [0.11, -0.17, 0.03]}
RULES = {"max_influences": 4, "rules": [
    {"part": "torso", "deny": ["*ForeArm", "*Hand"]},  # the upper arm stays: the shoulder needs both sides
    {"part": "coat", "only": ["Hips", "Spine", "Spine2", "Cloth*", "*UpLeg"]},
    {"part": "head", "only": ["Head", "Neck", "Spine2"]},  # Spine2 stays, or the neck tears where head meets torso
    {"part": "hand_L", "only": ["LeftHand"]}, {"part": "hand_R", "only": ["RightHand"]}]}


def limb(bm, a, b, r1, r2):
    a, b = Vector(a), Vector(b)
    made = bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=r1, radius2=r2, depth=(b - a).length)
    turn = (b - a).to_track_quat("Z", "Y").to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=turn, verts=made["verts"])
    bmesh.ops.translate(bm, vec=(a + b) / 2, verts=made["verts"])
    for centre, radius in ((a, r1), (b, r2)):
        ball(bm, centre, (radius, radius, radius))


def ball(bm, centre, radii):
    made = bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=1)
    bmesh.ops.scale(bm, vec=radii, verts=made["verts"])
    bmesh.ops.translate(bm, vec=centre, verts=made["verts"])


def make_shell(path):
    """A biped in an A-pose with a long coat that touches its hands, fused into one skin."""
    common.reset()
    bm = bmesh.new()
    ball(bm, (0, 0, 1.12), (0.19, 0.13, 0.3)); ball(bm, (0, 0, 1.3), (0.21, 0.14, 0.2)); ball(bm, (0, 0, 1.58), (0.12, 0.13, 0.13))
    limb(bm, (0, 0, 1.4), (0, 0, 1.5), 0.06, 0.055)
    for s in (-1, 1):
        limb(bm, (s * 0.2, 0, 1.4), (s * 0.31, 0, 1.17), 0.055, 0.048); limb(bm, (s * 0.31, 0, 1.17), (s * 0.42, 0, 0.96), 0.048, 0.04)
        ball(bm, (s * 0.45, 0, 0.9), (0.05, 0.035, 0.07))
        limb(bm, (s * 0.1, 0, 0.94), (s * 0.11, 0, 0.5), 0.08, 0.06); limb(bm, (s * 0.11, 0, 0.5), (s * 0.11, 0, 0.08), 0.06, 0.045)
        made = bmesh.ops.create_cube(bm, size=1); bmesh.ops.scale(bm, vec=(0.1, 0.27, 0.08), verts=made["verts"]); bmesh.ops.translate(bm, vec=(s * 0.11, -0.06, 0.04), verts=made["verts"])
    coat = bmesh.ops.create_cone(bm, cap_ends=True, segments=28, radius1=1, radius2=0.5, depth=0.75)  # a bell from chest to knee
    for v in coat["verts"]:
        v.co.x *= 0.44 if v.co.z < 0 else 0.44
        v.co.y *= 0.3
    bmesh.ops.translate(bm, vec=(0, 0, 0.82), verts=coat["verts"])
    mesh = bpy.data.meshes.new("shell"); bm.to_mesh(mesh); bm.free()
    obj = bpy.data.objects.new("shell", mesh); bpy.context.scene.collection.objects.link(obj)
    common.activate(obj)
    remesh = obj.modifiers.new("fuse", "REMESH"); remesh.mode, remesh.voxel_size = "VOXEL", 0.014
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    obj.rotation_euler.z = math.radians(90)  # now it faces +X
    bpy.ops.object.transform_apply(rotation=True)
    bpy.ops.export_scene.gltf(filepath=path)
    return common.triangles([obj])


def main(argv):
    out = os.path.abspath(argv[0] if argv else "selftest_out")
    os.makedirs(out, exist_ok=True)
    renders, failures = os.path.join(out, "renders"), []

    def check(ok, text):
        print(("PASS  " if ok else "FAIL  ") + text)
        if not ok:
            failures.append(text)

    print("== props from a parts list")
    spec_path = os.path.join(out, "mailbox.json"); common.write_json(spec_path, MAILBOX)
    prop = os.path.join(out, "mailbox.blend")
    build_parts.main([spec_path, prop, "--glb", os.path.join(out, "mailbox.glb"), "--render", renders])
    check(not check_assembly.main([prop, spec_path])["failures"], "the mailbox passes the assembly check")
    common.load(prop); bpy.data.objects["flag"].location.x += 0.03; common.save(os.path.join(out, "mailbox_broken.blend"))
    broken = check_assembly.main([os.path.join(out, "mailbox_broken.blend"), spec_path])["failures"]
    check(any(f.startswith("flag: floats") for f in broken), f"a part moved 3 cm away is caught: {broken}")

    print("== buildings from a generator")
    made = buildings.main([os.path.join(out, "buildings"), "--count", "3"])
    check(len(made) == 3 and all(os.path.exists(os.path.join(out, "buildings", b["file"])) for b in made), "three building variants are exported")

    print("== character: a fused shell, as a generator would deliver it")
    shell, work = os.path.join(out, "shell.glb"), os.path.join(out, "character.blend")
    print("  shell triangles:", make_shell(shell))
    cleaned = clean_mesh.main([shell, work, "--turn", "-90", "--height", "1.15", "--budget", "20000", "--crowd", "3000", "--render", renders])
    check(abs(cleaned["size_m"][2] - 1.15) < 0.005 and cleaned["triangles_out"] <= 20000, f"cleaned to 1.15 m and {cleaned['triangles_out']} triangles")
    check(cleaned["size_m"][0] > cleaned["size_m"][1], "the model was turned to face -Y (wider across than deep)")
    k = 1.15 / H
    joints_path, regions_path, rules_path = (os.path.join(out, n) for n in ("joints.json", "regions.json", "rules.json"))
    cloth = [{"name": "ClothFront", "head": [0, -0.1 * k, 0.9 * k], "tail": [0, -0.2 * k, 0.5 * k], "parent": "Hips"},
             {"name": "ClothBack", "head": [0, 0.1 * k, 0.9 * k], "tail": [0, 0.2 * k, 0.5 * k], "parent": "Hips"}]
    common.write_json(joints_path, {"joints": {name: [c * k for c in p] for name, p in JOINTS.items()}, "extra_bones": cloth})
    common.write_json(regions_path, {"reach": {"arm_*": 0.055, "hand_*": 0.065}, "regions": [{"name": "coat", "z": [0.44 * k, 1.16 * k], "from": ["torso", "leg_*"]}],
                                     "split": [["hand_*", "coat"], ["arm_*", "coat"], ["leg_*", "coat"]]})
    common.write_json(rules_path, RULES)
    # the mesh as delivered: tagged the same way, but nothing cut apart and no rules
    fused, uncut_path = os.path.join(out, "fused.blend"), os.path.join(out, "regions_uncut.json")
    shutil.copy(work, fused)
    common.write_json(uncut_path, {k: v for k, v in common.read_json(regions_path).items() if k != "split"})
    tag_parts.main([fused, joints_path, uncut_path])
    rig_rules.main([fused, joints_path, rules_path, "--no-rules"])
    naive = {r["pose"]: r for r in pose_test.main([fused, os.path.join(renders, "fused")])}
    parts = tag_parts.main([work, joints_path, regions_path, "--render", renders])
    check(all(name in parts for name in ("coat", "head", "torso", "arm_L", "hand_R", "leg_L")), f"parts tagged: {sorted(parts)}")

    print("== rig without rules, then with rules")
    unruled = rig_rules.main([work, joints_path, rules_path, "--no-rules"])
    plain = {r["pose"]: r for r in pose_test.main([work, os.path.join(renders, "no_rules")])}
    rigged = rig_rules.main([work, joints_path, rules_path])
    ruled = {r["pose"]: r for r in pose_test.main([work, os.path.join(renders, "rules")])}
    check(rigged["vertices_changed"] > unruled["vertices_changed"], f"the rules took bones away from {rigged['vertices_changed']} vertices (the bone limit alone: {unruled['vertices_changed']})")
    print("  pose: longest stretched edge / coat movement in cm, as delivered -> cut apart -> cut apart with rules")
    for name in plain:
        cells = [f"x{run[name]['worst_stretch']} / {run[name]['part_motion_m']['coat'] * 100:.2f}" for run in (naive, plain, ruled)]
        print(f"  {name}: " + " -> ".join(cells))
    drag = [run["arms_up_90"]["part_motion_m"]["coat"] for run in (naive, plain, ruled)]
    check(drag[2] < drag[0] * 0.5, f"arms up 90: the coat follows the arms less than half as far once cut apart and ruled ({drag[0] * 100:.2f} cm -> {drag[2] * 100:.2f} cm on average)")
    check(drag[2] <= drag[1], f"arms up 90: the rules never add coat movement ({drag[1] * 100:.2f} cm -> {drag[2] * 100:.2f} cm)")
    check(all(ruled[name]["worst_stretch"] <= plain[name]["worst_stretch"] * 1.1 for name in plain), "no test pose tears more with the rules than without them")
    common.write_json(os.path.join(out, "pose_report.json"), {"as_delivered": naive, "cut_apart": plain, "cut_apart_with_rules": ruled})

    print("== clips, checks and export")
    written = example_clips.main([work])
    clips = {c["clip"]: c for c in check_clips.main([work, "--speed", f"walk={written['walk_speed']}"])}
    check(set(clips) == {"idle", "walk"}, "idle and walk were written")
    check(all(c["loop_difference"] <= 0.002 for c in clips.values()), "both loops close: the last frame matches the first")
    check(all(c["lowest_point_m"] > -0.01 for c in clips.values()), "the mesh stays above the floor in both clips")
    check(not clips["walk"]["failures"], f"the walk's planted feet do not slide at {written['walk_speed']} m/s: {clips['walk']['foot_slide_m']}")
    still = check_clips.main([work])  # the same walk with the game moving nobody: the feet must be caught sliding
    check(any("slides" in f for c in still if c["clip"] == "walk" for f in c["failures"]), "without that speed, the same walk is reported as sliding")
    exported = export_game.main([work, os.path.join(out, "export", "character")])
    for row in exported:
        check(row["bones"] == rigged["bones"] and {"idle", "walk"} <= set(row["clips"]) and abs(row["height_m"] - 1.15) < 0.02,
              f"{row['file']} reads back with {row['bones']} bones, {row['triangles']} triangles, {row['height_m']} m, clips {row['clips']}")

    print(f"\n{'SELFTEST FAILED: ' + str(len(failures)) if failures else 'SELFTEST OK'}  (files in {out})")
    return failures


if __name__ == "__main__":
    sys.exit(1 if main(common.args()) else 0)
