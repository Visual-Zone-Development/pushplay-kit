// The party join page: the same page for every game. It joins a TV's party by code, gets the
// game's controller from the TV, runs it in a sandboxed frame (frame.html) and passes messages
// between the two. It survives locked phones and Wi-Fi changes: the seat is kept on the relay
// and taken back with a resume token.
//
// Two rooms at most. The one joined from the form or the QR code is home. Its host can send the
// phone into a game's room ({k:'go'}): the launcher does, so a phone that's its remote becomes the
// controller of a game that takes phones, then comes back when it ends. Home stays connected
// (its frame hidden) the whole time, so getting back is instant and can't fail.
//
// Messages inside the relay's `send` payload (d), host → phone:
//   {k:'cb', h, i, n, s}   controller chunk i of n (n = 0: "use the one you have", h = its hash)
//   {k:'go', room, game}   home only: join this room on this relay (four letters) as the same player
//   {k:'home', room}       home only: leave that game room (none: whichever) and show home again
//   {k:'peek', on}         home only: show home's controller over the game's while on (the
//                          launcher's pause menu is open), staying in the game room
//   anything else          passed to the controller
// Controller ↔ join page, besides the relay: a controller that wants the phone's motion sensors
// posts {type:'motion', on:true}; the join page asks for permission only then (iOS needs a tap
// on this page, so it shows an "Allow motion" button), answers {type:'motion', state:'on' |
// 'ask' | 'denied' | 'unsupported' | 'insecure'} ('ask': waiting for that tap; 'insecure': the page
// isn't https, so the browser hides the sensors) and streams {type:'motion', r:{b, g, x, y, z}, s:[…]}
// until {type:'motion', on:false}. r: tilt in degrees and the strongest movement in m/s² since the
// last reading. s: every sensor event since then, {age, a:[x,y,z], g:[x,y,z], w:[alpha,beta,gamma],
// o:[b,g,a]} (age in ms before the message was posted, a without gravity, g with it, w the rotation
// rate in deg/s, o the latest orientation), so a controller can detect gestures at the full sensor rate.
// phone → host:
//   {k:'hi', h, rtc}       "I'm (back) here; I have controller h": the host replies with the
//                          controller if needed, then everything the controller should show.
//                          rtc: 1 when this phone can take a direct link (below)
//   {k:'i', i, q}          the controller's held input, numbered (q) so the host can drop a stale copy
//   anything else          from the controller
//
// The direct link: a host that wants one answers hi with {k:'rtc', sdp, s} (a WebRTC offer, s its
// STUN servers); this page answers {k:'rtc', sdp} and both trade {k:'rtc', c} (ICE candidates),
// all inside the relay's send. Once the data channel is open, each input goes on it as well as
// through the relay: the channel is quicker on the same Wi-Fi, the relay copy always arrives, and
// the host keeps whichever comes first (q). Nothing else uses the channel. ?rtc=0 turns it off.

