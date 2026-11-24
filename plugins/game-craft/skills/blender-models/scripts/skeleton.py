"""Skeleton data for the rigging scripts. No Blender import, so it is tested with plain Python.

joints.json holds joint positions in metres, for a model that faces -Y with z up (its left is +x):

    {"joints": {"hips": [0, 0, 0.58], "spine": ..., "chest": ..., "neck": ..., "head": ..., "head_top": ...,
                "shoulder_L": ..., "elbow_L": ..., "wrist_L": ..., "hand_L": ...,
                "hip_L": ..., "knee_L": ..., "ankle_L": ..., "toe_L": ...},
     "extra_bones": [{"name": "ClothFront", "head": [...], "tail": [...], "parent": "Hips"}]}

A missing right-side joint is mirrored from the left. Bone names follow the Mixamo convention, so
engines that map humanoids by name need no setup. Anything that is not a biped (an animal, a vehicle)
gives its bones directly instead: {"bones": [{"name", "head", "tail", "parent"}, ...]}.
"""
from fnmatch import fnmatchcase

CENTRE = [  # bone, head joint, tail joint, parent
    ("Hips", "hips", "spine", None), ("Spine", "spine", "chest", "Hips"), ("Spine2", "chest", "neck", "Spine"),
    ("Neck", "neck", "head", "Spine2"), ("Head", "head", "head_top", "Neck")
]
SIDE = [  # the same for Left and Right; {s} is L or R, {S} is Left or Right
    ("{S}Shoulder", "clavicle_{s}", "shoulder_{s}", "Spine2"), ("{S}Arm", "shoulder_{s}", "elbow_{s}", "{S}Shoulder"),
    ("{S}ForeArm", "elbow_{s}", "wrist_{s}", "{S}Arm"), ("{S}Hand", "wrist_{s}", "hand_{s}", "{S}ForeArm"),
    ("{S}UpLeg", "hip_{s}", "knee_{s}", "Hips"), ("{S}Leg", "knee_{s}", "ankle_{s}", "{S}UpLeg"),
    ("{S}Foot", "ankle_{s}", "toe_{s}", "{S}Leg")
]
PARTS = [  # which body part a bone's surroundings belong to; first match wins
    ("Head", "head"), ("Neck", "head"), ("*Shoulder", "torso"), ("Hips", "torso"), ("Spine*", "torso"),
    ("LeftArm", "arm_L"), ("LeftForeArm", "arm_L"), ("LeftHand", "hand_L"), ("LeftUpLeg", "leg_L"),
    ("LeftLeg", "leg_L"), ("LeftFoot", "foot_L"), ("RightArm", "arm_R"), ("RightForeArm", "arm_R"),
    ("RightHand", "hand_R"), ("RightUpLeg", "leg_R"), ("RightLeg", "leg_R"), ("RightFoot", "foot_R")
]


def complete(joints):
    """The joints with right-side ones mirrored from the left where missing, and clavicles filled in."""
    out = {name: list(p) for name, p in joints.items()}
    for name, p in joints.items():
        if name.endswith("_L") and name[:-2] + "_R" not in out:
            out[name[:-2] + "_R"] = [-p[0], p[1], p[2]]
    for s in ("L", "R"):
        if f"clavicle_{s}" not in out and "neck" in out and f"shoulder_{s}" in out:
            neck, shoulder = out["neck"], out[f"shoulder_{s}"]
            out[f"clavicle_{s}"] = [neck[i] + (shoulder[i] - neck[i]) * 0.25 for i in range(3)]
    return out


def bones_from(spec):
    """Bones as [{name, head, tail, parent}] from a joints file's contents, parents before children."""
    if "bones" in spec:
        return [dict(b) for b in spec["bones"]]
    joints = complete(spec["joints"])
    table = list(CENTRE) + [tuple(x.format(s=s, S=S) if x else x for x in row) for s, S in (("L", "Left"), ("R", "Right")) for row in SIDE]
    bones = []
    for name, head, tail, parent in table:
        if head in joints and tail in joints:
            bones.append({"name": name, "head": joints[head], "tail": joints[tail], "parent": parent})
    return bones + [dict(b) for b in spec.get("extra_bones", [])]


def part_of(bone):
    """The body part a bone belongs to: head, torso, arm_L, hand_L, leg_L, foot_L and so on."""
    for pattern, part in PARTS:
        if fnmatchcase(bone, pattern):
            return part
    return bone.lower()


def distance_to_segment(p, a, b):
    ab = [b[i] - a[i] for i in range(3)]
    length2 = sum(c * c for c in ab) or 1e-12
    t = max(0.0, min(1.0, sum((p[i] - a[i]) * ab[i] for i in range(3)) / length2))
    return sum((p[i] - (a[i] + ab[i] * t)) ** 2 for i in range(3)) ** 0.5


def nearest_bone(point, bones, reach=None):
    """The bone a surface point belongs to: the nearest one whose part can reach that far.

    reach: {part pattern: metres}, the thickness of a limb. A sleeve is only a few centimetres from its
    arm bone; a coat hanging beside the arm is nearer to that bone than to the spine, but out of the
    arm's reach, so it goes to the nearest bone with no limit instead (the body).
    """
    ranked = sorted(bones, key=lambda b: distance_to_segment(point, b["head"], b["tail"]))
    if not reach:
        return ranked[0]["name"]
    unlimited = None
    for bone in ranked:
        limit = next((metres for pattern, metres in reach.items() if fnmatchcase(part_of(bone["name"]), pattern)), None)
        if limit is None:
            unlimited = unlimited or bone["name"]
            return unlimited
        if distance_to_segment(point, bone["head"], bone["tail"]) <= limit:
            return bone["name"]
    return ranked[0]["name"]


def in_region(point, part, region):
    """Whether a vertex at `point`, tagged `part` so far, falls in a region
    {"name", "x": [lo, hi], "y": [...], "z": [...], "from": [part patterns]} (every key optional)."""
    for axis, key in enumerate("xyz"):
        if key in region and not region[key][0] <= point[axis] <= region[key][1]:
            return False
    return "from" not in region or any(fnmatchcase(part, pattern) for pattern in region["from"])
