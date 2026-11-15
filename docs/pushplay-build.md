# Getting a game into PushPlay

PushPlay is a launcher for a Steam Deck, a Legion Go, a PC and a phone. It follows a game's GitHub repo and plays its builds. This page is everything PushPlay needs from a game, whatever the game is made with: Godot, Unity, GameMaker, Rust, Love2D, Ren'Py, plain JavaScript or anything else that produces a web page or a program.

## Start here: what do you have?

PushPlay needs a build it can use. Nothing else: no particular engine, no library, and no files of ours in your repo beyond a manifest, two pictures and (only if you want checked builds) one small workflow file. Your normal release stays exactly as it is.

Every way in ends the same way, in the launcher: **Add game → Connect GitHub**, pick the repo, and the game is in your **Library**. You need a GitHub account and the game pushed to a repo on it. Nothing else has to be installed to play.

| You have | Do this | You get |
|---|---|---|
| **Nothing yet, and you don't code** | Ask a coding agent that has the [PushPlay skills](../README.md#with-a-coding-agent-optional): "Make me a game about a frog delivering mail." It writes the game, checks it and pushes it. | A checked game in your library, updated on every push. |
| **Nothing yet, and you code** | Press **Use this template** on the [starter repo](https://github.com/Visual-Zone-Development/pushplay-games), or run `pushplay new-game my-game` in an empty folder. Push. | The same. The starter has working title, pause and settings screens. |
| **A game, in any engine, that already publishes releases** | Nothing: the launcher plays the zips on your normal releases. Add a [`pushplay.json` with `release`](#play-from-your-normal-releases) to give it a name, tags and art. | Your normal build, in the library. No workflow, no second export. |
| **A plain HTML game in a repo** | Nothing: the launcher plays it from the latest commit. | The game, with a made-up cover. |
| **Any game, and you want every version checked and listed** | Add `pushplay.json`, two pictures and [the workflow file](#the-workflow-file). In the launcher, **Set up auto-builds** on the repo or the game's page opens a pull request that adds the workflow file and a starter manifest. | Every push (or every release you publish) is checked and published to a `pushplay-latest` release. The game gets rendered art and "Plays on" labels, and can be listed on Discover and played in the phone app. |

What each level adds:

| | As it is | `pushplay.json` in the repo | Plus the workflow file |
|---|---|---|---|
| Plays in the launcher on a Steam Deck, a Legion Go and a PC | ✓ | ✓ | ✓ |
| Its own name, description, tags, launch options | | ✓ | ✓ |
| Cover and banner | made up | PNG, JPG or WebP from the repo | any format, rendered and checked |
| Played headlessly on every version to catch problems | | | ✓ |
| Discover and the phone app | | | ✓ |

**One rule:** the launcher reads `pushplay.json` on the repo's default branch first. It says what the game is called and how it is described, whichever of these the files come from, and an edit to it shows up in the library within minutes, with no new build. The files themselves come from a checked build in `pushplay-latest` if there is one, else from your normal releases, else (a plain HTML game) from the repo itself. With no `pushplay.json` the launcher guesses from the repo's name, description and file names.

To check on your own machine before pushing, run `pushplay check` in the repo (needs Node.js). It is the same check that runs on GitHub.

Below, `pushplay` stands for `npx github:Visual-Zone-Development/pushplay-plugin`: `pushplay check` means `npx github:Visual-Zone-Development/pushplay-plugin check`. It unpacks its tools into a cache in your home folder, never into your repo.

| Command | What it does |
|---|---|
| `pushplay check [id ...]` | Build and play the games headlessly; prints ✗ problems, ⚠ notes, and the full paths of the rendered cover, banner and screenshot PNGs (in a scratch folder outside the repo) |
| `pushplay setup` | Install the headless browser the check uses (the first `check` tries by itself) |
| `pushplay dev [id] [--host]` | Play a web game in a browser with live reload, at http://localhost:5173 |
| `pushplay art-shots [id]` | Render the game's art to PNG and print the paths |
| `pushplay art [id] [--dry] [--approve <$>]` | Optional painted art from your own image API key (see [Generated art](#generated-art)) |
| `pushplay new-game <id> …` | Start a new JavaScript game (see [The runtime files](#the-runtime-files-optional-javascript-only)) |
| `pushplay update-runtime` | Refresh the runtime files of JavaScript games |
| `pushplay promote <id> [--repo owner/name] [--private] [--keep]` | Move one game out of a repo of many (`games/<id>/`) into its own repo |
| `pushplay migrate [--dry]` | Clean up a repo set up with an older kit (see [Moving off an old kit](#moving-off-an-old-kit)) |
| `pushplay where`, `pushplay version` | Where the tools are unpacked; their version |

## The manifest

`pushplay.json` sits at the root of the repo, next to the game. (A repo can also hold several games, each in `games/<id>/` with its own `pushplay.json` and art; the folder name is then the id.) The [schema](../schema/manifest.schema.json) rejects fields it doesn't know.

```json
{
  "$schema": "https://raw.githubusercontent.com/Visual-Zone-Development/pushplay-plugin/v1/schema/manifest.schema.json",
  "id": "star-courier",
  "name": "Star Courier",
  "description": "Pilot a tiny courier ship through an asteroid field, grabbing parcels before the clock runs out.",
  "version": "1.0.0",
  "entry": { "web": "index.html" },
  "art": { "cover": "art/cover.svg", "hero": "art/hero.svg" },
  "controls": "gamepad",
  "inputs": ["gamepad", "keyboard", "mouse", "touch"],
  "players": "1",
  "tags": ["arcade", "space", "score attack"]
}
```

`id`, `name` and `entry` are required by the schema. The check also requires `description`, `tags` and `inputs`. A game that [plays from its normal releases](#play-from-your-normal-releases) needs only `id`, `name` and `release`; the rest is then advice.

| Field | Meaning |
|---|---|
| `id` | **Required.** Lowercase letters, digits and dashes, up to 64 characters. Permanent: players' saves and the game's listing follow it, so never change it. |
| `name` | **Required.** The title players see, up to 80 characters. |
| `entry` | **Required.** What starts the game, per platform: `web` (an HTML page), `linux-x64`, `linux-arm64`, `windows-x64`, `darwin-arm64`, `darwin-x64` (a program). With `build.outputs`, each is a path inside that platform's folder. |
| `description` | **Required by the check**, at least 20 characters. 1–3 plain sentences: what you do and what makes it fun. Shown in the library. |
| `tags` | **Required by the check.** 2–5 lowercase words players filter the library by (8 at most): genre first (`"racing"`, `"puzzle"`), then setting or style (`"space"`, `"pixel art"`), and `"local multiplayer"`, `"online multiplayer"` or `"party"` when they apply. Letters, digits, spaces, `-`, `&` and `'`, up to 24 characters each. |
| `inputs` | **Required by the check.** What the whole game, gameplay included, can be played with: any of `"gamepad"`, `"keyboard"`, `"mouse"`, `"touch"`. List only what works. |
| `version` | A label players see next to the build, such as `1.2.0`. It is not what makes the launcher update: every new build does that. Change it when you want players to see a new number. |
| `release` | Play the game from the repo's normal GitHub releases, with nothing built for PushPlay. `true` finds each platform's zip by its name; an object names them: `{ "linux-x64": "Game-*-linux.zip" }`. See [Play from your normal releases](#play-from-your-normal-releases). |
| `art` | `cover` and `hero`: paths to `.svg`, `.html`, `.png`, `.jpg` or `.webp` files (see [The art](#the-art)). The build adds `screenshots` itself. |
| `controls` | `"gamepad"` once the game works with a controller; `"keyboard-mapped"` for a game that has no controller support yet. |
| `players` | `"1"`, or a range like `"1-4"`. |
| `build.outputs` | The finished folder for each platform, made by your own build: `{ "web": "export/web", "linux-x64": "export/linux" }`. Every platform in `entry` needs a folder here and the other way round. See [Any engine](#any-engine). |
| `build.command` | A command run in the game's folder before packaging, in place of `npm run build`. It runs with `PUSHPLAY_BUILD=1` in the environment. |
| `build.preset`, `build.output` | `"preset": "vite"` or `"static"`; `output` is the folder an npm build writes (default `dist`). |
| `launch` | Arguments and environment for a native build, per platform: `{ "linux-x64": { "args": ["--fullscreen"], "env": { "NAME": "value" } } }`. |
| `web.isolated` | `true` serves the web build cross-origin isolated, which engine exports that use threads (`SharedArrayBuffer`) need. Everything the game loads must then be its own files. |
| `online` | `true` for an online multiplayer game built on PushPlay's relay; it may then connect to the relay. |
| `party` | `true` for a party game (see [Party games](#party-games)). |
| `phone` | `{ "orientation": "portrait" \| "landscape" \| "any" }` for a game laid out for a phone (see [Phones](#phones)). `inputs` must then include `"touch"`. |
| `movedFrom` | Written by `pushplay promote` so players' copies follow a game to its new repo. Don't edit it. |

The library's "Plays on" labels are worked out from the manifest and the check, never typed in: **Handheld & controller**; **Desktop** (`keyboard` and `mouse` in `inputs`); **Tablet** (a landscape game with `touch`; "Needs a controller" without); **Phone** (`phone`, `touch` and a passing phone check); **Party** (`party`).

## The art

Two images, the first thing anyone sees in the library. Write them as SVG, as an `.html` page that draws on a canvas (rendered at the exact size after `load`), or as a PNG, JPG or WebP.

| File | Size | Where it shows | Rules |
|---|---|---|---|
| `art.cover`, e.g. `art/cover.svg` | 720×500 | The library tile, shown at about 216×150 | **Must include the game's title**, big and bold. Keep the **bottom 110 px clear of anything important**: the launcher draws badges there. |
| `art.hero`, e.g. `art/hero.svg` | 1920×450 | The banner on the game's page, and cropped at the top of the phone app's library | **No title text**: the launcher writes the title in light text over the bottom-left, so keep that area calm and dark. Put the key visual in the middle (x 600–1320, top 250 px): the phone shows only that part. |

- Set `width`, `height` and `viewBox` on the root `<svg>` to the exact size.
- Show what the game is: its hero, ship or key object, in the game's own colours. Bold shapes, 2–4 main colours, one focal point. It must read at thumbnail size.
- Fill the frame with a background: no transparency.
- Text in SVG or HTML art must use one of the bundled fonts, which look the same everywhere: `Chakra Petch` (600, 700), `Rubik` (400, 700, 900), `Bungee`, `Lilita One`, `Press Start 2P`. Other fonts aren't available when the art is rendered.
- No external images or links inside an SVG. An embedded `<image href="data:...">` is fine.

A game with a web build and no `art` field gets a basic cover made from a screenshot. A game with no web build needs both images. `pushplay art-shots` renders them so you can look.

## Play from your normal releases

If your game already publishes GitHub releases with a zip per platform, PushPlay can use those. There is no workflow to add and nothing is exported a second time.

With no files of ours at all, the launcher finds the zips by their names (`Game-Windows.zip`, `game_linux64.zip`, `Game-HTML5.zip`, `Game-macOS.zip`), skips source and symbol zips, and uses the repo's description. To say more, put a `pushplay.json` at the top of the repo:

```json
{
  "id": "star-drift",
  "name": "Star Drift",
  "description": "Race a little ship through asteroid fields. One to four players.",
  "tags": ["racing", "space"],
  "players": "1-4",
  "release": {
    "linux-x64": "StarDrift-*-linux.zip",
    "windows-x64": "StarDrift-*-windows.zip"
  },
  "entry": { "linux-x64": "StarDrift.x86_64", "windows-x64": "StarDrift.exe" },
  "launch": { "linux-x64": { "args": ["--fullscreen"] } },
  "art": { "cover": "art/cover.png", "hero": "art/hero.png" }
}
```

- **`release`** names the file for each platform in your newest release that isn't a draft or a prerelease. `*` stands for the part that changes, such as the version. `"release": true` keeps finding them by name.
- **`entry`** is optional. Without it the launcher looks inside the zip for an `index.html` or the program. Name it when the zip holds more than one program.
- **`art`**: a 720×500 cover and a 1920×450 banner kept in the repo. Without the workflow file the launcher shows PNG, JPG and WebP pictures; SVG and HTML art is drawn by the build, so it needs the workflow. With no art the launcher makes up a cover.
- Everything except `id`, `name` and `release` is optional. `pushplay check` reads the file and tells you what would make the game look better; it doesn't check the game's files, because they are in your releases.
- The launcher reads the file from the default branch each time it looks at the repo, so a change shows up without a new release.

This plays in the launcher on the systems your zips are for. A Linux build plays on a Steam Deck; a Windows-only game doesn't. Discover and the phone app take checked builds only: for those, add the workflow file below. It then packages each release you publish from its own files, so there is still only one export.

## The workflow file

Save this as `.github/workflows/pushplay.yml` (it is [workflow.yml](workflow.yml) in this folder):

```yaml
name: PushPlay

on:
  push:
    branches: ['**']
    paths-ignore: ['**/*.md']
  release:
    types: [published] # a game with "release" in its manifest is packaged from your release's own files
  workflow_dispatch:

jobs:
  pushplay:
    uses: Visual-Zone-Development/pushplay-plugin/.github/workflows/build.yml@v1
    permissions:
      contents: write # publish the builds to this repo's releases
      id-token: write # online games: prove which repo built them
```

What it does:

- On every push, on any branch, it builds the games that changed and checks them. Running it by hand (`workflow_dispatch`) rebuilds every game.
- On the default branch it publishes them to a release named `pushplay-latest`, where the launcher picks them up. A branch named `beta` publishes to `pushplay-beta`. Other branches only check.
- `pushplay-latest` is a prerelease, so your repo's own "Latest" release is untouched.
- For a game with `release` in its manifest, publishing one of your own releases is what triggers it: it takes that release's zips, checks them, renders the art and publishes them to `pushplay-latest`. Pushes only check the manifest.
- The build itself is shared by every game repo, so there is nothing to keep up to date in yours.
- Keep both permissions, whatever the game. The shared build asks for `id-token` for every game (it is how an online game proves which repo built it), and GitHub refuses to start a called workflow that asks for more than its caller grants.
- Keep it in its own file. Called from a workflow that only runs on tags, it would check and publish nothing: it publishes from the default branch, from `beta`, and from a published release.

It lives beside your own release workflow and doesn't affect it: a separate file, separate releases. A game can have a normal release and a PushPlay release side by side.

### Handing over files from your own build

If your game already attaches its builds to releases, [play from those](#play-from-your-normal-releases) and skip this. Otherwise, if a job of yours exports the game, let PushPlay use those folders instead of building again. This exports on every push, so limit `branches:` to your default branch if the export is slow. Put both jobs in `pushplay.yml`: yours uploads the folders as an artifact, and the PushPlay job takes it with `needs:` and `with:`.

- `artifact`: the name of the artifact your job uploaded.
- `artifact-path`: the folder in the repo it is unpacked into (default: the repo root), so that the folders named in `build.outputs` exist when the build runs.

A complete example for a Godot project that exports web and Linux in one job:

```yaml
name: PushPlay

on:
  push:
    branches: ['**']
    paths-ignore: ['**/*.md']
  workflow_dispatch:

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Install Godot and its export templates here, the way your release workflow already does.
      - name: Export
        run: |
          mkdir -p export/web export/linux
          godot --headless --export-release "Web" export/web/index.html
          godot --headless --export-release "Linux" export/linux/game.x86_64
      - uses: actions/upload-artifact@v4
        with:
          name: pushplay-export
          path: export

  pushplay:
    needs: export
    uses: Visual-Zone-Development/pushplay-plugin/.github/workflows/build.yml@v1
    permissions:
      contents: write
      id-token: write
    with:
      artifact: pushplay-export
      artifact-path: export
```

with this in `pushplay.json`:

```json
"entry": { "web": "index.html", "linux-x64": "game.x86_64" },
"build": { "outputs": { "web": "export/web", "linux-x64": "export/linux" } }
```

Artifacts drop the mark that makes a file runnable. That is fine: the build puts it back on each native entry when it packages the game.

Builds made on different runners (Linux and Windows, say) go into one artifact: give each job's upload the same folder layout and a different artifact name, and add a small job that downloads them all and uploads the combined folder under the name you pass as `artifact`. The [Rust example](#rust-or-c-native-builds-only) does this.

`"Web"` and `"Linux"` are the names of the export presets in the project's `export_presets.cfg`; use yours. The export command is the commonly used form: check Godot's documentation for the exact command for your version.

## Any engine

PushPlay doesn't build engines. It packages the **finished folders** your build makes. `build.outputs` says where each platform's folder is, and `entry` says which file inside it starts the game.

The folders can come from three places:

1. **Committed to the repo.** Export by hand from the editor and commit the folder. This always works and needs no build setup.
2. **Made by `build.command`**, a command PushPlay's build runs in the game's folder first (on a GitHub Linux runner, with `PUSHPLAY_BUILD=1` set).
3. **Uploaded by your own workflow job**, as shown above. This suits engines that need an editor, a licence or a long setup.

With neither `build.outputs` nor `build.command`: a repo with an npm `build` script is built with it (output `dist`, or `build.output`), and any other repo ships its folder as it is, starting at `entry.web`.

A **native build** is a program for one system: `linux-x64`, `linux-arm64`, `windows-x64`, `darwin-arm64` or `darwin-x64`. Its entry must be a real program for that system: an ELF binary, an AppImage or a script starting with `#!` on Linux; an `.exe` on Windows; the binary inside `Game.app/Contents/MacOS/` on a Mac. Use `launch` to pass it arguments or environment variables.

For the engine's own export commands, the forms below are the commonly known ones. Check your engine's documentation for the exact command, or skip the question: export the folders by hand and commit them.

### Godot: web and Linux exports

```json
{
  "id": "moss-runner",
  "name": "Moss Runner",
  "description": "Sprint through an overgrown ruin, wall-jumping past traps to beat your best time.",
  "version": "1.0.0",
  "entry": { "web": "index.html", "linux-x64": "moss-runner.x86_64" },
  "build": { "outputs": { "web": "export/web", "linux-x64": "export/linux" } },
  "web": { "isolated": true },
  "launch": { "linux-x64": { "args": ["--fullscreen"] } },
  "art": { "cover": "art/cover.png", "hero": "art/hero.png" },
  "controls": "gamepad",
  "inputs": ["gamepad", "keyboard"],
  "players": "1",
  "tags": ["platformer", "speedrun"]
}
```

If the project already attaches these exports to its releases, drop `build` and use `"release": { "web": "…-web.zip", "linux-x64": "…-linux.zip" }` instead ([Play from your normal releases](#play-from-your-normal-releases)). To export in the PushPlay workflow, use the two-job file under [Handing over files from your own build](#handing-over-files-from-your-own-build).

Export with `godot --headless --export-release "<preset>" <file>` or from the editor. Keep `web.isolated` only if the web export uses threads. The Linux build plays on a Steam Deck; the web build plays everywhere else.

### Unity: a WebGL build

```json
{
  "id": "orbit-golf",
  "name": "Orbit Golf",
  "description": "Putt a ball around tiny planets, using their gravity to curve every shot into the hole.",
  "version": "1.0.0",
  "entry": { "web": "index.html" },
  "build": { "outputs": { "web": "Builds/WebGL" } },
  "art": { "cover": "art/cover.png", "hero": "art/hero.png" },
  "controls": "gamepad",
  "inputs": ["gamepad", "keyboard", "mouse"],
  "players": "1",
  "tags": ["golf", "space", "physics"]
}
```

For phones, export without compression (Compression Format: Disabled) or turn on Decompression Fallback: the launcher serves `.br` and `.gz` files as what they hold, but the phone app's game view can't, and the check notes it. Build for WebGL from the editor's build window (or with Unity's batch mode from your own workflow) into `Builds/WebGL`, and commit the folder or hand it over as an artifact. The folder must hold everything the page loads.

### Rust or C++: native builds only

```json
{
  "id": "cave-diver",
  "name": "Cave Diver",
  "description": "Dive deeper into a flooded cave on one tank of air, mapping tunnels as you go.",
  "version": "1.0.0",
  "entry": { "linux-x64": "cave-diver", "windows-x64": "cave-diver.exe" },
  "build": { "outputs": { "linux-x64": "dist/linux", "windows-x64": "dist/windows" } },
  "art": { "cover": "art/cover.png", "hero": "art/hero.png" },
  "controls": "gamepad",
  "inputs": ["gamepad", "keyboard"],
  "players": "1",
  "tags": ["exploration", "roguelike"]
}
```

If your CI already attaches `cave-diver-linux.zip` and `cave-diver-windows.zip` to releases, that manifest becomes `"release": { "linux-x64": "cave-diver-*-linux.zip", "windows-x64": "cave-diver-*-windows.zip" }` with no `build`, and you are done.

To build in the PushPlay workflow instead, `build.command` only suits the Linux build (it runs on a Linux runner; `cargo build --release` works there if the toolchain is installed by a step of yours, and the folder must hold only the game, so copy the binary out of `target/release` into `dist/linux`). For Linux and Windows together, build each on its own runner and hand over one artifact:

```yaml
jobs:
  build:
    strategy:
      matrix:
        include:
          - { os: ubuntu-latest, folder: linux, file: cave-diver }
          - { os: windows-latest, folder: windows, file: cave-diver.exe }
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - run: cargo build --release
      - run: mkdir -p dist/${{ matrix.folder }} && cp target/release/${{ matrix.file }} dist/${{ matrix.folder }}/
        shell: bash
      - uses: actions/upload-artifact@v4
        with:
          name: build-${{ matrix.folder }}
          path: dist

  combine:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          pattern: build-*
          merge-multiple: true
          path: dist
      - uses: actions/upload-artifact@v4
        with:
          name: pushplay-export
          path: dist

  pushplay:
    needs: combine
    uses: Visual-Zone-Development/pushplay-plugin/.github/workflows/build.yml@v1
    permissions:
      contents: write
      id-token: write
    with:
      artifact: pushplay-export
      artifact-path: dist
```

These are the commonly used forms of those actions; check their documentation for your versions.

Each folder holds the program and every file it needs beside it. With no web build, both art images are required, the game is not play-tested by the check, and it plays only on the systems you built for (not in the phone app or Discover). The game needs its own way to quit (see [Inside the launcher](#inside-the-launcher)).

### JavaScript with your own bundler

```json
{
  "id": "tile-drop",
  "name": "Tile Drop",
  "description": "Drop coloured tiles into a well and chain matches before the stack reaches the top.",
  "version": "1.0.0",
  "entry": { "web": "index.html" },
  "build": { "command": "npm run build:pushplay", "outputs": { "web": "public/build" } },
  "art": { "cover": "art/cover.svg", "hero": "art/hero.svg" },
  "controls": "gamepad",
  "inputs": ["gamepad", "keyboard", "mouse", "touch"],
  "players": "1",
  "tags": ["puzzle", "arcade"]
}
```

`build:pushplay` is a script of your own in `package.json`. Commit `package-lock.json`: the build installs your packages from it. If your ordinary `npm run build` writes to `dist`, you need no `build` field at all.

## What the check requires

`pushplay check` and the GitHub build run the same check. ✗ problems fail the build; ⚠ notes don't. It runs the game with the launcher's object present (`window.pushplay`), so it judges what the game does **inside the launcher**.

| Kind of game | What is checked |
|---|---|
| **Every game** | The manifest is valid; `description`, `tags` and `inputs` are there; art files exist and aren't placeholders; every `entry` exists. |
| **A web build** (your own engine, or an engine's export) | Must not crash, must not request the internet, must not open `alert` / `confirm` dialogs, must have no missing files, and must show a picture within 30 seconds (a loading screen counts). Pausing and menus are only reported (⚠), never failed. Nothing inside an exported folder is scanned. An `F10` binding in your own JavaScript is only pointed out. |
| **A JavaScript game on the runtime files** | All of the above within 3 seconds, plus every play pass: a controller, keyboard only (Enter starts, Esc pauses), mouse only, touch, a 16:9 window at 2× pixels, and for a `phone` game a touch-only pass at phone size. See [The runtime files](#the-runtime-files-optional-javascript-only). |
| **A native build** | The entry exists in its folder and is a real program for that platform. It is not played. |
| **No web build** | `art.cover` and `art.hero` are required: there is no screenshot to make them from. |

The messages you are most likely to see:

| Message | Fix |
|---|---|
| `the game loads <url> from the internet. Games must work offline: bundle it into the game folder (or set "online": true for multiplayer games)` | Copy the file (a font, a script from a CDN) into the game and load it from there. If it is analytics, an ad or a service for your normal release, put it behind `if (!window.pushplay)`. |
| `the game opens a WebSocket to <url>. Games must work offline (or set "online": true for multiplayer games)` | The same: keep it out of the launcher with `if (!window.pushplay)`. |
| `the game opened a alert() dialog, which blocks controller input; draw UI in the game instead` | Replace `alert`, `confirm` and `prompt` with something drawn in the game, or keep them behind `if (!window.pushplay)`. |
| `after 30s the screen is still one flat color. The game should show something (a loading screen counts) while it starts` | Draw a loading screen straight away. If the game never starts, look for `the game crashed: …` or `missing file: … (404)` above it. A threaded engine export needs `"web": { "isolated": true }`. |
| `missing file: <path> (404)` | The page asks for a file that isn't in the build folder. Check the path and its upper and lower case. |
| `add a "description" of 1–3 sentences (at least 20 characters)` | Write it in `pushplay.json`. |
| `add "tags" (1–8 lowercase genre and style words, e.g. ["arcade", "space"]) so players can filter the library` | Add them. |
| `add "inputs": ["gamepad", "keyboard", "mouse", "touch"] (drop the ones gameplay can't support; menus must work with all four)` | Add the ones the game really plays with. |
| `<file> is still the placeholder. Design real cover art for this game` | Replace the starter image with your own (see [The art](#the-art)). |
| `a game with no web build needs art.cover and art.hero (there is no screenshot to make them from)` | Add both images and the `art` field. |
| `entry.linux-x64 "<file>" isn't a Linux program (an ELF binary, an AppImage or a script starting with #!)` | Point `entry` at the program itself, not at a folder, an archive or a data file. The Windows and Mac messages read `isn't a Windows program (.exe)` and `isn't a Mac program (the file inside Game.app/Contents/MacOS/)`. |
| `entry.<platform> "<file>" isn't in <folder>` | `entry` is a path **inside** the `build.outputs` folder, not from the repo root. |
| `build.outputs.<platform>: the folder "<folder>" doesn't exist. Commit it, make it with "build": { "command": "…" }, or upload it from your own workflow before this one runs` | The export hasn't happened where the build can see it. Commit the folder, or check `artifact-path` and the artifact's contents. |
| `entry.<platform> has no folder in build.outputs` / `build.outputs.<platform> has no entry.<platform>` | Every platform needs both: the folder, and the file in it that starts the game. |
| `entry.web "<file>" doesn't exist` | Point it at the real page, usually `index.html`. |
| `(root) must NOT have additional properties "<name>"` | Remove the field: the schema doesn't know it. |

## A normal release and a PushPlay release

They are separate. The PushPlay workflow has its own file and publishes to its own releases (`pushplay-latest`, `pushplay-beta`). Your store page, your itch.io upload, your own GitHub releases and the workflow that makes them stay as they are, and nothing PushPlay asks for has to change what the game does there.

Inside the launcher a game must work offline and without dialogs. To keep analytics, ads, a login or an online leaderboard in your normal release, tell the two apart:

- **A web game at run time:** `window.pushplay` exists only inside the launcher (and in the check).

  ```js
  if (!window.pushplay) {
    loadAnalytics()
    showNewsletterPrompt()
  }
  ```

- **At build time:** `PUSHPLAY_BUILD=1` is set when the PushPlay build runs `build.command` or `npm run build`, so a bundler can leave a module out or define a flag.
- **A native game:** the environment variable `PUSHPLAY=1` is set when the launcher starts it.

"Quit to library" belongs only inside the launcher. Show it when `window.pushplay?.quit` exists (or `PUSHPLAY=1` for a native game), and your normal release never shows it.

## Inside the launcher

**The `window.pushplay` object** (web builds):

| Member | |
|---|---|
| `version` | The launcher's version |
| `gamingMode` | Whether the launcher is in its gaming mode (a game should then start out showing controller prompts) |
| `inputMode` | The launcher's current input mode |
| `quit()` | Close the game and go back to the library |
| `restart()` | Restart the game |
| `onPause(cb)`, `onResume(cb)` | Called when the launcher pauses and resumes the game |

The window also gets the events `pushplay:pause` and `pushplay:resume`. Always write `window.pushplay?.…`: outside the launcher the object is undefined.

```js
window.addEventListener('pushplay:pause', () => pauseGame())
if (window.pushplay?.quit) pauseMenu.add('Quit to library', () => window.pushplay.quit())
```

**Pausing.** The launcher pauses the game when its own menu opens. When that happens, stop the game, save, and wait for the player to resume; don't resume by yourself.

**Reserved keys.** F10, Start+Select held together, and Esc held for one second open the launcher's own menu (Resume, Restart game, Quit game) over the game; for mouse and touch the launcher draws a ≡ button. Never bind them. A short press of Esc or Start is yours, and pausing is the usual thing to do with it.

**Quitting.**

- A web game can always be left through the launcher's menu. Add "Quit to library" to your own pause menu as well, calling `window.pushplay.quit()`.
- A native game needs its own quit, reachable with a controller. On Linux the launcher also closes a native game when Start+Select is held for 3 seconds; on Windows and Mac it does not.

**Controls.** The game is played on a handheld with a controller, on the couch. Every screen must work with a controller alone, and text must be readable on a 7–8" 1280×800 screen. A controller has no hover, scroll wheel or typed text, so nothing may depend on them; anything aimed or dragged with a pointer also needs a stick-driven way to do it.

**Where each kind of build plays.**

| Build | Plays on | Limits |
|---|---|---|
| Web | Everywhere: handheld, Windows, Mac, Linux, the phone app, Discover | Must work offline |
| Native | Only the system it was built for | A Windows-only game does not run on a Steam Deck in PushPlay: there is no Proton. The phone app and Discover take web builds only. |

From a PushPlay release the launcher installs the native build for the device when there is one, and the web build otherwise.

## Phones

The phone app plays checked web builds of games listed on Discover. A game marked `"web": { "isolated": true }` is served isolated there too, as in the launcher. Pre-compressed files (`.br`, `.gz`) are not supported in the phone app.

A game earns the **Phone** label when it is laid out for a phone, plays with touch alone and says so in the manifest:

```json
"inputs": ["gamepad", "keyboard", "touch"],
"phone": { "orientation": "portrait" }
```

`orientation` is `"portrait"`, `"landscape"`, or `"any"` for a game that lays itself out both ways. A game that stays in a landscape handheld layout with `touch` in `inputs` earns **Tablet** instead.

What a phone layout needs:

- **A phone-shaped space.** Portrait **720×1280** for one-thumb games (tappers, stackers, runners, puzzles, cards); landscape **1280×720** for two-thumb games with a stick and buttons. Better still, fill the whole screen: phones differ in shape, so treat that size as the minimum and let the view grow, without letting a bigger screen make the game easier.
- **Text of at least 32 px** in that space (40 px reads comfortably), headings from 44 px.
- **Tap targets of at least 56 px**, on-screen buttons at least 64 px and 24 px apart.
- **Safe areas.** Phones draw under the notch and the home indicator. Nothing the player reads or taps goes there; backgrounds may. Keep the HUD 32 px inside the safe area. In CSS these are the `env(safe-area-inset-*)` values; read them when the phone turns, too.
- **Thumb zones.** Everything pressed during play goes where thumbs rest: the bottom third in portrait, the lower two-thirds of each side in landscape. The HUD goes at the top, read-only. The pause button, in a top corner, is the only tap target up there.
- **Touch alone.** No hover, no right-click, no keyboard. Every menu a player can leave needs a visible Back item. Fingers are imprecise and hide what's under them: no tiny targets, snap drags to a grid or to targets.
- **Pause when hidden.** A call, the lock button or switching apps hides the page at any moment (`visibilitychange`). Pause and save; never resume by yourself. The first frame after coming back can be seconds long, so cap your time step.
- **A controller still works.** A phone or tablet with a Bluetooth controller should play like a handheld: hide on-screen controls when a controller is in use. Don't write your own orientation lock; the PushPlay app turns the game as the manifest says.

For a JavaScript game on the runtime files the check plays a phone game with touch only at 390×844 (portrait) or 844×390 (landscape) at 3× pixels: menus by tap, the pause button, a pause when the page is hidden, and no text under 32 px. `pushplay new-game <id> --phone portrait|landscape` starts a game already laid out this way, and `pushplay dev --host` serves it on your Wi-Fi to try on a real phone.

## Party games

A party game runs on the handheld or PC plugged into a TV, and everyone plays from their phone: they scan the QR code on the lobby screen, or open the address shown there in any browser and type the room code. Controllers plugged into the machine can join too. Think of quizzes, drawing and bluffing games, card games with hidden hands, or action games with phones as gamepads.

Party games are JavaScript games built on PushPlay's runtime files, which carry the connection, the lobby and the QR code:

```sh
pushplay new-game <id> --party [--controller pad|custom|motion] [--players 3-8]
```

- `pad` (the default) gives every phone a stick and A/B buttons. `custom` starts a phone screen of your own (answers, votes, a hand of cards, a drawing pad). `motion` makes the phone a motion controller. Up to 16 players.
- **The TV runs the whole game.** Phones only show what they are sent and send back taps. Each frame the game reads every player's input the same way, whether it comes from a phone or a plugged-in controller.
- **Who sees what.** `party.public` goes to every phone (the prompt, the choices, whose turn). `party.view(id)` goes to one player's phone only (their hand, their secret role). Everything else stays on the TV. Never put a secret in `party.public`.
- **The phone screen is one file,** `controller.html`, with its styles, script and images inline. The TV sends it to each phone, where it runs with no network. Design it for a phone held in one hand: big tap targets, one decision per screen. Text fields are fine there.
- **Pause freezes the game,** because the TV runs it. Phones that drop (a locked screen, Wi-Fi) keep their seat for two minutes; show those players dimmed and skip their turn.
- **Delay.** A phone's input takes about 50–150 ms to reach the TV: fine for party, quiz, card and brawler games, wrong for precise aiming.
- Set `"party": true` and the tag `"party"` (the scaffold does). `pushplay dev` lets phones on the same Wi-Fi join by scanning the lobby's QR code. The check brings headless phones that join, play, see only their own private view, and reconnect.

**Motion controls** (`--controller motion`). Phones know which way gravity points and how fast they are turning. They don't know where they are in the room or where the TV is.

| Works | Doesn't work |
|---|---|
| Tilt (a tray, a marble maze), a steering wheel, swings, flicks and shakes, grip-swing-release (bowling, throwing), timing ("hit it now") | Pointing at the screen like a light gun, tracking the phone's position, precise continuous aiming |

Gestures are detected and timed on the phone, so timing games work despite the delay. iOS asks for motion permission only after a tap and only on an https page; the published build is https, while `pushplay dev` over Wi-Fi is plain http, so phones fall back to a touch pad there. Test motion on the published build. Every motion game must also play with a controller, a keyboard, a mouse and touch, and always offer a re-center button.

## Generated art

Optional. Art drawn in code or by hand is the default, and every game works without this. If you have an image-generation API key, `pushplay art` can make painted sprites, textures and key art from a list of prompts. Generation runs only on your machine; the images are saved into the game folder and bundled like any other asset, so the game still never touches the network.

**Keys.** Set one of these in the environment, or in a `.env` file at the repo root that you keep out of git:

| Variable | Provider |
|---|---|
| `OPENAI_API_KEY` | OpenAI image models (transparent backgrounds built in). `OPENAI_IMAGE_MODEL` overrides the model. |
| `GEMINI_API_KEY` | Google Gemini image models. `GEMINI_IMAGE_MODEL` overrides the model. |
| `REPLICATE_API_TOKEN` | Replicate. `REPLICATE_IMAGE_MODEL` (`owner/name`) picks the model. |

With several keys set, `ART_PROVIDER=openai|gemini|replicate` picks one. Never commit a key or put one in a game's code.

**Nothing is charged until you agree.** Every run prints an estimate first. In a terminal it asks, e.g. `This charges about $0.60 to your openai account. Generate 12 image(s)? [y/N]`, and anything but `y` cancels. With no terminal to answer (a script, CI) it stops at the estimate and exits with code 2 unless you passed `--approve <$>` and that amount covers the estimate. A run stops at 12 images unless you pass `--max`, defaults to medium quality and skips images that already exist. Prices are your provider's; check its pricing page.

**The prompts** are in `art/prompts.json`: one shared `style`, reusable `clauses`, and one short line per asset.

```json
{
  "style": "Game art for a top-down arcade space game. Bold hand-painted sci-fi style, readable at 64 px. No text or logos.",
  "clauses": { "isolated": "One object, centred, empty margin on every side. No ground, no shadow, no frame." },
  "quality": "medium",
  "assets": [
    { "id": "courier", "prompt": "A small cargo courier spaceship.", "use": ["isolated"], "transparent": true, "out": 256 }
  ]
}
```

`id` is the file name (`assets/art/<id>.png`); `size` is `1024x1024` (the default), `1536x1024` or `1024x1536`; `transparent` asks for a transparent background; `out` scales the longest side down to that many pixels.

```sh
pushplay art --dry             # prompts and cost estimate, no calls
pushplay art                   # generate what's missing (12 per run at most); asks first
pushplay art --approve 0.60    # no terminal: generate once you have agreed to about $0.60
pushplay art courier --force   # redo one asset (also asks)
pushplay art --list            # which assets exist
```

Each run saves the raw images to `art/raw/` (added to `.pushplayignore`, so they aren't shipped), writes the finished PNGs to `assets/art/`, updates a *Generated art* section in `assets/CREDITS.md`, and prints the path of a contact sheet. Look at the contact sheet before using the images. Keep bundled assets small (under 30 MB in total) and check your provider's terms for commercial use.

## The runtime files (optional, JavaScript only)

If you are starting a JavaScript game from nothing, PushPlay has a small set of plain ES modules that do the parts every launcher game needs: controller, keyboard, mouse and touch as one input, menus that work with all four, scaling, saves, settings, sound and on-screen touch controls. They are optional. A game that uses them is held to more by the check (every input alone, pausing, scaling), and in return gets "Quit to library", auto-pause and the launcher's hooks without writing them.

```sh
pushplay new-game <id> [--workshop] [--vite] [--online --players 2-4 | --party [--controller pad|custom|motion]] [--phone portrait|landscape] [--name "Title"]
```

It writes a working starter with title, pause and settings screens, the runtime files, `pushplay.json`, placeholder art (which the check won't accept: replace it), and the workflow file if the repo has none. `--workshop` puts the game in `games/<id>/` so one repo can hold many; `--vite` adds a bundler for npm packages such as three.js.

| File | What it does |
|---|---|
| `input.js` | One view of controller, keyboard, mouse and touch; button labels for the device in use; pause requests from the launcher |
| `menu.js` | Menus that work with every input; adds "Quit to library" to the pause menu inside the launcher |
| `fit.js` | Scales a fixed 1280×800 space (or a phone space) to any window; safe areas |
| `audio.js` | Master, music and SFX buses; generated tones and noise; bundled files; unlocks on first input, mutes on pause |
| `save.js` | Versioned saves in `localStorage` under the game's id |
| `settings.js` | The Settings screen: volumes, reduced shake and flash, text size, your own options |
| `prompts.js` | Button-prompt icons for the device in use |
| `touch.js` | An on-screen stick and buttons for touch play |
| `net.js`, `lobby.js` | Online games (`--online`): rooms, synced state and a lobby through PushPlay's relay |
| `party.js`, `party-lobby.js`, `qr.js`, `controller.js`, `net.js` | Party games (`--party`): phones as controllers, the lobby and its QR code |

Each starts with the header `pushplay runtime vN`. Don't edit them: `pushplay update-runtime` replaces them with the current versions (and adds missing ones, such as `touch.js`), leaving alone any file of the same name that you wrote yourself.

## Moving off an old kit

Repos set up before kit v14 carry a copy of the build kit and agent instructions. `pushplay migrate` removes what the kit put there and nothing of yours:

- the kit's old copy in `.github/pushplay/`;
- the kit's lines in `AGENTS.md` and `CLAUDE.md`;
- the kit's skills in `.claude/skills/` and its guides in `docs/game-design/`;
- `tools/art` and `tools/promote`;
- the npm scripts that ran the kit;

and writes the workflow file. Your own skills, tools, scripts and docs are kept. Run `pushplay migrate --dry` first to see what it would do, then `pushplay migrate`, then `pushplay check`, and commit. From then on every command is `pushplay …` as on this page.

---

Agent skills for making and porting PushPlay games are in this repository too, for people who want them; nothing on this page needs them.
