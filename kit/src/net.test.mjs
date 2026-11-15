// The change-only sync in the online template's net.js: diff → patch → apply round trips.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyPatch, createNet, diff, lerp, sample, snapshot } from './templates/online/net.js'

const roundTrip = (a, b) => applyPatch(structuredClone(a), JSON.parse(JSON.stringify(diff(a, b))))

describe('net.js sync', () => {
  it('sends nothing when nothing changed', () => {
    const s = { ships: { p1: { x: 10.004, y: 5 } }, score: [1, 2] }
    expect(diff(snapshot(s), snapshot(structuredClone(s)))).toEqual([])
    // Jitter below the rounding isn't a change either.
    expect(diff(snapshot(s), snapshot({ ...s, ships: { p1: { x: 10.001, y: 5 } } }))).toEqual([])
  })

  it('sends only the fields that changed', () => {
    const a = { ships: { p1: { x: 1, y: 2 }, p2: { x: 3, y: 4 } }, round: 1 }
    const b = { ships: { p1: { x: 1, y: 2 }, p2: { x: 3.5, y: 4 } }, round: 1 }
    expect(diff(a, b)).toEqual([[['ships', 'p2', 'x'], 3.5]])
  })

  it('round-trips additions, removals, arrays and type changes', () => {
    const cases = [
      [{}, { a: 1, b: { c: [1, 2, 3] } }],
      [{ a: 1, b: { c: [1, 2, 3] } }, { b: { c: [1, 9] } }],
      [{ list: [1, 2] }, { list: [1, 2, { x: 1 }] }],
      [{ v: [1] }, { v: { k: 1 } }],
      [{ v: { k: 1 } }, { v: null }],
      [{ s: 'a', t: true }, { s: 'b', t: false }]
    ]
    for (const [a, b] of cases) expect(roundTrip(a, b)).toEqual(b)
  })

  it('smooths numbers between updates and takes everything else from the newest', () => {
    expect(lerp({ x: 0.5, name: 'a' }, { x: 10.5, name: 'b', hp: 3 }, 0.5)).toEqual({ x: 5.5, name: 'b', hp: 3 })
    expect(lerp({ list: [0.5, 0] }, { list: [10.5, 20.5, 30] }, 0.5)).toEqual({ list: [5.5, 10.25, 30] })
  })

  it("doesn't blend whole numbers like countdowns and scores", () => {
    expect(lerp({ count: 2, score: 4, x: 10.5 }, { count: 1, score: 5, x: 20.5 }, 0.37)).toEqual({ count: 1, score: 5, x: 14.2 })
  })

  it('makes state JSON-safe', () => {
    expect(snapshot({ a: undefined, f: () => 1, n: NaN, x: 1.23456 })).toEqual({ n: 0, x: 1.23 })
  })

  it('draws steady motion from updates that arrive unevenly', () => {
    // A puck moving at 300 px/s; the host's updates land on screen frames, 33 or 50 ms apart.
    const snaps = []
    for (let t = 0, i = 0; t < 1000; t += i++ % 2 ? 50 : 33.3) snaps.push({ t, s: { x: 0.3 * t } })
    const steps = []
    let last = null
    for (let t = 200; t < 900; t += 1000 / 60) {
      const x = sample(snaps, t).x
      if (last !== null) steps.push(x - last)
      last = x
    }
    for (const step of steps) expect(step).toBeCloseTo(5, 6) // 300 px/s at 60 fps, every frame
  })

  it('holds the newest state when no newer update exists', () => {
    const snaps = [{ t: 0, s: { x: 0 } }, { t: 33, s: { x: 10 } }]
    expect(sample(snaps, 500)).toEqual({ x: 10 })
    expect(sample(snaps, -5)).toEqual({ x: 0 })
    expect(sample([], 5)).toEqual({})
  })
})

