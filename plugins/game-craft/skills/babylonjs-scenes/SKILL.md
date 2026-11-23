---
name: babylonjs-scenes
description: Babylon.js scenes for a web game bundled with Vite, built to look finished and stay cheap - deep imports that keep the bundle small, a fixed-size 3D canvas with the HUD on its own 2D canvas, baked lightmaps on an unlit surface material, image-based light and ACES tone mapping, a first-person render group, a software-renderer and frame-time tier, and cosmetic Havok ragdolls. Use when a Babylon.js game looks flat or plastic, lags on a weak GPU, runs seconds per frame in a headless check, has a gun that clips into walls, or has a ragdoll that twists on a glTF rig. Not for three.js (use lighting-pass and threejs-models) or for engines other than Babylon.js.
---

# Babylon.js scenes

`<skill-dir>` is the folder this file is in.

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the target devices, the resolution, the checks and how to finish a change. This is a stack skill: it is about one engine, so browser terms are fine here. The general method is in [lighting-pass](../lighting-pass/SKILL.md), [performance-pass](../performance-pass/SKILL.md) and [fps-viewmodel](../fps-viewmodel/SKILL.md); this page is how to do it in Babylon.

## 1. Imports: deep paths, and only what you use

Import from the module that defines each class, not from the package root, so the bundler can drop the rest:

```js
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector'
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture'
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration'
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline'
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader'
```

- **Side-effect imports are needed for some features**: the prefiltered `.env` loader (`@babylonjs/core/Materials/Textures/Loaders/envTextureLoader`) and the physics components. If a feature silently does nothing, check for the missing import first.
- **Pin the versions exactly**, `@babylonjs/core` and `@babylonjs/loaders` to the same version, and `@babylonjs/havok` on its own. Upgrades change shader output and the look, so do them on purpose and re-check the screenshots.
- **Keep one copy of each helper.** Vectors and colours are created once and reused (`Vector3` scratch values at module level), not built each frame.

## 2. The render surface

Render the 3D world to a fixed surface and let the page scale it, the same as the 2D HUD:

```js
const engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' }, false)
engine.setSize(1280, 800)           // the logical size; the 4th argument false keeps it from adapting to device pixel ratio
```

- Keep the 3D canvas at pixel ratio 1. A high-density screen gains little readable detail and costs four times the pixels.
- Draw the HUD and menus on a separate 2D canvas above it, sized at the screen's pixel ratio, so text stays sharp.
- The lower tier in section 6 halves the 3D resolution with `engine.setHardwareScalingLevel(2)`. Only the 3D view changes; the HUD does not.

## 3. Baked lighting

Static geometry gets its light from a bake made offline (see [lighting-pass](../lighting-pass/SKILL.md) section 1), so the scene itself needs no real-time lights:

```js
const lightmap = new Texture(url, scene, false, false)
lightmap.coordinatesIndex = 1     // UV 1 holds the lightmap atlas; UV 0 holds the panel tiling
lightmap.level = LIGHTMAP_LEVEL   // the stored (light / 4) ^ (1 / 2.2) decoded back: the exposure knob
material.lightmapTexture = lightmap
mesh.freezeWorldMatrix()          // static meshes never move: skip their transform work each frame
mesh.isPickable = false
```

- **Surfaces are unlit**: colour = tint × panel texture × lightmap, plus a small Fresnel reflection. A `StandardMaterial` takes `reflectionFresnelParameters` with a bias, a power and a left and right colour (a little more reflection on floors).
- **Group the meshes by surface** and share one material per surface. A map of a few hundred pieces then costs a few dozen draw calls.
- **Emissive trims are the only things that glow.** Give a mesh the tint on its emissive channel only if it's a trim, and keep every other mesh out of the glow layer, so a wall hides the glow behind it.
- **Freshness:** write a hash of the plan next to each bake, and fail a test when the plan changed and the bake didn't. Babylon itself won't tell you a lightmap is stale.

## 4. Image-based light and tone mapping

```js
scene.environmentTexture = CubeTexture.CreateFromPrefilteredData(envUrl, scene) // a prefiltered .env from a CC0 HDRI
scene.environmentIntensity = 0.75                                           // characters and props: PBR lit by it
```

