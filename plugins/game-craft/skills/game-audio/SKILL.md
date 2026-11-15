---
name: game-audio
description: Create and mix the sound for the game in this repo, in any engine — a short list of generated or bundled SFX given as recipes any synth can play, a music loop that fits the mood and reacts to intensity, variation, voice limits, ducking and mixing on master / music / SFX buses so everything follows the Settings sliders. Use for "add sound", "the game is silent", "make the music better", "sounds are annoying / repetitive", "add a soundtrack", or the audio part of a new game.
---

# Game audio

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the audio API, where assets go, the checks and how to finish a change. If the project or engine has an audio layer, everything goes through it (never a second audio device or mixer beside it, never edits to shared files). Read the game's `DESIGN.md` (*Audio*, fun targets, the kickoff answer for sound and music).

This is a craft skill: sections 1–5 hold in any engine. Code for a browser game is in the last section.

## 1. List every sound the game needs
Go through the game's actions and screens and write a table in DESIGN.md under *Audio*:

| Event | Character | Priority |
|---|---|---|
| menu move / choose / back | soft tick / bright blip / low blip | must |
| jump, shoot, hit, pickup, hurt, death | … | must |
| combo, level up, new best | rising, rewarding | must |
| ambience, music | the kickoff's mood | must |

Every action and every menu move has a sound ([definition-of-done.md](../game-design/references/definition-of-done.md)).

## 2. The audio layer: three buses, voices and pause
What the game needs, whether the engine's mixer or a few lines of your own provide it:

- **Buses:** a **master** bus with a **music** and an **SFX** bus under it, each with its own volume following a Settings slider (0–1, changed over ~20 ms so it doesn't click).
- **Sources:** either a synth with two generators, a **tone** (a waveform whose pitch can slide) and a **noise** burst, or sound files; both play into a bus with their own level and pitch.
- **Voice limits:** the same sound starts at most once per 50 ms; cap the voices playing at once (about 16–24) and drop the oldest or quietest when full. Never drop hurt or low-health sounds.
- **Ducking:** while an important sound plays (hurt, a big explosion, a voice line) pull the music down to about half for 0.3–0.5 s, then let it rise back.
- **Pause:** fade the master to silence on pause and when the game loses focus or is hidden; restore on resume. Music stops advancing too.

## 3. SFX recipes
Each sound is data: waveform, start → end frequency, duration, peak level (0–1). The envelope for all of them is an instant attack and a smooth decay to silence over the duration (a hard cut clicks). Feed the rows to any synth, or use them as the brief when picking sound files.

| Sound | Waveform | Frequency (Hz) | Duration | Level |
|---|---|---|---|---|
| Menu tick | square | 880 | 30 ms | 0.08 |
| Confirm | square, two notes 50 ms apart | 660, then 990 | 60 ms each | 0.15 |
| Jump | square | 300 → 700 | 120 ms | 0.15 |
| Laser / shot | sawtooth | 1200 → 300 | 100 ms | 0.1 |
| Hit | noise + triangle | noise; 120 | 60 ms + 80 ms | 0.25 + 0.15 |
| Explosion | noise + sine | noise; 80 → 30 | 400 ms both | 0.35 + 0.3 |
| Pickup / coin | square, two notes 60 ms apart | 990, then 1320 | 60 ms, 100 ms | 0.15 |
| Hurt | sawtooth | 220 → 100 | 200 ms | 0.15 |
| Combo step n | the pickup sound | × 2^(n/12): a semitone up per step, capped | | |

Keep each sound behind one name (`sfx.jump`) so game code never holds the numbers.

Variation: randomise pitch ±5–10% on repeated sounds, and keep levels low (0.05–0.3): many sounds stack, and the sum must not clip.

**Bundled files** (the user's or CC0): keep them in the project (an `sfx` and a `music` folder; a compressed format the engine plays, music ≤ ~3 MB), never streamed from another site, and credit them in the project's credits file ([assets.md](../game-design/references/assets.md)). Load them once at startup, not at first use, and play each with its own pitch and level into the right bus.

## 4. Music
- **Generated loop:** a tiny step sequencer: a tempo, a 16-step pattern per voice (bass, lead, drums from noise), played on the music bus and stopped while paused. Pick a scale that fits the mood (minor pentatonic for tense, major pentatonic for cozy).
- **Layers:** add a voice as intensity rises (a drum layer at wave 5, a lead at the boss). Players notice it as "something new".
- **Bundled track:** it must loop cleanly: cut on a bar line, with no gap or click at the seam and no reverb tail cut off. Stop it on Quit to title and Restart.

## 5. Mix and verify
1. Music sits under SFX (music level about half of SFX). Important sounds (hurt, low health) are the loudest and most distinct.
2. The loudest moment (many hits, an explosion, music at full) doesn't distort; if it does, lower levels or tighten the voice limit.
3. Pause silences everything, and the music stops advancing (notes queued ahead would otherwise play on). Restart and Quit to title stop the run's loops.
4. Move each Settings slider (Master, Music, SFX) to 0 and back; each must work.
5. Play 2 minutes: is anything grating or too repetitive? Fix it. Judge per target: a phone's speaker loses everything below ~200 Hz, so no sound may live only in the bass; a TV or headphones reveal harshness. If you can't hear the game, ask the user to listen.
6. Update DESIGN.md (*Audio*, Changelog).
7. Run the project's checks and finish the change the way its rules say.

## In a web game
When the project has no audio layer, this is all of section 2 in Web Audio, playing the recipes of section 3:

```js
const ac = new AudioContext()
const bus = { master: ac.createGain(), music: ac.createGain(), sfx: ac.createGain() }
bus.music.connect(bus.master); bus.sfx.connect(bus.master); bus.master.connect(ac.destination)
const setVolume = (name, v) => bus[name].gain.setTargetAtTime(v, ac.currentTime, 0.02) // 0..1, from the sliders

// browsers start audio only after a gesture
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => ac.resume(), { once: true })

function tone({ freq = 440, end = freq, dur = 0.1, type = 'square', gain = 0.15, delay = 0, to = 'sfx' }) {
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (end !== freq) o.frequency.linearRampToValueAtTime(Math.max(20, end), t + dur) // the slide
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur) // a fade, so no click
  o.connect(g).connect(bus[to]); o.start(t); o.stop(t + dur)
}
function noise({ dur = 0.1, gain = 0.2, delay = 0, to = 'sfx' }) {
  const t = ac.currentTime + delay, n = Math.ceil(ac.sampleRate * dur)
  const buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
  const s = ac.createBufferSource(), g = ac.createGain()
  s.buffer = buf
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  s.connect(g).connect(bus[to]); s.start(t)
}
const sfx = { jump: () => tone({ freq: 300, end: 700, dur: 0.12 }) } // one entry per recipe row
```

- **Gesture unlock:** nothing plays before the first key press, click or touch, and a pad's first press isn't a gesture in every browser. So never assume sound is running, and don't count on title-screen music before the first input.
- **Pause:** ramp the master gain to 0 (or `ac.suspend()`) on pause and when the page is hidden.
- **Files:** `.ogg` or `.mp3`, loaded with `fetch` → `arrayBuffer()` → `ac.decodeAudioData` and played through a buffer source with its own playback rate and gain. A bundled track is a looping buffer source on the music bus; keep it and `stop()` it.
- **Sequencer:** schedule a bar ahead with delayed tones, on a timer that stops while paused.
