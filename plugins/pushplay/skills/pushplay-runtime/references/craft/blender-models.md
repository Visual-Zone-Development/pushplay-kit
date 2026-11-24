# blender-models in a PushPlay game

The general `blender-models` skill builds props from a parts list, and cleans, rigs and exports characters that start from a generated mesh, all with Blender scripts. This page gives the PushPlay side: where the files go, the budgets, and money. The rules are in the `pushplay-rules` skill, and the 3D setup and budgets are in [3d.md](../3d.md).

## Where the files go

- **A game repo holds only the game.** The pipeline's inputs and scripts (`parts.json`, `joints.json`, `regions.json`, `rules.json`, the per-part scripts, the working `.blend`) go in a `tools/` folder inside the game's own folder, which the build skips. Renders and reports go to a scratch folder, never the repo.
- **What ships** is the exported GLB, in `public/assets/models/` of a `--vite` game with three.js. Record its source and licence in `assets/CREDITS.md`.
- **Blender is not part of the build.** Nothing in the workflow file or the shared build runs Blender: the GLB is committed, like any other asset. Don't add an install step for it to the repo.
- Use GLB for a PushPlay web game. FBX is for games that also ship in another engine.

## Budgets

- Take the budgets from [3d.md](../3d.md): a hero of about 15k triangles or fewer, others about 5k, textures of 1024 or under, about 60 bones or fewer, and under 100k triangles on screen. Pass them to `clean_mesh.py` as `--budget` and `--crowd`.
- A crowd uses the crowd copy. Hundreds of full-detail characters will not hold 60 fps on a handheld.
- Load models behind a loading screen; the title and pause screens must never wait for one. The `character-models` page has the loading and clip code.

## Money

- A paid generation is the user's money. Say what it will cost, wait for a yes, and record the task so a re-run does not pay twice, exactly as the `cover-art` skill does for painted art.
- The check and the build never generate anything.

## The check

- `pushplay check` plays the game in a headless browser with a software renderer. A game with a rigged hero must still reach gameplay there: keep the low graphics tier working with the model loaded, and look at the check's screenshot.
