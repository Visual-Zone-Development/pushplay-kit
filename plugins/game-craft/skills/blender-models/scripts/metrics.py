"""The maths the Blender scripts share. No Blender import, so it runs and is tested with plain Python."""
from fnmatch import fnmatchcase
from math import hypot


def aabb_gap(a, b):
    """Distance between two boxes ((min x, y, z), (max x, y, z)). 0 when they touch or overlap."""
    (amin, amax), (bmin, bmax) = a, b
    per_axis = [max(0.0, bmin[i] - amax[i], amin[i] - bmax[i]) for i in range(3)]
    return hypot(*per_axis)


def size_error(spec_size, actual_size):
    """Largest difference between a part's listed size and its built size, per axis, in the same units."""
    return max(abs(s - a) for s, a in zip(spec_size, actual_size))


def triangle_count(polygon_sides):
    """Triangles in a mesh, from the number of sides of each polygon."""
    return sum(max(0, n - 2) for n in polygon_sides)


def stretch(rest_lengths, posed_lengths):
    """How far edges stretched in a pose. Returns (worst ratio, its index, 95th percentile ratio)."""
    ratios = [(p / r if r > 1e-9 else 1.0) for r, p in zip(rest_lengths, posed_lengths)]
    if not ratios:
        return 1.0, -1, 1.0
    worst = max(range(len(ratios)), key=ratios.__getitem__)
    ordered = sorted(ratios)
    return ratios[worst], worst, ordered[min(len(ordered) - 1, int(len(ordered) * 0.95))]


def foot_slide(positions, floor=0.03, speed=0.0, fps=30.0, forward=(0.0, -1.0)):
    """Ground distance a foot travels while planted (height at or under `floor`).

    positions: one (x, y, z) per frame. For a clip that walks on the spot, pass the speed the game
    moves the character at (m/s): a planted foot should then move backward at exactly that speed.
    """
    total = 0.0
    for a, b in zip(positions, positions[1:]):
        if a[2] <= floor and b[2] <= floor:
            dx = b[0] - a[0] + forward[0] * speed / fps
            dy = b[1] - a[1] + forward[1] * speed / fps
            total += hypot(dx, dy)
    return total


def loop_difference(first, last):
    """Largest difference between the first and last frame of a loop. Each is a flat list of numbers."""
    return max((abs(a - b) for a, b in zip(first, last)), default=0.0)


def allowed(part, bone, rules):
    """Whether `bone` may move vertices tagged `part`. rules: [{part, only: [...]} or {part, deny: [...]}].

    Patterns use shell wildcards and are case-sensitive. The last matching rule for a part wins per key;
    a part with no rule allows every bone.
    """
    ok = True
    for rule in rules:
        if not fnmatchcase(part, rule["part"]):
            continue
        if "only" in rule:
            ok = any(fnmatchcase(bone, pattern) for pattern in rule["only"])
        if "deny" in rule and any(fnmatchcase(bone, pattern) for pattern in rule["deny"]):
            ok = False
    return ok


def fade(distance, band):
    """How strongly a rule applies at `distance` from the border of a part: 0 on the border, 1 from
    `band` inward, eased in between. A rule that cut in at full strength on the border would tear the
    mesh there, because the neighbour on the other side keeps the bone."""
    if band <= 0:
        return 1.0
    t = max(0.0, min(1.0, distance / band))
    return t * t * (3 - 2 * t)


def apply_rules(weights, part, rules, max_influences=4, fallback=None, strength=1.0):
    """One vertex's weights after the rules: take away bones the part may not follow, keep the strongest
    `max_influences`, and scale them to add up to 1.

    weights: {bone: weight}. strength (0..1) is how much of a forbidden bone's weight is removed; see
    fade(). If nothing is left, the vertex goes fully onto `fallback` (a bone name), or keeps its
    strongest original bone when there is no fallback.
    """
    kept = {bone: (w if allowed(part, bone, rules) else w * (1 - strength)) for bone, w in weights.items() if w > 0}
    kept = {bone: w for bone, w in kept.items() if w > 1e-6}
    if not kept:
        if fallback:
            return {fallback: 1.0}
        if not weights:
            return {}
        strongest = max(weights, key=weights.get)
        return {strongest: 1.0}
    top = sorted(kept.items(), key=lambda item: -item[1])[:max_influences]
    total = sum(w for _, w in top)
    return {bone: w / total for bone, w in top}
