// @vitest-environment jsdom
// party.js on the TV: party.controls() and party.pad(id), which reads a phone on a shared layout
// and a controller plugged into the TV the same way, and the page phones get. The relay is a
// stand-in socket that the test talks through.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { brand } from '../../config.mjs'

const dir = join(import.meta.dirname, '../../../dist/party-pad-test')
mkdirSync(dir, { recursive: true })
const fill = (from) => readFileSync(join(import.meta.dirname, from), 'utf8').replaceAll('{{SLUG}}', brand.slug)
writeFileSync(join(dir, 'net.js'), fill('../online/net.js'))
writeFileSync(join(dir, 'party.js'), fill('party.js'))
const { createParty } = await import(/* @vite-ignore */ join(dir, 'party.js'))

const files = {
  'controller.js': '/* controller runtime */',
  'controller-layouts.js': '/* shared layouts */',
  'controller.html': '<html><head></head><body>custom page</body></html>'
}
globalThis.fetch = async (url) => {
  const name = String(url).split('/').pop()
  if (name === '__net.json') return new Response(JSON.stringify({ url: 'ws://relay.test', token: 't' }))
  return name in files ? new Response(files[name]) : new Response('', { status: 404 })
}
let socket
globalThis.WebSocket = class {
  static OPEN = 1
  constructor(url) {
    this.url = url
    this.readyState = 1
    this.sent = []
    socket = this
    queueMicrotask(() => this.onopen?.())
  }
  send(m) {
    this.sent.push(JSON.parse(m))
  }
  close() {}
  /** A message from the relay. */
  deliver(msg) {
    this.onmessage({ data: JSON.stringify(msg) })
  }
}
const tick = () => new Promise((r) => setTimeout(r, 0))
/** Let the page fetches and the hello finish. */
const settle = async () => {
  for (let i = 0; i < 10; i++) await tick()
}

/** A party with one phone (p1) joined. */
async function partyWithPhone(opts = {}) {
  const party = createParty({ minPlayers: 1, ...opts })
  party.open()
  await tick()
  await tick()
  socket.deliver({ t: 'party', room: 'ABCD', join: 'https://join.test/j/ABCD', resume: 'r', players: [] })
  socket.deliver({ t: 'peer-join', id: 'p1', name: 'Sam', color: '#4dd8a8' })
  const phone = (i) => socket.deliver({ t: 'msg', from: 'p1', d: { k: 'i', i } })
  const say = (d) => socket.deliver({ t: 'msg', from: 'p1', d })
  return { party, phone, say }
}

let now = 1000
const frame = (party) => party.update((now += 16))

beforeEach(() => {
  sessionStorage.clear()
})

describe('party.controls', () => {
  it('puts the layout everyone sees in party.public, and one player’s in their view', () => {
    const party = createParty({ controls: 'classic' })
    expect(party.public.controls).toEqual({ layout: 'classic' })
    party.controls({ layout: 'twin', labels: { rt: 'Fire' } })
    expect(party.public.controls).toEqual({ layout: 'twin', labels: { rt: 'Fire' } })
    party.controls('choices', 'p1')
    expect(party.view('p1').controls).toEqual({ layout: 'choices' })
    party.controls(null, 'p1')
    expect(party.view('p1').controls).toBeUndefined()
  })
})