// A phone suspends its socket mid-match: net.js reconnects and takes the same slot back.
describe('net.js reconnect', () => {
  /** A fake relay socket: records what the game sends and lets the test answer. */
  class FakeSocket {
    static all = []
    constructor(url) {
      this.url = url
      this.readyState = 0
      this.sent = []
      FakeSocket.all.push(this)
      setTimeout(() => {
        this.readyState = 1
        this.onopen?.()
      }, 0)
    }
    send(text) {
      this.sent.push(JSON.parse(text))
    }
    close(code = 1000) {
      this.readyState = 3
      this.onclose?.({ code })
    }
    /** The relay speaks. */
    say(msg) {
      this.onmessage?.({ data: JSON.stringify(msg) })
    }
    /** The network dropped (no clean close code). */
    drop() {
      this.readyState = 3
      this.onclose?.({ code: 1006 })
    }
  }
  FakeSocket.OPEN = 1
  const tick = async (ms = 0) => {
    await vi.advanceTimersByTimeAsync(ms)
    await vi.advanceTimersByTimeAsync(0)
  }

  beforeEach(() => {
    FakeSocket.all = []
    vi.useFakeTimers()
    vi.stubGlobal('WebSocket', FakeSocket)
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ url: 'ws://relay.test/' }) }))
    vi.stubGlobal('document', { baseURI: 'http://localhost/', hidden: false, addEventListener: () => {} })
    vi.stubGlobal('location', { hostname: 'localhost' })
    vi.stubGlobal('window', {})
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('keeps the room and state through a drop, rejoins with its token, and reports status', async () => {
    const net = createNet({ maxPlayers: 2 })
    const events = []
    for (const t of ['joined', 'reconnected', 'disconnect', 'away', 'back']) net.on(t, (x) => events.push([t, x]))
    expect(net.connection).toBe('offline')
    void net.host()
    await tick(1)
    const s1 = FakeSocket.all[0]
    expect(net.connection).toBe('connected')
    s1.say({ t: 'hello', you: 'p1' })
    s1.say({ t: 'joined', room: 'ABCD', you: 'p1', host: 'p2', players: ['p2', 'p1'], max: 2, resume: 'tok-1', started: false, away: [] })
    s1.say({ t: 'start' })
    expect(net.status).toBe('playing')
    s1.say({ t: 'msg', from: 'p2', d: { k: 'f', s: { ships: { p1: { x: 1 } } }, t: 100 } })
    expect(net.state).toEqual({ ships: { p1: { x: 1 } } })

    // The socket drops mid-match.
    s1.drop()
    expect(net.status).toBe('reconnecting')
    expect(net.connection).toBe('reconnecting')
    expect(net.room).toBe('ABCD') // still in the match, as far as the game knows
    expect(net.state).toEqual({ ships: { p1: { x: 1 } } })
    expect(events.map(([t]) => t)).toEqual(['joined'])

    // First retry after 500 ms: a new socket, and a rejoin with the token.
    await tick(499)
    expect(FakeSocket.all).toHaveLength(1)
    await tick(2)
    expect(FakeSocket.all).toHaveLength(2)
    const s2 = FakeSocket.all[1]
    await tick(1)
    expect(s2.sent.at(-1)).toEqual({ t: 'rejoin', room: 'ABCD', resume: 'tok-1' })

    // That attempt fails too: backoff doubles.
    s2.drop()
    expect(net.status).toBe('reconnecting')
    await tick(999)
    expect(FakeSocket.all).toHaveLength(2)
    await tick(2)
    const s3 = FakeSocket.all[2]
    await tick(1)
    s3.say({ t: 'hello', you: 'p9' })
    s3.say({ t: 'joined', room: 'ABCD', you: 'p1', host: 'p2', players: ['p2', 'p1'], max: 2, resume: 'tok-1', started: true, away: ['p2'] })
    expect(net.status).toBe('playing')
    expect(net.connection).toBe('connected')
    expect(net.me).toBe('p1')
    expect(net.away).toEqual(['p2'])
    expect(net.state).toEqual({ ships: { p1: { x: 1 } } }) // kept
    expect(events.map(([t]) => t)).toEqual(['joined', 'reconnected'])
    s3.say({ t: 'peer-back', id: 'p2' })
    expect(net.away).toEqual([])
    expect(events.at(-1)).toEqual(['back', 'p2'])

    // The relay let the slot go: the match is over for this copy.
    s3.drop()
    await tick(501)
    const s4 = FakeSocket.all[3]
    await tick(1)
    s4.say({ t: 'hello', you: 'p10' })
    s4.say({ t: 'error', code: 'not-found' })
    expect(net.status).toBe('error')
    expect(net.error).toMatch(/ended while you were away/)
    expect(net.room).toBeNull()
    expect(events.at(-1)[0]).toBe('disconnect')
  })

  it('treats a drop in the lobby, or a close with a reason, as a disconnect', async () => {
    const net = createNet()
    void net.host()
    await tick(1)
    const s1 = FakeSocket.all[0]
    s1.say({ t: 'joined', room: 'ABCD', you: 'p1', host: 'p1', players: ['p1'], max: 2, resume: 't', started: false, away: [] })
    s1.drop()
    expect(net.status).toBe('error')
    expect(net.connection).toBe('offline')

    const again = createNet()
    void again.host()
    await tick(1)
    const s2 = FakeSocket.all[1]
    s2.say({ t: 'joined', room: 'EFGH', you: 'p1', host: 'p1', players: ['p1'], max: 2, resume: 't', started: false, away: [] })
    s2.say({ t: 'start' })
    s2.close(4008) // online play is resting: no point retrying
    expect(again.status).toBe('error')
    expect(again.error).toMatch(/resting/)
  })
})
