// A phone that's the launcher's remote following the player into games and back, through the
// local relay and the real join page (relay-public/shell.js). The launcher's room is played by a
// small scripted host here; the games are real party.js pages. Checks the whole cycle, game after
// game: into a game with no second code, the game hears it, ⌂ still reaches the launcher, back
// home when the game ends, into the next game, and that nobody else can steer the phone.
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { chromium } from 'playwright'
import WebSocket from 'ws'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { brand } from './config.mjs'
import { startLocalRelay } from './local-relay.mjs'

const dir = join(import.meta.dirname, '../dist/phone-handoff-test')
mkdirSync(dir, { recursive: true })
const fill = (from) => readFileSync(join(import.meta.dirname, 'templates', from), 'utf8').replaceAll('{{SLUG}}', brand.slug)
writeFileSync(join(dir, 'net.js'), fill('online/net.js'))
for (const f of ['party.js', 'controller.js', 'controller-layouts.js']) writeFileSync(join(dir, f), fill(`party/${f}`))
// A party game: opens its room at once, updates every frame.
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

/** The remote page the scripted launcher sends: says ready, and has one button. */
const REMOTE_PAGE = `<!doctype html><body><button id="b" onclick="parent.postMessage({type:'send',d:{k:'m',d:{a:'b'}}},'*')">B</button>
<script>parent.postMessage({type:'ready'},'*')</script></body>`

let relay
let server
let browser
let base
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
  base = `http://127.0.0.1:${server.address().port}/`
  browser = await chromium.launch({ executablePath: process.env.KIT_BROWSER || undefined })
}, 60_000)
afterAll(async () => {
  await browser?.close()
  server?.close()
  await relay?.close()
})

const until = async (fn, what, ms = 10_000) => {
  const end = Date.now() + ms
  while (Date.now() < end) {
    const v = await Promise.resolve().then(fn).catch(() => null)
    if (v) return v
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`timed out: ${what}`)
}

/** A scripted host (the launcher's remote room): records what phones send, can send them anything. */
async function scriptedHost(page = REMOTE_PAGE) {
  const ws = new WebSocket(`${relay.url}?game=local`)
  const host = { code: null, heard: [], his: [], phones: [], ws }
  ws.on('message', (data) => {
    const m = JSON.parse(String(data))
    if (m.t === 'party') host.code = m.room
    if (m.t === 'peer-join') host.phones.push(m.id)
    if (m.t !== 'msg') return
    if (m.d?.k === 'hi') {
      host.his.push({ from: m.from, ...m.d })
      ws.send(JSON.stringify({ t: 'send', to: m.from, d: { k: 'cb', h: 'remote', i: 0, n: 1, s: page } }))
      host.onHi?.(m.from)
    } else host.heard.push(m.d)
  })
  await new Promise((r) => ws.on('open', r))
  ws.send(JSON.stringify({ t: 'party-host', max: 4 }))
  await until(() => host.code, 'the scripted room')
  host.tell = (to, d) => ws.send(JSON.stringify({ t: 'send', to, d }))
  host.close = () => ws.close()
  return host
}

/** A party game in its own page (a TV), with its room open. */
async function partyGame() {
  const tv = await (await browser.newContext()).newPage()
  await tv.goto(base)
  await tv.waitForFunction(() => window.__kitParty?.code)
  const code = await tv.evaluate(() => window.__kitParty.code)
  return { tv, code, players: () => tv.evaluate(() => window.__kitParty.players.map((p) => p.name)) }
}

async function phoneAt(code, name = 'Ana') {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage()
  await page.goto(`${relay.joinBase}/j/${code}`)
  await page.fill('#name', name)
  await page.click('#go')
  return page
}
const rooms = (phone) => phone.evaluate(() => window.partyLink.rooms)
/** The controller frame on screen: the remote's (a #b button) or a game's (#pp, the shared layouts). */
const visibleFrame = (phone) => {
  const frames = phone.frames().filter((f) => f.url().endsWith('/frame.html'))
  return Promise.all(frames.map(async (f) => ((await f.frameElement().then((e) => e.isVisible())) ? f : null))).then((v) => v.find(Boolean))
}

