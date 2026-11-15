---
name: playtest
description: Playtest the game in this repo without a human, in any engine — drive it with scripted or bot inputs, capture the screen over time, measure how long runs last, where players die and how the score grows, and turn that into a balance and fun report with concrete TUNING changes. Use for "is it balanced?", "playtest it", "is it too hard", "check the difficulty curve", "does it get boring", or before shipping a new game. It reports and proposes; it changes the game only when the user approves.
---

# Playtest

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the APIs, how the game is run, the checks and how to finish a change. Read the game's `DESIGN.md` (fun targets, pacing, Definition of done) and its `TUNING`. This skill **measures and reports**; it doesn't change the game unless the user approves the proposals.

This is a craft skill: sections 1–5 hold in any engine. The ready-made harness for a browser game is in the last section.

## 1. Plan what to measure
Pick 3–6 questions from the design, for example:
- How long does a run last for a weak, an average and a good player?
- When does the first new thing appear, and then every how many seconds?
- Where do runs end (which enemy, hazard or level)?
- Is the first minute nearly impossible to lose?
- Does the score or progress grow at the rate the design expects?

## 2. What a bot needs from the game
Four things. If the game lacks one, add it first, the way the project's rules say.

| Need | What it is |
|---|---|
| **A way to run unattended** | without a window, and fast-forwarded if it can be (a time scale in `TUNING`, or stepping the simulation with no rendering). Otherwise real time with a timeout (3 min per run). |
| **Input injection** | the bot presses the actions a player does, through the game's input layer, never by writing to the player's position. |
| **Readable state** | a debug hook or a state line printed each second: current screen, score, health, level or wave, where the player, pickups and threats are, entity counts, frame time, and on game over the cause. |
| **A fixed random seed** | passed in at start, so a run can be repeated and two builds compared on the same runs. |

How to get them: in a browser, the harness below. In any other engine use its own headless or test mode and its input simulation, or have the game print the state line each second and read the log. If none of that exists, ask the user to play 3–5 runs and report the same signals (run length, where each run ended, score, when it got dull), with a screen capture at each death.

## 3. Bots, seeds and captures
- **Bots of 2–3 skill levels**, each reading the state about 10 times a second and choosing inputs: *idle* (presses nothing, finds the floor of difficulty), *random* (mashes and wanders), *greedy* (moves toward the nearest pickup and away from the nearest threat, with a reaction delay of 150–300 ms). Keep each bot to a few dozen lines.
- **Seeds:** run each bot on 5–10 seeds if the game is seeded; otherwise run more times.
- **Logging:** record the state line every second, and the cause on game over if the state exposes it.
- **Screen captures** at 5 s, 30 s, 60 s, 2 min, and at each death.
- **Each target the game ships on:** run the same bots at that target's screen size and input: a phone held in the hand (portrait or landscape, driving the on-screen touch controls in the thumb zones), a handheld, a desktop window, a TV across the room (pad). If only one input can be driven, still capture the picture at each size. On phone captures overlay two thumb zones (each about a quarter of the long side) when you read them.

Keep it under the session's limits: a handful of runs per bot is enough to see a trend.

## 4. Read the results
Look at every capture and the numbers:

| Signal | Means | Usual fix |
|---|---|---|
| idle bot survives a long time | no pressure, nothing forces the verb | earlier first threat, a timer |
| random bot does about as well as greedy | skill doesn't matter | reward precision: combos, risk/reward pickups |
| all bots die at the same spot | a spike | smooth that step in the curve |
| greedy bot never dies | too easy at the top end | steeper late ramp, a new threat type |
| nothing new on screen between two captures 60 s apart | boring stretch | add content there (level-design) |
| frame rate below 55 fps anywhere (target 60) | performance | cap entities or particles (performance-pass) |
| captures hard to read at a target's size and viewing distance | readability | game-ui |
| phone captures: the threat appears under a thumb zone, or text is too small to read at arm's length | phone layout | touch-controls, game-ui |

## 5. Report and propose
Write a short report (in chat, and a *Playtest* section with the date in DESIGN.md): the questions, a small table of results per bot, the captures that matter, and **3–5 proposals**, each as *problem → change (exact `TUNING` key and new value, or a content change) → expected effect*. Ask the user (with a question tool if you have one, letting them pick several) which to apply, the biggest fun problem first, marked "(Recommended)". Apply the chosen ones, re-run the same playtest on the same seeds to confirm the numbers moved the right way, then run the project's checks and finish the change the way its rules say.

Remind the user that bots measure balance, not fun: suggest 2–3 specific things to feel for in their own next session.

## In a web game
Drive the game in a headless browser with Playwright: keyboard input, the state read through the debug hook (a global the page can read, holding the game's state and its `TUNING`), screenshots at intervals. Save this as `playtest.mjs` in a scratch folder, never in the game folder, that has Playwright (if `import 'playwright'` fails there: `npm install playwright && npx playwright install chromium`), start the project's dev server, and run `node playtest.mjs <url> <bot> <seed>`:

```js
import { chromium } from 'playwright'

const [url = 'http://localhost:5173', botName = 'idle', seed = '1'] = process.argv.slice(2)
const HOOK = 'debugHook'                  // the global the game exposes: { state, TUNING }
const RUN_MS = 180_000, TICK_MS = 100     // 3 min per run, 10 decisions a second
const shots = [5, 30, 60, 120]            // seconds

// A bot gets the state and returns the keys to hold this tick.
const bots = {
  idle: () => [],
  random: () => ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].filter(() => Math.random() < 0.3),
  greedy: (s) => [],                      // toward the nearest pickup, away from the nearest threat
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })   // set to the game's logical resolution
page.on('pageerror', (e) => console.error('page error:', e.message))
await page.goto(`${url}?seed=${seed}`)
await page.waitForFunction((h) => window[h]?.state, HOOK)
await page.keyboard.press('Enter')        // whatever starts a run from the title

// Copy out only what you measure and what the bots need (plain data, no functions).
const read = () => page.evaluate((h) => {
  const s = window[h].state
  return { screen: s.screen, score: s.score, health: s.health, wave: s.wave }
}, HOOK)

const log = [], held = new Set(), t0 = Date.now()
while (Date.now() - t0 < RUN_MS) {
  const t = (Date.now() - t0) / 1000
  const s = await read()
  if (!log.length || t - log.at(-1).t >= 1) log.push({ t, ...s })
  if (shots.length && t >= shots[0]) await page.screenshot({ path: `${botName}-${seed}-${shots.shift()}s.png` })
  if (s.screen === 'gameover') { await page.screenshot({ path: `${botName}-${seed}-death.png` }); break }
  const want = new Set(bots[botName](s))
  for (const k of held) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k) }
  for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k) }
  await page.waitForTimeout(TICK_MS)
}
console.log(JSON.stringify({ bot: botName, seed, end: log.at(-1), log }))
await browser.close()
```

Then fill it in to match section 3:
- **Seeds** as `?seed=n`; **fps** from `requestAnimationFrame` timing, added to what the hook exposes.
- **Other targets:** change the viewport per target. For a phone: `viewport: { width: 390, height: 844 }` or `844×390`, `deviceScaleFactor: 3, hasTouch: true, isMobile: true`, driving the touch controls with `page.touchscreen.tap()` and pointer sequences (thumb zones about 320 px wide at that size; text under 32 px there is too small).
