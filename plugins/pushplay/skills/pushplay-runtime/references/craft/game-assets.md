# game-assets in a PushPlay game

The general `game-assets` skill covers finding, licensing, crediting and processing assets. This page gives the PushPlay side. The rules are in the `pushplay-rules` skill: [saves-and-audio.md](../../../pushplay-rules/references/saves-and-audio.md) for bundled assets.

- **A game repo holds only the game.** Keep downloaded packs, raw sound libraries and source files outside the repo, or in an ignored folder. Commit only the processed files the game loads, plus the credits file.
- **Bundle everything.** The game must run offline from its own build, so no asset is loaded from another site at runtime.
- **Size:** processed assets count towards the game's download. Compress audio (OGG/Opus), use WebP or KTX2 textures, and keep models within the polygon budget for a handheld with an integrated GPU.
- **Credits:** keep `CREDITS.md` in the game's folder, and show attribution credits on a Credits screen reached from the title menu (built with `menu.js`).
