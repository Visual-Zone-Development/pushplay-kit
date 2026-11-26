// The direct link between a phone and a party game: two real Chromium pages through the local
// relay, the game's party.js and the relay's join page. Input takes the WebRTC data channel when
// both sides can open one, still arrives through the relay when they can't, and falls back to the
// relay mid-game without losing a held button.
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { brand } from './config.mjs'
import { startLocalRelay } from './local-relay.mjs'

const dir = join(import.meta.dirname, '../dist/direct-link-test')
mkdirSync(dir, { recursive: true })
const fill = (from) => readFileSync(join(import.meta.dirname, 'templates', from), 'utf8').replaceAll('{{SLUG}}', brand.slug)
writeFileSync(join(dir, 'net.js'), fill('online/net.js'))
for (const f of ['party.js', 'controller.js', 'controller-layouts.js']) writeFileSync(join(dir, f), fill(`party/${f}`))
// The smallest party game: a party on the classic layout, updated every frame.
writeFileSync(
  join(dir, 'index.html'),
  `<!doctype html><script type="module">
    import { createParty } from './party.js'
    const party = createParty({ minPlayers: 1, controls: 'classic', direct: !location.search.includes('direct=0') })
    party.open()
    const tick = () => (party.update(), requestAnimationFrame(tick))
    tick()
  </script>`
)

let relay
let server
let browser
let url
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
  url = `http://127.0.0.1:${server.address().port}/`
  // Real addresses in ICE candidates (Chromium hides them behind mDNS names, which a test box can't resolve).
  browser = await chromium.launch({ executablePath: process.env.KIT_BROWSER || undefined, args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] })
}, 60_000)
afterAll(async () => {
  await browser?.close()
  server?.close()
  await relay?.close()
})

/** A TV with its party open, and one phone joined through the join page. */
async function tvAndPhone({ phoneDirect = true, tvDirect = true } = {}) {
  const tv = await (await browser.newContext()).newPage()
  await tv.goto(url + (tvDirect ? '' : '?direct=0'))
  await expect.poll(() => tv.evaluate(() => window.__kitParty?.code), { timeout: 10_000 }).toBeTruthy()
  const code = await tv.evaluate(() => window.__kitParty.code)
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true })
  const phone = await context.newPage()
  if (!phoneDirect) await phone.addInitScript(() => delete window.RTCPeerConnection)
  await phone.goto(`${relay.joinBase}/j/${code}`)
  await phone.fill('#name', 'Ana')
  await phone.click('#go')
  const frame = () => phone.frames().find((f) => f.url().endsWith('/frame.html'))
  await expect.poll(async () => frame()?.evaluate(() => document.querySelector('#pp')?.dataset.layout), { timeout: 10_000 }).toBe('classic')
  const id = await tv.evaluate(() => window.__kitParty.players[0].id)
  return {
    tv,
    phone,
    /** What the game reads from this phone. */
    pad: (expr) => tv.evaluate(([pid, e]) => new Function('pad', `return ${e}`)(window.__kitParty.pad(pid)), [id, expr]),
    link: () => tv.evaluate(() => window.__kitParty.players[0].link),
    input: (value) => frame().evaluate((v) => window.controller.input(v), value),
    close: () => Promise.all([tv.context().close(), context.close()])
  }
}

describe('the direct link', () => {
  it('carries input straight from the phone when both sides can open one', async () => {
    const t = await tvAndPhone()
    await expect.poll(t.link, { timeout: 10_000 }).toBe('direct')
    expect(await t.phone.evaluate(() => window.partyLink.state)).toBe('direct')
    // Drop the relay's copy of input on the phone: what reaches the game came direct.
    await t.phone.evaluate(() => {
      const send = WebSocket.prototype.send
      WebSocket.prototype.send = function (m) {
        if (typeof m === 'string' && m.includes('"k":"i"')) return
        return send.call(this, m)
      }
    })
    await t.input({ n: 't', x: 1, y: 0, h: ['a'], c: { a: 1 } })
    await expect.poll(() => t.pad('pad.x'), { timeout: 5000 }).toBe(1)
    // Held buttons update on the game's next frame (party.update()).
    await expect.poll(() => t.pad("pad.held('a')"), { timeout: 2000 }).toBe(true)
    await t.close()
  }, 60_000)

  it('still gets input through the relay when the phone has no WebRTC', async () => {
    const t = await tvAndPhone({ phoneDirect: false })
    await t.input({ n: 't', x: -1, y: 0 })
    await expect.poll(() => t.pad('pad.x'), { timeout: 5000 }).toBe(-1)
    expect(await t.link()).toBe('relay')
    await t.close()
  }, 60_000)

  it('stays on the relay when the game turns the direct link off', async () => {
    const t = await tvAndPhone({ tvDirect: false })
    await t.input({ n: 't', x: 0.5, y: 0 })
    await expect.poll(() => t.pad('pad.x'), { timeout: 5000 }).toBe(0.5)
    expect(await t.link()).toBe('relay')
    expect(await t.phone.evaluate(() => window.partyLink.state)).toBe('relay')
    await t.close()
  }, 60_000)

  it('falls back to the relay when the direct link drops mid-game, keeping a held button held', async () => {
    const t = await tvAndPhone()
    await expect.poll(t.link, { timeout: 10_000 }).toBe('direct')
    await t.input({ n: 't', x: 0, y: 0, h: ['a'], c: { a: 1 } })
    await expect.poll(() => t.pad("pad.held('a')"), { timeout: 5000 }).toBe(true)
    await t.phone.evaluate(() => window.partyLink.drop())
    await expect.poll(t.link, { timeout: 10_000 }).toBe('relay')
    expect(await t.pad("pad.held('a')")).toBe(true)
    await t.input({ n: 't', x: 0, y: 0, c: { a: 1 } })
    await expect.poll(() => t.pad("pad.held('a')"), { timeout: 5000 }).toBe(false)
    await t.close()
  }, 60_000)
})
