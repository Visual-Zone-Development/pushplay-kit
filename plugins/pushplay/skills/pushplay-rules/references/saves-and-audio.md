# Saves, audio, assets and offline play

For a JavaScript game built on the runtime files. `pushplay` is the command the `pushplay-rules` skill gives you.

## Saves (`save.js`)

- `const save = createSave(id, 1, defaults, migrate?)` → `{ data, load, save, reset }`, stored under `<id>-save-v1`. Keep best scores, unlocks and progress in `save.data` and call `save.save()` after every change that matters, **on pause and in `input.onPause`**. Bump the version and pass `migrate(old)` when the shape changes.
- All `localStorage` keys must start with the game id (the check reports any that don't: other games on the same device can clash with them). Only `save.js` and `createSettings` should touch `localStorage`.
- Saves persist per game on the device. The id never changes, so they survive updates and a move to another repo (`pushplay promote`).

## Audio (`audio.js`)

- `const audio = createAudio({ settings })`: buses `master`, `music`, `sfx`; `audio.tone()`, `audio.noise()` for generated SFX, `audio.load()` + `audio.play()` for bundled files, `audio.setVolume()`.
- Browsers only start audio after a user gesture. `audio.js` unlocks itself on the first key, click, tap or gamepad press and mutes on pause; the launcher allows autoplay, a normal browser doesn't, so never assume sound is running before the first input and don't rely on music playing on the title screen before a press. Draw the first frame immediately; never wait for a click or for audio before drawing.
- Every action has a sound; a music loop fits the mood; both obey the Settings sliders.

## Assets

Games can be fully procedural, or use the user's own sprites, audio, models and fonts. Copy them into `assets/` (never link to the internet), record where each came from and its license in `assets/CREDITS.md`, and keep files small (sprite sheets ≤ 2048px, music ≤ ~3 MB, < 30 MB total). Details: [assets.md](../../pushplay-runtime/references/assets.md).

Painted sprites and textures can also be generated with the user's own image API key (`pushplay art`, see [generated-art.md](../../pushplay-runtime/references/generated-art.md)); the images are bundled, never fetched at runtime.

**Never spend the user's money without their agreement.** Before anything that charges them (image generation or any other paid API), tell them what it costs and wait for a yes in the conversation. For `pushplay art`: run it with `--dry`, give them the number of images and the estimate, and only after they agree run it with `--approve <that amount>`. Each new batch, redo or `--force` is a new charge and needs a new yes.

## Offline and self-contained

- No CDNs, remote fonts, analytics or network calls inside the launcher. Bundle everything in the repo (or install it with npm in a `--vite` game). The check fails on internet requests and on WebSockets.
- Something the game's normal release needs from the network (analytics, an online leaderboard) goes behind `if (!window.pushplay) { … }`: the check runs the game with the launcher's object present, so that code is neither run nor judged there.
- Exception: online multiplayer, with `"online": true` in the manifest. Scaffold it with `--online`: it plays through the shared relay with no setup, and only the relay connection is allowed. Follow [multiplayer.md](../../pushplay-runtime/references/multiplayer.md) and don't edit the provided `net.js` or `lobby.js`.
- Same for party games (`"party": true`, scaffolded with `--party`): phones join through the same relay. See [online-and-party.md](online-and-party.md).
