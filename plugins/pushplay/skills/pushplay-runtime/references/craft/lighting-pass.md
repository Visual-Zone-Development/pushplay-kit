# lighting-pass in a PushPlay game

The general `lighting-pass` skill covers baking, image-based light, post-processing and a low tier. This page gives the PushPlay side. The rules are in the `pushplay-rules` skill: [screens.md](../../../pushplay-rules/references/screens.md) for *Screens and scaling* and [verification.md](../../../pushplay-rules/references/verification.md) for the check.

- **The check plays the game in a headless browser with a software renderer.** The low tier must switch on there, and keep the game fast enough that the check's play passes reach gameplay. Confirm it with `pushplay check` and its screenshot.
- **Handhelds:** default the Graphics setting to Low on a handheld with an integrated GPU, and keep the 60 fps budget there at High.
- **Resolution:** the 3D view may drop to half resolution in the low tier; the HUD stays on the 2D canvas at 1280×800 through `fitCanvas`, so text stays crisp.
- **Settings:** add the Graphics High / Low item to the settings screen built with `createSettingsScreen`, and save it with the game's settings.
