// The shared layouts on real phone screens, inside the real join page: at common phone sizes,
// sideways and upright, the pause button covers no control, nothing is cut off, and a layout held
// sideways gives its controls all the height the join page leaves.
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { brand, CONTROLLER_LAYOUTS } from './config.mjs'
import { startLocalRelay } from './local-relay.mjs'

const dir = join(import.meta.dirname, '../dist/controller-fit-test')
mkdirSync(dir, { recursive: true })
const fill = (from) => readFileSync(join(import.meta.dirname, 'templates', from), 'utf8').replaceAll('{{SLUG}}', brand.slug)
writeFileSync(join(dir, 'net.js'), fill('online/net.js'))
for (const f of ['party.js', 'controller.js', 'controller-layouts.js']) writeFileSync(join(dir, f), fill(`party/${f}`))
writeFileSync(
  join(dir, 'index.html'),
  `<!doctype html><script type="module">
    import { createParty } from './party.js'
    const party = createParty({ minPlayers: 1, controls: 'classic', direct: false })
    party.open()
    const tick = () => (party.update(), requestAnimationFrame(tick))
    tick()
  </script>`
)

// Phones held sideways (the gamepad layouts) and upright (the one-thumb and answer layouts).
const SIDEWAYS = [
  { width: 667, height: 375 },
  { width: 740, height: 360 },
  { width: 844, height: 390 },
  { width: 915, height: 412 }
]
const UPRIGHT = [
  { width: 360, height: 740 },
  { width: 390, height: 844 }
]
const PORTRAIT_LAYOUTS = ['tap', 'swipe', 'choices', 'motion']
const CONTROLS = '.pp-btn, .pp-trig, .pp-cross, .pp-full, .pp-surface, .pp-track, .pp-choice, .pp-mpad, .pp-center'

let relay
let server
let browser
let tv
beforeAll(async () => {
  relay = await startLocalRelay()
  server = createServer((req, res) => {
    const path = new URL(req.url, 'http://x').pathname
    if (path === '/__net.json') return res.end(JSON.stringify({ url: relay.url }))
    const file = join(dir, path === '/' ? 'index.html' : path)
    if (!existsSync(file)) return res.writeHead(404).end()
    res.writeHead(200, { 'content-type': extname(file) === '.js' ? 'text/javascript' : 'text/html' }).end(readFileSync(file))
  }).listen(0)
  await new Promise((r) => server.on('listening', r))
  browser = await chromium.launch({ executablePath: process.env.KIT_BROWSER || undefined })
  tv = await browser.newPage()
  await tv.goto(`http://127.0.0.1:${server.address().port}/`)
  await tv.waitForFunction(() => window.__kitParty?.code, null, { timeout: 10_000 })
}, 60_000)
afterAll(async () => {
  await browser?.close()
  server?.close()
  await relay?.close()
})

/** A phone of this size joined through the join page; returns its controller frame. */
async function phone(viewport) {
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  await page.goto(`${relay.joinBase}/j/${await tv.evaluate(() => window.__kitParty.code)}`)
  await page.fill('#name', 'Fit')
  await page.click('#go')
  const frame = () => page.frames().find((f) => f.url().endsWith('/frame.html'))
  await expect.poll(async () => frame()?.evaluate(() => Boolean(document.querySelector('#pp'))), { timeout: 10_000 }).toBe(true)
  return { context, frame }
}

/** Everything wrong with the layout on screen now: overlaps with the pause button, clipping. */
function problems(controls) {
  const box = (e) => e.getBoundingClientRect()
  const pause = document.querySelector('.pp-pause')
  const p = pause && !pause.hidden ? box(pause) : null
  const W = innerWidth
  const H = innerHeight
  const out = []
  if (p && p.height < 40) out.push(`pause button only ${Math.round(p.height)}px tall`)
  for (const e of document.querySelectorAll(controls)) {
    if (e === pause || e.closest('[hidden]') || e.offsetParent === null) continue
    const r = box(e)
    const name = `${e.className}${e.dataset.b ? `[${e.dataset.b}]` : ''}`
    if (p && r.left < p.right && r.right > p.left && r.top < p.bottom && r.bottom > p.top) out.push(`pause covers ${name}`)
    if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) out.push(`${name} cut off (${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)} in ${W}×${H})`)
  }
  return out
}

describe('the shared layouts on phone screens', () => {
  for (const [sizes, layouts] of [
    [SIDEWAYS, CONTROLLER_LAYOUTS.filter((l) => !PORTRAIT_LAYOUTS.includes(l))],
    [UPRIGHT, PORTRAIT_LAYOUTS]
  ]) {
    for (const viewport of sizes) {
      it(`fits ${layouts.join(', ')} on a ${viewport.width}×${viewport.height} phone, the pause button clear of every control`, async () => {
        const { context, frame } = await phone(viewport)
        const found = []
        for (const layout of layouts) {
          await tv.evaluate((l) => window.__kitParty.controls(l === 'choices' ? { layout: l, prompt: 'Who did it?', choices: ['Alice', 'Bob', 'Carol', 'Dan'] } : l), layout)
          await expect.poll(() => frame().evaluate(() => document.querySelector('#pp').dataset.layout), { timeout: 5000 }).toBe(layout === 'pad' ? 'classic' : layout)
          await frame().evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
          for (const p of await frame().evaluate(problems, CONTROLS)) found.push(`${layout}: ${p}`)
          if (!PORTRAIT_LAYOUTS.includes(layout)) {
            // No bar: the stage is the whole frame, and the frame is most of the screen.
            const { stage, frameH } = await frame().evaluate(() => ({ stage: document.querySelector('.pp-stage').getBoundingClientRect().height, frameH: innerHeight }))
            if (stage < frameH - 1) found.push(`${layout}: the controls get ${Math.round(stage)} of ${frameH}px`)
            if (frameH < viewport.height - 44) found.push(`${layout}: the join page leaves ${frameH} of ${viewport.height}px`)
          }
        }
        await context.close()
        expect(found).toEqual([])
      }, 60_000)
    }
  }
})