describe('a launcher remote phone, game after game', () => {
  it('goes into a game without a second code, keeps the launcher in reach, and comes back when it ends', async () => {
    const launcher = await scriptedHost()
    const phone = await phoneAt(launcher.code)
    await until(() => launcher.phones[0], 'the phone in the launcher room')
    const ana = launcher.phones[0]

    // Game 1 opens its room; the launcher sends the phone in.
    const g1 = await partyGame()
    launcher.tell(ana, { k: 'go', room: g1.code, game: 'Brawl' })
    await until(async () => (await rooms(phone)).game === g1.code, 'the phone in game 1')
    await until(async () => (await g1.players()).includes('Ana'), 'game 1 sees Ana')
    expect((await rooms(phone)).home).toBe(launcher.code)
    expect(await phone.textContent('#room')).toBe('Brawl')
    expect(await phone.isVisible('#home-button')).toBe(true)
    // The game's controller is what's on screen, and its presses reach the game.
    const pad = await until(async () => {
      const f = await visibleFrame(phone)
      return (await f?.evaluate(() => Boolean(document.querySelector('#pp')))) ? f : null
    }, 'the game controller on screen')
    await pad.locator('.pp-btn[data-b="a"]').dispatchEvent('pointerdown')
    await until(() => g1.tv.evaluate(() => window.__kitParty.pad(window.__kitParty.players[0].id).held('a')), 'A in game 1')
    // ⌂ still reaches the launcher.
    await phone.click('#home-button')
    await until(() => launcher.heard.some((d) => d?.k === 'm' && d.d?.a === 'home'), 'Home at the launcher')
    // The launcher's pause menu opens: the remote goes on top, still in the game; then back.
    launcher.tell(ana, { k: 'peek', on: true })
    await until(async () => (await visibleFrame(phone))?.evaluate(() => Boolean(document.getElementById('b'))), 'the remote over the game')
    expect(await phone.textContent('#room')).toBe('Paused')
    expect((await rooms(phone)).game).toBe(g1.code)
    launcher.tell(ana, { k: 'peek', on: false })
    await until(async () => (await visibleFrame(phone))?.evaluate(() => Boolean(document.querySelector('#pp'))), 'the game controller again')

    // Game 1 ends (its room closes): the phone is home by itself, the remote on screen and heard.
    await g1.tv.evaluate(() => window.__kitParty.close())
    await until(async () => (await rooms(phone)).game === null, 'back home after game 1')
    expect(await phone.isVisible('#home-button')).toBe(false)
    const remote = await until(async () => {
      const f = await visibleFrame(phone)
      return (await f?.evaluate(() => Boolean(document.getElementById('b')))) ? f : null
    }, 'the remote on screen again')
    await remote.click('#b')
    await until(() => launcher.heard.some((d) => d?.k === 'm' && d.d?.a === 'b'), 'the remote heard again')

    // Game 2: same phone, same page; a stale "home" for game 1 changes nothing; "home" for 2 brings it back.
    const g2 = await partyGame()
    launcher.tell(ana, { k: 'go', room: g2.code, game: 'Kart' })
    await until(async () => (await rooms(phone)).game === g2.code, 'the phone in game 2')
    launcher.tell(ana, { k: 'home', room: g1.code })
    await phone.waitForTimeout(400)
    expect((await rooms(phone)).game).toBe(g2.code)

    // Restart: a new room for the same game moves the phone across.
    const g3 = await partyGame()
    launcher.tell(ana, { k: 'go', room: g3.code, game: 'Kart' })
    await until(async () => (await rooms(phone)).game === g3.code, 'the phone in the restarted game')
    await until(async () => !(await g2.players()).includes('Ana'), 'game 2 lets go of Ana')

    // Quit from the TV: the launcher says home.
    launcher.tell(ana, { k: 'home', room: g3.code })
    await until(async () => (await rooms(phone)).game === null, 'back home after game 3')

    // The phone reloads mid-game: home comes back, and the launcher sending it in again gets its old seat.
    const g4 = await partyGame()
    launcher.onHi = (id) => launcher.tell(id, { k: 'go', room: g4.code, game: 'Quiz' })
    launcher.tell(ana, { k: 'go', room: g4.code, game: 'Quiz' })
    await until(async () => (await rooms(phone)).game === g4.code, 'the phone in game 4')
    await until(async () => (await g4.players()).includes('Ana'), 'game 4 sees Ana')
    const seat = await g4.tv.evaluate(() => window.__kitParty.players[0].id)
    await phone.reload()
    await until(async () => (await rooms(phone).catch(() => ({}))).game === g4.code, 'back in game 4 after a reload')
    await g4.tv.waitForTimeout(400)
    expect(await g4.tv.evaluate(() => window.__kitParty.players.map((p) => p.id))).toEqual([seat])

    for (const g of [g1, g2, g3, g4]) await g.tv.context().close()
    await phone.context().close()
    launcher.close()
  }, 120_000)

  it('lets only the room it joined from move it, and only to a room code', async () => {
    const launcher = await scriptedHost()
    const phone = await phoneAt(launcher.code)
    await until(() => launcher.phones[0], 'the phone in the launcher room')
    const ana = launcher.phones[0]
    // Not a room code: ignored.
    for (const room of ['abcd', 'AB', 'ABCDE', 'wss://evil.example/j/ABCD', 42]) launcher.tell(ana, { k: 'go', room })
    await phone.waitForTimeout(400)
    expect((await rooms(phone)).game).toBe(null)

    // A game room (here a scripted one) can't send the phone anywhere else.
    const sneaky = await scriptedHost()
    const elsewhere = await scriptedHost()
    launcher.tell(ana, { k: 'go', room: sneaky.code, game: 'Sneaky' })
    await until(async () => (await rooms(phone)).game === sneaky.code, 'the phone in the sneaky game')
    await until(() => sneaky.phones[0], 'the sneaky game sees it')
    sneaky.tell(sneaky.phones[0], { k: 'go', room: elsewhere.code })
    sneaky.tell(sneaky.phones[0], { k: 'home' })
    sneaky.tell(sneaky.phones[0], { k: 'peek', on: true })
    await phone.waitForTimeout(500)
    expect(await rooms(phone)).toEqual({ home: launcher.code, game: sneaky.code })
    expect(elsewhere.phones).toEqual([])
    expect(await phone.textContent('#room')).toBe('Sneaky')

    // "Remote" on the phone leaves the game by choice.
    await phone.click('#back-button')
    await until(async () => (await rooms(phone)).game === null, 'back to the remote by choice')
    for (const h of [launcher, sneaky, elsewhere]) h.close()
    await phone.context().close()
  }, 60_000)

  it('treats a phone that joined a party directly as before: no home to go back to', async () => {
    const g = await partyGame()
    const phone = await phoneAt(g.code, 'Ben')
    await until(async () => (await g.players()).includes('Ben'), 'the party sees Ben')
    expect(await rooms(phone)).toEqual({ home: g.code, game: null })
    expect(await phone.isVisible('#home-button')).toBe(false)
    await g.tv.evaluate(() => window.__kitParty.close())
    await until(() => phone.textContent('#notice-text').then((t) => /ended/.test(t)), 'told the game ended')
    await g.tv.context().close()
    await phone.context().close()
  }, 60_000)

  it('joins straight in when the PushPlay app opens it with the room’s key, and keeps the key out of the address', async () => {
    const launcher = await scriptedHost()
    const key = 'k'.repeat(40) + 'abc'
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage()
    await page.goto(`${relay.joinBase}/j/${launcher.code}#k=${key}&n=Tom`)
    await until(() => launcher.his.length, 'the phone says hi')
    expect(launcher.his[0]).toMatchObject({ key })
    expect(await page.isVisible('#join')).toBe(false)
    expect(new URL(page.url()).hash).toBe('')
    expect(await page.textContent('#who')).toBe('Tom')
    // A reload still has it (same tab), and rejoins the same seat.
    await page.reload()
    await until(() => launcher.his.length >= 2, 'hi again after a reload')
    expect(launcher.his[1]).toMatchObject({ key, from: launcher.his[0].from })
    // A key that isn't one is ignored: the form, as from a QR code.
    const other = await (await browser.newContext()).newPage()
    await other.goto(`${relay.joinBase}/j/${launcher.code}#k=short&n=Eve`)
    expect(await other.isVisible('#join')).toBe(true)
    await page.context().close()
    await other.context().close()
    launcher.close()
  }, 60_000)
})

