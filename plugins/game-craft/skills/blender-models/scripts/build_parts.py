"""Build a prop from a parts list: numbers first, geometry second.

    blender -b --python build_parts.py -- parts.json out.blend [--glb out.glb] [--render out_dir]

parts.json, in metres, origin at the base centre, front toward -Y:
    {"name": "mailbox", "budget_tris": 2000, "parts": [
      {"name": "post", "type": "box", "at": [0, 0, 0.36], "size": [0.075, 0.075, 0.72], "colour": "#6b4a30", "attach": null},
      {"name": "body", "type": "box", "at": [0, 0, 0.78], "size": [0.24, 0.38, 0.14], "colour": "#3d6fb6", "attach": "post"}]}

Part types: box; cylinder (size = width, depth, height; "sides", "axis" x|y|z); outline (a side-view
"points" list [[y, z], ...] extruded across "width"). Options on any part: "top" (scale of the top face,
for tapers), "bevel" in metres (boxes default to 0.002, other types to 0), "rot" in degrees.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import bmesh
from mathutils import Matrix

import common


def build_part(part):
    bm = bmesh.new()
    size = part.get("size", [0.1, 0.1, 0.1])
    kind = part.get("type", "box")
    if kind == "box":
        bmesh.ops.create_cube(bm, size=1)
        bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    elif kind == "cylinder":
        bmesh.ops.create_cone(bm, cap_ends=True, segments=part.get("sides", 12), radius1=0.5, radius2=0.5, depth=1)
        axis = part.get("axis", "z")
        if axis != "z":  # turn the unit cylinder first, so "size" is always the finished width, depth, height
            turn = Matrix.Rotation(math.pi / 2, 4, "Y" if axis == "x" else "X")
            bmesh.ops.transform(bm, matrix=turn, verts=bm.verts)
        bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    elif kind == "outline":
        points = part["points"]
        width = part.get("width", 0.05)
        face = bm.faces.new([bm.verts.new((-width / 2, y, z)) for y, z in points])
        extruded = bmesh.ops.extrude_face_region(bm, geom=[face])
        bmesh.ops.translate(bm, vec=(width, 0, 0), verts=[g for g in extruded["geom"] if isinstance(g, bmesh.types.BMVert)])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    else:
        raise SystemExit(f"Part {part['name']}: unknown type {kind}")
    if "top" in part:  # taper: scale the vertices above the middle toward the centre line
        top = max(v.co.z for v in bm.verts)
        for v in bm.verts:
            if v.co.z > top - 1e-6:
                v.co.x *= part["top"]
                v.co.y *= part["top"]
    bevel = part.get("bevel", 0.002 if kind == "box" else 0)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1, affect="EDGES")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(part["name"])
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(part["name"], mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = part.get("at", (0, 0, 0))
    obj.rotation_euler = [math.radians(a) for a in part.get("rot", (0, 0, 0))]
    mesh.materials.append(common.flat_material("c_" + part.get("colour", "#888888").lstrip("#"), part.get("colour", "#888888")))
    return obj


def main(argv):
    spec = common.read_json(argv[0])
    common.reset()
    objects = [build_part(part) for part in spec["parts"]]
    bpy.context.view_layer.update()
    for obj in objects:  # bake position and rotation into the mesh, so exports carry no transforms
        common.activate(obj)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    common.save(argv[1])
    if "--glb" in argv:
        bpy.ops.export_scene.gltf(filepath=argv[argv.index("--glb") + 1], export_apply=True)
    if "--render" in argv:
        folder = argv[argv.index("--render") + 1]
        for view in ("front", "side", "34"):
            common.render(os.path.join(folder, f"{spec.get('name', 'prop')}_{view}.png"), view, grid=0.05 if view != "34" else 0)
    print(f"built {len(objects)} parts, {common.triangles(objects)} triangles -> {argv[1]}")
    return objects


if __name__ == "__main__":
    main(common.args())
