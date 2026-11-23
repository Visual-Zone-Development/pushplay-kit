# babylonjs-scenes in a PushPlay game

The general `babylonjs-scenes` skill covers Babylon.js scenes: imports, baked lighting, tone mapping, the first-person render group, the quality tiers and cosmetic ragdolls. This page gives the PushPlay side. The rules are in the `pushplay-rules` skill: [screens.md](../../../pushplay-rules/references/screens.md) for *Screens and scaling* and [verification.md](../../../pushplay-rules/references/verification.md) for the check.

- **Scaling:** follow [3d.md](../3d.md) (*Render size and scaling*). The 3D canvas stays at 1280×800 and pixel ratio 1, the HUD is a separate 2D canvas sized with `fitCanvas` (maximum DPR 2), and `input.attach` goes on the top-most canvas.
- **The check renders with a software renderer.** The light tier from the general skill must switch on there, and the game must still reach its screens in time for the check's screenshot. Show the tier in the `?debug` overlay and confirm it with `pushplay check`.
- **Graphics setting:** add High / Low to the settings screen built with `createSettingsScreen`, save it with the game's settings, and default handhelds with an integrated GPU to Low.
- **Physics is optional.** If Havok fails to load, deaths must still play the death animation. Nothing in the rules may depend on a ragdoll.
- **Dependencies:** pin `@babylonjs/core` and `@babylonjs/loaders` to the same exact version, and `@babylonjs/havok` on its own. Import from deep paths so the Vite build stays small.
