import { describe, expect, it, vi } from 'vitest'
import { createMotion } from './motion.js'

/** A party with one phone, a fake clock and a phone clock 123.456 s ahead. */
function setup() {
  let tv = 1000
  vi.spyOn(performance, 'now').mockImplementation(() => tv * 1000)
  const handlers = []
  const sent = []
  const party = {
    players: [{ id: 'p1', kind: 'phone', connected: true }],
    inputs: { p1: { tb: 35, tg: 0, st: 'on', still: true } },
    public: {},
    view: () => ({}),
    pressed: () => false,
    send: (id, d) => sent.push(d),
    on: (e, f) => handlers.push(f)
  }
  const motion = createMotion(party)
  const msg = (data) => handlers.forEach((h) => h({ from: 'p1', data }))
  const flying = []
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      tv += 1 / 60
      motion.update(1 / 60)
      // 40 ms to the phone, which answers with its clock, and 40 ms back
      for (const d of sent.splice(0)) if (d.ping) flying.push({ at: tv + 0.08, data: { pong: d.ping, pt: (tv + 0.04 + 123.456) * 1000 } })
      for (const f of flying.filter((f) => f.at <= tv)) (flying.splice(flying.indexOf(f), 1), msg(f.data))
    }
  }
  return { party, motion, msg, step, clock: () => tv }
}

describe('createMotion', () => {
  it('syncs the phone clock and puts swings on the TV clock', () => {
    const { motion, msg, step, clock } = setup()
    step(120)
    const m = motion.of('p1')
    expect(m.clockOff).toBeCloseTo(123.456, 2)
    const at = clock() - 0.1
    msg({ swing: { dir: 'left', p: 0.5, m: 20, pt: (at + 123.456) * 1000 } })
    step()
    expect(m.swings).toHaveLength(1)
    expect(m.swings[0].t).toBeCloseTo(at, 2)
    expect(m.swings[0].dir).toBe('left')
  })

  it('centres on the first reading, then tilts against it', () => {
    const { party, motion, step } = setup()
    step(10)
    expect(motion.of('p1').tilt.x).toBeCloseTo(0, 3)
    party.inputs.p1 = { tb: 35, tg: 12.5, st: 'on', still: true }
    step(120)
    expect(motion.of('p1').tilt.x).toBeGreaterThan(0.3) // right side down: tilt right
  })

  it('reads a steering wheel from gravity, right turn positive', () => {
    const { party, motion, step } = setup()
    party.inputs.p1 = { tb: 90, tg: 0, st: 'on', still: true } // upright, screen facing you
    step(10)
    expect(motion.of('p1').wheel).toBeCloseTo(0, 3)
    // turned clockwise by 35°: gravity's "up" moves toward the phone's -x
    const phi = (35 * Math.PI) / 180
    const b = Math.asin(Math.cos(phi)) / (Math.PI / 180)
    const g = Math.atan2(Math.sin(phi), Math.cos(phi) * 0) / (Math.PI / 180)
    party.inputs.p1 = { tb: b, tg: g > 90 ? 90 : g, st: 'on', still: true }
    step(120)
    expect(motion.of('p1').wheel).toBeGreaterThan(0.3)
  })

  it('waits for a still phone to re-center', () => {
    const { party, motion, step } = setup()
    step(5)
    party.inputs.p1 = { tb: 50, tg: 0, st: 'on', still: false }
    motion.center('p1')
    step(30)
    expect(motion.of('p1').centering).toBeGreaterThan(0)
    party.inputs.p1 = { tb: 50, tg: 0, st: 'on', still: true }
    step(2)
    expect(motion.of('p1').centering).toBe(0)
  })
})
