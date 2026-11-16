// @vitest-environment jsdom
// The party lobby with a fake party, a fake input and a canvas context that draws nothing: what a
// host on a touch screen (a tablet with no controller) can do from it.
// The templates carry the product name as {{SLUG}}, so they're filled in into a temp folder first.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { brand } from '../../config.mjs'

// Inside the package (dist/ is gitignored) so vitest can import the filled copies.
const dir = join(import.meta.dirname, '../../../dist/party-lobby-test')
mkdirSync(dir, { recursive: true })
const fill = (text) => text.replaceAll('{{SLUG}}', brand.slug).replaceAll('{{BRAND}}', brand.name)
for (const [group, name] of [['party', 'party-lobby.js'], ['party', 'qr.js'], ['shared', 'prompts.js'], ['shared', 'input.js']]) {
  writeFileSync(join(dir, name), fill(readFileSync(join(import.meta.dirname, '..', group, name), 'utf8')))
}
const { createPartyLobby } = await import(/* @vite-ignore */ join(dir, 'party-lobby.js'))

/** A canvas context that accepts every call and measures text at 12 px a character. */
function stubContext() {
  const ctx = {
    measureText: (text) => ({ width: String(text).length * 12 }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} })
  }
  return new Proxy(ctx, { get: (target, key) => (key in target ? target[key] : () => {}) })
}

function fakeParty({ players = [] } = {}) {
  return {
    status: 'open',
    error: '',
    code: 'ABCD',
    joinUrl: 'https://play.example/j/ABCD',
    minPlayers: 1,
    maxPlayers: 8,
    localPlayers: true,
    locked: false,
    players,
    public: {},
    open: vi.fn(),
    close: vi.fn(),
    kick: vi.fn(),
    addLocal: vi.fn(),
    on() {},
    player(id) {
      return this.players.find((p) => p.id === id) ?? null
    }
  }
}

/** A host on a touch screen: no controllers, no keys, one finger. */
function fakeInput() {
  return {
    mode: 'touch',
    pads: [],
    pointer: { x: 0, y: 0, down: false, pressed: false, released: false, active: false, type: 'touch' },
    pressed: () => false,
    held: () => false,
    label: (b) => b
  }
}

/** A quick tap at the middle of a rect: down and up between two frames. */
function tap(input, r) {
  Object.assign(input.pointer, { x: r.x + r.w / 2, y: r.y + r.h / 2, active: true, pressed: true, released: true, down: false })
}
const phone = { id: 'p1', name: 'Ada', color: '#ffb547', kind: 'phone', connected: true }

function setup(party) {
  const input = fakeInput()
  const lobby = createPartyLobby(party, input, { title: 'Test Party' })
  const ctx = stubContext()
  lobby.open()
  lobby.draw(ctx, 1280, 800)
  return { input, lobby, ctx }
}

describe('party-lobby.js', () => {
  it('starts the party when the host taps Start with a player in', () => {
    const party = fakeParty({ players: [phone] })
    const { input, lobby } = setup(party)
    const { start } = lobby.buttons
    expect(start.disabled).toBe(false)
    expect(start.h).toBeGreaterThanOrEqual(56)
    tap(input, start)
    expect(lobby.update()).toBe('start')
    expect(party.close).not.toHaveBeenCalled()
  })

  it('ignores a Start tap with nobody in', () => {
    const party = fakeParty()
    const { input, lobby, ctx } = setup(party)
    const { start } = lobby.buttons
    expect(start.disabled).toBe(true)
    tap(input, start)
    expect(lobby.update()).toBe(null)
    // Still in the lobby, and still a dimmed Start on the next frame.
    input.pointer.pressed = input.pointer.released = false
    lobby.draw(ctx, 1280, 800)
    expect(lobby.update()).toBe(null)
    expect(lobby.buttons.start.disabled).toBe(true)
  })

  it('leaves the lobby when Back is tapped', () => {
    const party = fakeParty()
    const { input, lobby } = setup(party)
    const { back } = lobby.buttons
    expect(back.h).toBeGreaterThanOrEqual(56)
    tap(input, back)
    expect(lobby.update()).toBe('back')
    expect(party.close).toHaveBeenCalledOnce()
  })

  it('offers Back while the party opens, and Try again after an error', () => {
    const party = fakeParty()
    party.code = null
    party.status = 'connecting'
    const { input, lobby, ctx } = setup(party)
    expect(Object.keys(lobby.buttons)).toEqual(['back'])
    party.status = 'error'
    party.error = "Can't reach the game server."
    lobby.draw(ctx, 1280, 800)
    tap(input, lobby.buttons.retry)
    expect(lobby.update()).toBe(null)
    expect(party.open).toHaveBeenCalledTimes(2)
    tap(input, lobby.buttons.back)
    expect(lobby.update()).toBe('back')
  })

  it('draws prompts, not buttons, for a controller or keyboard, and a tap elsewhere does nothing', () => {
    const party = fakeParty({ players: [phone] })
    const input = fakeInput()
    input.mode = 'gamepad'
    const lobby = createPartyLobby(party, input, { title: 'Test Party' })
    lobby.draw(stubContext(), 1280, 800)
    expect(lobby.buttons).toEqual({})
    input.mode = 'touch'
    tap(input, { x: 600, y: 300, w: 0, h: 0 })
    expect(lobby.update()).toBe(null)
  })
})
