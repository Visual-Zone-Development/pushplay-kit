"""Check a built prop against its parts list, by numbers.

    blender -b --python check_assembly.py -- model.blend parts.json [--report report.json]

For every part: it exists, its size matches the list (2 mm tolerance; skipped for rotated or tapered
parts), and the gap to the part it attaches to is 0 (0.5 mm tolerance; surfaces must touch or overlap).
For the whole prop: the triangle count is within "budget_tris". Exits with status 1 if anything fails.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy

import common
import metrics

SIZE_TOLERANCE = 0.002
GAP_TOLERANCE = 0.0005


def main(argv):
    common.load(argv[0])
    spec = common.read_json(argv[1])
    objects = {o.name: o for o in common.meshes()}
    rows, failures = [], []
    for part in spec["parts"]:
        obj = objects.get(part["name"])
        if not obj:
            failures.append(f"{part['name']}: missing from the model")
            continue
        row = {"part": part["name"]}
        if "size" in part and part.get("type", "box") != "outline" and "rot" not in part and "top" not in part:
            lo, hi = common.bounds([obj])
            error = metrics.size_error(part["size"], [hi[i] - lo[i] for i in range(3)])
            row["size_error_m"] = round(error, 4)
            # a cylinder with few sides is narrower across its flats than its listed diameter
            slack = max(part["size"]) * (1 - math.cos(math.pi / part.get("sides", 12))) if part.get("type") == "cylinder" else 0
            if error > SIZE_TOLERANCE + slack:
                failures.append(f"{part['name']}: size is off by {error * 100:.1f} cm")
        target = part.get("attach")
        if target:
            if target not in objects:
                failures.append(f"{part['name']}: attaches to {target}, which is missing")
            else:
                gap = common.mesh_gap(obj, objects[target])
                row["attach"], row["gap_m"] = target, round(gap, 4)
                if gap > GAP_TOLERANCE:
                    failures.append(f"{part['name']}: floats {gap * 100:.1f} cm from {target}")
        rows.append(row)
    total = common.triangles(objects.values())
    budget = spec.get("budget_tris")
    if budget and total > budget:
        failures.append(f"{total} triangles is over the budget of {budget}")
    lo, hi = common.bounds(objects.values())
    report = {"triangles": total, "budget": budget, "size_m": [round(hi[i] - lo[i], 4) for i in range(3)], "parts": rows, "failures": failures}
    for row in rows:
        print("  ", row)
    print(f"triangles {total}" + (f" / {budget}" if budget else "") + f", size {report['size_m']} m")
    print("ASSEMBLY OK" if not failures else "ASSEMBLY FAILED:\n  " + "\n  ".join(failures))
    if "--report" in argv:
        common.write_json(argv[argv.index("--report") + 1], report)
    return report


if __name__ == "__main__":
    sys.exit(1 if main(common.args())["failures"] else 0)
