// Which local relay `dev` starts: none for a plain game, localhost for an online game, and one on the
// Wi-Fi for party games and games that take phones (phone-pads.js), so a real phone can join.
import { describe, expect, it } from 'vitest'
import { devRelay } from './local-relay.mjs'

describe('the relay dev starts', () => {
  it('starts none for a game that never touches the network', () => {
    expect(devRelay({ id: 'plain' })).toBeNull()
  })

  it('starts one on localhost for an online game', () => {
    const relay = devRelay({ id: 'duel', online: true })
    expect(relay.lan).toBe(false)
    expect(relay.message('http://192.168.1.5:5174')).toContain('ws://localhost:5174')
  })

  it('starts one on the Wi-Fi for a party game, and says where phones join', () => {
    const relay = devRelay({ id: 'quiz', party: true })
    expect(relay.lan).toBe(true)
    expect(relay.message('http://192.168.1.5:5174')).toMatch(/party relay.*http:\/\/192\.168\.1\.5:5174.*lobby/)
  })

  it('starts one on the Wi-Fi for a game that takes phones as controllers', () => {
    const relay = devRelay({ id: 'shooter' }, { phonePads: true })
    expect(relay.lan).toBe(true)
    expect(relay.message('http://192.168.1.5:5174')).toMatch(/phone relay.*http:\/\/192\.168\.1\.5:5174.*Connect a phone/)
  })

  it('treats an online game with phones as one phones can reach', () => {
    expect(devRelay({ id: 'both', online: true }, { phonePads: true }).lan).toBe(true)
  })
})
