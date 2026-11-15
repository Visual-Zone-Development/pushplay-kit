---
name: pushplay-rules
description: The rules every PushPlay game follows and the pushplay command that builds, checks and scaffolds games. Load it first whenever you are about to work on a PushPlay game, meaning any repo with a pushplay.json (at its root or in games/<id>/), or any request to make, change, fix, check, port or publish a game for PushPlay, the launcher for a Steam Deck, Legion Go, PC and phone. It says what any game needs (JavaScript, an engine's web export or a native build), how to run pushplay check, what may go into a game repo, and which skill to use for what. It also holds the manifest reference, so use it for "fill in the manifest", "write pushplay.json", "the check says tags / inputs / description is missing", "why doesn't my game show the Phone label", "add tags", "change the name or description", "bump the version".
---

# PushPlay rules

Read this before every piece of work on a PushPlay game. `<skill-dir>` is the folder this file is in.

PushPlay is a launcher: it follows a game's GitHub repo and plays its builds on a handheld (a Steam Deck or Legion Go), a PC and, for web builds, a phone. It takes any kind of game. These skills are optional help; all PushPlay needs is a build it can use.

## 1. What every game must do, whatever it is built with

1. **A manifest.** `pushplay.json` next to the game (the repo root, or `games/<id>/` in a workshop repo of many games). Required: `id` (permanent: saves and the listing follow it), `name`, `entry` (or `release`, for a game that plays from its normal releases) and `inputs`, which the check plays the game by. The check asks for a `description` and `tags` with a ⚠; a finished game always has both. Every field, which fields each kind of game needs, the Plays-on labels and the fix for each check message: [manifest.md](references/manifest.md).
2. **Art.** `art/cover` at 720×500 **with** the title, `art/hero` at 1920×450 **without** it (`.svg`, `.html`, `.png`, `.jpg` or `.webp`). The check passes a new game with placeholder art but notes it: a game isn't finished until it has its own. The `cover-art` skill makes both.
3. **A build PushPlay can use**, one of:
   - the folder as it is (`entry.web`, usually `index.html`), or the repo's npm `build` script (output `dist`);
   - the game's own build: `"build": { "outputs": { "web": "export/web", "linux-x64": "export/linux" } }` names the finished folder per platform and each `entry.<platform>` is a path inside it. The folders are committed, made by `"build": { "command": "…" }`, or handed over by the repo's own workflow as an Actions artifact;
   - nothing at all: the launcher can follow a repo as it is (a plain HTML repo from its latest commit, or the zips on its ordinary GitHub releases). Then none of this skill applies.
   - a `pushplay.json` with `"release"` and no workflow: the launcher reads the manifest first (name, description, tags, art) and plays the zips on the repo's normal releases. Only the manifest rules apply; the `port-game` skill sets it up.
4. **Works offline inside the launcher.** No internet requests, and no `alert()` / `confirm()` / `prompt()` dialogs or new tabs. The check runs the game with `window.pushplay` present, so code for the normal release goes behind `if (!window.pushplay) { … }` (analytics, an ad, an online leaderboard) and is not judged. Only `"online": true` and `"party": true` games use the network, through the relay.
5. **Playable with a controller on a handheld**, start to finish, menus included. `inputs` lists what the whole game, gameplay included, really plays with (`gamepad`, `keyboard`, `mouse`, `touch`).
6. **A way back to the library.** A web game with its own menus adds "Quit to library" to its pause menu only when `window.pushplay?.quit` exists, and calls `window.pushplay.quit()`. A native game needs its own quit; the environment variable `PUSHPLAY=1` tells it it is in the launcher (the launcher's hold Start+Select 3 s works on Linux only).
7. **Never bind F10, Start+Select or a held Esc.** They open the launcher's own menu.
8. **The normal release doesn't change.** The PushPlay build, when a game has one, is separate (its own workflow file, its own `pushplay-latest` prerelease); a game that plays from its normal releases has neither. Nothing PushPlay asks for may alter what the game does elsewhere: use `window.pushplay`, `PUSHPLAY=1` (native) and `PUSHPLAY_BUILD=1` (build time) to tell the two apart.

Web builds play everywhere (the phone app and Discover take web builds only). A native build plays only on the system it was built for: a Windows-only game does not run on a Steam Deck (no Proton).

**The repo holds only the game.** The only PushPlay-specific files are `pushplay.json`, the art and, for a game with checked builds, `.github/workflows/pushplay.yml` (about 20 lines, calling the shared build; `pushplay new-game` writes it). So:

- Don't add agent instruction files (an `AGENTS` or `CLAUDE` file), skills, a kit folder, `tools/`, `docs/` or npm scripts for PushPlay. A `package.json` exists only when the game itself uses npm packages.
- Don't copy the kit or anything from `pushplay where` into the repo; the kit lives in a cache in the user's home folder.
- Don't edit the workflow file or the repo's own release workflow unless asked.
- In a workshop, work only on the game you were asked about. Don't start a second game in a one-game repo.
- Never spend the user's money (`pushplay art`, any paid API) without quoting the cost and getting a yes first.

## 2. The `pushplay` command

Everywhere in these skills `pushplay <command>` means:

```sh
node <skill-dir>/scripts/pushplay.mjs <command>     # this skill's folder
npx github:Visual-Zone-Development/pushplay-kit <command>   # with no skills installed
```

Run it from the game's repo. It never leaves a file in the repo except what the command is for.

| Command | What it does |
|---|---|
| `pushplay new-game <id> [--workshop] [--vite] [--online --players 2-4 \| --party [--controller pad\|custom\|motion]] [--phone portrait\|landscape] [--name "Title"]` | Scaffold a JavaScript game on the runtime files (repo root, or `games/<id>/` with `--workshop` or an existing `games/`), and add the workflow file if the repo has none |
| `pushplay dev [id] [--host]` | Play it in a browser with live reload, http://localhost:5173 |
| `pushplay check [id ...]` | Build and play the games headlessly; prints ✗ problems, ⚠ notes and the absolute paths of the cover, hero and screenshot PNGs |
| `pushplay setup` | Install the headless browser the check uses (the first `check` tries by itself) |
| `pushplay art [id] [--dry] [--approve <$>]` | Painted art from the user's own image API key (asks before any cost) |
| `pushplay art-shots [id]` | Render the game's art pages to PNG and print their paths |
| `pushplay update-runtime` | Replace the runtime files in JavaScript games with the kit's current ones |
| `pushplay promote <id> [--repo owner/name] [--private] [--keep]` | Move a workshop game into its own repo |
| `pushplay where` / `pushplay version` | The folder the kit is unpacked in (`templates/`, `node_modules/playwright`) / the kit version |

**Every change follows this:**

1. Read the game's `DESIGN.md` if there is one, and keep the change consistent with it.
2. Make the change.
3. Bump `version` in `pushplay.json` (and add a Changelog line to `DESIGN.md` when it has one).
4. Run `pushplay check` and fix every ✗. Read the ⚠ notes.
5. Open the PNGs it prints and look at them: the screenshot must show the game, the cover must read at tile size.
6. Commit and push. The default branch publishes; a branch named `beta` publishes to `pushplay-beta`; other branches only run the check.

## 3. A JavaScript game built on the runtime files

A game from `pushplay new-game` imports shared files (`input.js`, `menu.js`, `fit.js`, `audio.js`, `save.js`, `settings.js`, `prompts.js`, `touch.js`, and `net.js` / `lobby.js` or `party.js` and friends) and follows a fuller contract, which the check enforces pass by pass. Read the page for the area you are touching:

| Read | Before you touch |
|---|---|
| [controls.md](references/controls.md) | Buttons, sticks, pointer, local multiplayer, on-screen controls, any prompt or hint text |
| [menus-and-exit.md](references/menus-and-exit.md) | Any menu, pause, Quit to library, the screen flow, restart |
| [screens.md](references/screens.md) | Layout, scaling, phone spaces, safe areas, the Settings screen, performance, npm packages |
| [saves-and-audio.md](references/saves-and-audio.md) | Saves, sound, bundled assets, anything touching the network |
| [online-and-party.md](references/online-and-party.md) | An `--online` game, or a `--party` game and its phone screen |
| [verification.md](references/verification.md) | Before pushing: what the check runs for each kind of game, and the by-hand matrix |

Broken most often:

- **Runtime files are never edited** (header `pushplay runtime vN`): `pushplay update-runtime` overwrites them. Key aliases go through `input.extendKeys`.
- **Pause is `menu`, back is `b`.** Esc never goes back; B never pauses.
- **`state.screen`** is `title`, `playing`, `paused`, `gameover`, `settings` (or `lobby`), exactly, and `window.__game = { state, TUNING }` is exposed: the check presses Start and expects `'paused'`.
- **Every menu goes through `menu.js`**; the pause menu keeps a `resume` item, which is what earns Quit to library.
- **No prompt row along the bottom of the screen**, and no literal "Press A" / "Tap": prompts come from `input.label()`.
- **All `localStorage` goes through `save.js` and `createSettings`**, with keys that start with the game id.
- **1280×800 logical space through `fitCanvas`** (or a phone space); never your own resize code.

## 4. Which skill for what

| Intent | Skill |
|---|---|
| Make a game / change, tune, improve or fix one | `new-game` / `improve-game` |
| Set up any existing game for PushPlay, any engine | `port-game` |
| A finished workshop game ready for Discover or its own repo | `promote-game` |
| `pushplay.json`, tags, inputs, Plays-on labels | [manifest.md](references/manifest.md) in this skill |
| The runtime files' calls, or refreshing them | `pushplay-runtime` |
| Cover, banner, library screenshot, shots and clips | `cover-art` |
| Every screen with each input alone / phone and tablet play | `input-walkthrough` / `mobile-port` |
| A party game's phone screen / phone motion controls | `party-phone-screen` / `motion-controls` |
| The design brief; not sure which direction | `game-design`; `prototype-sprint` |
| How it plays | `game-feel`, `physics-feel`, `camera`, `enemy-ai`, `touch-controls`, `local-multiplayer`, `online-netcode` |
| Content | `level-design`, `boss-design`, `progression`, `dialogue` |
| Art | `art-direction` (whole screen), `model-asset` (a new asset, or a change to one), `animate-asset` (motion), with `canvas2d-assets` or `threejs-models`; `pixel-art`, `character-models`, `environments` |
| Sound and interface | `game-audio`, `game-ui` |
| Quality | `playtest`, `performance-pass`, `accessibility-audit`, `localization`, `release-notes` |

The craft skills (from *the design brief* down) are written for any game in any engine, with their browser-only parts under an "In a web game" heading: "the game's menu system", "its save data" or "the project's checks" mean the runtime files and `pushplay check`, and `pushplay-runtime` has the exact calls. For a new game, `new-game` runs the kickoff interview ([kickoff.md](../new-game/references/kickoff.md)), writes `DESIGN.md` from [the template](../new-game/references/DESIGN.template.md) and builds toward the [definition of done](../new-game/references/complete-game.md).
