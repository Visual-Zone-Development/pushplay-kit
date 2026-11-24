"""Render a model as flat orthographic views, the pictures every other step is judged from.

    blender -b --python render_views.py -- model.glb out_dir [--views front,side,back,34] [--size 768] [--grid 0.05]

Views: front, back, side (the model's left), left, top, 34 (three-quarter). --grid puts a line grid of
that spacing in metres behind the model (every fifth line heavier), so sizes and joint positions can be
read off the picture. Keep renders at 768 px or under: larger ones fill an agent's context for no gain.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common


def main(argv):
    common.load(argv[0])
    views = argv[argv.index("--views") + 1].split(",") if "--views" in argv else ["front", "side", "back", "34"]
    size = int(argv[argv.index("--size") + 1]) if "--size" in argv else 768
    grid = float(argv[argv.index("--grid") + 1]) if "--grid" in argv else 0.0
    name = os.path.splitext(os.path.basename(argv[0]))[0]
    paths = [common.render(os.path.join(argv[1], f"{name}_{view}.png"), view, size=size, grid=grid) for view in views]
    print("\n".join(paths))
    return paths


if __name__ == "__main__":
    main(common.args())
