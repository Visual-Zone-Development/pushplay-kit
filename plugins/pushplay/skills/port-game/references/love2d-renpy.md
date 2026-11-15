# Love2D and Ren'Py

Neither engine was run here. Tool names and commands are the commonly known form: **check your engine version's documentation**. Both engines ship the game as data plus a runtime, so the rule is the same for both: the folder PushPlay gets must contain the runtime, because the device does not have LÖVE or Ren'Py installed.

## Love2D

| Platform | What must come out | `entry` |
|---|---|---|
| `linux-x64` | an AppImage with LÖVE and the game fused in (the official LÖVE AppImage repacked with the game, or one made by a packaging tool such as `makelove` or `love-release`) | `MyGame.AppImage` |
| `windows-x64` | the fused `MyGame.exe` with LÖVE's `.dll` files beside it | `MyGame.exe` |
| `web` | a `love.js` build (LÖVE compiled to WebAssembly by the community `love.js` project): a folder with `index.html` | `index.html` |

A bare `.love` file is not a build PushPlay can start, and a `#!` script that runs `love game.love` only works where LÖVE is installed.

```json
"entry": { "linux-x64": "MyGame.AppImage", "web": "index.html" },
"build": { "outputs": { "linux-x64": "export/linux", "web": "export/web" } }
```

- **Web:** `love.js` supports particular LÖVE versions and not every feature (threads, some audio and shader use, LuaJIT-only code such as FFI). Its standard build uses threads and needs `"web": { "isolated": true }`; its compatibility build does not (check the love.js documentation). Play the web build through before relying on it.
- **Export job:** zip the game into `game.love` (the zip's root must contain `main.lua`), run the packaging tool the repo already uses, put each result in `export/<platform>/`, upload `export/` as one artifact, then the `pushplay` job from the skill's step 3.
- **Hooks:** `local in_pushplay = os.getenv("PUSHPLAY") == "1"` on a native build; "Quit to library" is `love.event.quit()`. LÖVE has joystick and gamepad callbacks (`love.gamepadpressed`), but a game uses them only if it was written to.

## Ren'Py

| Platform | What must come out | `entry` |
|---|---|---|
| `linux-x64` | the Linux distribution unpacked: `MyGame.sh`, `lib/`, `renpy/`, `game/` | `MyGame.sh` (a `#!` script, which the check accepts) |
| `windows-x64` | the Windows distribution unzipped | `MyGame.exe` |
| `darwin-arm64` / `darwin-x64` | the Mac distribution unzipped: `MyGame.app` | `MyGame.app/Contents/MacOS/MyGame` |
| `web` | Ren'Py's web build (a folder with `index.html`), where the Ren'Py version offers one | `index.html` |

```json
"entry": { "linux-x64": "MyGame.sh", "windows-x64": "MyGame.exe" },
"build": { "outputs": { "linux-x64": "export/MyGame-linux", "windows-x64": "export/MyGame-win" } }
```

- **Building:** *Build Distributions* in the Ren'Py launcher, or from a command line `renpy.sh launcher distribute <project> --package linux --destination <folder>` (check your engine version's documentation). The results are archives: unpack each so that the files sit directly in the folder named in `build.outputs` (archives usually wrap them in one more folder; point `build.outputs` at that inner folder or flatten it). A combined "PC" package holds Windows and Linux together; it can serve as both folders.
- **Web:** Ren'Py's web target is marked beta in many versions, downloads large files and doesn't support everything (video, some Python modules). Offer it, try it, and don't promise it.
- **Hooks:** in a `python` block, `import os` and `in_pushplay = os.environ.get("PUSHPLAY") == "1"` on a native build; "Quit to library" is `renpy.quit()`. Guard an update check or web links with the same flag.
- **Controllers:** Ren'Py handles gamepads itself for its standard menus and for advancing text, so a visual novel usually plays on a handheld as it is. Custom screens with small mouse-only buttons are the thing to look at.

## Known limits (both)

- The check does not play native builds: it only confirms the entry is in its folder and is a real program or `#!` script. Try the Linux build on the device.
- With no web build the game is not on phones or Discover, and the manifest needs both `art.cover` and `art.hero`.
- Committing the unpacked distribution works but makes a heavy repo; the artifact way keeps builds out of git.
