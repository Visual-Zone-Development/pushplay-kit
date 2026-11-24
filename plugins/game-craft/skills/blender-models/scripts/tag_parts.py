"""Split a fused shell into named parts, so weights can be set per part.

    blender -b --python tag_parts.py -- model.blend joints.json [regions.json] [--render out_dir]

Every vertex is tagged with the body part of the bone it is nearest to (head, torso, arm_L, hand_L,
leg_L, foot_L and so on). regions.json refines that by position:
    {"reach": {"arm_*": 0.06, "hand_*": 0.07},
     "regions": [{"name": "coat", "z": [0.3, 0.62], "from": ["torso", "leg_*"]}]}
"reach" is how thick a limb is, in metres from its bone. Without it, cloth hanging beside an arm is
tagged as arm, follows the arm and tears. A vertex out of reach goes to the nearest unlimited part.
A region takes the vertices inside its x / y / z ranges whose current tag matches "from". Regions run in
order, so later ones win.

A generator fuses things that only touch: a hand to the coat it rests on, a hem to the legs under it.
While they share vertices no weights can separate them, so list the pairs to cut apart:
    {"regions": [...], "split": [["hand_*", "coat"], ["arm_*", "coat"], ["leg_*", "coat"]]}
The mesh is cut along the border between the two parts of each pair. It leaves a seam with no faces
behind it, which is hidden while the parts stay close.

The tags are stored on the mesh (an integer attribute "part" and the list "part_names"), and --render
writes a flat-colour picture per view: look at it before binding.
"""
import colorsys
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import bmesh
from fnmatch import fnmatchcase

import common
import skeleton


def read_parts(obj):
    """The part name of every vertex of a tagged mesh."""
    names = json.loads(obj.get("part_names", "[]"))
    data = obj.data.attributes["part"].data
    return [names[item.value] for item in data]


def split_between(obj, tags, pairs):
    """Cut the mesh along the border between each pair of parts. Returns the new tag list and the edges cut."""
    def paired(a, b):
        return any((fnmatchcase(a, p) and fnmatchcase(b, q)) or (fnmatchcase(a, q) and fnmatchcase(b, p)) for p, q in pairs)

    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    face_part = {}
    for face in bm.faces:
        votes = [tags[v.index] for v in face.verts]
        face_part[face.index] = max(set(votes), key=votes.count)
    border = [e for e in bm.edges if len(e.link_faces) == 2 and paired(face_part[e.link_faces[0].index], face_part[e.link_faces[1].index])]
    layer = bm.faces.layers.int.new("_part")
    names = sorted(set(face_part.values()))
    for face in bm.faces:
        face[layer] = names.index(face_part[face.index])
    old = bm.verts.layers.int.new("_old")
    for vert in bm.verts:
        vert[old] = vert.index
    bmesh.ops.split_edges(bm, edges=border)
    bm.verts.ensure_lookup_table()
    new_tags = []
    for vert in bm.verts:  # a vertex on a cut now belongs to the faces on its own side
        sides = [names[f[layer]] for f in vert.link_faces]
        new_tags.append(sides[0] if sides and len(set(sides)) == 1 else tags[vert[old]])
    bm.faces.layers.int.remove(layer)
    bm.verts.layers.int.remove(bm.verts.layers.int["_old"])
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    return new_tags, len(border)


def main(argv):
    common.load(argv[0])
    obj = next(o for o in common.meshes() if o.name == "model")
    spec = common.read_json(argv[1])
    bones = skeleton.bones_from({k: v for k, v in spec.items() if k != "extra_bones"})  # cloth and helper bones tag nothing
    config = common.read_json(argv[2]) if len(argv) > 2 and not argv[2].startswith("--") else {}
    regions = config.get("regions", [])
    tags = []
    for vert in obj.data.vertices:
        point = obj.matrix_world @ vert.co
        part = skeleton.part_of(skeleton.nearest_bone(point, bones, config.get("reach")))
        for region in regions:
            if skeleton.in_region(point, part, region):
                part = region["name"]
        tags.append(part)
    cut = 0
    if config.get("split"):
        tags, cut = split_between(obj, tags, config["split"])
    names = sorted(set(tags))
    if "part" in obj.data.attributes:
        obj.data.attributes.remove(obj.data.attributes["part"])
    attribute = obj.data.attributes.new("part", "INT", "POINT")
    for item, tag in zip(attribute.data, tags):
        item.value = names.index(tag)
    obj["part_names"] = json.dumps(names)
    counts = {name: tags.count(name) for name in names}
    print("parts:", counts, f"; cut {cut} edges between parts that only touched" if cut else "")
    common.save(argv[0])

    if "--render" in argv:  # one flat colour per part, on a throwaway copy
        folder = argv[argv.index("--render") + 1]
        common.activate(obj)
        bpy.ops.object.duplicate()
        copy = bpy.context.view_layer.objects.active
        copy.data.materials.clear()
        for i, name in enumerate(names):
            copy.data.materials.append(common.flat_material("part_" + name, colorsys.hsv_to_rgb(i / len(names), 0.75, 0.9)))
        for poly in copy.data.polygons:
            votes = [names.index(tags[v]) for v in poly.vertices]
            poly.material_index = max(set(votes), key=votes.count)
        for view in ("front", "back"):
            common.render(os.path.join(folder, f"parts_{view}.png"), view, [copy])
        bpy.data.objects.remove(copy, do_unlink=True)
    return counts


if __name__ == "__main__":
    main(common.args())
