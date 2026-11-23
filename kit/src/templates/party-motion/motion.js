// Phone motion on the TV, for party games made with --controller motion. The phone screen
// (controller.html) reads the sensors and detects swings; this turns what it sends into what a
// game needs, one tracker per phone. Yours to change (it isn't a runtime file).
//
//   const motion = createMotion(party, { tiltRange: 25 })   // options: see DEFAULTS
//   each frame, after party.update():  motion.update(dt)
//   const m = motion.of(id)    // null until that phone sends motion
//     m.live              sensors on (or its touch pad), and connected
//     m.tilt.x / .y       -1..1, calibrated, smoothed (tilt like a tray)
//     m.wheel             -1..1 or null: the phone held up like a steering wheel and turned
//     m.swings            this frame's swings: [{ dir: 'left'|'right'|'up'|'down'|null, power 0..1, m, t }]
//                         dir is in the room (up = toward the ceiling); t is on the TV's clock (s)
//     m.button / m.pressed    the phone's big button (party.inputs[id].a)
//     m.still, m.state ('on' | 'touch' | 'ask' | 'waiting'), m.rtt, m.clockOff, m.hz
//   motion.center(id)      re-center: waits (up to centerWait) for the phone to be held still
//   motion.configure(cfg, id?)   swing detection for every phone, or one: { thr, cd, at, gk, … }
//   motion.now()           the TV clock swing times use (seconds)
//
// Safety first: before the first motion of a party, ask every phone for the safety card (give
// yourself room, hold on tight, smooth beats wild) and hold the round on the TV until each has
// tapped I'm ready (controller.js shows the card and sends { safe: true }):
//   on the round's start:   if (motion.safety.hold(ids)) show the safety screen  // phones that haven't read it
//   each frame while held:  if (motion.safety.update(dt, { skip })) start         // skip: A / Start now here
//   draw while held:        drawSafety(ctx, { w: W, h: H, players, safety: motion.safety })
// Each phone reads it once per party (motion.safety.reset() when a new party opens). This machine
// can skip it after safetyMin seconds, so a phone that has dropped out can't block the game.
//
// Why it works this way (the build guide's section on party games):
//   - Tilt and the wheel come from gravity, so they're absolute: no drift, lag can't make them wander.
//   - Swings are detected on the phone from every sensor event and timed there; the TV keeps the
//     fastest of the last few pings to know the phone's clock, so swing times are right to a few ms.
//   - Calibrate during a countdown (center() then play), not from a pose saved somewhere else.

const DEG = Math.PI / 180
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180
const DIRS = ['left', 'right', 'up', 'down']

export const DEFAULTS = {
  safetyMin: 2.5, // s the safety screen stays up before this machine can skip it
  safety: {
    title: 'Before you move',
    tips: [
      { title: 'Give yourself room', text: 'Keep clear of people, pets, the TV and lamps: a full swing reaches further than you think.' },
      { title: 'Hold on tight', text: 'Keep a firm grip on your phone the whole time. A grippy case or a wrist strap helps.' },
      { title: 'Smooth beats wild', text: 'A controlled motion reads just as well as a wild one. Never let go of the phone.' }
    ]
  },
  tiltRange: 25, // degrees from the centre for full tilt
  wheelRange: 70, // degrees of wheel turn for full lock
  filterMin: 1.6, // Hz: One Euro smoothing for slow movement (lower = steadier, laggier)
  filterBeta: 0.6, // how quickly fast movement cuts through it
  wheelFilter: 2.2,
  pingEvery: 1, // s between clock checks (four quick ones when a phone arrives)
  clockSamples: 8, // the fastest round trip of these sets the clock difference
  centerWait: 1.5 // s to wait for a still phone before re-centering anyway
}

/** "Up" in the phone's axes from its beta/gamma (degrees). */
function upOf(b, g) {
  return [-Math.sin(g * DEG) * Math.cos(b * DEG), Math.sin(b * DEG), Math.cos(g * DEG) * Math.cos(b * DEG)]
}
/** Side and forward tilt (degrees) from "up": independent at any holding angle. */
const tiltOf = ([ux, uy, uz]) => ({ x: Math.asin(clamp(-ux, -1, 1)) / DEG, y: Math.atan2(uy, uz) / DEG })
/** The wheel angle: gravity across the phone's face (null while it lies too flat to tell). */
const wheelOf = ([ux, uy]) => (Math.hypot(ux, uy) > 0.35 ? Math.atan2(ux, uy) / DEG : null)

/** One Euro filter: steady when slow, quick when fast. */
function oneEuro(minCutoff, beta) {
  let x = null
  let dx = 0
  const alpha = (cutoff, dt) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt))
  return {
    reset: () => (x = null),
    step(v, dt) {
      if (x === null || !dt) return (x = v)
      dx += alpha(1, dt) * ((v - x) / dt - dx)
      x += alpha(minCutoff + beta * Math.abs(dx), dt) * (v - x)
      return x
    }
  }
}

