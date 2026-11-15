---
name: port-game
description: Set up an existing game for PushPlay whatever it is built with — plain HTML/JavaScript, a bundler project, Godot, Unity, GameMaker, a Rust or C++ native build, Love2D, Ren'Py or a prebuilt export — by adding a manifest, library art and one workflow file, and leaving the game's own code and release workflow alone. Use for "add my game to PushPlay", "port this game", "set up my Godot / Unity game", "I already have a release workflow", "make my existing game work on the Deck", "import this repo / folder / zip".
---

# Set up an existing game for PushPlay

Follow the `pushplay-rules` skill. `pushplay` is the command the `pushplay-rules` skill gives you. The aim: the game as it is, playable from the PushPlay launcher, with **its normal release exactly as before** and a PushPlay release beside it. PushPlay needs a build it can use; it does not need the game rewritten.

Check first that the user may publish it: their own work, or a licence that allows copying and modifying (record the source and licence in the repo's credits). No licence means don't; say so.

## 1. Find out what the game is

Read the repo before asking anything. Ask the user only what it doesn't answer.

| You find | It is | Page |
|---|---|---|
| `project.godot` | Godot | [godot.md](references/godot.md) |
| `ProjectSettings/` and `Assets/` | Unity | [unity.md](references/unity.md) |
| a `*.yyp` file | GameMaker | [gamemaker.md](references/gamemaker.md) |
| `Cargo.toml`, `CMakeLists.txt`, a `Makefile`, `build.zig`, `go.mod` | a native build (Rust, C++, Zig, Go) | [native.md](references/native.md) |
| `main.lua` and `conf.lua` | Love2D | [love2d-renpy.md](references/love2d-renpy.md) |
| `game/script.rpy` | Ren'Py | [love2d-renpy.md](references/love2d-renpy.md) |
| `package.json` with a `build` script | a JavaScript project with its own build | [javascript.md](references/javascript.md) |
| `index.html` and no build step | plain HTML / JavaScript | [javascript.md](references/javascript.md) |
| a folder or zip of finished files (an `index.html`, an `.exe`, an `.x86_64`) | a prebuilt export | step 3, *committed folder* |

Also read every file in `.github/workflows/` that builds or releases. They show how the game is really built, with which engine version, and where the output lands: reuse that, don't guess. Note what the game does that PushPlay will care about: controller support, how it quits, anything it loads from the internet.

## 2. Agree the depth with the user

Ask once (with a question tool if you have one), recommended option first.

| Depth | What changes in the repo | What the user gets |
|---|---|---|
| **B. Manifest, art and one workflow file** (recommended) | `pushplay.json`, `art/`, `.github/workflows/pushplay.yml`. The game's code and its own workflows stay as they are. | A checked PushPlay release for every platform the build supplies, with the game's name, description, tags and real art in the library. |
| **A. Play its normal releases** (recommended when the repo already attaches a zip per platform to its GitHub releases) | `pushplay.json` with `"release"`, and optionally `art/` as PNG, JPG or WebP. No workflow, no second export, nothing else. | The launcher plays the newest normal release with the game's own name, description, tags, launch options and art. Not play-tested, and not on Discover or the phone app. |
| **Nothing at all** | Nothing. | The launcher plays a plain HTML repo from its latest commit, or the zips on its normal releases found by name (`Game-Windows.zip`, `game_linux64.zip`, `Game-HTML5.zip`). The repo's description, a made-up cover. |
| **C. Adopt the runtime files** (JavaScript games only) | The game's code: its input, menus, scaling, saves and audio move to PushPlay's runtime files. | Controller menus, pause, saves, settings and a phone layout done for it, and every pass of the check. It rewrites game code, so it is the user's choice, never a default. |

For A, write the manifest as below and stop at the last step: `"release": { "<platform>": "<file name in the release, with * for the version>" }` (read the names from the repo's release workflow or its latest release), `entry` only when a zip holds more than one program, and `id`, `name`, `description`, `tags`, `players`. `pushplay check` then reads the manifest and art only. A can grow into B later without exporting twice: add the workflow file and it packages each release the user publishes from that release's own files. For nothing at all, tell the user how to add the repo in the launcher (the last step) and stop. For C do B's manifest and art, then follow [runtime-files.md](references/runtime-files.md). The rest of this skill is depth B.

## 3. Wire up the build

**Web first.** A web build plays everywhere: handheld, Windows, Mac, Linux, the phone app and Discover (those two take web builds only). A native build plays only on the system it was built for, and a Windows-only game does not run on a Steam Deck in PushPlay. So: a web export when the engine has one, a Linux build (`linux-x64`) for the Deck when it doesn't, and Windows or Mac builds on top if the user wants them. When a release has both, the launcher installs the native build for the device and falls back to the web build.

The manifest names one finished folder per platform and the file inside it that starts the game:

```json
"entry": { "web": "index.html", "linux-x64": "game.x86_64" },
"build": { "outputs": { "web": "export/web", "linux-x64": "export/linux" } }
```

Every platform in `entry` needs a folder in `build.outputs` and the other way round. Those folders can reach the PushPlay build three ways:

| Way | Use it when | How |
|---|---|---|
| **An artifact from the repo's own build** (prefer it) | a workflow already exports the game, or the engine has to be installed to build | A job exports the folders and uploads them as one artifact; the shared build unpacks it into the repo. See the workflow below. |
| **`build.command`** | the build is one command that runs on a plain Linux runner with Node (a bundler, a script) | `"build": { "command": "…", "outputs": { … } }`. It runs in the game's folder before packaging, with `PUSHPLAY_BUILD=1` set. |
| **A committed folder** | the game is exported by hand from an editor, or it is a prebuilt export | Commit the export folder and name it in `build.outputs`. Simple, but someone must re-export and commit for every update. |

Prefer reusing the build the repo already does, so there is one build to maintain. A JavaScript project often needs none of this: with a `build` script in `package.json` it is built with `npm run build` (output `dist`, or `build.output`), and a repo with no build ships its folder as it is (`entry.web`). See [javascript.md](references/javascript.md).

**The workflow file.** Don't use `pushplay new-game` here: it scaffolds a new JavaScript game. Write `.github/workflows/pushplay.yml` from [references/workflow.yml](references/workflow.yml), copied as it is (`pushplay migrate` also writes it, in a repo that has an old kit). That is enough for `build.command` and committed folders. For the artifact way, add an export job in front of it:

```yaml
jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # the engine's export steps, the same as the repo's own workflow uses,
      # writing export/web and export/linux
      - uses: actions/upload-artifact@v4
        with: { name: pushplay-export, path: export/ }
  pushplay:
    needs: export
    uses: Visual-Zone-Development/pushplay-plugin/.github/workflows/build.yml@v1
    with:
      artifact: pushplay-export   # the artifact's name
      artifact-path: export       # the folder in the repo it is unpacked into
    permissions:
      contents: write
      id-token: write
```

`needs:` only reaches jobs in the same workflow file, so the export job lives in `pushplay.yml`. If the repo's own workflow already has the export steps, either copy them into this job, or (with the user's yes, since it touches their file) add `workflow_call:` to their build workflow's `on:` and call it from `pushplay.yml` as the `export` job. Never add the PushPlay job to their release workflow. The engine page has the export steps.

## 4. The manifest and the art

Write `pushplay.json` at the repo root with the `pushplay-manifest` skill (its table says which fields each kind of game needs) and make `art/cover` and `art/hero` with the `cover-art` skill. A game with a web build gets a cover generated from a screenshot if it has none; **a game with no web build needs both art files**, because there is no screenshot to make them from. Fill `inputs` and `controls` from what the game really supports (step 6).

## 5. Keep the normal release unchanged

- **Separate file, separate release.** `pushplay.yml` is its own workflow, and it publishes to the `pushplay-latest` release, a prerelease, so the repo's own "Latest" release is untouched (a branch named `beta` publishes to `pushplay-beta`).
- **At run time, in a web build:** `window.pushplay` exists only inside the launcher. Keep what belongs to the normal release behind `if (!window.pushplay) { … }` (analytics, an ad, a dialog, an online leaderboard). The check runs the game with that object present, so it judges only what the game does inside the launcher.
- **At run time, in a native build:** the environment variable `PUSHPLAY=1` is set.
- **At build time:** `PUSHPLAY_BUILD=1` is set when the PushPlay build runs `build.command` or `npm run build`, so one build script can make both versions. In an export job of your own, set a variable yourself.

What NOT to do to the game for PushPlay's sake:

- Don't remove analytics, ads, leaderboards or online services from the normal build. Guard them.
- Don't rename, move or stop publishing the game's own release assets, tags or workflows.
- Don't add PushPlay files beyond the manifest, the art and the workflow file (no runtime files at depth B, no kit, no agent instructions).
- Don't change key bindings globally because the launcher keeps F10, Start+Select and a held Esc. Guard the change (`window.pushplay`, `PUSHPLAY=1`) or leave it: those inputs simply don't reach the game inside the launcher.
- Don't change the game's resolution, save format or menus unless the user chose depth C.

## 6. Launcher hooks worth adding (optional, small)

Each is a few lines, guarded so the normal release never sees it. The engine pages show them in each engine's terms.

- **Quit to library.** Web: add the item only when `window.pushplay?.quit` exists, and call `window.pushplay.quit()`. Native: show it when `PUSHPLAY=1` is set, and just exit the game. It matters most on Windows and Mac, where quitting a native game from the controller (hold Start+Select 3 s) does not work and the game needs a quit of its own; on Linux that hold works.
- **Pause when the launcher asks.** Web: listen for the window events `pushplay:pause` and `pushplay:resume` (or `window.pushplay.onPause(cb)`), and pause the game's own way.
- **Controllers.** The game is played on a handheld, so a controller should reach every screen. If the game has no controller support and the user doesn't want it added now, say so honestly in the manifest: `"controls": "keyboard-mapped"` and an `inputs` list without `"gamepad"`.

## 7. Check and finish

1. `pushplay check`. What it requires depends on the kind of game:
   - **A web build not on the runtime files** (its own engine, or an engine's export): it must not crash, must not request the internet, must not open `alert` / `confirm` dialogs, must have no missing files, and must show a picture within 30 s (a loading screen counts). The pause and menu passes only report (⚠), never fail. Nothing inside an exported folder is scanned.
   - **A native build:** the entry must exist in its folder and be a real program for that platform (an ELF binary, an AppImage or a `#!` script on Linux; an `.exe` on Windows; the binary inside `.app/Contents/MacOS/` on Mac).
   - Folders that come from the repo's own workflow don't exist on your machine unless you export them: either export locally first, or let the push run the same check on GitHub Actions and read the run's summary.
2. Open the cover, hero and screenshot PNGs whose absolute paths the check prints. The screenshot should show the game, not an error or an endless loader.
3. **Say plainly what was not verified.** A native build is not play-tested: the check never starts it, so whether it runs on a Deck, finds its libraries, reads a controller or quits cleanly is unknown until someone tries it on the device. For an engine web export, pausing and controller menus are only reported, not required.
4. Commit the manifest, art and workflow file (`Set up <Name> for PushPlay`) and push. Pushing the default branch publishes; other branches only check.
5. Make sure the game is in a GitHub repo the user owns and pushed (ask before creating a repo or pushing for the first time). Then tell the user: in the launcher, **Add game → Connect GitHub**, pick the repo in **My repositories**, and the game is in the **Library** (for depth B, once the first build has published, a couple of minutes). List which platforms it plays on and anything from step 3 or 6 left for later.
