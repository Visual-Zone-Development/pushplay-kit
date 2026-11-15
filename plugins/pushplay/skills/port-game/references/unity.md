# Unity

Nothing here was run against your Unity version. Commands, menu names and action inputs are the commonly known form: **check your engine version's documentation**, and reuse the repo's own build workflow where it has one. Building Unity in CI needs a Unity licence set up as repository secrets; if the repo has none, the *committed folder* way is the realistic start.

## What must come out

| Platform | Folder contains | `entry` |
|---|---|---|
| `web` | the WebGL build: `index.html`, a `Build/` folder, usually `TemplateData/` (and `StreamingAssets/` if used) | `index.html` |
| `linux-x64` | `<Name>.x86_64`, `<Name>_Data/`, `UnityPlayer.so` | `<Name>.x86_64` |
| `windows-x64` | `<Name>.exe`, `<Name>_Data/`, `UnityPlayer.dll`, … | `<Name>.exe` |
| `darwin-arm64` / `darwin-x64` | `<Name>.app` | `<Name>.app/Contents/MacOS/<Name>` |

```json
"entry": { "web": "index.html", "linux-x64": "Game.x86_64" },
"build": { "outputs": { "web": "export/WebGL", "linux-x64": "export/Linux" } }
```

**WebGL compression.** A Brotli or Gzip WebGL build only loads when the server sends matching `Content-Encoding` headers. The launcher and the check do; the phone app does not, so don't count on it for a game that should also play on phones. In Player Settings → Publishing Settings either turn on *Decompression Fallback* or set *Compression Format* to *Disabled* for the PushPlay build (check your engine version's documentation). A build that fails this way shows as a crash or a missing picture in the check.

**Threads.** A default WebGL build does not need cross-origin isolation. Only if native multithreading is enabled for the web build, add `"web": { "isolated": true }`.

## The export job

The command-line form, with a build method of the project's own:

```
Unity -batchmode -quit -projectPath . -buildTarget WebGL -executeMethod BuildScript.BuildWebGL   # check your engine version's documentation
```

Most repos use a community build action instead (GameCI's `unity-builder` is the common one), run once per target platform. Whatever is used, end with the finished folders gathered under one folder and uploaded as one artifact:

```yaml
      # after the Unity build steps for WebGL and StandaloneLinux64 have written their folders
      - run: |
          mkdir -p export
          cp -r <where the WebGL build landed> export/WebGL    # must contain index.html directly
          cp -r <where the Linux build landed> export/Linux     # must contain the .x86_64 directly
      - uses: actions/upload-artifact@v4
        with: { name: pushplay-export, path: export/ }
```

Look at where the build really landed before writing the `cp` lines: build actions often nest it one folder deeper than expected. Then the `pushplay` job from the skill's step 3 (`artifact: pushplay-export`, `artifact-path: export`).

## Launcher hooks

Native builds read the environment:

```csharp
static bool InPushPlayNative => System.Environment.GetEnvironmentVariable("PUSHPLAY") == "1";
// "Quit to library" on a native build is just Application.Quit();
```

A WebGL build reaches the page's JavaScript through a `.jslib` plugin (`Assets/Plugins/pushplay.jslib`) and `[DllImport("__Internal")]` (check your engine version's documentation):

```js
mergeInto(LibraryManager.library, {
  PushPlayPresent: function () { return window.pushplay ? 1 : 0 },
  PushPlayQuit: function () { if (window.pushplay) window.pushplay.quit() },
})
```

- Show "Quit to library" only when `PushPlayPresent()` (web) or `InPushPlayNative` is true.
- Pause on request, web: in the WebGL template or the `.jslib`, listen for the window event `pushplay:pause` and call into the game (`SendMessage` on the Unity instance) to open its pause menu.
- Guard analytics, ads and online services with the same test, at run time; or give the PushPlay build its own scripting define symbol in the build method and use `#if`.

## Known limits

- The check never starts a native build. `UnityPlayer.so` and `_Data/` must sit beside the executable exactly as Unity wrote them.
- WebGL builds are large; the check needs a picture within 30 s (Unity's loading screen counts).
- Unity's WebGL player is not supported by Unity on mobile browsers in every version, so a web build may still play poorly in the phone app. Say so rather than promise it.
- Menus need controller navigation set up in the game's UI (an event system with a first selected control); the check only reports on menus for an engine export.
