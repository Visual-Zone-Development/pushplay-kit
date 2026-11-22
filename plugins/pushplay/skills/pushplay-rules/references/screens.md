# Screens, settings, performance and tech

For a JavaScript game built on the runtime files. `pushplay` is the command the `pushplay-rules` skill gives you.

## Screens and scaling

- **Logical space is at least 1280×800** (the Steam Deck's screen). Lay out every screen for it, text ≥ **24px** and important HUD ≥ **32px** from the edges. `fit.js` does the scaling.
- Call `fitCanvas(canvas, { w: 1280, h: 800, maxDpr: 2, integer: false, letterbox: '#000', fill: true })` once; it resizes on every window change, caps the device pixel ratio at `maxDpr` and keeps one game unit the same size both ways. With **`fill: true`** (the starters use it) the space grows to the screen's shape instead of showing bars: `fit.w` × `fit.h` is 1422×800 on a 16:9 TV, 1280×960 on a 4:3 iPad, 1896×800 on an ultrawide, and `fit.minW` × `fit.minH` stays 1280×800. Read `fit.w` / `fit.h` each frame or in `fit.onResize`, pin the HUD to the real edges, centre menus (`menu.place()`, `settingsScreen.place()`), cover the whole space with backgrounds and dims, and **keep what decides difficulty inside the 1280×800** (spawns, rooms, boards): a bigger screen sees more, never plays easier. Without `fill` the game is letterboxed and the check notes the bars on its 16:9 pass. Don't write your own resize code. The `screen-shapes` skill measures every shape and does the change.
- Targets it must look right on: Steam Deck **1280×800** at DPR 1; Legion Go **1920×1200** and **2560×1600** (the launcher zooms the window, so DPR reaches 1.5–2 in the same 1280×800 space); a **TV or monitor at 16:9** (1920×1080 or 4K: a docked handheld, or a PC from Big Picture), read from across a room; ultrawide **21:9**; laptops at **3:2**; tablets in landscape (**4:3** iPads to 16:10); any resizable window, including smaller than 1280×800.
- **Phone games** use one of two more spaces, **portrait 720×1280** or **landscape 1280×720** (`pushplay new-game <id> --phone portrait|landscape` sets it up; `"phone": { "orientation": "portrait" | "landscape" | "any" }` in the manifest says which, `"any"` meaning the game lays out for both and swaps on `fit.onResize`). Pass the same size to `fitCanvas` and `input.attach`. Add `fill: true` so the game covers the whole screen of every phone (no bars): the size becomes the minimum, `fit.w` / `fit.h` follow the screen, and difficulty stays inside `fit.minW` × `fit.minH` (see *Fill the screen* in [phone.md](../../pushplay-runtime/references/phone.md)). **1280×800 stays the minimum** for a game that isn't built for phones, and a phone game still has to play with a controller and a keyboard. Text ≥ **32px** in a phone space, tap targets ≥ 56px (on-screen buttons ≥ 64px), controls in the thumb zones (bottom third in portrait, the lower two-thirds of each side in landscape) and nothing pressable in the top half but the pause button. See [phone.md](../../pushplay-runtime/references/phone.md) and the `mobile-port` skill.
- **Safe areas:** phones draw under the notch and the home indicator. `fit.safe` → `{ top, right, bottom, left }` in game units (zero on the Deck and PCs, changes when the phone turns): place text and tap targets from it (`fit.safe.left + 32`), never under it; backgrounds may extend beneath. Read it every frame or in `fit.onResize`.
- `letterbox`: the colour around the canvas while the page loads, or in a game without `fill`: use the game's background colour, or black. Never white, never transparent.
- `maxDpr: 2` is the cap; don't read `devicePixelRatio` in 2D code. Text, lines and vector shapes stay crisp at DPR 2 automatically. Pre-rendered bitmaps (glow sprites, cached text) made at 1× look soft at DPR 2: render them at 2× or keep them small.
- Pixel art: `integer: true` plus `ctx.imageSmoothingEnabled = false`, and draw sprites at whole-number scales.
- 3D: render to a 1280×800 surface (or the phone space) with `renderer.setPixelRatio(Math.min(devicePixelRatio, 1))` and let `fitCanvas` scale it; with `fill`, size it to `fit.w` × `fit.h` in `fit.onResize` and set `camera.aspect = fit.w / fit.h` (keep the vertical field of view); see [3d.md](../../pushplay-runtime/references/3d.md).
- Cursor: hide it (`canvas.style.cursor = 'none'`) **only during gameplay** in mouse mode, and show it again on every menu (title, pause, settings, game over). Never hide it in a menu.

## Settings (`settings.js`)

Every game has a Settings screen, **reachable from the title and from the pause menu**, built with `createSettingsScreen({ settings, audio, extra })` → `{ update, draw }` (same calling pattern as a menu: `update(input, dt)` returns `'back'` when the player leaves). It provides:
- **Master, Music and SFX** volume (0–100).
- **Reduced shake / flash** toggle: when on, skip screen shake, white flashes and strobing. Every game that shakes or flashes must honour `settings.data.reducedShake`.
- **Text size** (`settings.data.textScale`, 1 = normal): multiply HUD and menu font sizes by it.
- `extra`: game-specific items such as difficulty, colourblind palette or rumble, as `menu.js` value items.

`const settings = createSettings(id, defaults)` stores them under `<id>-settings-v1` with defaults `{ master, music, sfx, reducedShake, textScale }`. Pass the same object to `createAudio({ settings })` so the buses follow the sliders.

## Performance

The Deck and the Legion Go have mid-range integrated GPUs. Aim for a steady 60fps at 1280×800 and no drops at DPR 2. Prefer canvas 2D or modest WebGL scenes, cap particle counts, avoid `shadowBlur` and huge textures.

## Tech

- Default: plain HTML + ES modules (`<script type="module">`) and canvas. The repo then needs no `package.json` at all.
- Use `pushplay new-game <id> --vite` when you need npm packages (three.js, Phaser, physics engines). The `package.json` is then the game's own: install with `npm install <pkg>` in the game's folder (the repo root, or `games/<id>/` in a workshop, where each Vite game has its own `package.json` and lockfile) and commit `package-lock.json`.
- Keep the game self-contained in its repo. The PushPlay build ships the game's files and skips `mockups/`, `*.py`, `__pycache__/`, `DESIGN.md`, `docs/` and dot-folders. List anything else to skip (reference images, notes) in `.pushplayignore` at the root. Don't commit `node_modules/` or `dist/`.
- For 3D games (three.js), follow the budgets in [3d.md](../../pushplay-runtime/references/3d.md).
- Put all gameplay numbers in a `TUNING` object at the top of `game.js`, so tuning later is quick. Clamp `dt` (`Math.min(1/20, …)`).
- The cover and banner are the `cover-art` skill's; `pushplay.json` is in [manifest.md](manifest.md).
