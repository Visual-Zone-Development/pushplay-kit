---
name: pushplay-runtime
description: How to do things with PushPlay's runtime files in a game (input.js, menu.js, fit.js, audio.js, save.js, settings.js, prompts.js, touch.js, net.js, lobby.js, party.js, controller.js) and the PushPlay side of every craft skill. Use whenever a general skill says "the game's menu system", "its save data", "the input-prompt helper", "the audio layer", "the project's checks" or "a debug hook" and you need the actual PushPlay call, and for "how do I read the controller", "add a setting", "save progress", "play a sound", "show button prompts", "use the on-screen stick", "sync state online", "send something to a phone". Also refreshes those files to the kit's current ones, for "update the runtime files", "refresh input.js / menu.js", "get the latest runtime".
---

# The PushPlay runtime

This skill is for JavaScript games built on the runtime files; a game made in another engine doesn't use it. The `pushplay-rules` skill is the contract: it says what every game must do, and the runtime files are how. They are shared code that `pushplay update-runtime` replaces, so import them and never edit them. This skill is the lookup from a craft skill's plain words to the calls. `pushplay` is the command the `pushplay-rules` skill gives you.

## 1. From the craft skills' words to the runtime

The craft skills (`game-feel`, `game-ui`, `game-audio`, …) are written for any web game. In a PushPlay game they mean:

| A craft skill says | In a PushPlay game |
|---|---|
| the game's input state, a button, a stick | `input.js`: `input.update()` first thing every frame; `input.x / y`, `input.aimX / aimY`, `input.held(b)`, `input.pressed(b)`, `input.released(b)`, `input.navX / navY` for menus, `input.pointer` and `input.pointers` |
| per-player controllers | `input.pads[i]` (`{ index, connected, x, y, aimX, aimY, held(), pressed() }`) |
| the input-prompt helper | `input.label('a')`, `input.label('menu')`, `input.stickLabel()`, `input.dpadLabel()`, and `drawPrompts(ctx, input, [['a', 'Jump']], opts)` from `prompts.js`. Never a literal "A" or "Space". |
| which device the player is using | `input.mode`: `'gamepad' \| 'keyboard' \| 'mouse' \| 'touch'` |
| a game-specific key | `input.extendKeys({ KeyR: 'y' })` in `game.js` |
| the pause input, the pause button | `menu` (Start / Esc / P); the on-screen button calls `input.requestMenu()`; `input.onPause(cb)` for auto-pause |
| the game's menu system | `createMenu(items, opts)` from `menu.js`: `menu.update(input, dt)` returns the chosen id, `'back'` or `null`; `menu.draw(ctx)`; `menu.value(id)`, `menu.select(id)`, `menu.selected`, `menu.items` |
| the settings screen, a new setting | `createSettingsScreen({ settings, audio, extra })` from `settings.js`; a new option is a `menu.js` value item (`toggle`, `range`, `choice`) in `extra` |
| the reduced shake / flash setting | `settings.data.reducedShake` |
| the text-size setting | `settings.data.textScale` (multiply HUD and menu font sizes by it) |
| the game's save data | `createSave(id, 1, defaults, migrate?)` from `save.js`: `save.data`, `save.save()` after every change that matters, on pause and in `input.onPause` |
| the game's audio layer, its buses | `createAudio({ settings })` from `audio.js`: `audio.tone()`, `audio.noise()`, `audio.load()` + `audio.play()`, buses `master`, `music`, `sfx` |
| on-screen touch controls | `createTouchControls(input, { stick, buttons, labels })` from `touch.js`: `touch.update()` right after `input.update()`, `touch.draw(ctx)` last during play |
| the logical resolution, the scaling layer | 1280×800 (or the phone spaces 720×1280 and 1280×720) through `fitCanvas(canvas, { w, h, maxDpr: 2, … })` from `fit.js`; `fit.safe` for notches; `input.attach(canvas, w, h)` |
| the target device | A Steam Deck or Legion Go: a mid-range integrated GPU, a 7–8" screen, 60 fps at 1280×800 and no drops at DPR 2 |
| a debug hook | `window.__game = { state, TUNING }` (the check needs it), with helpers of your own such as `window.__game.jumpTo('boss')`; `?debug` and `?seed=` in the URL |
| the project's dev server | `pushplay dev` (`pushplay dev <id>` in a workshop), at `http://localhost:5173/` |
| the project's checks | `pushplay check` (`pushplay check <id>`): fix everything it reports, then look at the images whose paths it prints |
| how the project finishes a change | Bump `version` in `pushplay.json`, add a Changelog line to `DESIGN.md`, commit and push |
| a headless-browser script | The repro script in [debugging.md](references/debugging.md), on the kit's Playwright (`PW_MODULE="$(pushplay where)/node_modules/playwright"`) |
| an image-generation tool | `pushplay art`, and its cost rules, in [generated-art.md](references/generated-art.md) |
| the project's cover or key art | `art/cover.svg` and `art/hero.svg`: the `cover-art` skill |

The full signatures and the rules around each are in the `pushplay-rules` skill: [controls.md](../pushplay-rules/references/controls.md) (*Controls*, *Input hints*), [menus-and-exit.md](../pushplay-rules/references/menus-and-exit.md) (*Menus*, *Flow*), [screens.md](../pushplay-rules/references/screens.md) (*Settings*, *Screens and scaling*) and [saves-and-audio.md](../pushplay-rules/references/saves-and-audio.md) (*Saves*, *Audio*).

