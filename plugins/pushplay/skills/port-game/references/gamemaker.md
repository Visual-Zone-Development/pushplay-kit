# GameMaker

Nothing here was run against your GameMaker version. Target names, function names and tool options are the commonly known form: **check your engine version's documentation**.

## What must come out

| Platform | Folder contains | `entry` |
|---|---|---|
| `web` | the HTML5 export unzipped: `index.html` and its `html5game/` folder (a GX.games / WebAssembly export also gives an `index.html` with its runner files) | `index.html` |
| `linux-x64` | the Ubuntu export unpacked: the executable and its `assets/` folder, or the AppImage | the executable or the `.AppImage` |
| `windows-x64` | the Windows package unzipped (not the installer): `<Name>.exe`, `data.win`, … | `<Name>.exe` |

```json
"entry": { "web": "index.html", "windows-x64": "MyGame.exe" },
"build": { "outputs": { "web": "export/html5", "windows-x64": "export/windows" } }
```

Remember where each plays: the Windows export does not run on a Steam Deck in PushPlay. For the Deck, ship the web export or the Linux (Ubuntu) export. GameMaker builds the Linux target on a Linux machine or over a connection to one (check your engine version's documentation), which is why many GameMaker projects have only a Windows build to hand: then the web export is the one to add.

## Getting the folders to the build

Most GameMaker projects are exported from the IDE, so start with the **committed folder** way:

1. In the IDE, create the HTML5 package as a zip (and the other targets wanted).
2. Unzip each into its folder (`export/html5/` so that `index.html` is directly inside).
3. Commit the folders, name them in `build.outputs`, and use the workflow file as it is.

If the repo already builds in GitHub Actions (with GameMaker's command-line build tool, Igor, or a community action wrapping it), keep that job, unzip its packages into `export/…`, upload `export/` as one artifact and add the `pushplay` job from the skill's step 3. Don't write an Igor command line from memory: copy the one the repo's workflow already uses, or take it from the documentation for the installed runtime version.

## Launcher hooks

```gml
// Native export. Check these functions against your engine version's documentation.
global.in_pushplay = (environment_get_variable("PUSHPLAY") == "1");

// "Quit to library" on a native build:
if (global.in_pushplay) game_end();
```

- An HTML5 export can't read environment variables. Reach `window.pushplay` through a small JavaScript extension (an extension with a `.js` file whose functions GML can call), with functions like `pushplay_present()` returning `window.pushplay ? 1 : 0` and `pushplay_quit()` calling `window.pushplay.quit()`.
- Show "Quit to library" only when inside PushPlay. On a Windows export this matters: the controller's hold-to-quit doesn't work there, so the game needs its own way out.
- Guard normal-release-only code (analytics, HTTP calls, a storefront link) with the same flag.
- Controllers: GameMaker has gamepad functions (`gamepad_is_connected`, `gamepad_button_check_pressed`, …) but uses none of them unless the game does. If the game is keyboard only, either add them or set `"controls": "keyboard-mapped"` and leave `"gamepad"` out of `inputs`.

## Known limits

- The check never starts a native export, and for the HTML5 export it only requires: no crash, no internet requests, no dialogs, no missing files, a picture within 30 s.
- The HTML5 target does not run every GML feature the same way as the desktop targets (extensions, some shaders and surfaces, file access). Play the web export through before shipping it as the only build.
- A Windows installer (`.exe` setup) is not a game folder. Use the zip package.
