---
name: performance-pass
description: Measure and fix frame rate, stutter, load time and memory for the game in this repo, in any engine, so it holds a steady 60 fps on its weakest target — frame-time profiling, a frame budget, draw calls and batching, overdraw, object pooling, removing per-frame allocations and garbage-collection hitches, physics and particle caps, texture and audio memory, and load time. Use for "it lags", "fps drops when lots happens", "slow on my handheld", "loads slowly", or a performance check before shipping.
---

# Performance pass

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the target devices, the resolution, the checks and how to finish a change. Measure first, fix the biggest cost, measure again.

This is a craft skill: sections 1–3 hold in any engine. Costs and tools that exist only in a browser are in the last section.

## 1. Measure the worst case
1. **Find the heaviest moment:** the most enemies, particles and effects (late waves, a boss, an explosion chain). Use a debug hook the game exposes (a jump to a level or wave, say) or raise spawn counts in `TUNING` to reach it.
2. **Log frame time** in the game's debug overlay or log: frame time (ms) averaged over 1 s, the worst single frame, and counts of entities, particles and draw calls.
3. **Profile for a breakdown** with what the engine has: the browser's performance panel, Godot's monitors and profiler, the Unity Profiler, a frame-time graph or a sampling profiler in a native game. Record the worst moment and find the top functions, and whether the time goes to simulation or to rendering.
4. **Measure per target**, at the resolution each one really renders: a phone (high-density screen, weak GPU, throttles when hot), a handheld with an integrated GPU, a desktop window, a TV at 1080p or 4K. The weakest target the game ships on sets the budget. Numbers from a development machine or a headless run are relative (compare before and after); ask the user for the readout on the real device.

**Frame budget:** 16.7 ms per frame at 60 fps (33.3 ms at 30, 8.3 ms at 120), everything included. A **hitch** is a single frame that takes about twice the budget or more (over ~33 ms at 60 fps). An average hides hitches, so always record the worst frame too.

Targets: a steady 16.7 ms frame; no hitch during play; no growth in memory over 5 minutes.

## 2. Common costs and fixes
| Cost | Usual fix |
|---|---|
| **Draw calls:** many separate objects, materials or state changes | batch: one atlas or shared material per group, instancing for repeated objects, merge static geometry; under ~150 draw calls on a handheld or phone |
| **Overdraw and fill rate:** full-screen layers, alpha overlays, big soft particles, post-processing; cost grows with pixels, so worst on high-density phones and 4K TVs | fewer full-screen passes, smaller or fewer transparent layers, render below native resolution and scale up, cap the render scale |
| **Redrawing what doesn't change** (static background, glows, text) | render once to a cached texture and draw that |
| **Per-frame allocation** (new objects, lists, closures, string building) | pool entities and particles, reuse lists, build HUD strings only when the value changes |
| **Garbage-collection hitch** (a periodic long frame in a managed language) | the row above; rate-limit bulk creation such as sound voices |
| **Unbounded lists** | hard caps (particles ≤ 300 alive), remove dead entities by swap-and-pop |
| **Collision checks O(n²)** | a uniform grid or spatial hash |
| **Physics steps** (several catch-up steps in a slow frame, too many active bodies) | a fixed timestep with a cap on steps per frame, sleep resting bodies, simpler collision shapes |
| **Texture memory** | ≤ 1024² for most, compressed formats, no texture larger than it is ever shown |
| **Audio memory and voices** | compressed music streamed or ≤ ~3 MB, short SFX, a voice limit |
| **Slow load** | smaller assets, show the first frame immediately, load music and later levels after the title is drawn |

## 3. Verify and record
1. Re-measure the same worst case on the same targets; report before → after numbers (1 s average and worst frame).
2. Play 5 minutes: no stutter creeping in, memory steady.
3. Gameplay must not change: the same seed gives the same run. Pin that with a test: a seeded run must end with the same result before and after, so a speed-up can't change play without someone noticing (a golden result, checked in the test suite).
4. Add a Changelog line to DESIGN.md with the numbers. Tell the user what to notice on the device ("the boss explosion should no longer hitch").
5. Run the project's checks and finish the change the way its rules say.

## In a web game
**Measuring:** drive the game with a short headless-browser script (Playwright) that presses the inputs and reads the timings, at the game's logical resolution at **device pixel ratio 1** and at **2** (a high-density handheld or phone screen). For the breakdown take a Chrome DevTools performance profile (Playwright's `page.context().tracing` or CDP `Profiler`). In three.js, read draw calls and triangles from `renderer.info.render.calls` and `.triangles`; its budgets are in [3d.md](../threejs-models/references/3d.md).

**Several copies, one browser:** two game copies in one headless browser starve each other and skew the numbers. Give each online copy its own browser when you measure or play-test online.

**Software renderers** (SwiftShader, llvmpipe) run many times slower than a GPU. Use them to compare before and after, never as the budget.

| Cost | Fix |
|---|---|
| Canvas: `shadowBlur`, filters, large gradients each frame | pre-render glows and gradients to an offscreen canvas **at 2×** once and `drawImage` them |
| Canvas: lots of `fillText` | cache static text to a 2× canvas; fewer font changes |
| Canvas: many small paths | batch same-colour shapes into one `beginPath` / `fill` |
| Fill cost at device pixel ratio 2 and above | fewer full-screen layers; have the game's scaling layer cap the ratio at 2 |
| Allocation in the frame loop | also `map` / `filter` on big lists, and audio nodes created in bulk |
| three.js: many meshes | `InstancedMesh`, merged geometries, shared materials; < ~150 draw calls |
| three.js: heavy pixels | `renderer.setPixelRatio(Math.min(devicePixelRatio, 1))`, fewer real-time shadows, smaller shadow maps, no post-processing stack |
| three.js: textures | ≤ 1024² for most, power-of-two, compressed or small canvases |
