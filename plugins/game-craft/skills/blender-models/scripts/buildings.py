"""Worked example: buildings from a generator, not from single models.

    blender -b --python buildings.py -- out_dir [--count 6] [--seed 1]

One function per building type, each taking width, depth, floors, roof and colour. Windows and the door
are placed by rule. Every variant is exported as its own GLB and all of them are rendered in a row.
Change a rule once and every building follows; that is why streets come from code and not from a
generator of single meshes. Parts follow the same habits as any prop: a base, walls, a roof that
overhangs and has thickness, framed openings, a darker trim and one accent.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import bmesh
from mathutils import Matrix, Vector

import common

FLOOR = 2.6  # metres per storey


def box(name, size, at, colour, parent, rot_y=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if rot_y:
        bmesh.ops.transform(bm, matrix=Matrix.Rotation(rot_y, 4, "Y"), verts=bm.verts)
    bmesh.ops.translate(bm, vec=at, verts=bm.verts)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(common.flat_material("c_" + colour.lstrip("#"), colour))
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    return obj


def opening(parent, x, z, w, h, front, glass="#2e3f55", trim="#f4ecd8", door=False):
    """A framed window or door on the front wall (the wall at y = front, facing -Y)."""
    box("frame", (w + 0.16, 0.08, h + 0.16), (x, front - 0.02, z), trim, parent)
    box("door" if door else "glass", (w, 0.08, h), (x, front - 0.035, z), "#6a4028" if door else glass, parent)
    if door:
        box("step", (w + 0.5, 0.4, 0.14), (x, front - 0.2, 0.07), "#9a9488", parent)
        box("knob", (0.07, 0.06, 0.07), (x + w * 0.3, front - 0.09, z), "#e8c040", parent)
    else:
        box("sill", (w + 0.3, 0.16, 0.07), (x, front - 0.07, z - h / 2 - 0.1), trim, parent)
        box("bar", (0.05, 0.09, h), (x, front - 0.04, z), trim, parent)


def building(kind, width, depth, floors, roof, colour, rng):
    root = bpy.data.objects.new(kind, None)
    bpy.context.scene.collection.objects.link(root)
    height, front = floors * FLOOR, -depth / 2
    box("base", (width + 0.24, depth + 0.24, 0.3), (0, 0, 0.15), "#8f897c", root)
    box("walls", (width, depth, height), (0, 0, 0.3 + height / 2), colour, root)
    top = 0.3 + height
    if roof == "gable":  # two slabs that overhang, with a ridge cap and filled gable ends
        rise, half = width * 0.32, width / 2
        slope = math.hypot(half, rise) + 0.3
        angle = math.atan2(rise, half)
        for side in (-1, 1):
            mid = Vector((side * (half + 0.3 * math.cos(angle)) / 2, 0, top + rise - (slope / 2) * math.sin(angle) + 0.02))
            box("roof", (slope, depth + 0.5, 0.14), mid, "#a8432f", root, rot_y=side * angle)
        box("ridge", (0.3, depth + 0.56, 0.12), (0, 0, top + rise + 0.07), "#7d3020", root)
        for y in (front + 0.06, -front - 0.06):  # gable ends as stepped slabs, cheap and exact
            for i in range(5):
                w = width * (1 - (i + 0.5) / 5)
                box("gable", (w, 0.12, rise / 5 + 0.002), (0, y, top + rise * (i + 0.5) / 5), colour, root)
    else:  # flat roof with a parapet and a cornice
        box("cornice", (width + 0.3, depth + 0.3, 0.18), (0, 0, top + 0.09), "#f4ecd8", root)
        box("parapet", (width + 0.1, depth + 0.1, 0.4), (0, 0, top + 0.38), colour, root)
        box("roofdeck", (width - 0.3, depth - 0.3, 0.42), (0, 0, top + 0.38), "#5a5f66", root)
    # openings by rule: a door on the ground floor, windows on a regular bay grid
    bays = max(2, int(width // 1.5))
    step = width / bays
    door_bay = rng.randrange(bays)
    for floor in range(floors):
        for bay in range(bays):
            x, z = -width / 2 + step * (bay + 0.5), 0.3 + floor * FLOOR + 1.45
            if floor == 0 and bay == door_bay:
                opening(root, x, 0.3 + 1.05, 0.95, 2.1, front, door=True)
            elif kind == "shop" and floor == 0:
                opening(root, x, 0.3 + 1.3, step * 0.72, 1.7, front, glass="#5d7d8f")
            else:
                opening(root, x, z, 0.8, 1.2, front)
    if kind == "shop":
        box("awning", (width * 0.96, 0.9, 0.08), (0, front - 0.42, 0.3 + 2.42), rng.choice(["#c8553d", "#3d6fb6", "#3f9e4d"]), root)
        box("sign", (width * 0.6, 0.1, 0.5), (0, front - 0.06, 0.3 + FLOOR + 0.1), "#f4ecd8", root)
    if kind == "house":
        box("chimney", (0.45, 0.45, 1.3), (width * 0.28, depth * 0.2, top + 0.6), "#8a5a44", root)
        box("chimney_cap", (0.58, 0.58, 0.1), (width * 0.28, depth * 0.2, top + 1.3), "#6b655c", root)
    return root


TYPES = {
    "house": lambda rng: dict(width=rng.uniform(5, 7), depth=rng.uniform(5, 6.5), floors=rng.choice([1, 2]), roof="gable", colour=rng.choice(["#f3e3c3", "#e8d2b0", "#d9c2a2", "#cfd8c4"])),
    "shop": lambda rng: dict(width=rng.uniform(6, 9), depth=rng.uniform(6, 8), floors=rng.choice([2, 3]), roof="flat", colour=rng.choice(["#d8a48f", "#c9b79c", "#a9b8c4"])),
    "tower": lambda rng: dict(width=rng.uniform(4, 5), depth=rng.uniform(4, 5), floors=rng.choice([4, 5, 6]), roof=rng.choice(["flat", "gable"]), colour=rng.choice(["#b9b1a2", "#c7b8a0"]))
}


def main(argv):
    out = argv[0]
    count = int(argv[argv.index("--count") + 1]) if "--count" in argv else 6
    seed = int(argv[argv.index("--seed") + 1]) if "--seed" in argv else 1
    common.reset()
    os.makedirs(out, exist_ok=True)
    cursor, report = 0.0, []
    for i in range(count):
        rng = random.Random(seed * 1000 + i)
        kind = list(TYPES)[i % len(TYPES)]
        params = TYPES[kind](rng)
        root = building(kind, rng=rng, **params)
        parts = list(root.children)
        bpy.context.view_layer.update()
        common.activate(parts[0], *parts[1:])  # one variant per file, exported where it was built, at the origin
        path = os.path.join(out, f"{kind}_{seed}_{i}.glb")
        bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_apply=True)
        report.append({"file": os.path.basename(path), "kind": kind, "triangles": common.triangles(parts), **{k: (round(v, 2) if isinstance(v, float) else v) for k, v in params.items()}})
        root.location.x = cursor + params["width"] / 2  # then line it up for the row render
        cursor += params["width"] + 1.5
    bpy.context.view_layer.update()
    common.render(os.path.join(out, "row.png"), "34", size=1024)
    common.write_json(os.path.join(out, "buildings.json"), report)
    for row in report:
        print("  ", row)
    return report


if __name__ == "__main__":
    main(common.args())