describe('party.pad: a phone on a shared layout', () => {
  it('reads the sticks, held buttons and presses, a press lasting one frame', async () => {
    const { party, phone } = await partyWithPhone({ controls: 'twin' })
    phone({ n: 'a1', x: 0.5, y: -1, ax: 1, ay: 0, h: ['rt'], c: { rt: 1 } })
    frame(party)
    const pad = party.pad('p1')
    expect(pad).toMatchObject({ kind: 'phone', x: 0.5, y: -1, aimX: 1, aimY: 0, connected: true })
    expect(pad.held('rt')).toBe(true)
    expect(pad.pressed('rt')).toBe(true)
    expect(party.pressed('p1', 'rt')).toBe(true)
    frame(party)
    expect(pad.pressed('rt')).toBe(false)
    expect(pad.held('rt')).toBe(true)
    phone({ n: 'a1', x: 0, y: 0, c: { rt: 1 } })
    frame(party)
    expect(pad.released('rt')).toBe(true)
    expect(pad.held('rt')).toBe(false)
  })

  it('counts a press the network squeezed between two messages (down and up already over)', async () => {
    const { party, phone } = await partyWithPhone({ controls: 'classic' })
    phone({ n: 'a1', x: 0, y: 0, c: { a: 1 } })
    frame(party)
    expect(party.pad('p1').pressed('a')).toBe(true)
    expect(party.pad('p1').held('a')).toBe(false)
  })

  it('does not count the same press twice when the held button and its count arrive together', async () => {
    const { party, phone } = await partyWithPhone({ controls: 'classic' })
    phone({ n: 'a1', h: ['a'], c: { a: 1 } })
    frame(party)
    phone({ n: 'a1', h: ['a'], c: { a: 1 } })
    frame(party)
    expect(party.pad('p1').pressed('a')).toBe(false)
  })

  it('starts counting again after the phone reloads its page, so the first press after it counts', async () => {
    const { party, phone } = await partyWithPhone({ controls: 'classic' })
    phone({ n: 'a1', c: { a: 5 } })
    frame(party)
    frame(party)
    phone({ n: 'b2', c: { a: 1 } })
    frame(party)
    expect(party.pad('p1').pressed('a')).toBe(true)
  })

  it('turns a swipe into one frame of a direction press', async () => {
    const { party, phone } = await partyWithPhone({ controls: 'swipe' })
    phone({ n: 'a1', c: { left: 1 } })
    frame(party)
    expect(party.pad('p1').pressed('left')).toBe(true)
    frame(party)
    expect(party.pad('p1').pressed('left')).toBe(false)
  })

  it('moves the trackpad pointer by the change in the totals, and gives the slider’s value', async () => {
    const { party, phone } = await partyWithPhone({ controls: 'trackpad' })
    phone({ n: 'a1', p: { x: 0, y: 0, d: true } })
    frame(party)
    const pad = party.pad('p1')
    expect(pad.pointer).toMatchObject({ x: 0.5, y: 0.5, down: true })
    phone({ n: 'a1', p: { x: 0.1, y: 0, d: true } })
    phone({ n: 'a1', p: { x: 0.25, y: 0, d: true } })
    frame(party)
    expect(pad.pointer.dx).toBeCloseTo(0.25)
    expect(pad.pointer.x).toBeCloseTo(0.75)
    frame(party)
    expect(pad.pointer.dx).toBe(0)
    phone({ n: 'a1', x: 0.5, v: 0.75 })
    frame(party)
    expect(pad.value).toBe(0.75)
  })

  it('takes the first copy of numbered input and drops a late one, from either way it came', async () => {
    const { party, say } = await partyWithPhone({ controls: 'classic' })
    say({ k: 'i', i: { n: 'a1', x: 1, y: 0 }, q: 5 })
    say({ k: 'i', i: { n: 'a1', x: 0.5, y: 0 }, q: 3 }) // older, arriving late
    say({ k: 'i', i: { n: 'a1', x: 1, y: 0 }, q: 5 }) // the same one again (the other way)
    frame(party)
    expect(party.pad('p1').x).toBe(1)
    say({ k: 'i', i: { n: 'a1', x: -1, y: 0 }, q: 6 })
    frame(party)
    expect(party.pad('p1').x).toBe(-1)
    // A reloaded phone says hello and numbers from the start again.
    say({ k: 'hi', h: 'x' })
    say({ k: 'i', i: { n: 'b2', x: 0.25, y: 0 }, q: 1 })
    frame(party)
    expect(party.pad('p1').x).toBe(0.25)
  })

  it('keeps party.inputs in its old shape for games that read it', async () => {
    const { party, phone } = await partyWithPhone({ controls: 'classic' })
    phone({ n: 'a1', x: 1, y: 0, h: ['a', 'x'], c: { a: 1, x: 1 } })
    expect(party.inputs.p1).toMatchObject({ x: 1, y: 0, a: true })
    expect(party.inputs.p1.n).toBeUndefined()
  })

  it('lets go of a dropped phone’s buttons', async () => {
    const { party, phone } = await partyWithPhone({ controls: 'classic' })
    phone({ n: 'a1', h: ['a'], c: { a: 1 } })
    frame(party)
    socket.deliver({ t: 'peer-away', id: 'p1' })
    frame(party)
    expect(party.pad('p1').held('a')).toBe(false)
    expect(party.pad('p1').connected).toBe(false)
  })
})