const COLORS = ['#ffb547', '#ff6b6b', '#4dd8a8', '#5aa9ff', '#c38bff', '#ff8fd0', '#f5e663', '#8ce05a']
const store = {
  get: (k) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v)
    } catch {}
  }
}
const session = {
  get: (k) => {
    try {
      return sessionStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k, v) => {
    try {
      if (v === null) sessionStorage.removeItem(k)
      else sessionStorage.setItem(k, v)
    } catch {}
  }
}
const $ = (id) => document.getElementById(id)
const CODE = /^[A-Z]{4}$/

const ERRORS = {
  'not-found': 'No party with that code. Check the TV.',
  full: 'That party is full.',
  locked: "That game has started and isn't letting new players in.",
  'slow-down': 'Too many wrong codes from this network. Wait a few minutes, then try again.',
  'bad-message': 'Something went wrong. Try again.'
}
const CLOSED = { 'host-left': 'The game ended.', idle: 'The party closed after a quiet spell.', kicked: 'You were removed from the party.' }
/** The relay closed us for too many wrong codes: trying again at once would only make it worse. */
const WRONG_CODES = 4030

let home = null // the room joined from the form or QR code
let game = null // a room home's host sent us into
let color = store.get('party:color') ?? COLORS[Math.floor(Math.random() * COLORS.length)]
let wakeLock = null
/** True while home's host wants its controller on screen over the game's (a pause menu). */
let peek = false
const shown = () => (game && !peek ? game : home)
const rooms = () => [home, game].filter(Boolean)

/** One room: its socket, its seat, its controller frame and its direct link. */
class Room {
  constructor({ code, name, role, resume = null, gameName = '' }) {
    Object.assign(this, { code, role, resume, gameName })
    this.me = { id: null, name, color }
    this.ws = null
    this.left = false
    this.retry = 0
    this.retryTimer = null
    this.frame = null
    this.frameReady = false
    this.pending = [] // messages for the controller until it's ready
    this.chunks = null
    this.rtc = null // { pc, dc, ready, early: [] }: the direct link, while there is one
    this.seq = 0 // numbers this room's input messages
  }

  get cacheKey() {
    return `party:controller:${this.role}`
  }

  connect() {
    clearTimeout(this.retryTimer)
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED && this.ws.readyState !== WebSocket.CLOSING) return
    const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/?party=1`)
    this.ws = socket
    socket.onopen = () => this.send({ t: 'party-join', room: this.code, name: this.me.name, color: this.me.color, resume: this.resume })
    socket.onmessage = (e) => this.receive(JSON.parse(e.data))
    socket.onclose = (e) => {
      if (this.ws !== socket || this.left) return
      this.ws = null
      if (e.code === WRONG_CODES) return this.fail('slow-down')
      if (e.code === 4001) return this.notice('This party is open in another tab.', 'Use this tab', () => this.connect())
      if (e.code === 4008) return this.notice('Online play is resting until tomorrow.')
      // Lost the connection (locked phone, Wi-Fi change): the seat waits for us, so keep trying.
      this.notice('Reconnecting…')
      this.retryTimer = setTimeout(() => this.connect(), Math.min(8000, 500 * 2 ** this.retry++))
    }
  }

  send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
  }

  /** Only the room on screen speaks to the player. */
  notice(text, button, onClick) {
    if (shown() === this) notice(text, button, onClick)
  }

  receive(msg) {
    switch (msg.t) {
      case 'party-joined':
        this.retry = 0
        this.me.id = msg.you
        this.resume = msg.resume
        session.set(`party:resume:${this.code}`, this.resume)
        keepAwake()
        this.hello()
        return
      case 'host-away':
        return this.notice('The TV lost its connection. Hang on…')
      case 'host-back':
        return this.hello()
      case 'closed':
        session.set(`party:resume:${this.code}`, null)
        return this.end(CLOSED[msg.reason] ?? 'The party closed.')
      case 'error':
        if (msg.code === 'not-found' && this.resume) session.set(`party:resume:${this.code}`, null)
        return this.fail(msg.code)
      case 'msg':
        return this.fromHost(msg.d)
    }
  }

  /** Couldn't get in (or was thrown out for wrong codes). */
  fail(code) {
    this.close()
    if (this.role === 'game') return backHome(ERRORS[code] ?? ERRORS['bad-message'])
    showForm(ERRORS[code] ?? ERRORS['bad-message'])
  }

  /** The room is over. A game room just sends us home; home says so and offers another. */
  end(text) {
    this.close()
    if (this.role === 'game') return backHome(text)
    if (game) leaveGame()
    home = null
    notice(text, 'Join another', () => {
      history.replaceState(null, '', '/')
      $('code').value = ''
      showForm()
    })
  }

  /** Stop: no more reconnecting, the socket and the frame gone. */
  close() {
    this.left = true
    clearTimeout(this.retryTimer)
    this.ws?.close(1000)
    this.ws = null
    this.unmount()
  }

  /** Give up the seat on purpose. */
  leave() {
    this.send({ t: 'leave' })
    session.set(`party:resume:${this.code}`, null)
    this.close()
  }

  /** Tell the host we're here, and which controller we already have. */
  hello() {
    this.notice(this.role === 'game' ? `Joining ${this.gameName || 'the game'}…` : 'Getting the game ready…')
    this.send({ t: 'send', d: { k: 'hi', h: store.get(`${this.cacheKey}-hash`), ...(canDirect() ? { rtc: 1 } : {}) } })
  }

  fromHost(d) {
    if (!d || typeof d !== 'object') return
    if (d.k === 'rtc') return this.fromHostRtc(d)
    // Only home's host may move the phone, and only to a room code: never to another server.
    if (d.k === 'go') return this.role === 'home' && typeof d.room === 'string' && CODE.test(d.room) && enterGame(d.room, typeof d.game === 'string' ? d.game.slice(0, 40) : '')
    if (d.k === 'home') return this.role === 'home' && game && (!d.room || d.room === game.code) && backHome()
    if (d.k === 'peek') return this.role === 'home' && ((peek = d.on === true), show())
    if (d.k !== 'cb') return this.toController(d)
    if (d.n === 0) {
      const html = store.get(`${this.cacheKey}-hash`) === d.h ? store.get(this.cacheKey) : null
      if (html) return this.mount(html)
      // The cache went missing since we said hello: ask again, with nothing cached.
      return this.send({ t: 'send', d: { k: 'hi', h: null } })
    }
    if (!this.chunks || this.chunks.h !== d.h) this.chunks = { h: d.h, parts: [] }
    this.chunks.parts[d.i] = d.s
    if (this.chunks.parts.filter((p) => p !== undefined).length < d.n) return
    const html = this.chunks.parts.join('')
    this.chunks = null
    store.set(this.cacheKey, html)
    store.set(`${this.cacheKey}-hash`, d.h)
    this.mount(html)
  }

  // ---- the controller frame ----

  mount(html) {
    // Keep messages waiting for the controller: the host sends everything right after the
    // controller pages, which are paced, so the state often arrives first.
    this.frame?.remove()
    this.frameReady = false
    const frame = document.createElement('iframe')
    frame.setAttribute('sandbox', 'allow-scripts')
    frame.setAttribute('allow', 'fullscreen; accelerometer; gyroscope')
    frame.src = '/frame.html'
    frame.html = html
    frame.hidden = shown() !== this
    this.frame = frame
    $('stage').append(frame)
  }

  unmount() {
    this.closeDirect()
    if (motion.room === this) motionOff()
    this.frame?.remove()
    this.frame = null
    this.frameReady = false
    this.pending = []
  }

  toController(d) {
    if (this.frameReady) this.frame.contentWindow.postMessage({ type: 'msg', d }, '*')
    else this.pending.push(d)
  }

  fromController(m) {
    if (m.type === 'frame') this.frame.contentWindow.postMessage({ type: 'load', html: this.frame.html }, '*')
    else if (m.type === 'ready') {
      this.frameReady = true
      this.frame.contentWindow.postMessage({ type: 'me', me: { ...this.me, room: this.code } }, '*')
      for (const d of this.pending.splice(0)) this.toController(d)
      this.notice(null)
    } else if (m.type === 'send') this.sendFromController(m.d)
    else if (m.type === 'vibrate') navigator.vibrate?.(Math.min(1000, Number(m.ms) || 0))
    else if (m.type === 'motion') m.on ? motionOn(this) : motion.room === this && motionOff()
  }

  // ---- the direct link ----

  /** The controller's messages: input is numbered, and goes on the direct link too when it's open. */
  sendFromController(d) {
    if (d?.k !== 'i') return this.send({ t: 'send', d })
    const numbered = { ...d, q: ++this.seq }
    if (this.rtc?.dc?.readyState === 'open') {
      try {
        this.rtc.dc.send(JSON.stringify(numbered))
      } catch {}
    }
    this.send({ t: 'send', d: numbered })
  }

  /** The host's offer and candidates: answer, and keep candidates until the offer is in. */
  async fromHostRtc(d) {
    if (!canDirect()) return
    try {
      if (d.sdp) {
        this.closeDirect()
        const servers = Array.isArray(d.s) ? d.s.filter((u) => typeof u === 'string' && /^stuns?:/.test(u)) : []
        const pc = new RTCPeerConnection({ iceServers: servers.map((urls) => ({ urls })) })
        const link = { pc, dc: null, ready: false, early: [] }
        this.rtc = link
        pc.onicecandidate = (e) => e.candidate && this.rtc === link && this.send({ t: 'send', d: { k: 'rtc', c: e.candidate.toJSON() } })
        pc.ondatachannel = (e) => {
          if (this.rtc !== link) return
          link.dc = e.channel
          e.channel.onclose = () => this.rtc === link && (link.dc = null)
        }
        pc.onconnectionstatechange = () => ['failed', 'closed'].includes(pc.connectionState) && this.rtc === link && this.closeDirect()
        await pc.setRemoteDescription(d.sdp)
        await pc.setLocalDescription(await pc.createAnswer())
        if (this.rtc !== link) return
        this.send({ t: 'send', d: { k: 'rtc', sdp: pc.localDescription.toJSON() } })
        link.ready = true
        for (const c of link.early.splice(0)) await pc.addIceCandidate(c).catch(() => {})
      } else if (d.c && this.rtc) {
        if (this.rtc.ready) await this.rtc.pc.addIceCandidate(d.c).catch(() => {})
        else this.rtc.early.push(d.c)
      }
    } catch {
      this.closeDirect()
    }
  }

  closeDirect() {
    const link = this.rtc
    this.rtc = null
    try {
      link?.pc.close()
    } catch {}
  }
}

const canDirect = () => typeof RTCPeerConnection === 'function' && new URLSearchParams(location.search).get('rtc') !== '0'

// ---- join form ---------------------------------------------------------------------------

const fromPath = /^\/j\/([A-Za-z]{4})\/?$/.exec(location.pathname)?.[1]?.toUpperCase()
$('code').value = fromPath ?? ''
$('name').value = store.get('party:name') ?? ''
for (const c of COLORS) {
  const b = document.createElement('button')
  b.type = 'button'
  b.style.background = c
  b.setAttribute('aria-label', c)
  b.setAttribute('aria-pressed', String(c === color))
  b.onclick = () => {
    color = c
    for (const o of $('colors').children) if (o.tagName === 'BUTTON') o.setAttribute('aria-pressed', String(o === b))
  }
  $('colors').append(b)
}


function showForm(error = '') {
  $('play').hidden = true
  $('join').hidden = false
  $('error').textContent = error
  $('go').disabled = false
  ;($('code').value ? $('name') : $('code')).focus()
}

$('join').onsubmit = (e) => {
  e.preventDefault()
  const c = $('code').value.trim().toUpperCase()
  const name = $('name').value.trim()
  if (!CODE.test(c)) return showForm('Room codes are four letters.')
  if (!name) return showForm('Pick a name.')
  store.set('party:name', name)
  store.set('party:color', color)
  history.replaceState(null, '', `/j/${c}`)
  join(c, name, session.get(`party:resume:${c}`))
}

// ✕ leaves everything: the game room and home.
$('leave').onclick = () => {
  game?.leave()
  game = null
  home?.leave()
  home = null
  history.replaceState(null, '', '/')
  $('code').value = ''
  showForm()
}
// ⌂ (in a game room): the launcher's pause menu, through home.
$('home-button').onclick = () => {
  home?.send({ t: 'send', d: { k: 'm', d: { a: 'home' } } })
  navigator.vibrate?.(15)
}
// Back to the remote: leave the game room, show home.
$('back-button').onclick = () => {
  if (!game) return
  game.leave()
  game = null
  show()
}

function join(code, name, resume) {
  for (const r of rooms()) r.close()
  game = null
  home = new Room({ code, name, role: 'home', resume })
  $('go').disabled = true
  $('join').hidden = true
  $('play').hidden = false
  show()
  notice('Joining…')
  home.connect()
}

/** Home's host sent us into a game's room: join it as the same player, keep home connected. */
function enterGame(code, gameName) {
  if (game?.code === code || code === home?.code) return
  if (game) game.leave()
  game = new Room({ code, name: home.me.name, role: 'game', resume: session.get(`party:resume:${code}`), gameName })
  peek = false
  show()
  notice(`Joining ${gameName || 'the game'}…`)
  game.connect()
}

/** Leave the game room (or what's left of it) and show home again. */
function backHome(text = '') {
  if (!game) return
  game.close()
  game = null
  peek = false
  show()
  if (text) flash(`${text} Back to the remote.`)
}
function leaveGame() {
  game?.leave()
  game = null
  peek = false
}

/** Show the room on screen: its frame, its name in the header, and the buttons for getting back. */
function show() {
  const on = shown()
  for (const r of rooms()) if (r.frame) r.frame.hidden = r !== on
  if (motion.room && motion.room !== on) motionOff()
  $('who').textContent = on?.me.name ?? ''
  $('swatch').style.background = color
  $('room').textContent = game ? (peek ? 'Paused' : game.gameName || game.code) : (home?.code ?? '')
  $('room').classList.toggle('named', Boolean(game && (peek || game.gameName)))
  document.querySelector('header').classList.toggle('in-game', Boolean(game))
  $('home-button').hidden = !game
  $('back-button').hidden = !game
  if (on?.frameReady) notice(null)
}

// Messages from a controller frame go to the room that owns it.
addEventListener('message', (e) => {
  if (!e.data) return
  const room = rooms().find((r) => r.frame && e.source === r.frame.contentWindow)
  room?.fromController(e.data)
})

/** For tests and troubleshooting: which way input goes now, a way to drop the direct link, and where we are. */
window.partyLink = {
  get state() {
    return shown()?.rtc?.dc?.readyState === 'open' ? 'direct' : 'relay'
  },
  drop: () => shown()?.closeDirect(),
  get rooms() {
    return { home: home?.code ?? null, game: game?.code ?? null }
  }
}

// ---- motion sensors, only for controllers that ask ----------------------------------------

// One room at a time can use the sensors: the one whose controller asked (the room on screen).
const motion = { wanted: false, granted: false, listening: false, tilt: null, peak: null, samples: [], timer: null, button: null, seen: false, room: null }
const toFrame = (d) => motion.room?.frame?.contentWindow?.postMessage({ type: 'motion', ...d }, '*')

function motionOn(room) {
  motion.room = room
  motion.wanted = true
  if (!window.isSecureContext) return toFrame({ state: 'insecure' })
  if (typeof DeviceOrientationEvent === 'undefined') return toFrame({ state: 'unsupported' })
  if (motion.listening) return toFrame({ state: 'on' })
  const ask = [DeviceOrientationEvent, globalThis.DeviceMotionEvent].filter((E) => typeof E?.requestPermission === 'function')
  // Once allowed, iOS keeps it for the page: later challenges start without asking again.
  if (!ask.length || motion.granted) return listen()
  // iOS: permission needs a tap on this page, not inside the controller's frame.
  motion.button?.remove()
  const b = document.createElement('button')
  b.type = 'button'
  b.textContent = 'Allow motion controls'
  b.style.cssText = 'position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:20;padding:16px 24px;min-height:56px;border-radius:16px;background:#ffb547;color:#0d0f14;font-weight:800;font-size:18px;box-shadow:0 6px 24px rgba(0,0,0,.4)'
  b.onclick = async () => {
    b.remove()
    motion.button = null
    try {
      const results = await Promise.all(ask.map((E) => E.requestPermission()))
      if (results.every((r) => r === 'granted')) {
        motion.granted = true
        if (motion.wanted) listen()
      }
      else toFrame({ state: 'denied' })
    } catch {
      toFrame({ state: 'denied' })
    }
  }
  motion.button = b
  document.body.append(b)
  toFrame({ state: 'ask' })
}

function listen() {
  motion.listening = true
  addEventListener('deviceorientation', onTilt)
  addEventListener('devicemotion', onMove)
  motion.timer = setInterval(flushMotion, 16)
  toFrame({ state: 'on' })
  // Desktop browsers have the API but no sensor: no events ever arrive.
  setTimeout(() => {
    if (motion.listening && !motion.seen) {
      toFrame({ state: 'unsupported' })
      motionOff()
    }
  }, 1500)
}

function motionOff() {
  motion.wanted = false
  motion.button?.remove()
  motion.button = null
  if (!motion.listening) return
  motion.listening = false
  removeEventListener('deviceorientation', onTilt)
  removeEventListener('devicemotion', onMove)
  clearInterval(motion.timer)
}

function onTilt(e) {
  if (e.beta === null) return
  motion.seen = true
  motion.tilt = { b: e.beta, g: e.gamma, a: e.alpha }
}
const vec = (v, ...k) => (v && typeof v[k[0]] === 'number' ? k.map((n) => Math.round(v[n] * 100) / 100) : null)
function onMove(e) {
  const a = vec(e.acceleration, 'x', 'y', 'z')
  const g = vec(e.accelerationIncludingGravity, 'x', 'y', 'z')
  const w = vec(e.rotationRate, 'alpha', 'beta', 'gamma')
  if (!a && !g && !w) return
  motion.seen = true
  if (a) {
    const m = Math.hypot(...a)
    if (!motion.peak || m > motion.peak.m) motion.peak = { m, x: a[0], y: a[1], z: a[2] }
  }
  const t = motion.tilt
  motion.samples.push({ t: e.timeStamp || performance.now(), a, g, w, o: t ? [t.b, t.g, t.a ?? null] : null })
  if (motion.samples.length > 64) motion.samples.shift()
}
function flushMotion() {
  if (!motion.tilt && !motion.peak && !motion.samples.length) return
  const r = (n) => Math.round((n ?? 0) * 10) / 10
  const p = motion.peak ?? { x: 0, y: 0, z: 0 }
  const at = performance.now()
  const s = motion.samples.splice(0).map(({ t, ...rest }) => ({ age: Math.round((at - t) * 10) / 10, ...rest }))
  toFrame({ r: { b: r(motion.tilt?.b), g: r(motion.tilt?.g), x: r(p.x), y: r(p.y), z: r(p.z) }, s })
  motion.peak = null
}

// ---- niceties ----------------------------------------------------------------------------

function notice(text, button, onClick) {
  $('notice').hidden = !text
  $('notice-text').textContent = text ?? ''
  $('notice-button').hidden = !button
  $('notice-button').textContent = button ?? ''
  $('notice-button').onclick = onClick ?? null
}

/** Keep the screen on while playing. */
async function keepAwake() {
  try {
    if (!wakeLock && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock?.request('screen')
      wakeLock?.addEventListener('release', () => (wakeLock = null))
    }
  } catch {}
}

/** A message that clears itself (coming back from a game). */
let flashTimer = null
function flash(text) {
  notice(text)
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => $('notice-text').textContent === text && notice(null), 2500)
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return
  if (rooms().some((r) => r.me.id && !r.left)) keepAwake()
  // Phones often kill sockets in the background without telling us.
  for (const r of rooms()) {
    if (!r.me.id || r.left || r.ws?.readyState === WebSocket.OPEN) continue
    r.retry = 0
    r.connect()
  }
})

// ---- start ---------------------------------------------------------------------------------
// Last, so everything above exists: back on the page with a seat still held (reload, or the
// browser dropped the tab), rejoin. (A game room comes back on its own: home's host sends us in again.)
const held = fromPath && session.get(`party:resume:${fromPath}`)
if (held && $('name').value) join(fromPath, $('name').value, held)
else showForm()
