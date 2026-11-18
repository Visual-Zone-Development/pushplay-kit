---
name: lighting-pass
description: Make a 3D game look properly lit yet stay cheap on weak hardware - baked lightmaps (from the engine or headless Blender), image-based light from a CC0 HDRI, tone mapping and a light post-processing stack, and a low tier for slow GPUs and software renderers. Use when 3D scenes look flat, unlit or plastic, when adding baked lighting or an environment map, or when the game crawls on weak machines or a headless renderer. Not for the 2D look or palette (use art-direction) or general frame-time work (use performance-pass).
---

# Lighting pass

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the engine, the target devices, the frame budget and the checks.

Real-time lights and shadows are expensive and often look plain anyway. Light the **static** world once, offline, and keep the frame cheap:
- static geometry gets a **baked** lightmap
- moving things get **image-based light** from an HDRI, plus at most one directional light
- characters get soft blob shadows under them

## 1. Bake the static world

Use the engine's own baker where it has one (Godot's LightmapGI, Unity's Progressive Lightmapper, Unreal's Lightmass). Otherwise bake in headless Blender from a script that builds the level from the same geometry source the game uses (a level file or plan), so a rebake is one command (`blender -b -P bake_level.py -- <level>`).

- **Shape:** bevel block edges a little. Bevels catch light and make simple blocks read as built, at almost no cost.
- **UVs:** UV 0 holds world-aligned tiling coordinates for small panel or detail textures. UV 1 holds a lightmap atlas, with margin between islands.
- **Lights:** a graded sky, one sun, and emissive trims, so the bake carries coloured bounce from the scene's glowing parts.
- **Light only:** bake light without surface colour (in Blender, Cycles Diffuse with direct and indirect on and colour off), and tint surfaces at runtime.
- **Range:** an 8-bit map clips every highlight. Store `(light / 4) ^ (1 / 2.2)` and decode it in the material, or use the engine's HDR lightmap format.
- **Axes:** Blender is Z-up, and most game engines are Y-up. Write down the mapping once, in the script.
- **Freshness:** store a hash of the source geometry next to the bake, and add a test that fails when the geometry changed without a rebake.

## 2. Materials

- **Baked surfaces are unlit:** colour = tint × albedo × decoded lightmap × exposure, plus a small Fresnel reflection of the environment (a bit more on floors). Emissive trims stay at full strength. Expose one exposure constant.
- **Characters and props** use PBR materials lit by the environment map.

## 3. Image-based light

Take a CC0 HDRI (Poly Haven's studio and indoor sets suit arenas), prefilter it into the engine's environment format, and use it as the scene's environment for PBR materials and reflections. A small studio HDRI often suits indoor or abstract spaces better than a sky. Credit it in the project's credits file.

## 4. Post-processing

ACES (or the engine's filmic) tone mapping, a little bloom on emissives only, anti-aliasing, and a soft vignette. Grain and chromatic aberration only on the highest setting. Offer a **Graphics High / Low** setting, and default handhelds and phones to Low.

## 5. A low tier for weak machines

Software renderers, integrated GPUs and many headless build checks take seconds per frame at full quality.

- **Watch frame time:** after a settle period (about 4 s of loading), an average above about 1/14 s held for about 3 s means the machine can't keep up. A single hitch doesn't count.
- **Detect** a software renderer from the graphics adapter's name where the platform reports it.
- **On either, drop to the low tier:** no post-processing, glow or reflections, and the 3D view at half resolution. Draw the HUD at full resolution on its own layer, so text stays crisp.
- Put the detection and the frame-time rule in a pure module with tests, and show the tier in a debug overlay so a headless run can confirm it.

## 6. Check it

- **Before and after:** screenshots from the same fixed camera positions on each level, from the engine's own frame capture or headless mode, or ask the user for them.
- **Frame time** on the weakest target and in a software renderer.
- **The lightmap is fresh** (the freshness test passes), and the scene still reads in the low tier.

## In a web game

- **Babylon.js:** prefilter the HDRI to `.env` (Babylon's IBL tool or `EnvironmentTextureTools`) and set `scene.environmentTexture`. Use the `DefaultRenderingPipeline` for ACES, bloom, FXAA and vignette. Feed the lightmap into a custom or node material for the decode.
- **three.js:** prefilter with `PMREMGenerator` and set `scene.environment`, set `renderer.toneMapping = ACESFilmicToneMapping`, and add bloom via `EffectComposer` and `UnrealBloomPass`. Decode the lightmap in `onBeforeCompile`, or store it linear and use `material.lightMap`.
- **Detect a software renderer** with the `WEBGL_debug_renderer_info` extension, matching `/swiftshader|llvmpipe|software|softpipe/i` in the unmasked renderer string.
- **Half resolution:** render the 3D canvas at a pixel ratio of 0.5 (Babylon `engine.setHardwareScalingLevel(2)`, three.js `renderer.setPixelRatio(0.5)`), and keep the HUD on a separate 2D canvas at the screen's pixel ratio.
- Save baked lightmaps as WebP (quality about 90) to keep the download small.

Run the project's checks and finish the change the way its rules say.