export function createMotion(party, options = {}) {
  const T = { ...DEFAULTS, ...options }
  const now = () => performance.now() / 1000
  const trackers = new Map()
  let pingId = 0

  function tracker(id) {
    let m = trackers.get(id)
    if (m) return m
    m = {
      id,
      live: false,
      state: 'waiting',
      tilt: { x: 0, y: 0 },
      wheel: null,
      swings: [],
      button: false,
      pressed: false,
      still: true,
      rtt: 0,
      clockOff: null,
      jitter: 0,
      hz: 0,
      raw: null,
      neutral: null,
      centering: 0,
      // internal
      _pending: [],
      _clock: [],
      _pings: new Map(),
      _pingAt: -1e9,
      _fast: 4,
      _f: { x: oneEuro(T.filterMin, T.filterBeta), y: oneEuro(T.filterMin, T.filterBeta), w: oneEuro(T.wheelFilter, T.filterBeta) }
    }
    trackers.set(id, m)
    return m
  }

  function centerNow(m) {
    m.centering = 0
    m.neutral = { u: m.raw.u, wheel: wheelOf(upOf(m.raw.b, m.raw.g)) }
    party.send(m.id, { buzz: 25 })
  }

  // The safety gate: which phones have read the card, and which a held round waits for.
  const read = new Set()
  let held = null // { ids: Set, t }
  const ask = (id, on) => {
    if (on) party.view(id).safety = { title: T.safety.title, tips: T.safety.tips }
    else delete party.view(id).safety
  }
  const safety = {
    /** These phones are about to move: ask those that haven't read the card. True if any must. */
    hold(ids = []) {
      const need = ids.filter((id) => !read.has(id))
      held = need.length ? { ids: new Set(need), t: 0 } : null
      for (const id of need) ask(id, true)
      return Boolean(held)
    },
    get held() {
      return Boolean(held)
    },
    /** The phones the held round still waits for. */
    get waiting() {
      return held ? [...held.ids] : []
    },
    get t() {
      return held?.t ?? 0
    },
    get canSkip() {
      return Boolean(held) && held.t > T.safetyMin
    },
    hasRead: (id) => read.has(id),
    /** One frame while held. skip: A / Start now pressed here. True when the round may start. */
    update(dt, { skip = false } = {}) {
      if (!held) return true
      held.t += dt
      for (const id of held.ids) if (read.has(id) || party.player?.(id)?.connected === false) held.ids.delete(id)
      if (held.ids.size && !(skip && held.t > T.safetyMin)) return false
      held = null
      return true
    },
    /** A new party: everyone reads it again. */
    reset() {
      read.clear()
      held = null
    }
  }

  party.on('msg', ({ from, data }) => {
    if (data?.safe) {
      read.add(from)
      ask(from, false)
    }
    if (!data || typeof data !== 'object') return
    const m = tracker(from)
    if (m._pings.has(data.pong)) {
      const sent = m._pings.get(data.pong)
      m._pings.delete(data.pong)
      const back = now()
      m._clock.push({ rtt: back - sent, off: typeof data.pt === 'number' ? data.pt / 1000 - (sent + back) / 2 : null })
      if (m._clock.length > T.clockSamples) m._clock.shift()
      const best = m._clock.reduce((a, c) => (c.rtt < a.rtt ? c : a))
      m.rtt = best.rtt
      m.clockOff = best.off
      m.jitter = Math.max(...m._clock.map((c) => c.rtt)) - best.rtt
    }
    if (data.center) motion.center(from)
    const s = data.swing
    if (s) {
      // On the phone's clock when the clock check is in, else from the delay estimate.
      const t = typeof s.pt === 'number' && m.clockOff !== null ? Math.min(now(), s.pt / 1000 - m.clockOff) : now() - m.rtt / 2 - (Number(s.age) || 0) / 1000
      m._pending.push({ dir: DIRS.includes(s.dir) ? s.dir : null, power: clamp(Number(s.p) || 0, 0, 1), m: Number(s.m) || 0, t })
    }
  })

  const motion = {
    safety,
    now,
    of(id) {
      const m = trackers.get(id)
      return m && m.raw ? m : null
    },
    center(id) {
      const m = trackers.get(id)
      if (m?.raw) m.centering ||= now()
    },
    configure(cfg, id) {
      if (id) party.view(id).cfg = { ...cfg }
      else party.public.cfg = { ...cfg }
    },
    update(dt) {
      const t = now()
      for (const p of party.players) {
        if (p.kind !== 'phone') continue
        const m = tracker(p.id)
        const inp = party.inputs[p.id] ?? {}
        m.swings = m._pending.splice(0)
        m.state = inp.st ?? 'waiting'
        m.live = p.connected && (m.state === 'on' || m.state === 'touch')
        m.button = Boolean(inp.a)
        m.pressed = party.pressed(p.id, 'a')
        m.still = inp.still !== false
        m.hz = inp.ph?.hz ?? 0
        if (p.connected && t - m._pingAt > (m._fast > 0 ? 0.25 : T.pingEvery)) {
          m._pingAt = t
          m._fast--
          m._pings.set(++pingId, t)
          for (const k of m._pings.keys()) if (k < pingId - 8) m._pings.delete(k)
          party.send(p.id, { ping: pingId })
        }
        if (!m.live || typeof inp.tb !== 'number') {
          m.tilt.x = m.tilt.y = 0
          m.wheel = null
          for (const f of Object.values(m._f)) f.reset()
          continue
        }
        const u = Array.isArray(inp.u) && inp.u.length === 3 ? inp.u : upOf(inp.tb, inp.tg ?? 0)
        m.raw = { b: inp.tb, g: inp.tg ?? 0, a: inp.ta, u }
        if (!m.neutral) centerNow(m) // first reading: start level wherever it's held
        if (m.centering && (m.still || t - m.centering > T.centerWait)) centerNow(m)
        const now0 = tiltOf(u)
        const zero = tiltOf(m.neutral.u)
        m.tilt.x = m._f.x.step(clamp((now0.x - zero.x) / T.tiltRange, -1, 1), dt)
        m.tilt.y = m._f.y.step(clamp(wrap(now0.y - zero.y) / T.tiltRange, -1, 1), dt)
        // The wheel uses the phone's own axes (not turned with the screen).
        const w = wheelOf(upOf(inp.tb, inp.tg ?? 0))
        if (w !== null) {
          m.neutral.wheel ??= w
          m.wheel = m._f.w.step(clamp(-wrap(w - m.neutral.wheel) / T.wheelRange, -1, 1), dt)
        }
      }
    }
  }
  return motion
}

