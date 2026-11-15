# JavaScript games that keep their own code

For a bundler project (Vite, webpack, Parcel, esbuild, a framework such as Phaser or three.js) or plain HTML that stays as it is: depth B. To move the game onto PushPlay's runtime files instead, see [runtime-files.md](runtime-files.md).

## Which manifest fields

| The repo | Manifest | What the PushPlay build does |
|---|---|---|
| `index.html` at the root, no build | `"entry": { "web": "index.html" }` | ships the folder as it is |
| `package.json` with a `build` script that writes `dist/` | `"entry": { "web": "index.html" }` | `npm run build`, ships `dist/` |
| the same, writing another folder | add `"build": { "output": "build" }` | `npm run build`, ships that folder |
| a different command for PushPlay | add `"build": { "command": "npm run build:pushplay" }` | runs that in place of `npm run build` |
| the page is in a subfolder (`public/`, `web/`) or the build is already committed | `"entry": { "web": "index.html" }`, `"build": { "outputs": { "web": "public" } }` | ships that folder; `entry.web` is a path inside it |

The built folder must have `index.html` in it. `build.preset` (`"vite"` or `"static"`) is only needed to force one behaviour: `"static"` ships the folder without building even though a `build` script exists.

- **Lockfile.** The shared build installs dependencies with `npm ci`, which needs a committed `package-lock.json` whenever the repo has a `package.json`. A repo that uses another package manager has no such file: tell the user, and agree whether to commit one alongside (it doesn't change their own installs) or to build in a job of their own and hand over the folder as an artifact (the skill's step 3).
- **`PUSHPLAY_BUILD=1`** is in the environment of `npm run build` and `build.command` when PushPlay builds. Use it in the build config for anything that must differ, so the normal build is untouched:

```js
// vite.config.js
const pushplay = process.env.PUSHPLAY_BUILD === '1'
export default { base: './', define: { __PUSHPLAY_BUILD__: pushplay } }
```

## What the check requires of it

No crash, no internet requests, no `alert` / `confirm` dialogs, no missing files, and a picture within 30 s. Pause and menu passes only report. An `F10` binding in the game's own code is pointed out, not failed: the launcher keeps F10, so it won't reach the game there.

- **Relative paths.** The build must work from whatever folder it is served in: `base: './'` in Vite (`publicPath: 'auto'` or `'./'` in webpack), and no URLs starting with `/` for the game's own files. A missing file fails the check.
- **Offline.** Inside the launcher the game may not load anything from the internet: CDN scripts, web fonts, remote images, analytics. Two ways, and the user picks:
  - Guard it at run time, when it is code: `if (!window.pushplay) { loadAnalytics() }`. The check runs with `window.pushplay` present, so guarded code is not judged, and the normal release behaves as before.
  - Bundle it, when the game needs it to run (a library from a CDN `<script>` tag, a font): install it with npm or copy the file into the repo. This does change the normal build, harmlessly; if the user wants even that left alone, swap the tag only when `PUSHPLAY_BUILD=1`.
- **Dialogs.** Replace `alert()` and `confirm()` with in-game UI, or guard them: they block a controller.
- **Saves.** `localStorage` works. Keys that start with the game's id can't clash with another game's on the same device.

## Launcher hooks

```js
// Quit to library: only inside the launcher
if (window.pushplay?.quit) pauseItems.push({ label: 'Quit to library', run: () => window.pushplay.quit() })

// Pause when the launcher's own menu opens
window.addEventListener('pushplay:pause', () => game.pause())
```

`window.pushplay` is `{ version, gamingMode, inputMode, quit(), restart(), onPause(cb), onResume(cb) }` and is undefined outside the launcher, so always reach it with `?.`. Don't auto-resume on `pushplay:resume`; let the player press Resume.

**Controllers.** The browser's Gamepad API works in the launcher. If the game is keyboard only and that stays so for now, set `"controls": "keyboard-mapped"` and leave `"gamepad"` out of `inputs`. Getting controller menus, pause, settings and touch for free is what depth C is for.

## Known limits

- Only the runtime-files route earns every pass of the check; for this kind of game controller, pause and phone behaviour are reported, not guaranteed.
- A game laid out for a mouse on a big monitor will be small on a 7-inch handheld. That is a design change for the user to decide, not part of setting up.
