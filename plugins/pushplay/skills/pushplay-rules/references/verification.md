# Verification

`pushplay` is the command the `pushplay-rules` skill gives you. `pushplay check` (with the game id in a workshop: `pushplay check <id>`) must pass before pushing. GitHub Actions runs the same check on every push.

## What `pushplay check` runs, by kind of game

It validates `pushplay.json`, builds the game, plays any web build headlessly and renders the art to PNG. It prints ✗ problems (the build fails; fix every one), ⚠ notes (read them; fix what applies) and the **absolute paths** of the rendered cover, hero and screenshot PNGs, which are in a scratch folder outside the repo. Open them.

The check runs the game with the launcher's object present (`window.pushplay`), so it judges what the game does **inside the launcher**. Code kept for the normal release behind `if (!window.pushplay) { … }` is not judged.

| Kind of game | How the check knows | What it does |
|---|---|---|
| **JavaScript on the runtime files** | `input.js` etc. with the runtime header sit next to `game.js` | Every pass: virtual gamepad at 1280×800; keyboard only (Enter, then Esc must pause); mouse only (menus by click, the on-screen pause button); touch (taps the title menu through `window.__game.titleMenu`); Start must give `window.__game.state.screen === 'paused'`; a 16:9 window at 2× pixels (1280×720 at DPR 2). The runtime's conventions are reported as ✗ or ⚠. |
| …with `phone` in the manifest | | Also the **phone pass**: touch only at 390×844 (portrait) or 844×390 (landscape) at DPR 3, menus by tap, the pause button, `visibilitychange` must pause, no text under 32 px in the phone space. `"orientation": "any"` runs both sizes. |
| …with `"online": true` | | Also plays two copies together through a local relay. |
| …with `"party": true` | | Also brings headless phones that join by code, send input, must each see exactly their own `party.view(id)`, and one reloads to check it gets its seat back. |
| **Any other web build** (the game's own engine, or an engine's web export through `build.outputs`) | no runtime files | Must not crash, must not request the internet, must not open `alert` / `confirm` dialogs, must have no missing files, and must show a picture within 30 s (a loading screen counts). Pause and menu passes only report (⚠), never fail. Nothing in an exported folder is scanned. An `F10` binding in the game's own JavaScript is only pointed out. |
| **A native build** | `entry.<platform>` other than `web` | The entry must exist in its folder and be a real program for that platform (ELF, AppImage or `#!` script on Linux; `.exe` on Windows; the binary inside `.app/Contents/MacOS/` on Mac). It is not play-tested. |
| **No web build at all** | | `art.cover` and `art.hero` are required: there is no screenshot to generate them from. |

For every game it fails on: missing `inputs`, an entry that doesn't exist, a `build.outputs` folder that doesn't exist. A missing or too-short `description`, missing `tags` and placeholder art are ⚠ notes, listed again at the end as what is left "before you share it": the game passes, but it isn't finished until they are done. For a runtime-file game it also fails on an F10 binding, a pause that doesn't happen and a blank screen after 3 s; it warns on console errors, `localStorage` keys that don't start with the game id, `menu.js` not being imported, `input.attach` never being called and a missing `window.__game`.

If the headless browser can't be installed (some cloud sandboxes block the download; `pushplay setup` is the command that installs it), still do every other step, then push: the Actions run does the same check and its summary page lists the problems.

## The matrix (a JavaScript game on the runtime files)

The check covers these headlessly; cover them for real too. Run the `input-walkthrough` skill first: it plays every screen and the gameplay with each input alone and reports what's broken where. It doesn't replace trying the game on a real device.

| Pass | How | Must be true |
|---|---|---|
| Controller | pad plugged into `pushplay dev`, or on the Deck / Legion Go | every screen; Start pauses; B never quits anything without a menu |
| Keyboard only | hands off the mouse, no pad | Enter starts, Esc pauses, Backspace backs, every action reachable, prompts show key names |
| Mouse only | hands off the keyboard | every menu by click; pause button works; gameplay if `inputs` includes `"mouse"` (the check's mouse-only pass backs the Desktop label) |
| Touch | DevTools device mode (touch emulation) | every menu by tap; pause button; prompts say "Tap"; gameplay if `inputs` includes `"touch"` |
| Phone (games with `phone`) | DevTools device mode at 390×844 or 844×390, DPR 3, touch only; or `pushplay dev --host` and a real phone on the same Wi-Fi | menus by tap; on-screen controls where needed and hidden with a controller; text ≥ 32px; nothing under the notch or home bar; `visibilitychange` pauses and saves |
| Scaling | resize the window to 1920×1080, then DevTools device mode at DPR 2 | centred, letterboxed in the right colour, crisp text, no blur or clipping |
| `pushplay check` | | passes; the screenshot shows real content; `window.__game.state.screen` exposed |
| Every screen, every input | the `input-walkthrough` skill | every screen works with each input alone, or the report explains why not |

## Any other game

The check can't play it the way a player does, so do it yourself: start it with only a controller and reach every screen, pause it, and get back out to the library (a web game: its own menu calling `window.pushplay?.quit()`, or the launcher's menu; a native game: its own quit). List in `inputs` only what you saw work.

When a check fails and the cause isn't obvious, see [debugging.md](../../pushplay-runtime/references/debugging.md) and *When something is broken* in the `improve-game` skill.
