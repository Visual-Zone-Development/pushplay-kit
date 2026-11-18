# fps-viewmodel in a PushPlay game

The general `fps-viewmodel` skill covers the arms and gun in first person. This page gives the PushPlay side. The rules are in the `pushplay-rules` skill: [controls.md](../../../pushplay-rules/references/controls.md) for *Controls* and [screens.md](../../../pushplay-rules/references/screens.md) for *Settings*.

- **Input:** aim with the right stick (`input.aimX` / `input.aimY`), zoom on the left trigger and fire on the right. Show the zoom and reload buttons with `input.label()`.
- **Settings:** when the reduced shake / flash toggle (`settings.data.reducedShake`) is on, weapon sway, head bob and recoil kick shrink, and muzzle flashes stay small and brief.
- **Debug:** put the viewmodel's override hook behind the game's `?debug` mode, so it never ships active.
