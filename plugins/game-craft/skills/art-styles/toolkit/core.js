// Shared helpers for the art-style lineup (art-styles skill): seeded random, noise, colour ramps, canvas finishing passes.
// The scene itself is in scene2d.js (2D) and model3d.js (3D); every style draws that same scene.
export const W = 640,
  H = 400

// ---------- random, noise, colour ----------
export function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
export function noise2(x, y, s = 0) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    xf = x - xi,
    yf = y - yi
  const u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi, s),
    b = hash(xi + 1, yi, s),
    c = hash(xi, yi + 1, s),
    d = hash(xi + 1, yi + 1, s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
export function fbm(x, y, s = 0, oct = 4) {
  let a = 0,
    f = 1,
    amp = 0.5
  for (let i = 0; i < oct; i++) {
    a += amp * noise2(x * f, y * f, s + i * 17)
    f *= 2
    amp *= 0.5
  }
  return a
}
export function hex(c) {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export function rgb([r, g, b], a = 1) {
  return a === 1 ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`
}
export function mix(a, b, t) {
  const A = typeof a === 'string' ? hex(a) : a,
    B = typeof b === 'string' ? hex(b) : b
  return A.map((v, i) => v + (B[i] - v) * t)
}
export function toHsl([r, g, b]) {
  r /= 255
  g /= 255
  b /= 255
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    l = (mx + mn) / 2
  let h = 0,
    s = 0
  if (mx !== mn) {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
    h *= 60
  }
  return [h, s, l]
}
export function fromHsl([h, s, l]) {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(1, s))
  l = Math.max(0, Math.min(1, l))
  const c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}
function towards(h, target, amt) {
  let d = ((target - h + 540) % 360) - 180
  return h + Math.sign(d) * Math.min(Math.abs(d), amt)
}
// Hue-shifted ramp: shadows toward blue-violet, highlights toward warm yellow.
export function ramp(c) {
  const [h, s, l] = toHsl(typeof c === 'string' ? hex(c) : c)
  return {
    light: fromHsl([towards(h, 55, 10), s * 0.95, Math.min(0.95, l + 0.13)]),
    base: fromHsl([h, s, l]),
    dark: fromHsl([towards(h, 250, 14), s * 0.92, l - 0.15]),
    darkest: fromHsl([towards(h, 250, 24), s * 0.8, Math.max(0.06, l - 0.33)])
  }
}
export function lum([r, g, b]) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export { shapes2d, NATURAL } from './scene2d.js'
import { colorOf } from './scene2d.js'
// colour of a role in palette P (detail roles derive from main ones), as [r,g,b]
export function col(P, role) {
  return colorOf(P, role, hex, toHsl, fromHsl)
}

export function path(ctx, pts, wob = 0, seed = 1, open = false) {
  const r = rng(seed)
  ctx.beginPath()
  pts.forEach(([x, y], i) => {
    const jx = wob ? (r() - 0.5) * wob : 0,
      jy = wob ? (r() - 0.5) * wob : 0
    i ? ctx.lineTo(x + jx, y + jy) : ctx.moveTo(x + jx, y + jy)
  })
  if (!open) ctx.closePath()
}

export function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

// Bayer 4x4 and 8x8 thresholds
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
export const BAYER8 = (() => {
  const m = []
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      let v = 0,
        xx = x,
        yy = y ^ x
      for (let b = 0; b < 3; b++) {
        v = (v << 2) | (((yy >> (2 - b)) & 1) << 1) | ((xx >> (2 - b)) & 1)
      }
      m.push((v + 0.5) / 64)
    }
  return m
})()

// A blurred copy of the image, masked to the top and bottom bands (tilt-shift).
export function tiltShift(src, band = 0.32, blur = 6, sat = 1.2) {
  const w = src.width,
    h = src.height,
    out = canvas(w, h),
    o = out.getContext('2d')
  o.filter = `saturate(${sat}) contrast(1.06)`
  o.drawImage(src, 0, 0)
  o.filter = 'none'
  const b = canvas(w, h),
    bc = b.getContext('2d')
  bc.filter = `blur(${blur}px) saturate(${sat})`
  bc.drawImage(src, 0, 0)
  bc.filter = 'none'
  bc.globalCompositeOperation = 'destination-in'
  const g = bc.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(band, 'rgba(0,0,0,0)')
  g.addColorStop(1 - band * 0.55, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,1)')
  bc.fillStyle = g
  bc.fillRect(0, 0, w, h)
  o.drawImage(b, 0, 0)
  return out
}

export function grain(ctx, w, h, amt = 0.14, seed = 3, blend = 'overlay') {
  const t = canvas(256, 256),
    tc = t.getContext('2d'),
    id = tc.createImageData(256, 256),
    r = rng(seed)
  for (let i = 0; i < id.data.length; i += 4) {
    const v = r() * 255
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v
    id.data[i + 3] = 255
  }
  tc.putImageData(id, 0, 0)
  ctx.save()
  ctx.globalAlpha = amt
  ctx.globalCompositeOperation = blend
  ctx.fillStyle = ctx.createPattern(t, 'repeat')
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}
export function vignette(ctx, w, h, strength = 0.45, color = '0,0,0') {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.55)
  g.addColorStop(0, `rgba(${color},0)`)
  g.addColorStop(1, `rgba(${color},${strength})`)
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}
