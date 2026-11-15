# Native builds (Rust, C++, Zig, Go, anything that compiles to a program)

Nothing here was built or run. Tool commands are the commonly known form: **check your toolchain's documentation**, and reuse the repo's own build where it has one.

## What must come out

One folder per platform holding the program **and everything it needs at run time** (assets, data files, shared libraries it doesn't expect from the system), laid out the way the program looks for them.

| Platform | `entry` must be |
|---|---|
| `linux-x64`, `linux-arm64` | an ELF binary, an AppImage, or a script starting with `#!` (a launcher script that sets a library path and starts the binary is fine) |
| `windows-x64` | an `.exe` |
| `darwin-arm64`, `darwin-x64` | the binary inside the bundle: `Game.app/Contents/MacOS/Game` |

```json
"entry": { "linux-x64": "mygame" },
"build": { "outputs": { "linux-x64": "dist/linux" } },
"launch": { "linux-x64": { "args": ["--fullscreen"], "env": { "MYGAME_DATA": "assets" } } }
```

`launch` gives a platform's build its arguments and environment variables, so the game's own defaults stay as they are for the normal release. A native-only game needs `art.cover` and `art.hero` in the manifest.

**Can it have a web build?** It is worth asking, because only a web build reaches phones and Discover. C and C++ often compile with Emscripten, Rust to `wasm32-unknown-unknown` (the game frameworks usually document a web target), Go and Zig to WebAssembly. What must come out is the same as any web build: a folder with `index.html`. A WebAssembly build that uses threads needs `"web": { "isolated": true }`.

## The export job

Build on the system the build is for: Linux on a Linux runner, Windows on a Windows runner, Mac on a Mac runner. For the Deck only `linux-x64` is needed.

```yaml
  export:
    runs-on: ubuntu-22.04   # an older runner keeps the binary usable on more systems (older glibc)
    steps:
      - uses: actions/checkout@v4
      - run: |
          cargo build --release                       # or cmake --build, zig build, go build: the repo's own command
          mkdir -p dist/linux
          cp target/release/mygame dist/linux/
          cp -r assets dist/linux/
      - uses: actions/upload-artifact@v4
        with: { name: pushplay-export, path: dist/ }
```

Then the `pushplay` job from the skill's step 3 with `artifact: pushplay-export` and `artifact-path: dist`.

- **Several systems:** each runner uploads its own artifact, and one last small job downloads them all into `dist/<platform>/` and uploads the single artifact the shared build takes (it takes one name).
- **A simple build can skip the job:** `"build": { "command": "cargo build --release && ./package.sh" }` runs on the shared build's Linux runner. Use it only when the toolchain and every system library the build needs are already on a stock GitHub Linux runner; otherwise keep your own job, where you control what is installed.
- Uploading an artifact drops the executable bit. The PushPlay build makes the `entry` file executable again; a second program the game starts itself would not be, so start it through the entry or keep it inside an AppImage.

## Launcher hooks

Read the environment variable `PUSHPLAY`; it is `1` inside the launcher.

```rust
let in_pushplay = std::env::var("PUSHPLAY").as_deref() == Ok("1");
```
```c
int in_pushplay = getenv("PUSHPLAY") && strcmp(getenv("PUSHPLAY"), "1") == 0;
```

- Show "Quit to library" only then; choosing it exits the program normally (save first).
- On Linux the player can also hold Start+Select for 3 s to quit a native game from the controller. On Windows and Mac that doesn't work: the game's own quit is the only way out with a controller, so it must be reachable with one.
- Guard what belongs to the normal release (an updater, a storefront overlay, telemetry) with the same test. An updater especially: inside PushPlay the launcher installs updates.
- A web (WebAssembly) build has no environment: test `window.pushplay` from JavaScript instead.

## Known limits

- **The check does not play a native build.** It confirms the entry exists in its folder and is a real program for that platform, nothing more. Missing shared libraries, a wrong working directory, no controller support, a window that isn't fullscreen: all only show up on the device.
- Shared libraries: the device has what its system ships, not what the build machine had. Link statically where the licence allows, or ship the `.so` files in the folder and start through a `#!` script that sets `LD_LIBRARY_PATH`, or package an AppImage.
- Asset paths: find assets relative to the executable, not the current directory.
- A Mac build that isn't signed and notarised may be blocked by macOS; sign it the way the normal release is signed.
