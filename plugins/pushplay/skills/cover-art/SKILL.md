---
name: cover-art
description: Make or improve how the game in this repo looks in the PushPlay library — the 720×500 cover with the title (art/cover.svg or cover.html), the 1920×450 hero banner (art/hero.svg) and the library screenshot the build captures about 3 seconds into play — plus extra screenshots and short clips to share. Use for "make the cover", "the cover looks bad / generic", "new banner", the check's note about placeholder art, the art step of new-game, "the library screenshot is boring / shows nothing / is just the title", "make screenshots", "record a GIF / clip", or before announcing a game.
---

# Cover art and the library screenshot

Follow the `pushplay-rules` skill and art-directions.md (in the `art-direction` skill's `references/`). `pushplay` is the command the `pushplay-rules` skill gives you. Read the game's `DESIGN.md` (*Art direction*: palette, font, hero object, cover and hero ideas). If the repo has `model-asset` or `canvas2d-assets` skills, use them to draw the hero object the same way as in game.

## 1. The rules (the check enforces some)
| | Cover `art/cover.svg` | Hero `art/hero.svg` |
|---|---|---|
| Size | exactly 720×500 (`width`, `height`, `viewBox`) | exactly 1920×450 |
| Shown at | ~216×150 in the library | full-width banner on the game's page |
| Text | **the title, big and bold** | **no text at all** |
| Keep clear | the **bottom 110 px** (badges) | the **bottom-left**: the launcher writes the title there in light text with no shade of its own, so keep it calm **and dark** |
| Focal point | the hero object, large, breaking out of the frame | in the **middle**: x 600–1320, top 250 px (see *Where the hero is cropped*); it may run on to the right |

**Where the hero is cropped.** The same 1920×450 image is shown three ways, so design for all of them:
- **Desktop launcher:** the whole banner (about 1280×300), the title written in light text over the bottom-left.
- **Phone library**, at the top of the list: a box about as wide as the phone and 240 px tall, filled from the middle, so only about **x 600–1320** shows; the top ~250 px are clear and the rest fades into the app's dark background under the title and the Play button.
- **Phone game page:** a 16:9 slice from the middle, **x 560–1360**, full height.

So put the key visual in the middle band (x 600–1320, top 250 px), let it continue to the right for desktop, keep the bottom-left dark and calm, and never rely on the left or right thirds alone. To check, render the hero and look at it cropped those three ways (a scratch HTML page with `object-fit: cover` boxes of those sizes is enough).

Also: a full background (no transparency), 2–4 main colours from the game's palette plus a text colour, fonts only from `Chakra Petch` (600, 700), `Rubik` (400, 700, 900), `Bungee`, `Lilita One`, `Press Start 2P`, no external images or links (`data:` images are fine). Pixel-art games can use `art/cover.html` drawing with the game's own sprite code (set `"cover": "art/cover.html"`). **Phone games use the same two sizes**: the cover and hero are landscape even for a portrait game (the library tile and banner don't turn); compose the portrait game's hero object large in the frame rather than shrinking a tall screenshot into it. The Plays on labels (Phone, Tablet…) are among the badges drawn over the bottom 110 px, so that rule matters even more.

**Best: draw both with the game's own art code.** If the game's drawing lives in one module (`art.js`, or the 3D model code), make `art/cover.html` and `art/hero.html` import it and compose a scene at their sizes, with the cover title as an HTML `<h1>` in a bundled font over a thick `-webkit-text-stroke` copy for the outline. The library art then always matches the game. Worked examples: [Arcade Sampler's `art/`](https://github.com/Visual-Zone-Development/arcade-sampler/tree/main/art) (cabinets drawn by each game's own `icon()`) and [Motion Lab's `art/`](https://github.com/Visual-Zone-Development/motion-lab/tree/main/art). Set `"art": { "cover": "art/cover.html", "hero": "art/hero.html" }`.

## 2. Compose for a thumbnail
1. **Pick one idea:** the hero object doing the core verb (a ship mid-dodge, a frog mid-jump), plus one hint of the challenge (an asteroid, a boss shadow). Not a collage.
2. **Silhouette test:** the main shape must be recognisable as a flat single-colour shape.
3. **Value contrast:** light hero on a dark background or the reverse; the title the highest-contrast thing on the cover.
4. **Title:** 70–130 px tall, one or two lines, a thick outline or drop shadow (an offset copy, not a filter blur) so it reads on any background; placed top or middle, never in the bottom 110 px.
5. **Depth with few layers:** background gradient or shapes → mid-ground hint of the world → hero → title. Diagonals and a slight tilt give energy.
6. **Hero banner:** a wide version of the same scene; key visual on the right third, calm, darker area bottom-left for the launcher's title.

## Optional: painted key art with the user's own key
With `OPENAI_API_KEY`, `GEMINI_API_KEY` or `REPLICATE_API_TOKEN` set, a painted backdrop or key-art scene can be generated (`pushplay art`, [generated-art.md](../pushplay-runtime/references/generated-art.md)) and embedded in `cover.html` / `hero.html` under the game-drawn hero and the title. Keep the title as real text, never generated. It costs the user money: run `--dry`, tell them the cost and only generate with `--approve <$>` once they've agreed to it.

## 3. Render, look, iterate
1. `pushplay check`; it renders `cover.png` and `hero.png` and prints their paths.
2. **Open both PNGs** and judge them:
   - Shrink test: does the cover still read at ~216×150? `pushplay art-shots` renders `cover-thumb.png` at that size. Is the title legible?
   - Does it look like *this* game, in its palette, and not a generic placeholder?
   - Anything important in the bottom 110 px of the cover or the bottom-left of the hero? Is the bottom-left dark enough for a light title?
   - Cropped to the middle (x 600–1320, top 250 px, as the phone library shows it), does the hero still show the game?
3. Fix and re-run until both look good: usually by enlarging the hero, simplifying the background and strengthening contrast.
4. Commit (`<Name>: cover and hero art`) and push. Bump `version` if the game was already released.

## 4. The library screenshot
The build opens the game at 1280×800, presses confirm (A) on the title up to three times while `state.screen` is still `title`, waits until about 3 s have passed and saves that frame as `screenshot.png`. It **replaces** `art.screenshots` in the shipped manifest with that one image, so listing your own files there has no effect: the way to a good library screenshot is a good first 3 seconds of play. A phone game is captured by the phone pass instead, touch only at phone size in its own orientation, on-screen controls included (a landscape phone game's 1280×720 frame gets bars in the 1280×800 shot); its title's first tap must start play.

Run `pushplay check` and open the `screenshot.png` it prints. It should show **real gameplay**: the hero, the world, a threat or goal, and a clean, readable HUD.

| Shows | Fix |
|---|---|
| The title screen | A on the title must start play (or open a menu whose first item, chosen by A, starts it) |
| An empty field, a black or loading screen | spawn the opening scene immediately; draw before assets finish loading |
| A wall of tutorial text | teach by doing (the `game-ui` skill): one short in-world prompt instead |
| A countdown "3, 2, 1" over a blank arena | show the arena and players behind the countdown, or shorten it |
| A character select screen | default to the last pick and start; put selection in a menu item |

Start with something happening: the first enemies or obstacles already on screen, the hero mid-motion, a pickup in view. That makes the first seconds better for players too. **Never detect the check** (no special case for headless browsers or `__kitCheck`): the screenshot must be what a player really sees.

**Extra shots and clips to share.** Write a scratch capture script (never in the game folder) from the repro script in [debugging.md](../pushplay-runtime/references/debugging.md): `?seed=` for a good run, `window.__game.jumpTo(...)` to reach the best moments (a boss, a big combo, a full level), `page.screenshot()` at 1280×800 and at DPR 2 for crisp images. For a phone game add a phone set (`viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true`) with the `touch.js` controls visible; store-style shots of phone games are usually portrait. For a clip, Playwright's `recordVideo` option on the browser context records a `.webm`; trim it with `ffmpeg` if available (`ffmpeg -ss 2 -t 6 -i in.webm -vf "fps=30,scale=640:-1" out.gif`). Save the results where the user can open them (the session's scratch directory, or a `media/` folder listed in the game's `.pushplayignore` so it isn't shipped), keep files small, and show the user the best 3–5 with the moment each shows.