describe('party.pad: the same for a custom page and a controller on the TV', () => {
  it('reads a custom controller.html that sends { x, y, a, b }', async () => {
    const { party, phone } = await partyWithPhone()
    phone({ x: -1, y: 0, a: true, b: false })
    frame(party)
    expect(party.pad('p1')).toMatchObject({ x: -1, y: 0 })
    expect(party.pad('p1').held('a')).toBe(true)
    expect(party.pad('p1').pressed('a')).toBe(true)
  })

  it('reads a local controller through input.pads', () => {
    const held = new Set(['b'])
    const input = { pads: [{ connected: true, x: 0.2, y: 0, aimX: 0, aimY: 1, held: (b) => held.has(b), pressed: (b) => b === 'b', released: () => false }] }
    const party = createParty({ input, controls: 'classic' })
    party.addLocal(0)
    frame(party)
    const pad = party.pad('local0')
    expect(pad).toMatchObject({ kind: 'local', x: 0.2, aimY: 1, connected: true })
    expect(pad.pressed('b')).toBe(true)
    expect(party.inputs.local0).toMatchObject({ x: 0.2, b: true, lb: false })
  })

  it('gives an empty pad for nobody', () => {
    const party = createParty()
    expect(party.pad('ghost')).toMatchObject({ kind: 'none', x: 0, connected: false })
    expect(party.pad('ghost').held('a')).toBe(false)
  })
})

describe('the page phones get', () => {
  it('is the shared layouts when the game gives controls, and the game’s controller.html otherwise', async () => {
    const party = createParty({ controls: 'classic' })
    party.open()
    await tick()
    await tick()
    socket.deliver({ t: 'party', room: 'ABCD', join: '', resume: 'r', players: [] })
    socket.deliver({ t: 'peer-join', id: 'p1', name: 'Sam' })
    socket.deliver({ t: 'msg', from: 'p1', d: { k: 'hi', h: null } })
    await settle()
    party.update((now += 16))
    party.update((now += 1000))
    const shared = socket.sent.filter((m) => m.d?.k === 'cb').map((m) => m.d.s).join('')
    expect(shared).toContain('/* shared layouts */')
    expect(shared).toContain('/* controller runtime */')
    expect(shared).not.toContain('custom page')

    const custom = createParty()
    custom.open()
    await tick()
    await tick()
    socket.deliver({ t: 'party', room: 'EFGH', join: '', resume: 'r', players: [] })
    socket.deliver({ t: 'peer-join', id: 'p2', name: 'Ann' })
    socket.deliver({ t: 'msg', from: 'p2', d: { k: 'hi', h: null } })
    await settle()
    custom.update((now += 16))
    custom.update((now += 1000))
    const page = socket.sent.filter((m) => m.d?.k === 'cb').map((m) => m.d.s).join('')
    expect(page).toContain('custom page')
    expect(page).not.toContain('/* shared layouts */')
  })
})
