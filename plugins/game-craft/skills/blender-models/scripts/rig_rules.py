"""Build the skeleton, bind the mesh, then set the weights by rules.

    blender -b --python rig_rules.py -- model.blend joints.json [rules.json] [--no-rules]

--no-rules binds with automatic weights and only the bone limit, to compare against in pose_test.py.

Run tag_parts.py first. Automatic weights cannot tell clothes from body on a fused shell, so a raised
arm drags the coat with it. rules.json says which bones each tagged part may follow:
    {"max_influences": 4, "rules": [
      {"part": "torso",  "deny": ["*Arm", "*ForeArm", "*Hand"]},
      {"part": "coat",   "only": ["Hips", "Spine", "Cloth*", "*UpLeg"]},
      {"part": "hand_L", "only": ["LeftHand"]}]}
Weights on bones a part may not follow are removed, the strongest four are kept (engines skin with at
most four bones per vertex; where five met, the cut can leave a small step) and they are scaled to add
up to 1. A rule fades in over "fade" metres (default 0.04) from the border of a part: on the border
the automatic weights are kept, so the mesh does not tear where two connected parts meet; deeper in, the
forbidden bones are gone. Parts cut apart by tag_parts.py share no border, so nothing leaks across a
cut. Rerun this script after any change: it rebuilds the skeleton and the weights from the files.

A vertex that automatic weights left on no bone at all is put on its nearest bone, and the count is
reported: left alone, an exporter invents an extra bone for such vertices.

Deny bones that have no business on a part (a hand on a coat). Do not deny the bone on the other side
of a part's own joint (the upper arm on the torso): that joint needs both.
"""
import heapq
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy

import common
import metrics
import skeleton
from tag_parts import read_parts


def build_armature(bones):
    data = bpy.data.armatures.new("Armature")
    obj = bpy.data.objects.new("Armature", data)
    bpy.context.scene.collection.objects.link(obj)
    common.activate(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    for bone in bones:
        edit = data.edit_bones.new(bone["name"])
        edit.head, edit.tail = bone["head"], bone["tail"]
        if bone.get("parent"):
            edit.parent = data.edit_bones[bone["parent"]]
    bpy.ops.object.mode_set(mode="OBJECT")
    return obj


def bind(mesh, rig):
    """Automatic weights; if they fail on a mesh with holes, bind a voxel-remeshed copy and copy its weights across."""
    common.activate(mesh, rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    bone_names = {b.name for b in rig.data.bones}
    weighted = sum(1 for v in mesh.data.vertices if any(mesh.vertex_groups[g.group].name in bone_names and g.weight > 0 for g in v.groups))
    if weighted >= len(mesh.data.vertices) * 0.98:
        return "automatic weights"
    lo, hi = common.bounds([mesh])
    common.activate(mesh)
    bpy.ops.object.duplicate()
    proxy = bpy.context.view_layer.objects.active
    proxy.vertex_groups.clear()
    remesh = proxy.modifiers.new("remesh", "REMESH")
    remesh.mode, remesh.voxel_size = "VOXEL", (hi[2] - lo[2]) / 90
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    common.activate(proxy, rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    mesh.vertex_groups.clear()
    transfer = mesh.modifiers.new("transfer", "DATA_TRANSFER")
    transfer.object, transfer.use_vert_data = proxy, True
    transfer.data_types_verts, transfer.vert_mapping = {"VGROUP_WEIGHTS"}, "POLYINTERP_NEAREST"
    common.activate(mesh)
    bpy.ops.object.datalayout_transfer(modifier=transfer.name)
    bpy.ops.object.modifier_apply(modifier=transfer.name)
    bpy.data.objects.remove(proxy, do_unlink=True)
    return "weights copied from a remeshed copy"


def border_distance(mesh, parts, limit):
    """Distance along the mesh from every vertex to the nearest vertex of another part, up to `limit`."""
    neighbours = [[] for _ in mesh.data.vertices]
    for edge in mesh.data.edges:
        a, b = edge.vertices
        length = (mesh.data.vertices[a].co - mesh.data.vertices[b].co).length
        neighbours[a].append((b, length))
        neighbours[b].append((a, length))
    distance = [limit] * len(neighbours)
    queue = []
    for v, linked in enumerate(neighbours):
        if any(parts[other] != parts[v] for other, _ in linked):
            distance[v] = 0.0
            queue.append((0.0, v))
    heapq.heapify(queue)
    while queue:
        d, v = heapq.heappop(queue)
        if d > distance[v]:
            continue
        for other, length in neighbours[v]:
            if d + length < distance[other]:
                distance[other] = d + length
                heapq.heappush(queue, (d + length, other))
    return distance


def apply_rules(mesh, rig, config, bones):
    rules, limit = config.get("rules", []), config.get("max_influences", 4)
    band = config.get("fade", 0.04)
    bone_names = {b.name for b in rig.data.bones}
    groups = {g.index: g for g in mesh.vertex_groups if g.name in bone_names}
    parts = read_parts(mesh)
    depth = border_distance(mesh, parts, band)
    changed, orphans = 0, 0
    for vert in mesh.data.vertices:
        current = {groups[g.group].name: g.weight for g in vert.groups if g.group in groups and g.weight > 0}
        if not current:  # automatic weights left it on no bone: an exporter would invent a bone for it
            current = {skeleton.nearest_bone(mesh.matrix_world @ vert.co, bones): 1.0}
            orphans += 1
        part = parts[vert.index]
        only = next((r["only"] for r in rules if r["part"] == part and "only" in r), [])
        fallback = next((name for name in only if name in bone_names), None)
        wanted = metrics.apply_rules(current, part, rules, limit, fallback, metrics.fade(depth[vert.index], band))
        if set(wanted) != {name for name, weight in current.items() if weight > 0}:
            changed += 1
        for group in groups.values():
            if group.name in wanted:
                group.add([vert.index], wanted[group.name], "REPLACE")
            elif group.name in current:
                group.remove([vert.index])
        for name in wanted:
            if name not in {g.name for g in groups.values()}:
                group = mesh.vertex_groups.new(name=name)
                groups[group.index] = group
                group.add([vert.index], wanted[name], "REPLACE")
    return changed, orphans


def main(argv):
    common.load(argv[0])
    mesh = next(o for o in common.meshes() if o.name == "model")
    old = common.armature()
    if old:  # start again from the files
        mesh.parent = None
        for modifier in [m for m in mesh.modifiers if m.type == "ARMATURE"]:
            mesh.modifiers.remove(modifier)
        mesh.vertex_groups.clear()
        bpy.data.objects.remove(old, do_unlink=True)
    bones = skeleton.bones_from(common.read_json(argv[1]))
    rig = build_armature(bones)
    how = bind(mesh, rig)
    config = common.read_json(argv[2]) if len(argv) > 2 and not argv[2].startswith("--") else {}
    if "--no-rules" in argv:  # the bone limit still applies: engines need it, so compare like with like
        config = {"max_influences": config.get("max_influences", 4)}
    changed, orphans = apply_rules(mesh, rig, config, bones)
    report = {"bones": len(bones), "bind": how, "vertices": len(mesh.data.vertices), "rules": len(config.get("rules", [])),
              "vertices_changed": changed, "unweighted_vertices_fixed": orphans}
    common.save(argv[0])
    print("rig:", report)
    return report


if __name__ == "__main__":
    main(common.args())
