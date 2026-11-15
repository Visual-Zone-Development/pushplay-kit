# The manifest (`pushplay.json`)

`pushplay` is the command the `pushplay-rules` skill gives you. `pushplay.json` sits at the root of the game: the repo root (next to `index.html`, `project.godot`, `Cargo.toml`, …), or `games/<id>/` in a workshop. The launcher reads it first for every repo. `pushplay new-game` writes a starter for a JavaScript game; for an existing game in any engine you write it by hand (the `port-game` skill sets the rest up). It is validated against the schema at the `$schema` URL, which rejects fields it doesn't know.

```json
{
  "$schema": "https://raw.githubusercontent.com/Visual-Zone-Development/pushplay-kit/v1/schema/manifest.schema.json",
  "id": "star-courier",
  "name": "Star Courier",
  "description": "Pilot a tiny courier ship through an asteroid field, grabbing parcels before the clock runs out.",
  "version": "1.0.0",
  "entry": { "web": "index.html" },
  "art": { "cover": "art/cover.svg", "hero": "art/hero.svg" },
  "controls": "gamepad",
  "inputs": ["gamepad", "keyboard", "mouse", "touch"],
  "players": "1",
  "tags": ["arcade", "space", "score attack"],
  "online": false,
  "phone": { "orientation": "landscape" }
}
```

A game with its own build adds where its finished files are (any engine; here a web export and a Linux build):

```json
  "entry": { "web": "index.html", "linux-x64": "game.x86_64" },
  "build": { "outputs": { "web": "export/web", "linux-x64": "export/linux" } },
  "launch": { "linux-x64": { "args": ["--fullscreen"], "env": { "NAME": "value" } } },
  "web": { "isolated": true }
```

**Read the game before writing about it.** Read `DESIGN.md` if the game has one and play the game (`pushplay dev` for a JavaScript game) or look at the check's screenshot. Every field describes what the game really does today: an input in `inputs` that gameplay doesn't support, or a tag for a mode that isn't built, is a bug a player will hit.

## Fields

