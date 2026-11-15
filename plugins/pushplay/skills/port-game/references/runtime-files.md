# Depth C: move a JavaScript game onto the runtime files

Only when the user chose it (step 2 of the skill). It rewrites how the game reads input, draws menus, scales, saves and plays sound, so the game's normal release changes too. In return it gets controller, keyboard, mouse and touch on every screen, pause, settings, saves, a phone layout if wanted, and every pass of the check. Work on a branch. `pushplay` is the command the `pushplay-rules` skill gives you; the button table, the screen names and the rules referred to below are in that skill, and the calls in `pushplay-runtime`.

## 1. Inventory

How the game reads input, how it sizes the canvas, its screens, its saves (`localStorage` keys), its assets and any network use (CDNs, fonts, analytics). Plain canvas / DOM / ES modules becomes a plain game; npm packages, a bundler, Phaser or three.js need `--vite`.

## 2. Get the starter and the runtime files

`pushplay new-game` won't scaffold over an existing game: it stops when the root already has `index.html`, `game.js`, `src`, `art` or `vite.config.js`, or a `pushplay.json`.

1. Move the game's own files into a holding folder (`original/`), and set aside a `pushplay.json` written for depth B (keep its `id`, description, tags and art for later).
2. `pushplay new-game <id> --name "<Name>"` (with `--vite` if needed; `--phone portrait|landscape` for a phone layout). Use the same `id` as before if the game was already published: saves and its listing follow it. This writes the runtime files, a starter `game.js` with working title, pause and settings screens, `pushplay.json` and placeholder art, and adds the workflow file if the repo has none.
3. Bring the game's code and assets back beside them (`assets/` for media) and delete `original/` when done. Bundle CDN libraries and remote fonts into the repo (or `npm install` them in a `--vite` game): the check fails on network requests.
4. Write `DESIGN.md` by reverse-engineering the game ([DESIGN.template.md](../../new-game/references/DESIGN.template.md)), with *Ported from <source>* in the Changelog.

Never edit the runtime files; `pushplay update-runtime` replaces them with the kit's current ones.

## 3. Convert, step by step (run `pushplay dev` after each)

1. **Loop and screens:** fold the game's loop into the starter's frame: `input.update()` first, `state.screen` with `title | playing | paused | settings | gameover`, `window.__game = { state, TUNING }`. Use the starter's title, pause (Resume, Restart, Settings, Quit to title) and settings screens; replace the game's own menus with `menu.js`, which also gives the pause menu Quit to library inside the launcher. If a menu has to stay custom, add that item yourself, shown only when `window.pushplay?.quit` exists.
2. **Input:** replace `keydown` / `mousedown` / `touchstart` handlers with the `input` API (`input.x`, `input.pressed('a')`, `input.pointer`); map the game's actions to buttons from the `pushplay-rules` table; key aliases through `input.extendKeys`. Remove any Esc-as-back, F10 or quit binding. Pointer-only mechanics also need a stick cursor or snapping.
3. **Scaling:** remove the game's resize code; `fitCanvas(canvas, { w: 1280, h: 800, maxDpr: 2, letterbox })`. If it was built for another resolution, scale its drawing (one `ctx.scale` at the top) or relayout the HUD to the 1280×800 rules (text ≥ 24 px, 32 px margins).
4. **Timing:** movement per second with a clamped `dt`, if it was per frame.
5. **Saves and audio:** move `localStorage` use to `save.js` (`<id>-save-v1`, with a one-time import of the old key if players have saves in the same browser) and sound to the `audio.js` buses.
6. **Prompts:** replace literal key names with `input.label()` / `drawPrompts`.
7. **Pause:** `input.onPause` switches to `paused` and saves; everything is frozen while paused.

## 4. What still belongs to the normal release

`menu.js` shows Quit to library only inside the launcher, so the normal release never shows it. Keep anything else the normal release needs (analytics, a leaderboard) behind `if (!window.pushplay) { … }`: the check runs with that object present and judges only what the game does inside the launcher.

## 5. Finish

1. The manifest from [manifest.md](../../pushplay-rules/references/manifest.md) (`description`, `players`, `tags`, `inputs`, `"controls": "gamepad"`), the cover and hero with `cover-art`.
2. `pushplay check`, fix every ✗, open the screenshot and art PNGs it prints the paths of.
3. Run the `input-walkthrough` skill and the verification matrix in `pushplay-rules`.
4. Commit (`Add <Name> (ported)`) and push. Tell the user what changed in the controls and anything that couldn't be kept.
