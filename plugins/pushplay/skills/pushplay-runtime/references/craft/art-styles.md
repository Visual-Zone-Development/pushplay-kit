# art-styles in a PushPlay game

The general `art-styles` skill has one style sheet per look (lit vector, storybook gouache, comic halftone, watercolour, neon, pixel art, low-poly, toon, claymation, papercraft, voxel, retro 3D) and a lineup toolkit that draws one scene in each. This page gives the PushPlay side: which styles need a 3D game, the sizes on the kit's screen, what the styles cost on a handheld, and the settings they must honour. The rules are in the `pushplay-rules` skill: [screens.md](../../../pushplay-rules/references/screens.md) (*Screens and scaling*, *Settings*), [controls.md](../../../pushplay-rules/references/controls.md) (*Input hints*) and [verification.md](../../../pushplay-rules/references/verification.md) for the check.

## 2D or 3D

- The six 2D styles work in a plain `pushplay new-game <id>` canvas game.
- The six 3D styles (low-poly, toon, claymation, papercraft, voxel, retro 3D) need a `--vite` game with three.js: see [3d.md](../3d.md) for the setup and the handheld budget. Ask the 2D or 3D question before the art-style question, and offer only the styles that fit the answer.

## Input

- Prompts still come from `input.label()` / `drawPrompts` in every style, drawn on the style's material (an ink blot, a paper tag, a pixel button).

## Settings

- Every text size stays ≥ 24 px × `settings.data.textScale`, whatever the style. A pixel font is used at a whole multiple of its design size.
- When `settings.data.reducedShake` is on, switch off what flickers or shimmers on purpose: the line boil in storybook and watercolour, the clay boil, neon flicker, comic impact frames, and calm the retro 3D vertex wobble (use a finer snap grid).

## Screen and scaling

- **Pixel art:** 1280×800 ÷ 4 = 320×200 native, `fitCanvas` with `integer: true`; see the [pixel-art page](pixel-art.md).
- **Retro 3D:** render the 3D view at 320×200 and scale it ×4 to 1280×800 without smoothing. Keep the HUD on the 2D canvas, either on the same ×4 grid or crisp at full resolution, and say which in STYLE.md.
- **Comic halftone:** a dot pitch of 8–12 px at 1280×800 stays readable on a 7" screen.
- **Voxel:** choose a cube size that covers at least 3 px at 1280×800 for the nearest objects.
- **Papercraft and toy looks:** the tilt-shift blur must leave the middle band, where play happens, sharp.

## Performance

- 2D styles: bake washes, paper, glows and dots at load (a few assets per frame, behind the title screen) and draw images per frame. Baked this way, none of them costs more than drawing sprites.
- 3D styles on a handheld's integrated GPU, cheapest first: retro 3D, low-poly, voxel (watch the cube count), toon (outlines double the draw calls of outlined meshes), claymation and papercraft (soft shadows and a full-screen pass).
- Give claymation, papercraft and neon bloom a low tier: one shadow light or blob shadows, no full-screen blur. Default to it on a handheld, as the [lighting-pass page](lighting-pass.md) describes.

## Debug hooks and the check

- **The check plays the game in a headless browser with a software renderer.** The low tier must switch on there, and the game must still reach gameplay within the check's play passes. Confirm with `pushplay check` and look at its screenshot: does the frame have the sheet's *Reads as* list?
- Capture the hero asset and one piece of scenery before making the rest, with the `model-asset` skill's `scripts/shot.mjs`:

  ```sh
  PW_MODULE="$(pushplay where)/node_modules/playwright" node <model-asset skill folder>/scripts/shot.mjs <game folder> <scratch>/style \
    "index.html|title.png" "index.html|play.png|keys=Enter|wait=20000"
  ```

## Art and tools

- **Library art** (the `cover-art` skill) is drawn in the same style from the same art module: an `art/cover.html` that imports the game's own drawing code, or for a 3D style renders the game's scene. A papercraft game gets a papercraft cover.
- **Fonts:** the bundled art fonts are `Chakra Petch`, `Rubik`, `Bungee`, `Lilita One` and `Press Start 2P`; see the [art-direction page](art-direction.md) for using them in the game and on the cover.
- **Record the style** in DESIGN.md (*Art direction → Style*) and write the sheet's block into STYLE.md. Nothing else goes into the repo for the style's sake.