## 2. The PushPlay side of each craft skill

When you use a craft skill in a PushPlay game, also read its page in `references/craft/`: the recipes that skill needs here, with the exact calls.

| Area | Pages |
|---|---|
| Design and content | [game-design](references/craft/game-design.md), [design-doc](references/craft/design-doc.md), [prototype-sprint](references/craft/prototype-sprint.md), [piecewise](references/craft/piecewise.md), [level-design](references/craft/level-design.md), [boss-design](references/craft/boss-design.md), [progression](references/craft/progression.md), [dialogue](references/craft/dialogue.md) |
| How it plays | [game-feel](references/craft/game-feel.md), [physics-feel](references/craft/physics-feel.md), [camera](references/craft/camera.md), [enemy-ai](references/craft/enemy-ai.md), [fps-viewmodel](references/craft/fps-viewmodel.md), [touch-controls](references/craft/touch-controls.md), [local-multiplayer](references/craft/local-multiplayer.md), [online-netcode](references/craft/online-netcode.md) |
| Art and assets | [art-direction](references/craft/art-direction.md), [model-asset](references/craft/model-asset.md), [animate-asset](references/craft/animate-asset.md), [canvas2d-assets](references/craft/canvas2d-assets.md), [pixel-art](references/craft/pixel-art.md), [threejs-models](references/craft/threejs-models.md), [character-models](references/craft/character-models.md), [environments](references/craft/environments.md), [game-assets](references/craft/game-assets.md), [lighting-pass](references/craft/lighting-pass.md) |
| Sound and interface | [game-audio](references/craft/game-audio.md), [game-ui](references/craft/game-ui.md) |
| Quality | [playtest](references/craft/playtest.md), [performance-pass](references/craft/performance-pass.md), [accessibility-audit](references/craft/accessibility-audit.md), [localization](references/craft/localization.md), [release-notes](references/craft/release-notes.md) |

## 3. Platform guides

| Guide | Read it for |
|---|---|
| [phone.md](references/phone.md) | Phone and tablet play: the phone spaces, `fill: true`, safe areas, thumb zones, the phone pass, the Phone and Tablet labels |
| [3d.md](references/3d.md) | three.js in a `--vite` game: the fixed render surface, the HUD canvas, budgets for the Deck |
| [assets.md](references/assets.md) | Bundled sprites, audio, models and fonts: where they go, sizes, licences and `assets/CREDITS.md` |
| [generated-art.md](references/generated-art.md) | `pushplay art`: painted art from the user's own image API key, and never spending their money without a yes |
| [multiplayer.md](references/multiplayer.md) | Online games: the whole `net.js` and `lobby.js` API, the host loop, private views, reconnects |
| [party.md](references/party.md) | Party games: `party.js`, `party.public` and `party.view(id)`, `controller.html`, the lobby and join badge |
| [motion.md](references/motion.md) | Phone motion controls in a party game: what sensors can and can't do, `motion.js` |
| [debugging.md](references/debugging.md) | Symptom → cause → fix for input, pause, touch, screen, sound and save bugs; the debug hooks and the repro script |

## 4. Rules that catch people out

- **Runtime files are never edited.** A change you want in one belongs in `game.js` (key aliases through `input.extendKeys`, a custom look by drawing `menu.items` yourself while `menu.update` keeps the behaviour).
- **Pause is `menu`, back is `b`.** Esc never goes back; B never pauses. Nothing is bound to F10, Start+Select or a held Esc: the launcher owns them.
- **Only `save.js` and `createSettings` touch `localStorage`,** and every key starts with the game id.
- **No network.** Everything is bundled; only an `--online` or `--party` game talks to the relay, through `net.js`.
- **`state.screen`** is one of `title`, `playing`, `paused`, `gameover`, `settings` (and `lobby`), with exactly those names: the check reads it.

## 5. Updating the runtime files

**Only when the user asks** ("update the runtime files", "get the latest runtime"). It touches shared files in every game in the repo, so work on a branch and keep it apart from game changes.

1. Start from a clean working tree (`git status`) and run `pushplay update-runtime`. In every game built on the runtime files it:
   - **replaces** each file that carries the runtime header (`input.js`, `menu.js`, `fit.js`, `audio.js`, `save.js`, `settings.js`, `prompts.js`, `touch.js`, plus `net.js` and `lobby.js` in an online game and `party.js`, `party-lobby.js`, `qr.js`, `controller.js` and `net.js` in a party game);
   - **adds** a runtime file the game doesn't have yet (`touch.js`, say), which does nothing until the game imports it;
   - leaves games that aren't on the runtime files alone. With none in the repo there is nothing to do: say so.
2. Read its whole output. Two warnings need action:
   - **"replaced without a runtime header"**: a runtime file that had been edited by hand was overwritten. Look at `git diff` for that file and move the game's own change into `game.js` (key aliases through `input.extendKeys`, behaviour in the game's own code).
   - **"kept (the game's own file shares a runtime name)"**: the game wrote its own file under a runtime name, and it was not touched. Nothing to do unless the game should be using the runtime's.
3. `pushplay check` (every game), fix each ✗ in the game that reports it ([debugging.md](references/debugging.md)), and open a few of the screenshots it prints to see that nothing renders differently.
4. Commit on its own (`Update the runtime files`); commit any game fixes separately (`<Name>: fixes for the new runtime files`), each with a patch `version` bump and a Changelog line. Push, and tell the user which files changed and which games needed fixes.
