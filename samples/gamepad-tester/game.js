// Loaded as an ES module and fetches JSON: both fail under file://, so this also
// checks that the launcher's game protocol works.
import { clamp, randomStar } from './util.js'

const config = await fetch('./levels.json').then((r) => r.json())
const canvas = document.getElementById('c')
const ctx = canvas.getContext('2d')
const hud = document.getElementById('hud')
const padsEl = document.getElementById('pads')

let w = 0
let h = 0
function resize() {
  w = canvas.width = innerWidth * devicePixelRatio
  h = canvas.height = innerHeight * devicePixelRatio
}
addEventListener('resize', resize)
resize()

const ship = { x: w / 2, y: h / 2, r: 22 * devicePixelRatio }
let stars = Array.from({ length: config.starCount }, () => randomStar(w, h, config.colors))
let score = 0
let best = Number(localStorage.getItem('best') ?? 0)
const keys = new Set()
addEventListener('keydown', (e) => keys.add(e.key))
addEventListener('keyup', (e) => keys.delete(e.key))

let last = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now

  let dx = 0
  let dy = 0
  const pads = navigator.getGamepads().filter(Boolean)
  for (const p of pads) {
    if (Math.abs(p.axes[0]) > 0.15) dx += p.axes[0]
    if (Math.abs(p.axes[1]) > 0.15) dy += p.axes[1]
    if (p.buttons[14]?.pressed) dx -= 1
    if (p.buttons[15]?.pressed) dx += 1
    if (p.buttons[12]?.pressed) dy -= 1
    if (p.buttons[13]?.pressed) dy += 1
  }
  if (keys.has('ArrowLeft')) dx -= 1
  if (keys.has('ArrowRight')) dx += 1
  if (keys.has('ArrowUp')) dy -= 1
  if (keys.has('ArrowDown')) dy += 1
  const boost = pads.some((p) => p.buttons[0]?.pressed) || keys.has(' ') ? 1.8 : 1

  const speed = config.speed * devicePixelRatio * boost
  ship.x = clamp(ship.x + clamp(dx, -1, 1) * speed * dt, ship.r, w - ship.r)
  ship.y = clamp(ship.y + clamp(dy, -1, 1) * speed * dt, ship.r, h - ship.r)

  stars = stars.map((s) => {
    if (Math.hypot(s.x - ship.x, s.y - ship.y) < s.r + ship.r) {
      score++
      if (score > best) {
        best = score
        localStorage.setItem('best', String(best))
      }
      return randomStar(w, h, config.colors)
    }
    return s
  })

  ctx.fillStyle = '#10131a'
  ctx.fillRect(0, 0, w, h)
  for (const s of stars) {
    ctx.fillStyle = s.color
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#eef0f5'
  ctx.beginPath()
  ctx.moveTo(ship.x, ship.y - ship.r)
  ctx.lineTo(ship.x + ship.r * 0.8, ship.y + ship.r)
  ctx.lineTo(ship.x - ship.r * 0.8, ship.y + ship.r)
  ctx.closePath()
  ctx.fill()

  hud.textContent = `Score ${score}   Best ${best}   (A / Space = boost)`
  padsEl.textContent = pads.length
    ? pads
        .map(
          (p) =>
            `#${p.index} ${p.id.slice(0, 48)}\n   buttons: ${p.buttons.map((b, i) => (b.pressed ? i : '·')).join(' ')}\n   axes: ${p.axes.map((a) => a.toFixed(2)).join(' ')}`
        )
        .join('\n')
    : 'No gamepad detected: press a button'
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