| Field | Rule |
|---|---|
| `id` | **Required.** Lowercase letters, digits and dashes, up to 64 characters, starting with a letter or digit; in a workshop the same as the folder name. **Never change it**: players' saves and the game's listing follow it. |
| `name` | **Required.** The title as players see it, up to 80 characters. |
| `entry` | **Required** (optional with `release`). The file that starts the game, per platform: `web`, `linux-x64`, `linux-arm64`, `windows-x64`, `darwin-arm64`, `darwin-x64`, no other keys. `{ "web": "index.html" }` for every game on the runtime files. With `build.outputs`, each is a path **inside that platform's output folder**, not from the repo root. A native entry must be a real program: an ELF binary, an AppImage or a `#!` script on Linux, an `.exe` on Windows, the binary inside `Game.app/Contents/MacOS/` on Mac. |
| `release` | In place of a build: play the zips on the repo's normal GitHub releases, with nothing built for PushPlay and no workflow file. `true` finds each platform's zip by its name; `{ "linux-x64": "Game-*-linux.zip" }` names them (`*` for the part that changes). Never together with `build`. Then only `id`, `name` and `release` are required: `entry` is for a zip that holds more than one program, and the check only advises on the rest. Art must be PNG, JPG or WebP unless the workflow file is added. |
| `inputs` | **Required by the check**, which plays the game by them. What the whole game, gameplay included, can be played with: any of `"gamepad"`, `"keyboard"`, `"mouse"`, `"touch"`, each once. A game on the runtime files always has `"gamepad"` and `"keyboard"`; a game in another engine lists only what it really supports. Drop `"mouse"` or `"touch"` only when gameplay genuinely can't work with them, and then say so on the title screen ("Needs a controller or keyboard"). Menus must work with all four regardless. |
| `description` | Asked for with a ⚠ (at least 20 characters); a finished game has one. See *Writing the description and tags*. |
| `tags` | Asked for with a ⚠; a finished game has them. 2–5 is right, 8 the limit; letters, digits, spaces, `-`, `&` and `'`, up to 24 characters each. See below. |
| `version` | Bump it on every notable change (`1.0.0` → `1.1.0` for something a player would notice, `1.0.1` for a fix or a change to the description, tags or art), with a line in DESIGN.md's Changelog. Online games: only builds with the same version play together, so bump it whenever the netcode changes. |
| `art` | `cover` (720×500, with the title) and `hero` (1920×450, no title): `.svg`, `.html`, `.png`, `.jpg` or `.webp` paths inside the game folder, made with the `cover-art` skill. Placeholder art is a ⚠. A game with a web build and no art gets a cover generated from a screenshot (⚠); **a game with no web build needs both**. The build writes `art.screenshots` itself: never set it by hand. |
| `controls` | `"gamepad"` once the game works with a controller (every game on the runtime files); `"keyboard-mapped"` only for an existing game with no controller support yet. |
| `players` | `"1"`, or a range like `"1-4"` or `"2-4"`. |
| `online`, `party` | `true` only for a game scaffolded with `--online` (it may then connect to the relay) or `--party`. |
| `phone` | Only for a game laid out in a phone space: `{ "orientation": "portrait" \| "landscape" \| "any" }`, matching the size passed to `fitCanvas` (720×1280, 1280×720, or both). `inputs` must then include `"touch"`. Leave it out of a 1280×800 game. |
| `build.outputs` | For a game whose own build makes the files: the finished folder per platform, same keys as `entry`, as paths from the game's root. **Every platform in `entry` needs a folder here and every folder here needs an `entry`.** The folders are committed, made by `build.command`, or unpacked from an artifact the repo's own workflow uploaded (the `port-game` skill has the workflow). |
| `build.command` | A command run in the game's folder before packaging, in place of the npm `build` script (up to 1000 characters), with `PUSHPLAY_BUILD=1` in its environment. |
| `build.preset`, `build.output` | `"vite"` or `"static"`, nothing else (there is no engine preset). `{ "preset": "vite", "output": "dist" }` is what `--vite` scaffolds; `"static"` ships the folder as it is even when `package.json` has a `build` script. With no preset, a game with an npm `build` script is built with it, and `output` names its folder when that isn't `dist`. |
| `launch` | Per native platform: `{ "args": [...], "env": { ... } }`, the arguments (up to 32) and environment the launcher starts that build with. Use it instead of changing the game's own defaults. |
| `web` | `{ "isolated": true }` serves the web build cross-origin isolated, for engine exports that use threads (SharedArrayBuffer). Everything the page loads must then be the game's own files. |
| `movedFrom` | Written by `pushplay promote`. Never add or edit it by hand. |

## Writing the description and tags

- **Description:** 1–3 plain sentences, written for a player reading the library: what you do, and what makes it fun. Not a feature list, no "A game where you…", no engine or tech words. 20 characters is the floor, not the goal.
- **Tags:** lowercase words players filter the library by. Genre first (`"racing"`, `"puzzle"`, `"platformer"`, `"shooter"`), then setting or style (`"space"`, `"pixel art"`, `"cozy"`), then `"local multiplayer"`, `"online multiplayer"` or `"party"` when they apply.

## Which fields for which kind of game

On top of `id`, `name`, `description`, `version`, `art`, `controls`, `inputs`, `players` and `tags`, which every finished game has:

| Kind of game | `entry` | `build` | Also |
|---|---|---|---|
| JavaScript on the runtime files | `{ "web": "index.html" }` | none (`{ "preset": "vite", "output": "dist" }` in a `--vite` game) | `phone`, `online`, `party` when they apply |
| JavaScript with its own build | `{ "web": "index.html" }` | none if the npm `build` script writes `dist`; else `output`, or `command` for a different command | guard normal-release-only code with `if (!window.pushplay)` |
| An engine's web export | `{ "web": "index.html" }` | `{ "outputs": { "web": "<export folder>" } }` | `"web": { "isolated": true }` if the export uses threads |
| Web and native | `web` plus one key per native build | `outputs` with the same keys | `launch` for native arguments; `web.isolated` if needed |
| Native only | one key per build (`linux-x64` for a Steam Deck) | `outputs` with the same keys | `art.cover` and `art.hero` are required; `launch` if needed |
| Plays from its normal releases | optional | none: `release` instead | only `id`, `name` and `release` are required; PNG, JPG or WebP art |

