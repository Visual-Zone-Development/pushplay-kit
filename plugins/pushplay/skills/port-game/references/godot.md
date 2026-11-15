# Godot

Nothing here was run against your Godot version. Every command and option name below is the commonly known form: **check your engine version's documentation** before relying on it, and prefer whatever the repo's own workflow already does.

## What must come out

| Platform | Folder contains | `entry` |
|---|---|---|
| `web` | `index.html` plus the `.js`, `.wasm` and `.pck` files next to it | `index.html` |
| `linux-x64` | the executable (usually `<name>.x86_64`) and its `.pck` beside it, unless the preset embeds the pck | `<name>.x86_64` |
| `windows-x64` | `<name>.exe` and its `.pck` | `<name>.exe` |

Export the web build as `index.html` (name the export file that), so `entry.web` needs no guessing.

```json
"entry": { "web": "index.html", "linux-x64": "game.x86_64" },
"build": { "outputs": { "web": "export/web", "linux-x64": "export/linux" } }
```

**Threads.** A web export that uses threads needs a cross-origin isolated page (SharedArrayBuffer). Godot 4.0–4.2 web exports are generally threaded; from 4.3 the web preset has a thread-support option that is off by default (check your engine version's documentation). For a threaded export add `"web": { "isolated": true }` to the manifest; everything the page loads must then be the game's own files.

## The export job

`export_presets.cfg` must be committed (many `.gitignore` files leave it out) and the preset names in the commands must match it. Godot 3 uses `--export` in place of `--export-release`.

```yaml
      # after checkout, with a Godot binary and its export templates installed
      # (a setup action or a container image; reuse the repo's own choice)
      - run: |
          mkdir -p export/web export/linux
          godot --headless --export-release "Web" export/web/index.html      # check your engine version's documentation
          godot --headless --export-release "Linux" export/linux/game.x86_64 # preset is "Linux/X11" in some versions
      - uses: actions/upload-artifact@v4
        with: { name: pushplay-export, path: export/ }
```

Then the `pushplay` job from the skill's step 3, with `artifact: pushplay-export` and `artifact-path: export`. If the repo already exports with a community action, keep it and only point its output at these folders. If the game is only ever exported from the editor, commit `export/` instead and skip the job.

## Launcher hooks

```gdscript
# Am I inside PushPlay? (check these calls against your engine version's documentation)
func in_pushplay() -> bool:
    if OS.has_feature("web"):
        return JavaScriptBridge.eval("!!window.pushplay", true)   # Godot 3: JavaScript.eval
    return OS.get_environment("PUSHPLAY") == "1"

func quit_to_library() -> void:
    if OS.has_feature("web"):
        JavaScriptBridge.eval("window.pushplay && window.pushplay.quit()", true)
    else:
        get_tree().quit()
```

- Show a "Quit to library" item only when `in_pushplay()` is true.
- Pause on request, web only: register a callback with `JavaScriptBridge.create_callback` and add it as a listener for `pushplay:pause` on `JavaScriptBridge.get_interface("window")`; keep a reference to the callback so it isn't freed. In it, set `get_tree().paused = true` and show the game's pause menu.
- Guard normal-release-only code (analytics, HTTP requests) with `if not in_pushplay():`.

## Known limits

- The check never starts the Linux or Windows export. Try it on the device.
- A web export is large and can take a while to start: the check needs a picture within 30 s, and the engine's loading bar counts.
- Web exports don't support everything the desktop ones do (GDExtension and C# support on the web depends on the version: check your engine version's documentation). If the web export isn't possible, ship `linux-x64` for the Deck and say the game won't be on phones or Discover.
- Controller support is Godot's own input map: make sure UI actions (`ui_accept`, `ui_cancel`, the directions) have joypad events, or menus won't work on a handheld.
