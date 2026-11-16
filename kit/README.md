# Build kit

The tools that build, check and publish games: `check.mjs` (validate, build, play headlessly, render art), `ci.mjs` (the same on GitHub Actions, then publish), `new-game.mjs`, `dev.mjs`, `promote.mjs`, `update-runtime.mjs` and the art tools, plus the runtime files a JavaScript game imports (`src/templates/shared/`: `input.js`, `menu.js`, `fit.js`, `audio.js`, `save.js`, `settings.js`, `prompts.js`, `touch.js`; `src/templates/online/`: `net.js`, `lobby.js`; `src/templates/party/`). This folder is its source.

**The kit is never copied into a game repo.** A game repo keeps one small workflow file (`src/workflow.yml`) that calls the shared build (`src/build.yml`), and the kit runs against the repo from outside it: `KIT_REPO_ROOT` (or the working directory) is the repo, and its scratch files go to `KIT_WORK_DIR` (by default a folder under the system's temp folder), so nothing it does leaves a file in the repo.

## Working on it

```
npm install && npm run kit:install     # once: the test runner, and the kit's own packages
npx playwright install chromium        # the browser the tests play games in (or set KIT_BROWSER)
npm run test:kit                       # the kit's tests
npm run kit:build                      # after any change: repack kit.zip and the published files
npm run kit:lock                       # after bumping KIT_VERSION
```

`KIT_VERSION` in `src/config.mjs` counts every change to what ships; `kit-lock.json` pins a hash of it and a test fails until the version is bumped and the lock refreshed (`UPDATE_KIT_LOCK=force npm run kit:lock` for more changes to a version that hasn't shipped). A second test fails while the published files (`kit.zip`, `.github/workflows/build.yml`, `docs/workflow.yml`, `schema/manifest.schema.json`) are behind the source. When a push to `main` passes the tests, the `v1` tag moves to it, and that is what every game repo builds with.

The runtime files start with `// <slug> runtime vN — shared runtime file, replaced by update-runtime; don't edit`, where N is the kit version that shipped them.

**Copies of the launcher's files.** `src/manifest.schema.json` and `src/kit-index.schema.json` are the launcher's published schemas (it is what reads manifests and indexes, so it defines them); `src/relay-rooms.mjs`, `src/relay-shell.mjs` and `src/relay-public/` are the hosted relay's room logic and join page, used by the local relay in `dev` and the check. They come from the launcher's repo (`packages/shared/schema/`, `apps/relay/`). Copy them again when they change there, bump `KIT_VERSION` and rebuild.

## How games get it

| Who | How |
|---|---|
| GitHub Actions, for every game repo | The repo's workflow file calls `build.yml` in this repo at the tag `brand.buildRef`. That job checks out this repo, unpacks `kit.zip` and runs `ci.mjs` against the game's checkout. |
| A person or an agent, locally | The command line unpacks the same `kit.zip` into a cache and runs a command against the current folder: `npx github:<pluginRepo> check` (or `new-game`, `dev`, `promote`, `update-runtime`, `art`). |
| A repo with no builds yet | The launcher's **Set up auto-builds** opens a pull request with the workflow file and a starter manifest. |

`npm run kit:build` packs `kit.zip` (`kit/` and `kit.json` with `{ kit, hash }`) next to the command line and writes the shared build, the workflow file and the schema to where this repo publishes them.

## Any kind of game

The kit builds a JavaScript project itself (`npm run build`, or the folder as it is). For anything else the game's own build makes the files and the manifest says where they are:

```json
"entry": { "web": "index.html", "linux-x64": "game.x86_64" },
"build": { "command": "godot --headless --export-release Web export/web/index.html", "outputs": { "web": "export/web", "linux-x64": "export/linux" } }
```

- `build.outputs`: a finished folder per platform. Each becomes `<id>-<platform>.zip` in the release, and the index lists them under `platforms`. The folders can be committed, made by `build.command`, or uploaded by an earlier job of the repo's own workflow and passed to the shared build as its `artifact` input.
- `build.command` runs in place of `npm run build`, with `<SLUG>_BUILD=1` set, so a game can build differently for the launcher than for its normal release.
- Only web builds are play-tested. A native build is checked to be a program for its platform.
- A game that isn't on the kit's runtime files isn't held to their conventions: it gets up to 30 s to show its first picture, nothing in an exported folder is read, and an F10 binding is pointed out, not refused.
- The check runs the game with the launcher's object present (`window.<slug>`), so what a game does only outside the launcher (analytics, a dialog) is not judged.

## Headless browser

The play passes need Playwright's Chromium (`npm run setup` in a game repo installs it). Where that download is blocked, set `KIT_BROWSER=/path/to/chrome` to use an installed Chrome or Chromium; with no browser at all, `check.mjs` runs the static checks and says what it skipped.

## v18: a touch screen can host a party

- `party-lobby.js`: with a mouse or touch, the lobby draws real Start and Back buttons (64 game px tall) and a tap or click on them works, also Try again and Back after an error and Back while the party opens. Start is dimmed and ignored until `minPlayers` are in. `lobby.buttons` gives their rects. Before, only A, Space/Enter, B, right-click and the first phone could start or leave, so a tablet with no controller was stuck in the lobby. Controllers and keyboards see the same prompts as before.

## v14: the kit left the game repos

- One workflow file per repo; the build is shared (`build.yml`, `workflow_call`). `update-kit`, `export` and `migrate` are gone; `update-runtime` refreshes a game's runtime files.
- Any engine: `build.outputs`, `build.command`, native zips, `launch` options, `web.isolated`.
- `new-game` writes the workflow file and a schema URL; `promote` needs no template; the art and promote tools are part of the kit.

## v11: full-screen phones, and a way out from the title

- `fit.js`: `fitCanvas(canvas, { w: 720, h: 1280, fill: true })` makes w×h the smallest space instead of a fixed box. The canvas covers the window with no bars and `fit.w` / `fit.h` grow to the screen's shape in game units (720×1604 on a 412×918 phone, 960×1280 on a 768×1024 tablet), never stretched. `fit.minW` / `fit.minH` keep what was asked for: lay out from the edges, and keep anything that decides difficulty inside the minimum so a bigger screen sees more, never an easier game. Without `fill` nothing changes.
- `input.js`: `input.space` is live, and pointers map into the fit's current size when the canvas fills.
- `touch.js`: re-reads the space every `update()`, so the stick and buttons stay in the corners of a growing space (unless the game passed `w` / `h`).
- `menu.js`: a title menu (any menu with a `play` item) also gets "Quit to library" inside the launcher or the app, so a game's first screen has a way out; `{ quitToLibrary: false }` opts out.

## v10: phones

- `manifest.schema.json`: `"phone": { "orientation": "portrait" | "landscape" | "any" }` marks a game laid out for a phone (with `touch` in `inputs`).
- `fit.js`: `fitCanvas(canvas, { w: 720, h: 1280 })` / `{ w: 1280, h: 720 }` are the phone spaces (1280×800 stays the default); `fit.safe` → `{ top, right, bottom, left }` safe-area insets in game units, live; `{ orientation }` asks for a screen lock without ever throwing; `fit.orientation`.
- `input.js`: `pagehide` / `freeze` pause like `visibilitychange` already did; `input.inject({ x, y, buttons })` feeds a frame from on-screen controls; `input.space` and `input.canvas` from `attach`.
- `touch.js` (new, in every game): `createTouchControls(input, { stick, buttons, labels })` → `{ update(), draw(ctx), enabled, active, visible, owns(id), held(id), buttonAt(id), stick }`; draws only in touch mode; lays itself out from `input.attach`'s space and `fit.safe`.
- `net.js`: a socket dropped mid-match reconnects with backoff and takes the same room and slot back (the relay holds it for a minute); `net.status` is `'reconnecting'` meanwhile, `net.connection` is `'connected' | 'reconnecting' | 'offline'`, `net.away` lists players who dropped (events `away`, `back`, `reconnected`). `update-kit` now refreshes `net.js` and `lobby.js` too.
- `new-game <id> --phone portrait|landscape`: the phone space, the manifest field, touch controls, a layout inside `fit.safe`, text at the phone minimum. Works with `--online`.
- `check.mjs`: a mouse-only pass for every game (title by click, the on-screen pause button by click; an error when `inputs` promises `mouse`), and for phone games a touch-only phone pass at 390×844 / 844×390 and DPR 3 (menus by tap, `visibilitychange` → paused, the pause button, no `fillText` under 32 game px of a 720-wide space, a `screenshot-phone-<orientation>.png`). Games expose `window.__game.pauseButton = { x, y, w, h }` and `window.__game.pauseMenu` so the passes know where to click; without them the usual corners are tried.