Where each plays, so the user isn't surprised: a web build plays everywhere, and the phone app and Discover take web builds only. A native build plays only on the system it was built for; a Windows-only game does not run on a Steam Deck in PushPlay.

## Plays-on labels are earned, not typed

PushPlay derives where a game plays from the manifest and the check's passes. If a label is missing, the fix is in the game (or in `inputs`), never a field you add.

| Label | What earns it |
|---|---|
| **Handheld & controller** | Every game on the runtime files. |
| **Desktop** | `"keyboard"` and `"mouse"` in `inputs`, with the check's keyboard-only and mouse-only passes green. |
| **Tablet** | A landscape game with `"touch"` in `inputs`. Without `"touch"` it is listed as "Needs a controller". |
| **Phone** | `phone` set, `"touch"` in `inputs`, and a green phone pass (touch only at 390×844 or 844×390, DPR 3). The `mobile-port` skill gets a game there. |
| **Party** | `"party": true`. |

## What the check says, and the fix

Run `pushplay check` (with the game id in a workshop) and read what it prints about the manifest. A ⚠ is a note ("Before you share it…"): the game passes, but isn't finished until it is done.

| Message | Fix |
|---|---|
| ⚠ `add a "description" of 1–3 sentences` / ⚠ `add "tags"` | Write them as above. |
| `add "inputs"` | Add the inputs the game really plays with. |
| ⚠ `art.cover … is still the placeholder` | The `cover-art` skill. |
| `"id" must match the folder name` | Someone renamed the folder or the id. Put the id back; rename the folder to match it, not the other way round. |
| `a phone game … "inputs" must include "touch"` | Make touch gameplay work (the `touch-controls` skill), then list it; or remove `phone`. |
| `entry.web "…" doesn't exist` | Point it at the real page, usually `index.html`. With a build command, the command didn't write it. |
| `build.outputs.<platform>: the folder "…" doesn't exist` | The game's own build hasn't made it here. Commit the folder, make it with `build.command`, or have the repo's own workflow upload it before the PushPlay job (then it exists on GitHub Actions, not on your machine, unless you export locally first). |
| `entry.<platform> "…" isn't in <folder>` | `entry` is a path inside the output folder: drop the folder prefix, or fix the file name to what the build really writes. |
| `entry.<platform> has no folder in build.outputs` / `build.outputs.<platform> has no entry.<platform>` | Every platform needs both: add the missing one, or remove the other. |
| `entry.<platform> needs "build": { "outputs": { … } }` | A native entry without `build.outputs`: add the folder the build writes. |
| `entry.<platform> "…" isn't a Linux program` / `a Windows program (.exe)` / `a Mac program` | The entry points at something that can't be started: a `.pck`, a `.love`, a data file, the `.app` folder itself. Point it at the executable. |
| `a game with no web build needs art.cover and art.hero` | Make both (`cover-art`): there is no screenshot to generate them from. |
| `the build command … failed` | Run the command yourself in the game's folder with `PUSHPLAY_BUILD=1` set and fix what it prints. |
| ⚠ `<platform> not played: only web builds are play-tested` | Nothing to fix: a native build was only checked to be a real program. Try it on the device. |
| `(root) must NOT have additional properties "…"` | Remove the field: the schema doesn't know it. |
| `build preset "vite" needs a package.json with a "build" script` | Add the script, re-scaffold with `--vite`, or remove the preset if the game has its own build (`build.command` or `build.outputs`). |
