"""Clean a generated or downloaded mesh before any bone goes in.

    blender -b --python clean_mesh.py -- model.glb out.blend --height 1.15 [--turn 90] [--budget 20000]
                                         [--crowd 3000] [--report report.json] [--render out_dir]

1. Joins the meshes, turns the model (--turn degrees about the up axis, so it faces -Y), scales it to
   --height metres, puts the feet on z = 0 and the middle on the origin, and applies the transforms.
2. Merges vertices that sit on top of each other (seams torn open in motion start here) and counts loose parts.
3. Recalculates normals and counts holes (open edges) and zero-area faces.
4. Decimates to --budget triangles, and makes a low copy named <name>_crowd at --crowd triangles.
It keeps UVs through decimation but does not bake textures or normal maps: bake those from the original
onto the decimated mesh as a separate step when the model has a texture.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import bmesh

import common


def option(argv, name, default=None, kind=float):
    return kind(argv[argv.index(name) + 1]) if name in argv else default


def decimate(obj, target):
    count = common.triangles([obj])
    if target and count > target:
        mod = obj.modifiers.new("decimate", "DECIMATE")
        mod.ratio = target / count
        common.activate(obj)
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return common.triangles([obj])


def main(argv):
    common.load(argv[0])
    parts = common.meshes()
    if not parts:
        raise SystemExit("No mesh in " + argv[0])
    common.activate(parts[0], *parts[1:])
    if len(parts) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = "model"
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    report = {"source": os.path.basename(argv[0]), "triangles_in": common.triangles([obj])}

    # 1. orient, scale, ground
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.rotation_mode = "XYZ"  # imported objects often use quaternions, which ignore rotation_euler
    obj.rotation_euler = (0, 0, math.radians(option(argv, "--turn", 0.0)))
    bpy.ops.object.transform_apply(rotation=True)
    lo, hi = common.bounds([obj])
    height = option(argv, "--height")
    if height:
        factor = height / (hi[2] - lo[2])
        obj.scale = (factor, factor, factor)
        bpy.ops.object.transform_apply(scale=True)
        lo, hi = common.bounds([obj])
    obj.location = (-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2])
    bpy.ops.object.transform_apply(location=True)

    # 2 and 3. weld, normals, and what is wrong with the mesh
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    before = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0001)
    report["vertices_merged"] = before - len(bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    report["open_edges"] = sum(1 for e in bm.edges if len(e.link_faces) == 1)
    report["zero_area_faces"] = sum(1 for f in bm.faces if f.calc_area() < 1e-12)
    # loose parts: connected groups of vertices, counted without recursion
    seen, islands = set(), 0
    bm.verts.ensure_lookup_table()
    for start in bm.verts:
        if start.index in seen:
            continue
        islands += 1
        stack = [start]
        seen.add(start.index)
        while stack:
            vert = stack.pop()
            for edge in vert.link_edges:
                other = edge.other_vert(vert)
                if other.index not in seen:
                    seen.add(other.index)
                    stack.append(other)
    report["loose_parts"] = islands
    bm.to_mesh(obj.data)
    bm.free()

    # 4. budget copy and crowd copy
    crowd_target = option(argv, "--crowd", None, int)
    if crowd_target:
        common.activate(obj)
        bpy.ops.object.duplicate()
        crowd = bpy.context.view_layer.objects.active
        crowd.name = "model_crowd"
        report["triangles_crowd"] = decimate(crowd, crowd_target)
        crowd.hide_render = True
        crowd.name = "_model_crowd"  # the underscore keeps it out of renders and checks until it is wanted
    report["triangles_out"] = decimate(obj, option(argv, "--budget", None, int))
    lo, hi = common.bounds([obj])
    obj.location.z -= lo[2]  # decimating can move the lowest point: put the feet back on the floor
    common.activate(obj)
    bpy.ops.object.transform_apply(location=True)
    lo, hi = common.bounds([obj])
    report["size_m"] = [round(hi[i] - lo[i], 3) for i in range(3)]

    common.save(argv[1])
    if "--render" in argv:
        folder = argv[argv.index("--render") + 1]
        for view in ("front", "side", "back"):
            common.render(os.path.join(folder, f"clean_{view}.png"), view, [obj], grid=0.05)
    if "--report" in argv:
        common.write_json(argv[argv.index("--report") + 1], report)
    print("clean:", report)
    return report


if __name__ == "__main__":
    main(common.args())
