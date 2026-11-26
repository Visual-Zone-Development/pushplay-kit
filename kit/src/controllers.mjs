// <kit> controllers [--host] [--out file.html]
// A gallery of the shared phone layouts: pick one, change its settings, and press, drag and swipe
// it in a phone-sized frame, while the panel beside it shows what the game reads (party.pad(id)).
// The frame runs the real phone page (controller.js + controller-layouts.js), and this page plays
// the join page's part, so what you see is what phones get.
//   --host        also listen on the Wi-Fi, to open it on a phone (http://<this machine>:5175)
//   --out <file>  write the gallery to a file instead of serving it
import { createServer } from 'node:http'
import { readFileSync, writeFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { brand, CMD } from './config.mjs'

export const GALLERY_PORT = 5175
const templates = join(import.meta.dirname, 'templates')
const runtime = (file) => readFileSync(join(templates, 'party', file), 'utf8').replaceAll('{{SLUG}}', brand.slug).replaceAll('{{BRAND}}', brand.name)

/** The page a phone gets for a game on shared layouts (what party.js builds, without a game). */
export function sharedPage() {
  const inline = (js) => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${inline(runtime('controller.js'))}</head><body>${inline(runtime('controller-layouts.js'))}</body></html>`
}

/** Example settings per layout: a starting point to edit in the gallery. */
const EXAMPLES = {
  classic: { layout: 'classic', labels: { a: 'Jump', b: 'Dash' } },
  pad: { layout: 'pad' },
  twin: { layout: 'twin', labels: { rt: 'Fire', lt: 'Bomb' } },
  dpad: { layout: 'dpad', labels: { a: 'Rotate', b: 'Drop' } },
  tap: { layout: 'tap', labels: { a: 'FLAP' } },
  swipe: { layout: 'swipe', prompt: 'Swipe to steer · tap to boost' },
  slider: { layout: 'slider', labels: { a: 'Serve' } },
  trackpad: { layout: 'trackpad', speed: 1.2 },
  choices: { layout: 'choices', prompt: 'Who took the last cookie?', choices: ['Alice', 'Bob', 'The dog'], card: 'Psst: it was you.' },
  motion: { layout: 'motion', prompt: 'Hold it like a bat and swing!', btn: 'Ready' }
}

/** The gallery, one self-contained page. */
export function galleryHtml() {
  const page = JSON.stringify(sharedPage()).replace(/<\//g, '<\\/')
  const examples = JSON.stringify(EXAMPLES)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Phone Controllers</title>
<style>
  :root { --bg: #f4f2ec; --panel: #ffffff; --ink: #1b1d24; --quiet: #5f6573; --line: #dedad0; --accent: #d9481c; --code: #f7f5ef; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #101218; --panel: #181b24; --ink: #eef0f5; --quiet: #9aa3b5; --line: #2a2f3b; --accent: #ff8a5c; --code: #12151c; } }
  :root[data-theme="dark"] { --bg: #101218; --panel: #181b24; --ink: #eef0f5; --quiet: #9aa3b5; --line: #2a2f3b; --accent: #ff8a5c; --code: #12151c; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
  header { padding: 28px 20px 8px; max-width: 1180px; margin: 0 auto; }
  h1 { margin: 0 0 4px; font-size: 26px; letter-spacing: -0.01em; }
  header p { margin: 0; color: var(--quiet); max-width: 70ch; }
  .tabs { display: flex; flex-wrap: wrap; gap: 6px; padding: 14px 20px; max-width: 1180px; margin: 0 auto; }
  .tabs button { font: inherit; font-weight: 650; padding: 7px 13px; border-radius: 999px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); cursor: pointer; }
  .tabs button[aria-pressed="true"] { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  main { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 20px; padding: 0 20px 40px; max-width: 1180px; margin: 0 auto; align-items: start; }
  .phone { display: flex; flex-direction: column; gap: 8px; align-items: center; }
  .frame { border: 10px solid #000; border-radius: 34px; overflow: hidden; background: #000; box-shadow: 0 10px 30px rgba(0,0,0,0.18); }
  iframe { display: block; border: 0; width: 100%; height: 100%; }
  .frame.portrait { width: 300px; height: 600px; } .frame.landscape { width: 600px; height: 300px; }
  .turn { font: inherit; font-size: 13px; color: var(--quiet); background: none; border: 1px solid var(--line); border-radius: 999px; padding: 4px 12px; cursor: pointer; }
  .side { display: grid; gap: 14px; min-width: 0; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; min-width: 0; }
  .card h2 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--quiet); }
  .about { margin: 0; }
  textarea { width: 100%; min-height: 120px; font: 13px/1.5 ui-monospace, Menlo, monospace; color: var(--ink); background: var(--code); border: 1px solid var(--line); border-radius: 10px; padding: 10px; resize: vertical; }
  .err { color: var(--accent); font-size: 13px; min-height: 1em; margin-top: 4px; }
  .reads { display: grid; grid-template-columns: max-content 1fr; gap: 4px 14px; font: 13px/1.5 ui-monospace, Menlo, monospace; }
  .reads dt { color: var(--quiet); } .reads dd { margin: 0; overflow-wrap: anywhere; }
  .flash { color: var(--accent); font-weight: 700; }
  pre { margin: 0; font: 12px/1.5 ui-monospace, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--quiet); max-height: 140px; overflow: auto; }
  code { font: 13px ui-monospace, Menlo, monospace; background: var(--code); padding: 1px 5px; border-radius: 5px; }
  @media (max-width: 900px) { main { grid-template-columns: minmax(0, 1fr); } .frame.landscape { width: min(600px, calc(100vw - 40px)); height: calc(min(600px, calc(100vw - 40px)) / 2); } .frame.portrait { width: min(300px, calc(100vw - 40px)); } }
</style>
</head>
<body>
<header>
  <h1>Phone controllers</h1>
  <p>Every shared layout a game can give its players' phones. Tap, drag and swipe the phone: the panel shows what the game reads. Change the settings to see what a game can adjust without making its own screen.</p>
</header>
<nav class="tabs" id="tabs" aria-label="Layouts"></nav>
<main>
  <div class="phone">
    <div class="frame landscape" id="frame"><iframe id="phone" title="Phone controller" allow="accelerometer; gyroscope"></iframe></div>
    <button class="turn" id="turn">Turn the phone</button>
  </div>
  <div class="side">
    <div class="card"><h2>Made for</h2><p class="about" id="about"></p></div>
    <div class="card"><h2>What the game reads: <code>party.pad(id)</code></h2><dl class="reads" id="reads"></dl></div>
    <div class="card"><h2>Settings: <code>party.controls(…)</code></h2><textarea id="settings" spellcheck="false" aria-label="Settings"></textarea><div class="err" id="err"></div></div>
    <div class="card"><h2>Messages to the game</h2><pre id="log">(none yet)</pre></div>
  </div>
</main>
<script>
  const PAGE = ${page}
  const EXAMPLES = ${examples}
  const ABOUT = {
    classic: 'Most action games: a floating stick and A B X Y. Reads as x, y and held("a"…"y").',
    pad: 'The smallest gamepad: a stick and A and B (classic with X and Y hidden).',
    twin: 'Twin-stick shooters: move with the left stick, aim with the right (aimX, aimY), triggers LT and RT.',
    dpad: 'Retro, puzzle and grid games: an 8-way d-pad (up, down, left, right, x and y in steps) and A and B.',
    tap: 'Rhythm, one-button and reaction games: the whole screen is A. Every finger is a press.',
    swipe: 'Snake, sliding blocks, lanes: each swipe is one press of up, down, left or right; a tap is A.',
    slider: 'Paddles, steering, aiming: one slider (value 0..1, x -1..1) and A. vertical and spring are options.',
    trackpad: 'Point-and-click, cards and strategy: moves a pointer on the TV (pointer.x, pointer.y). Tap is A, two-finger tap is B.',
    choices: 'Quizzes, votes and hidden roles: a prompt, a private card and answer buttons. A tap sends { pick }.',
    motion: 'Swinging and steering with the phone itself (motion.js on the TV). Here, with no sensors, it shows its touch pad.'
  }
  const ORIENT = { classic: 'landscape', pad: 'landscape', twin: 'landscape', dpad: 'landscape', tap: 'portrait', swipe: 'portrait', slider: 'landscape', trackpad: 'landscape', choices: 'portrait', motion: 'portrait' }
  const $ = (id) => document.getElementById(id)
  const phone = $('phone')
  let current = 'classic'
  let landscape = true
  let ready = false
  let settings = EXAMPLES.classic
  // What the game reads, decoded the way party.pad(id) does.
  let pad = { x: 0, y: 0, aimX: 0, aimY: 0, held: [], value: null, pointer: null }
  let counts = {}
  let nonce = null
  let pressedAt = {}
  let total = null
  const log = []

  for (const name of Object.keys(EXAMPLES)) {
    const b = document.createElement('button')
    b.textContent = name
    b.onclick = () => choose(name)
    b.dataset.name = name
    $('tabs').append(b)
  }
  function choose(name) {
    current = name
    settings = EXAMPLES[name]
    $('settings').value = JSON.stringify(settings, null, 2)
    $('err').textContent = ''
    $('about').textContent = ABOUT[name]
    for (const b of $('tabs').children) b.setAttribute('aria-pressed', String(b.dataset.name === name))
    landscape = ORIENT[name] === 'landscape'
    shape()
    publish()
  }
  function shape() {
    $('frame').className = 'frame ' + (landscape ? 'landscape' : 'portrait')
  }
  $('turn').onclick = () => ((landscape = !landscape), shape())
  $('settings').addEventListener('input', () => {
    try {
      settings = JSON.parse($('settings').value)
      $('err').textContent = ''
      publish()
    } catch (e) {
      $('err').textContent = 'Not valid JSON yet: ' + e.message
    }
  })

  // The join page's side of the frame: load the page, say who the phone is, pass the TV's state.
  const post = (m) => phone.contentWindow?.postMessage(m, '*')
  function publish() {
    if (!ready) return
    post({ type: 'msg', d: { k: 'P', s: { controls: settings } } })
  }
  addEventListener('message', (e) => {
    if (e.source !== phone.contentWindow) return
    const m = e.data
    if (m?.type === 'ready') {
      ready = true
      post({ type: 'me', me: { id: 'p1', name: 'You', color: '#4dd8a8', room: 'DEMO' } })
      post({ type: 'msg', d: { k: 'pl', players: [{ id: 'p1', name: 'You', color: '#4dd8a8', kind: 'phone', connected: true }] } })
      post({ type: 'msg', d: { k: 'V', s: {} } })
      publish()
    } else if (m?.type === 'send' && m.d?.k === 'i') read(m.d.i)
    else if (m?.type === 'send' && m.d?.k === 'm') {
      log.unshift(JSON.stringify(m.d.d))
      $('log').textContent = log.slice(0, 12).join('\\n')
    } else if (m?.type === 'motion' && m.on) post({ type: 'motion', state: 'unsupported' })
  })
  function read(w) {
    if (w.n !== nonce) ((nonce = w.n), (counts = {}), (total = null))
    for (const [b, n] of Object.entries(w.c ?? {})) {
      if (n > (counts[b] ?? 0)) pressedAt[b] = performance.now()
      counts[b] = n
    }
    pad.x = w.x ?? 0
    pad.y = w.y ?? 0
    pad.aimX = w.ax ?? 0
    pad.aimY = w.ay ?? 0
    pad.held = Array.isArray(w.h) ? w.h : Object.keys(w).filter((k) => w[k] === true)
    pad.value = typeof w.v === 'number' ? w.v : null
    if (w.p) {
      pad.pointer ??= { x: 0.5, y: 0.5, down: false }
      if (total) {
        pad.pointer.x = Math.max(0, Math.min(1, pad.pointer.x + w.p.x - total[0]))
        pad.pointer.y = Math.max(0, Math.min(1, pad.pointer.y + (w.p.y - total[1]) * 16 / 9))
      }
      total = [w.p.x, w.p.y]
      pad.pointer.down = w.p.d
    } else pad.pointer = null
    pad.own = w.st ? w : null
  }
  const f = (v) => (Math.round(v * 100) / 100).toFixed(2)
  function show() {
    requestAnimationFrame(show)
    const now = performance.now()
    const recent = Object.entries(pressedAt).filter(([, t]) => now - t < 500).map(([b]) => b)
    const rows = [
      ['x, y', f(pad.x) + ', ' + f(pad.y)],
      ['aimX, aimY', f(pad.aimX) + ', ' + f(pad.aimY)],
      ['held', pad.held.join(' ') || '—'],
      ['pressed', recent.length ? '<span class="flash">' + recent.join(' ') + '</span>' : '—'],
      ['value', pad.value === null ? 'null' : f(pad.value)],
      ['pointer', pad.pointer ? f(pad.pointer.x) + ', ' + f(pad.pointer.y) + (pad.pointer.down ? ' (finger down)' : '') : 'null']
    ]
    if (pad.own) rows.push(['motion', 'tilt ' + pad.own.tb + '°, ' + pad.own.tg + '° · ' + pad.own.st])
    const html = rows.map(([k, v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('')
    if ($('reads').innerHTML !== html) $('reads').innerHTML = html
  }
  phone.srcdoc = PAGE
  choose('classic')
  show()
</script>
</body>
</html>
`
}

function lanAddress() {
  for (const list of Object.values(networkInterfaces())) for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) return a.address
  return null
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2)
  const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : null
  if (out) {
    writeFileSync(out, galleryHtml())
    console.log(`Wrote the controller gallery to ${out}`)
  } else {
    const host = args.includes('--host')
    const html = galleryHtml()
    createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      res.end(html)
    }).listen(GALLERY_PORT, host ? '0.0.0.0' : '127.0.0.1', () => {
      console.log(`The phone controllers: http://localhost:${GALLERY_PORT}`)
      const lan = host && lanAddress()
      if (lan) console.log(`On a phone on this Wi-Fi: http://${lan}:${GALLERY_PORT}`)
      else if (!host) console.log(`(${CMD} controllers --host to open it on a phone on the same Wi-Fi)`)
    })
  }
}