- **Characters and props** are PBR and take their light from `environmentTexture`. The map's surfaces take their light from the bake, so keep the map's own reflection faint: a second cube texture with a low `level` (about 0.06 for a bright studio HDRI), because a full-strength HDR reflection floods the walls.
- **Post-processing** comes from one `DefaultRenderingPipeline` that reads `scene.imageProcessingConfiguration`:

```js
const pp = new DefaultRenderingPipeline('look', true, scene, cameras)
const ip = scene.imageProcessingConfiguration
ip.toneMappingEnabled = true
ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES
ip.vignetteEnabled = true
pp.fxaaEnabled = true
pp.bloomEnabled = high          // the high tier only (section 6)
pp.bloomThreshold = 0.95        // only the brightest values bloom: the emissive trims, not the walls
pp.bloomWeight = 0.15
```

- Bloom threshold high enough that only emissives pass. Lower it and the whole map blooms into haze.
- Grain and chromatic aberration only in the top tier, if at all.

## 5. The first-person view

Your arms and gun draw in **rendering group 1**, which draws after the world, so a gun held against a wall never clips into it:

```js
viewmodelMesh.renderingGroupId = 1
```

- Pass the group into your model and effect helpers when you build them, rather than setting it per mesh afterwards: a helper that makes the arms defaults to group 1, and the gun and its muzzle flash take a `group` option so they can be built for the first-person view. A first-person piece left in group 0 is drawn with the world and can clip into it.
- Put the hand positions in one table per gun and use it for the third-person gloves too, so the two views agree. Tune them with a live inspector behind the debug flag, not by editing constants and reloading. See [fps-viewmodel](../fps-viewmodel/SKILL.md) section 2.

## 6. Quality tiers

Measure before you change anything. The tiers below are how a Babylon game survives weak machines and a software-renderer check.

```js
const isSoftware = /swiftshader|llvmpipe|software|softpipe/i.test(engine.getGlInfo?.().renderer ?? '')
```

- **Light tier:** a software renderer (detected above, or frames that stay slow) drops to no post-processing, no glow layer, no reflections and the 3D view at half resolution: `engine.setHardwareScalingLevel(2)`. Without it, a headless check takes seconds per frame and the game can't reach its screens.
- **Two watches, two thresholds.** A High setting that averages under about 45 fps for 3 s (after a 4 s settle) is eased to Low for the session: no bloom, grain or aberration, the same look otherwise. A separate, harsher watch (under about 14 fps for 3 s) drops to the light tier. A single hitch doesn't count. Choosing High again in Settings starts both watches over.
- **Pure logic, tested:** the detection and the frame-time watch are a plain module with no Babylon imports, so `node --test` covers them (the game's `quality.js` is the example).
- **Show the tier** in the debug overlay (`?debug`), so a headless run can confirm which one it is on.

## 7. Cosmetic ragdolls with Havok

Havok (`@babylonjs/havok`) is a good fit for one job: making a dead body go limp. Keep it cosmetic.

- **Loads in the background.** If it fails to load (old browser, no WebAssembly), deaths play the death animation instead. The game must work without physics.
- **Never read it in the match.** Ragdolls run on each copy by themselves. The host's rules never depend on where a body landed.
- **Use your own ragdoll, not the experimental one, on a glTF rig.** A rig scaled down (0.01 is common from a Meshy or Blender export) and a glTF handedness flip break Babylon's bone decomposition. Instead, move each driven bone's world matrix rigidly with its physics body each frame.
- **Collision groups:** world bodies collide with ragdoll bodies, and limbs never collide with each other or with their own soldier.
- **Sleep and dispose.** Let resting bodies sleep and drop them after a while, keeping the last pose. Once a body is no longer needed, put the bones back and drop its bodies.
- **Stop the animation clips** before handing the rig to physics, then restore the bones on dispose.

## 8. Blob shadows

Real-time shadows are expensive and rarely worth it on a handheld. Put a soft dark disc (`CreateGround` with a transparent, dark material) under each character. It reads as grounded at almost no cost.

## 9. Check it

- **Frame time** at the target's resolution, and in a software renderer: a 1 s average and the worst frame, with the tier shown (section 6).
- **Look at both tiers.** A scene that looks right only in the high tier isn't finished, because the check and weak machines see the light tier.
- **Look at the bake.** Render from the same fixed cameras before and after a rebake.

Run the project's checks and finish the change the way its rules say.
