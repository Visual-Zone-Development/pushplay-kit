# Processing recipes

## Mixamo animations

- **Rig:** use one rig for every clip (a stock character such as Y Bot, or
  the game's own character uploaded once) so the clips share bone names.
- **Each clip:** FBX Binary, **Without Skin**, 30 fps, keyframe reduction
  none, and **In Place** ticked wherever it's offered (locomotion), so the game
  moves the character, not the clip.
- **Rig reference:** one T-Pose download **With Skin**, kept next to the clips.
- **Search** by what the clip does and read the descriptions: several clips
  share a name ("Rifle Idle" has four). Note the exact clip used for each
  slot, and any substitute.
- **Browser automation:** the download needs a real click. Script-triggered
  clicks finish the export but save nothing. After the first file, Chrome may
  block "multiple downloads" from the site: ask the user to allow it. Clear
  duplicate downloads (`name (1).fbx`) before moving files.
- **Into the engine:** convert FBX to glTF/GLB in headless Blender, or
  retarget onto the game's rig (Blender, or the engine's retargeting) when
  bone names differ.

## Sound bundles (Sonniss GDC and similar)

The bundles are many gigabytes of long WAVs. Work on a selection, not the
whole library:

1. **List each zip** (`zipinfo -1`, or Python's `zipfile`) into a table of
   file name, library folder and uncompressed size. Search names by
   category: UCS prefixes such as `GUNRif`, `GUNMech`, `EXPL`, `UIClick`,
   `WHSH` and `METLImpt` make this quick.
2. **Extract only the candidates** to a scratch folder outside the repo, with
   a small script that streams the matching entries. Run any Python over
   downloaded files with `-I`.
3. **Measure** with `ffprobe` (duration, rate, channels). Prefer short, dry
   one-shots. Real gun recordings are often 20–60 s takes with many shots, so
   skip them or cut them.
4. **Find the hits** in a long clip: a 50 ms peak envelope
   (`astats` with `reset=1` over 400-sample windows) or `silencedetect`.
5. **Cut, fade, normalise and compress** in one pass:
   ```bash
   ffmpeg -ss <start> -t <dur> -i in.wav -vn -ac 1 -ar 48000 \
     -af "afade=t=in:d=0.004,afade=t=out:st=<dur-fade>:d=<fade>,loudnorm=I=-16:TP=-1.5:LRA=11" \
     -c:a libopus -b:a 64k out.ogg
   ```
   `-vn` matters: some library WAVs embed artwork that ffmpeg treats as a
   video stream. Write fade times with a leading zero (`0.16`, not `.16`).
   Opus in OGG plays in every modern browser. Use Vorbis or AAC only if
   your engine needs them.
6. **Layer** sampled clips over existing placeholder sounds, so a clip that
   hasn't loaded yet doesn't leave silence.
7. **Keep the raw selection out of public repos** (the bundle licence forbids
   passing the files on), and list each clip with its library and original
   file name in the credits.

## AI-generated and downloaded models

- **Generate low-poly:** use a smart-topology or low-poly mode with a polygon
  target. Decimating a dense mesh afterwards looks worse. Around 5–10k
  triangles suits a main character in a web game, and props much less.
- **Get the owner's OK on the credit amount** before each paid generation,
  and record each task's id so a re-run never pays twice.
- **Clean up in headless Blender:** one material per mesh, WebP textures at
  1–2k, origin and scale set for the game, LODs for far views, and decimation
  (the Decimate modifier) for downloaded high-poly models.
- **Palette:** map each texture onto the game's palette (a colour bible),
  for example by re-tinting in Blender, so assets from different sources
  look like one game.
- **Simple shapes** (houses, crates, level blocks) are often better written
  as a Blender script than generated: when something's wrong, you fix one
  line and run it again.

## Textures and HDRIs

- **Textures:** WebP (or KTX2/Basis if the engine supports it), power-of-two
  sizes, 1k for props and 2k for hero surfaces.
- **HDRIs:** download 1–2k, prefilter into the engine's format (Babylon
  `.env`, three.js PMREM) at build time, and credit the HDRI.
