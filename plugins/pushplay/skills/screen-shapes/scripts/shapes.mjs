#!/usr/bin/env node
// Opens a game at every screen shape PushPlay plays on and reports, per shape, whether the game
// fills the screen: the bars around its canvas, its drawing space (fit.w × fit.h when it uses
// fit.js) and a screenshot to look at. Part of the screen-shapes skill.
//
//   node shapes.mjs <url> [--out <dir>] [--only deck,tv,tablet] [--at <name>=<js>]... [--wait <ms>]
//
//   <url>        the game, e.g. http://localhost:5173/ from `pushplay dev`
//   --out        where screenshots go (default: ./screen-shapes in the working directory)
//   --only       a comma-separated subset of the shape names below
//   --at         a screen to capture as well as the first one: a name and JavaScript run in the
//                page to get there, e.g. --at "pause=window.__game.state.screen='paused'".
//                Repeat it for more screens. Each runs on a fresh page.
//   --wait       how long the game runs before each screenshot (default 1500 ms)
//
// Exit code 1 when any shape has bars, 0 when every shape is filled.

import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

/** CSS size and pixel ratio of each screen, landscape unless it says otherwise. */
export const SHAPES = {
  deck: { label: 'Steam Deck (16:10)', width: 1280, height: 800, dpr: 1 },
  'legion-go': { label: 'Legion Go, launcher zoom (16:10)', width: 1280, height: 800, dpr: 1.5 },
  tv: { label: 'TV or monitor, docked handheld (16:9)', width: 1920, height: 1080, dpr: 1 },
  '4k': { label: '4K TV (16:9, 2× pixels)', width: 1920, height: 1080, dpr: 2 },
  ultrawide: { label: 'Ultrawide monitor (21:9)', width: 2560, height: 1080, dpr: 1 },
  laptop: { label: 'Laptop (3:2)', width: 1440, height: 960, dpr: 2 },
  ipad: { label: 'iPad (4:3)', width: 1024, height: 768, dpr: 2, touch: true },
  'ipad-air': { label: 'iPad Air 11" (~1.44)', width: 1180, height: 820, dpr: 2, touch: true },
  phone: { label: 'Phone, landscape (19.5:9)', width: 844, height: 390, dpr: 3, touch: true },
  'phone-portrait': { label: 'Phone, portrait (9:19.5)', width: 390, height: 844, dpr: 3, touch: true }
}

function loadPlaywright() {
  const require = createRequire(import.meta.url)
  if (process.env.PW_MODULE) return require(path.resolve(process.env.PW_MODULE))
  try {
    return require('playwright')
  } catch {}
  try {
    return createRequire(path.join(process.cwd(), 'package.json'))('playwright')
  } catch {}
  try {
    return require(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'))
  } catch {}
  console.error('Playwright not found. Install it once with:\n  npm i -g playwright && npx playwright install chromium')
  process.exit(2)
}

/** What the page shows: the biggest canvas's box against the window, and fit.js's space if it has one. */
function measure() {
  const canvases = [...document.querySelectorAll('canvas')].map((c) => ({ c, r: c.getBoundingClientRect() })).filter(({ r }) => r.width > 0 && r.height > 0)
  if (!canvases.length) return null
  const { c, r } = canvases.sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0]
  const fit = c.__fit
  const vis = (a, b) => Math.max(0, Math.round(b - a))
  return {
    bars: { left: vis(0, r.left), right: vis(r.right, innerWidth), top: vis(0, r.top), bottom: vis(r.bottom, innerHeight) },
    canvas: { w: Math.round(r.width), h: Math.round(r.height) },
    space: fit ? { w: fit.w, h: fit.h, minW: fit.minW ?? fit.w, minH: fit.minH ?? fit.h, fill: Boolean(fit.fill) } : null
  }
}

function parseArgs(argv) {
  const out = { url: null, dir: path.join(process.cwd(), 'screen-shapes'), only: null, at: [], wait: 1500 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--out') out.dir = path.resolve(argv[++i])
    else if (a === '--only') out.only = argv[++i].split(',').map((s) => s.trim())
    else if (a === '--wait') out.wait = Number(argv[++i])
    else if (a === '--at') {
      const spec = argv[++i]
      const eq = spec.indexOf('=')
      if (eq < 1) throw new Error(`--at needs <name>=<js>, got ${spec}`)
      out.at.push({ name: spec.slice(0, eq), js: spec.slice(eq + 1) })
    } else if (!a.startsWith('--')) out.url = a
  }
  return out
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.url) {
    console.error('usage: node shapes.mjs <url> [--out <dir>] [--only deck,tv,tablet] [--at <name>=<js>]... [--wait <ms>]')
    process.exit(2)
  }
  const names = args.only ?? Object.keys(SHAPES)
  for (const n of names) if (!SHAPES[n]) throw new Error(`unknown shape ${n}; one of ${Object.keys(SHAPES).join(', ')}`)
  mkdirSync(args.dir, { recursive: true })
  const { chromium } = loadPlaywright()
  const browser = await chromium.launch()
  let barred = 0
  try {
    for (const name of names) {
      const s = SHAPES[name]
      for (const at of [{ name: 'first', js: null }, ...args.at]) {
        const context = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: s.dpr, hasTouch: Boolean(s.touch), isMobile: Boolean(s.touch) })
        const page = await context.newPage()
        const errors = []
        page.on('pageerror', (e) => errors.push(e.message))
        await page.goto(args.url)
        await page.waitForTimeout(400)
        if (at.js) await page.evaluate(at.js).catch((e) => errors.push(`--at ${at.name}: ${e.message}`))
        await page.waitForTimeout(args.wait)
        const m = await page.evaluate(measure)
        const file = path.join(args.dir, `${name}-${at.name}.png`)
        await page.screenshot({ path: file })
        await context.close()
        const bars = m ? Object.entries(m.bars).filter(([, px]) => px > 2) : []
        if (bars.length) barred++
        const space = m?.space ? `space ${m.space.w}×${m.space.h}${m.space.fill ? ` (fill, min ${m.space.minW}×${m.space.minH})` : ' (fixed)'}` : 'no fit.js space'
        const verdict = !m ? '✗ no canvas' : bars.length ? `✗ bars ${bars.map(([side, px]) => `${side} ${px}px`).join(', ')}` : '✓ fills'
        console.log(`${verdict.padEnd(34)} ${`${name}/${at.name}`.padEnd(26)} ${s.label}, ${s.width}×${s.height} @${s.dpr}x · ${space} · ${file}`)
        for (const e of errors) console.log(`    page error: ${e}`)
      }
    }
  } finally {
    await browser.close()
  }
  console.log(barred ? `\n${barred} capture(s) with bars. Look at every screenshot too: filling the screen is half of it; nothing may be cut off or stranded.` : '\nEvery shape is filled. Now look at every screenshot: nothing cut off, the HUD on the real edges, menus centred.')
  process.exit(barred ? 1 : 0)
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => {
  console.error(e.message)
  process.exit(2)
})
