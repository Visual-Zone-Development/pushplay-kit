---
name: game-assets
description: Find, license and prepare ready-made assets for a game, in any engine - 3D models, animations, textures and HDRIs, sound effects, music and fonts, free or paid (Mixamo, Kenney, Quaternius, Poly Haven, Sonniss, freesound, Fab, Synty, Meshy and more) - then make them game-ready and credit them. Use when the user wants to get, download, buy or swap in assets, asks where to find sounds, models or animations, or needs a licence or credit checked. Not for making assets yourself (use model-asset or game-audio) or bringing a character into a three.js game (use character-models).
---

# Game assets

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the formats, the size budget, where assets go and how a change is finished.

A bought or free asset is only usable if three things hold: its **licence**
allows this game, it's **credited**, and it's **processed** to the game's
budget and style. Do all three for every asset that lands.

## 1. Make, find or generate

Decide per asset type, and say why in one line:

- **Find** when a good free or paid source exists: animations (Mixamo), sound
  effects (Sonniss, Kenney, freesound), HDRIs and textures (Poly Haven,
  ambientCG), low-poly packs.
- **Generate** with AI for hero models in a specific style (Meshy, Tripo).
  It costs credits and has its own licence (§2); get the owner's OK on the
  amount first.
- **Make** when it has to match an exact style or is simple shapes; code and
  Blender scripts are good at simple shapes and bad at "realistic".

## 2. Check the licence per item

Read [sources.md](references/sources.md) for each source's licence, price,
attribution and gotchas. Then open **the item's own page**: on Sketchfab,
itch.io, OpenGameArt, Poly Pizza, freesound and Humble, the licence is per
item. Done when you know, for this item: commercial use allowed, attribution
needed or not, and any condition on how it ships.

Conditions that bite games most:
- **Web games ship their files in the open:** anyone can download a glTF or
  OGG from the page. Licences that require models to be unextractable
  (CGTrader, TurboSquid) are hard to meet in a browser. Prefer CC0, or
  licences that only require the asset to be part of the game.
- **A public repo counts as redistribution:** keep paid and "no raw
  redistribution" source files (Synty, Fab, Unity Asset Store, Sonniss,
  Quaternius, Pixabay) out of open repos.
- **NC and Editorial licences can't go in a commercial game.**
- **AI-generated output:** check whether the plan was free or paid. Meshy's
  free tier, for example, gives a CC BY licence that requires crediting Meshy.
  Store pages may need an AI disclosure for AI art, sound or text players see
  (Steam's Content Survey does).

## 3. Credit it as it lands

Add a row to the project's credits file (create `CREDITS.md` if there isn't
one) in the same change that adds the asset: the file paths, the source and
author with a link, the licence, and what you changed (trimmed, re-tinted,
decimated). Keep a copy or screenshot of the licence as it read on download.
Credit attribution licences on an in-game credits screen too.

## 4. Process it to the game's budget

Follow the matching recipe in [recipes.md](references/recipes.md):

- **Mixamo:** settings for each clip, the T-pose rig reference, in place.
- **Sound bundles:** search the zips without unpacking them all, extract the
  picks, cut one-shots, normalise and compress.
- **AI and downloaded models:** polygon budget, decimation, one material, and
  matching the palette.
- **Textures and HDRIs:** formats and sizes.

Done when every asset is in the game's format and size budget, matches the
palette, and is credited.

## 5. Check it in the game

Look at or listen to each asset in the running game: models in place under
the game's lighting, animations on the real rig, and sounds at the game's mix
level next to the existing ones. A clip you couldn't audition (for example in
a headless session) is reported as **unheard**, with what to listen for.

Run the project's checks and finish the change the way its rules say.
