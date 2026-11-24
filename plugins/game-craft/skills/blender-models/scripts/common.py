"""Blender helpers shared by the scripts in this folder.

Every script runs two ways: `blender -b --python script.py -- <args>`, or with Blender installed as the
`bpy` Python package, `python script.py <args>`. Scripts add this folder to sys.path before importing.
Renders use Cycles on the CPU by default, because it needs no display or GPU.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

VIEWS = {  # where the camera sits, as a direction from the model. Models face -Y (Blender's front view).
    "front": (0, -1, 0), "back": (0, 1, 0), "side": (1, 0, 0), "left": (-1, 0, 0), "top": (0, 0, 1), "34": (0.75, -1, 0.5)
}


def args():
    """Arguments for the script: whatever follows `--` inside Blender, or the whole command line outside it."""
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def load(path):
    """Open a .blend, or start empty and import a .glb, .gltf, .fbx or .obj."""
    ext = os.path.splitext(path)[1].lower()
    if ext == ".blend":
        bpy.ops.wm.open_mainfile(filepath=os.path.abspath(path))
        return
    reset()
    if ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path)
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=path)
    else:
        raise SystemExit(f"Cannot read {path}: use .blend, .glb, .gltf, .fbx or .obj")


def save(path):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(path), check_existing=False)


def read_json(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path, data):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)


def meshes():
    return [o for o in bpy.context.scene.objects if o.type == "MESH" and not o.name.startswith("_")]


def armature():
    return next((o for o in bpy.context.scene.objects if o.type == "ARMATURE"), None)


def activate(obj, *others):
    bpy.ops.object.select_all(action="DESELECT")
    for o in (obj, *others):
        o.select_set(True)
    bpy.context.view_layer.objects.active = obj


def bounds(objects):
    """World-space box around the objects: ((min x, y, z), (max x, y, z))."""
    points = [o.matrix_world @ Vector(corner) for o in objects for corner in o.bound_box]
    return tuple(min(p[i] for p in points) for i in range(3)), tuple(max(p[i] for p in points) for i in range(3))


def triangles(objects):
    return sum(len(p.vertices) - 2 for o in objects for p in o.data.polygons)


def mesh_gap(a, b):
    """Exact distance between two mesh surfaces in world space: 0 when they touch or pass through each other."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    trees = []
    for o in (a, b):
        mesh = o.evaluated_get(depsgraph).data
        verts = [o.matrix_world @ v.co for v in mesh.vertices]
        trees.append((BVHTree.FromPolygons(verts, [tuple(p.vertices) for p in mesh.polygons]), verts))
    (tree_a, verts_a), (tree_b, verts_b) = trees
    if tree_a.overlap(tree_b):
        return 0.0
    near = [tree_b.find_nearest(v)[3] for v in verts_a] + [tree_a.find_nearest(v)[3] for v in verts_b]
    return min(d for d in near if d is not None)


def flat_material(name, colour):
    """A matte material in one colour. colour is '#rrggbb' or (r, g, b) in 0..1."""
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    if isinstance(colour, str):
        colour = tuple(int(colour.lstrip("#")[i:i + 2], 16) / 255 for i in (0, 2, 4))
    rgb = tuple(c ** 2.2 for c in colour)  # the hex is what you see on screen; Blender wants linear light
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    if shader:
        shader.inputs["Base Color"].default_value = (*rgb, 1)
        shader.inputs["Roughness"].default_value = 0.9
    return mat


def render(path, view="front", objects=None, size=768, grid=0.0, samples=12):
    """Orthographic render of the objects (default: every mesh) from a named view, framed to fit.

    grid > 0 puts a line grid of that spacing (in metres) behind the model, for reading sizes and joints.
    """
    scene = bpy.context.scene
    objects = objects or meshes()
    lo, hi = bounds(objects)
    centre = Vector([(lo[i] + hi[i]) / 2 for i in range(3)])
    radius = max((Vector(hi) - Vector(lo)).length / 2, 0.05)
    direction = Vector(VIEWS[view]).normalized()

    # frame to what the camera sees: the box's corners measured across and up the view
    look = (-direction).to_track_quat("-Z", "Y")
    right, up = look @ Vector((1, 0, 0)), look @ Vector((0, 1, 0))
    corners = [Vector((x, y, z)) - centre for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2])]
    span = 2 * max(max(abs(c.dot(right)) for c in corners), max(abs(c.dot(up)) for c in corners))

    cam_data = bpy.data.cameras.new("_cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = max(span, 0.1) * 1.12
    cam_data.clip_end = radius * 40 + 100
    cam = bpy.data.objects.new("_cam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = centre + direction * (radius * 10 + 5)
    cam.rotation_euler = look.to_euler()
    scene.camera = cam

    extras = [cam]
    bare = [o for o in objects if o.type == "MESH" and not o.data.materials]  # an unpainted mesh renders pure white: give it clay
    for o in bare:
        o.data.materials.append(flat_material("_clay", (0.62, 0.6, 0.58)))
    sun_data = bpy.data.lights.new("_sun", "SUN")
    sun_data.energy = 2.2
    sun = bpy.data.objects.new("_sun", sun_data)
    scene.collection.objects.link(sun)
    sun.rotation_euler = (direction + Vector((-0.4, 0, 0.7))).normalized().to_track_quat("Z", "Y").to_euler()
    extras.append(sun)
    if grid > 0 and view != "34":
        extras.append(_grid(centre - direction * radius * 1.5, direction, span * 1.3, grid))

    world = scene.world or bpy.data.worlds.new("_world")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs[0].default_value = (0.82, 0.82, 0.84, 1)
        background.inputs[1].default_value = 0.7

    scene.render.engine = os.environ.get("BLENDER_RENDER_ENGINE", "CYCLES")
    if scene.render.engine == "CYCLES":
        scene.cycles.device = "CPU"
        scene.cycles.samples = samples
    scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.filepath = os.path.abspath(path)
    os.makedirs(os.path.dirname(scene.render.filepath), exist_ok=True)
    bpy.ops.render.render(write_still=True)
    for extra in extras:
        bpy.data.objects.remove(extra, do_unlink=True)
    for o in bare:
        o.data.materials.clear()
    return scene.render.filepath


def _grid(origin, normal, extent, step):
    """A square line grid facing `normal`, as thin dark strips, centred on `origin`."""
    lines = int(extent / step) + 1
    verts, faces, half, thick = [], [], lines * step / 2, step * 0.03
    for i in range(lines + 1):
        offset = -half + i * step
        heavy = thick * (2.2 if i % 5 == 0 else 1)
        for horizontal in (True, False):
            a = (-half, offset - heavy) if horizontal else (offset - heavy, -half)
            b = (half, offset + heavy) if horizontal else (offset + heavy, half)
            base = len(verts)
            verts += [(a[0], a[1], 0), (b[0], a[1], 0), (b[0], b[1], 0), (a[0], b[1], 0)]
            faces.append((base, base + 1, base + 2, base + 3))
    mesh = bpy.data.meshes.new("_grid")
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new("_grid", mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = origin
    obj.rotation_euler = normal.to_track_quat("Z", "Y").to_euler()
    mesh.materials.append(flat_material("_grid", (0.35, 0.35, 0.4)))
    return obj
