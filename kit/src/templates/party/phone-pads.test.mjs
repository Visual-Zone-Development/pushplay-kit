// @vitest-environment jsdom
// phone-pads.js: phones as controllers in any game. A phone that joins becomes a pad in input.pads,
// and the game's ordinary input (input.x, input.held, input.pressed) reads it. The relay is a
// stand-in socket; input.js and party.js are the real ones.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { brand } from '../../config.mjs'

const dir = join(import.meta.dirname, '../../../dist/phone-pads-test')
mkdirSync(dir, { recursive: true })
const fill = (from) => readFileSync(join(import.meta.dirname, from), 'utf8').replaceAll('{{SLUG}}', brand.slug)
writeFileSync(join(dir, 'net.js'), fill('../online/net.js'))
writeFileSync(join(dir, 'input.js'), fill('../shared/input.js'))
for (const f of ['party.js', 'qr.js', 'phone-pads.js']) writeFileSync(join(dir, f), fill(f))
const { input } = await import(/* @vite-ignore */ join(dir, 'input.js'))
const { connectPhones } = await import(/* @vite-ignore */ join(dir, 'phone-pads.js'))

globalThis.fetch = async (url) => {
  const name = String(url).split('/').pop()
  if (name === '__net.json') return new Response(JSON.stringify({ url: 'ws://relay.test', token: 't' }))
  return new Response('/* page */')
}
const sockets = []
globalThis.WebSocket = class {
  static OPEN = 1
  constructor(url) {
    this.url = url
    this.readyState = 1
    this.sent = []
    sockets.push(this)
    queueMicrotask(() => this.onopen?.())
  }
  send(m) {
    this.sent.push(JSON.parse(m))
  }
  close() {}
  deliver(msg) {
    this.onmessage({ data: JSON.stringify(msg) })
  }
}
const settle = async () => {
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0))
}
/** A drawing context that draws nothing (jsdom has no canvas). */
const ctx = new Proxy({}, { get: (_t, k) => (k === 'measureText' ? (s) => ({ width: String(s).length * 10 }) : () => {}), set: () => true })

/** Phones connected to a game, the room open, and one phone (p1) in. */
async function gameWithPhone(opts) {
  const phones = connectPhones(input, opts)
  phones.drawCard(ctx, 0, 0)
  await settle()
  const relay = sockets.at(-1)
  relay.deliver({ t: 'party', room: 'WXYZ', join: 'https://join.test/j/WXYZ', resume: 'r', players: [] })
  relay.deliver({ t: 'peer-join', id: 'p1', name: 'Sam', color: '#4dd8a8' })
  const phone = (i) => relay.deliver({ t: 'msg', from: 'p1', d: { k: 'i', i } })
  return { phones, relay, phone, pad: () => phones.padOf('p1') }
}

describe('connectPhones', () => {
  it('opens no room until the card is shown', async () => {
    const before = sockets.length
    const phones = connectPhones(input)
    await settle()
    expect(sockets.length).toBe(before)
    expect(phones.status).toBe('idle')
    phones.drawCard(ctx, 0, 0)
    await settle()
    expect(sockets.length).toBe(before + 1)
    expect(phones.party.public.controls).toEqual({ layout: 'classic' })
  })

  it('makes a phone that joins a controller the game reads like any other', async () => {
    const { phones, phone, pad } = await gameWithPhone({ layout: 'pad', labels: { a: 'Jump' } })
    expect(phones.party.public.controls).toEqual({ layout: 'pad', labels: { a: 'Jump' } })
    expect(pad().virtual).toBe(true)
    expect(input.pads).toContain(pad())
    phone({ n: 'q', x: 1, y: 0, h: ['a'], c: { a: 1 } })
    input.update(1 / 60)
    expect(input.x).toBe(1)
    expect(input.held('a')).toBe(true)
    expect(input.pressed('a')).toBe(true)
    expect(input.mode).toBe('gamepad')
    expect(phones.count).toBe(1)
    input.update(1 / 60)
    expect(input.pressed('a')).toBe(false)
    expect(input.held('a')).toBe(true)
  })

  it('shows a tap the network squeezed between two messages as one frame of the button', async () => {
    const { phone } = await gameWithPhone()
    input.update(1 / 60)
    phone({ n: 'q', c: { menu: 1 } })
    input.update(1 / 60)
    expect(input.pressed('menu')).toBe(true)
    input.update(1 / 60)
    expect(input.held('menu')).toBe(false)
  })

  it('pauses the game when the phone in use drops, and lets go of its buttons', async () => {
    const { relay, phone, pad } = await gameWithPhone()
    phone({ n: 'q', x: 0.5, h: ['a'], c: { a: 1 } })
    input.update(1 / 60)
    let paused = 0
    const off = input.onPause(() => paused++)
    relay.deliver({ t: 'peer-away', id: 'p1' })
    input.update(1 / 60)
    off()
    expect(paused).toBeGreaterThan(0)
    expect(pad().connected).toBe(false)
    expect(pad().held('a')).toBe(false) // (other tests' phones share this input)
  })

  it('takes the pad away when the phone leaves for good', async () => {
    const { relay, pad } = await gameWithPhone()
    const gone = pad()
    relay.deliver({ t: 'peer-leave', id: 'p1' })
    input.update(1 / 60)
    expect(input.pads).not.toContain(gone)
  })
})