/**
 * The safety screen on the TV, drawn over the game while motion.safety is held: the card's tips,
 * who has tapped I'm ready, and (once motion.safety.canSkip) how to start anyway. Plain canvas;
 * restyle it freely. players: [{ id, name, color }].
 */
export function drawSafety(ctx, { w = 1280, h = 800, players = [], safety, card = DEFAULTS.safety, font = 'system-ui, sans-serif', startLabel = 'A to start now' } = {}) {
  const cx = w / 2
  const top = h / 2 - 340
  ctx.save()
  ctx.fillStyle = 'rgba(13,15,20,0.82)'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#1b1f29'
  ctx.beginPath()
  ctx.roundRect(cx - 430, top, 860, 680, 26)
  ctx.fill()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffd23f'
  ctx.font = `800 56px ${font}`
  ctx.fillText(card.title, cx, top + 64)
  const colors = ['#2ad1c9', '#ff5c8a', '#b6f04a']
  card.tips.forEach((tip, i) => {
    const y = top + 150 + i * 120
    ctx.fillStyle = colors[i % colors.length]
    ctx.beginPath()
    ctx.arc(cx - 350, y + 20, 30, 0, Math.PI * 2)
    ctx.fill()
    ctx.textAlign = 'left'
    ctx.fillStyle = '#eef0f5'
    ctx.font = `800 30px ${font}`
    ctx.fillText(tip.title, cx - 300, y)
    ctx.fillStyle = '#9aa3b5'
    ctx.font = `600 21px ${font}`
    // Wrap the tip to the card's width.
    let line = ''
    let ly = y + 38
    for (const word of tip.text.split(' ')) {
      const next = line ? `${line} ${word}` : word
      if (ctx.measureText(next).width > 640 && line) {
        ctx.fillText(line, cx - 300, ly)
        line = word
        ly += 27
      } else line = next
    }
    if (line) ctx.fillText(line, cx - 300, ly)
  })
  ctx.textAlign = 'center'
  const waiting = new Set(safety?.waiting ?? [])
  const shown = players.slice(0, 6)
  shown.forEach((p, i) => {
    const x = cx + (i - (shown.length - 1) / 2) * 140
    const ready = !waiting.has(p.id)
    ctx.fillStyle = ready ? 'rgba(182,240,74,0.25)' : 'rgba(255,255,255,0.08)'
    ctx.beginPath()
    ctx.roundRect(x - 64, top + 520, 128, 40, 20)
    ctx.fill()
    ctx.fillStyle = p.color ?? '#eef0f5'
    ctx.font = `700 19px ${font}`
    ctx.fillText(`${ready ? '\u2713 ' : ''}${String(p.name ?? '').slice(0, 9)}`, x, top + 541)
  })
  ctx.fillStyle = '#eef0f5'
  ctx.font = `600 22px ${font}`
  ctx.fillText('Everyone taps I\u2019m ready on their phone', cx, top + 600)
  if (safety?.canSkip) {
    ctx.fillStyle = '#ffd23f'
    ctx.font = `800 24px ${font}`
    ctx.fillText(startLabel, cx, top + 646)
  }
  ctx.restore()
}
