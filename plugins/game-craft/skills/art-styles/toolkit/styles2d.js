// Six 2D styles (art-styles skill), each drawing the same shapes2d() scene by its own rules for line, fill, shading
// and finish. Each function returns a canvas at twice the 640×400 scene size.
import { W, H, rng, noise2, fbm, hex, rgb, mix, ramp, shapes2d, path, canvas, grain, vignette, col } from './core.js'

const S = 2
function surface() {
  const c = canvas(W * S, H * S),
    x = c.getContext('2d')
  x.scale(S, S)
  return [c, x]
}
// tiny details: never outlined; far and ground shapes: flat, no outline
const SMALL = new Set([
  'shine',
  'pupil',
  'iris',
  'cheek',
  'spot',
  'flower',
  'flower2',
  'fruit',
  'knob',
  'buckle',
  'badge',
  'wallstone',
  'eaveShade',
  'shadow',
  'sill'
])
const FLAT = new Set(['sky', 'sun', 'cloud', 'hill', 'hilltree', 'ground', 'path'])
const objKey = (s) => (s.group === 'char' ? 'char' : ['tree', 'house', 'mailbox'].includes(s.part) ? s.part : '')
const glossy = (s) => ['body', 'eyebump', 'haunch'].includes(s.part)

function lit(ctx, s, base, amt = 1) {
  const r = ramp(base),
    b = s.box
  const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w * 0.7, b.y + b.h)
  g.addColorStop(0, rgb(mix(r.base, r.light, 0.9 * amt)))
  g.addColorStop(0.45, rgb(r.base))
  g.addColorStop(1, rgb(mix(r.base, r.dark, 0.95 * amt)))
  return g
}
function stroke(ctx, s, style, w, wob = 0, seed = 1) {
  ctx.strokeStyle = style
  ctx.lineWidth = w
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  path(ctx, s.pts, wob, seed, !!s.line)
  ctx.stroke()
}
// Thick silhouette line around a whole object, drawn before its parts: outer line heavier than inner lines.
function silhouettes(ctx, items, draw) {
  const seen = new Set()
  return (s) => {
    const k = objKey(s)
    if (!k || seen.has(k)) return
    seen.add(k)
    for (const q of items) if (objKey(q) === k && !q.line && !SMALL.has(q.role)) draw(q)
  }
}
function paperTex(w, h, base, dark, seed = 2, fibres = 120) {
  const c = canvas(w, h),
    x = c.getContext('2d'),
    id = x.createImageData(w, h),
    B = hex(base),
    D = hex(dark)
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const m = fbm(i / 90, j / 90, seed, 4) * 0.7 + fbm(i / 7, j / 7, seed + 9, 2) * 0.3
      const t = Math.max(0, m - 0.35) * 0.5 + (noise2(i * 1.7, j * 1.7, seed + 3) - 0.5) * 0.12,
        k = (j * w + i) * 4,
        c2 = mix(B, D, Math.max(0, Math.min(1, t)))
      id.data[k] = c2[0]
      id.data[k + 1] = c2[1]
      id.data[k + 2] = c2[2]
      id.data[k + 3] = 255
    }
  x.putImageData(id, 0, 0)
  const r = rng(seed)
  x.strokeStyle = rgb(D, 0.18)
  x.lineWidth = 1
  for (let i = 0; i < fibres; i++) {
    const px = r() * w,
      py = r() * h,
      a = r() * 6.28,
      l = 6 + r() * 18
    x.beginPath()
    x.moveTo(px, py)
    x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + 3, py + Math.sin(a) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l)
    x.stroke()
  }
  return c
}
// brush-like line: jittered passes of varying width
function inkLine(ctx, s, color, width = 2, seed = 1, passes = 2, wob = 1.2) {
  const pts = s.pts,
    n = s.line ? pts.length - 1 : pts.length
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (let p = 0; p < passes; p++) {
    const r = rng(seed * 13 + p)
    for (let i = 0; i < n; i++) {
      const a = pts[i],
        b = pts[(i + 1) % pts.length]
      ctx.lineWidth = width * (0.55 + 0.9 * noise2(i * 0.35, p * 3, seed))
      ctx.beginPath()
      ctx.moveTo(a[0] + (r() - 0.5) * wob, a[1] + (r() - 0.5) * wob)
      ctx.lineTo(b[0] + (r() - 0.5) * wob, b[1] + (r() - 0.5) * wob)
      ctx.stroke()
    }
  }
  ctx.restore()
}

// ---------- lit vector ----------
export function flatVector() {
  const [c, ctx] = surface()
  const P = {
    hill: '#7ccf8a',
    ground: '#4bb56c',
    path: '#ffd38a',
    leaves: '#2f9e6a',
    roof: '#ff7a6b',
    mailbox: '#3a7bff',
    cap: '#ff4f5e',
    frog: '#62d35a',
    wall: '#fff1d6',
    sun: '#ffd84a',
    foot: '#3fae4c',
    trunk: '#8a5a3c',
    belly: '#f4f7c0',
    bag: '#b9743c',
    capband: '#27306b'
  }
  const ink = '#15183a',
    items = shapes2d()
  const sil = silhouettes(ctx, items, (q) => stroke(ctx, q, ink, 6.5))
  const sky = ctx.createLinearGradient(0, 0, 0, 270)
  sky.addColorStop(0, '#3aa8f0')
  sky.addColorStop(1, '#c9eeff')
  for (const s of items) {
    const base = col(P, s.role)
    if (s.role === 'sky') {
      ctx.fillStyle = sky
      path(ctx, s.pts)
      ctx.fill()
      continue
    }
    if (s.role === 'shadow') {
      ctx.fillStyle = 'rgba(21,24,58,0.28)'
      path(ctx, s.pts)
      ctx.fill()
      continue
    }
    if (s.role === 'eaveShade') {
      ctx.fillStyle = 'rgba(21,24,58,0.22)'
      path(ctx, s.pts)
      ctx.fill()
      continue
    }
    if (s.line) {
      stroke(ctx, s, s.group === 'char' ? ink : rgb(base), s.w * (s.group === 'char' ? 1.25 : 1))
      continue
    }
    sil(s)
    if (!FLAT.has(s.role) && !SMALL.has(s.role)) stroke(ctx, s, ink, 2.4)
    ctx.fillStyle = FLAT.has(s.role) ? rgb(base) : lit(ctx, s, base)
    path(ctx, s.pts)
    ctx.fill()
    if (s.role === 'hill' || s.role === 'ground') {
      // one lighter rim along the top so layers separate
      ctx.save()
      path(ctx, s.pts)
      ctx.clip()
      ctx.strokeStyle = rgb(mix(base, [255, 255, 255], 0.28))
      ctx.lineWidth = 5
      ctx.beginPath()
      s.pts.slice(0, -2).forEach(([x, y], j) => (j ? ctx.lineTo(x, y + 1) : ctx.moveTo(x, y + 1)))
      ctx.stroke()
      ctx.restore()
    }
    // highlight edge facing the light, and a soft gloss on the frog's round forms
    if (!FLAT.has(s.role) && !SMALL.has(s.role) && s.box.w > 12) {
      ctx.save()
      path(ctx, s.pts)
      ctx.clip()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 2
      ctx.translate(1.6, 1.6)
      path(ctx, s.pts)
      ctx.stroke()
      ctx.restore()
    }
    if (glossy(s)) {
      const b = s.box
      ctx.save()
      path(ctx, s.pts)
      ctx.clip()
      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      ctx.beginPath()
      ctx.ellipse(b.x + b.w * 0.3, b.y + b.h * 0.26, b.w * 0.2, b.h * 0.13, -0.5, 0, 6.28)
      ctx.fill()
      ctx.restore()
    }
  }
  return c
}

// gouache form shading: an off-centre radial gradient per form (centre up-left, radius ~0.75 of the form)
function gouache(ctx, s, base) {
  const r = ramp(base),
    b = s.box,
    R = Math.max(b.w, b.h) * 0.75
  const g = ctx.createRadialGradient(b.x + b.w * 0.44, b.y + b.h * 0.32, 0, b.x + b.w * 0.44, b.y + b.h * 0.32, R)
  g.addColorStop(0, rgb(mix(r.base, r.light, 0.75)))
  g.addColorStop(0.5, rgb(r.base))
  g.addColorStop(0.82, rgb(mix(r.base, r.dark, 0.7)))
  g.addColorStop(1, rgb(r.dark))
  return g
}

// ---------- storybook paper & ink ----------
export function storybook() {
  const [c, ctx] = surface()
  const P = {
    hill: '#88a878',
    ground: '#9fae6a',
    path: '#e3cfa0',
    leaves: '#5d8a5a',
    roof: '#b4553e',
    wall: '#efe0bf',
    frog: '#89b05a',
    belly: '#efe6bd',
    cap: '#c8372d',
    mailbox: '#4d6f8c',
    bag: '#9a6a3a',
    sun: '#f2d48a',
    cloud: '#f4ecd8',
    foot: '#6e9a48',
    trunk: '#7a5a3c',
    trim: '#f4ead2',
    stone: '#b5aa94',
    flag: '#c8372d',
    iris: '#d9a441',
    flower: '#d9735f',
    capband: '#3a3f5a',
    window: '#f0cf80'
  }
  const sky = canvas(W, H),
    sc = sky.getContext('2d'),
    id = sc.createImageData(W, H),
    A = hex('#4e8c8a'),
    Bc = hex('#a9cdb9'),
    C = hex('#e8dcb5')
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = fbm(x / 120, y / 90, 5, 4),
        t = (y / H) * 0.9 + (n - 0.5) * 0.6,
        cc = t < 0.5 ? mix(A, Bc, t * 2) : mix(Bc, C, (t - 0.5) * 2),
        k = (y * W + x) * 4
      id.data[k] = cc[0]
      id.data[k + 1] = cc[1]
      id.data[k + 2] = cc[2]
      id.data[k + 3] = 255
    }
  sc.putImageData(id, 0, 0)
  const r = rng(11)
  for (let i = 0; i < 260; i++) {
    const x = r() * W,
      y = r() * 280
    sc.fillStyle = rgb(mix(A, C, r()), 0.12)
    sc.beginPath()
    sc.ellipse(x, y, 14 + r() * 22, 6 + r() * 10, r() * 3, 0, 6.28)
    sc.fill()
  }
  ctx.drawImage(sky, 0, 0)
  const paper = paperTex(W, H, '#f3e7cc', '#c9b48a', 4, 60),
    ink = '#2a2018',
    items = shapes2d()
  const sil = silhouettes(ctx, items, (q) => inkLine(ctx, q, ink, 3.6, q.pts.length, 2, 1.4))
  let i = 0
  for (const s of items) {
    i++
    const base = col(P, s.role)
    if (s.role === 'sky') continue
    if (s.role === 'shadow' || s.role === 'eaveShade') {
      ctx.fillStyle = 'rgba(60,40,30,0.25)'
      path(ctx, s.pts)
      ctx.fill()
      continue
    }
    if (s.line) {
      inkLine(ctx, s, s.group === 'char' ? ink : rgb(mix(base, hex(ink), 0.45)), s.w * 0.9, i, 1, 0.8)
      continue
    }
    sil(s)
    ctx.fillStyle = s.group === 'bg' ? rgb(base, 0.85) : gouache(ctx, s, base)
    path(ctx, s.pts, 0.8, i)
    ctx.fill()
    // dabs of a second tone inside big shapes: visible brushwork
    if (!SMALL.has(s.role) && s.box.w > 26 && s.role !== 'path') {
      ctx.save()
      path(ctx, s.pts)
      ctx.clip()
      const rr = rng(i),
        rp = ramp(base)
      for (let k = 0; k < Math.min(60, (s.box.w * s.box.h) / 160); k++) {
        const x = s.box.x + rr() * s.box.w,
          y = s.box.y + rr() * s.box.h,
          t = ((x - s.box.x) / s.box.w) * 0.5 + ((y - s.box.y) / s.box.h) * 0.5
        ctx.fillStyle = rgb(t > 0.5 ? rp.dark : rp.light, 0.16)
        ctx.beginPath()
        ctx.ellipse(x, y, 5 + rr() * 9, 2 + rr() * 4, rr() * 3, 0, 6.28)
        ctx.fill()
      }
      ctx.restore()
    }
    ctx.save()
    path(ctx, s.pts)
    ctx.clip()
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = 0.35
    ctx.drawImage(paper, 0, 0)
    ctx.restore()
    if (!FLAT.has(s.role) && !SMALL.has(s.role)) inkLine(ctx, s, ink, 1.5, i, 2, 0.9)
  }
  ctx.save()
  ctx.globalAlpha = 0.12
  ctx.strokeStyle = '#f4ecd8'
  ctx.lineWidth = 3
  for (let gx = 0; gx < 4; gx++) {
    const x = 40 + gx * 170,
      y = 26
    ctx.beginPath()
    ctx.moveTo(x, y + 30)
    ctx.lineTo(x, y)
    ctx.lineTo(x + 40, y)
    ctx.lineTo(x + 40, y + 20)
    ctx.lineTo(x + 18, y + 20)
    ctx.lineTo(x + 18, y + 10)
    ctx.stroke()
  }
  ctx.restore()
  vignette(ctx, W, H, 0.4, '40,25,15')
  grain(ctx, W, H, 0.18)
  return c
}

// ---------- comic / halftone ----------
export function comic() {
  const [c, ctx] = surface()
  const P = {
    sun: '#ffe14d',
    hill: '#7bd36b',
    ground: '#58c04a',
    path: '#ffd27a',
    leaves: '#2fae4e',
    roof: '#ff4b3e',
    wall: '#fff4d6',
    mailbox: '#2b6cff',
    frog: '#5fd35a',
    cap: '#ff2e2e',
    bag: '#c9792f',
    belly: '#fff6a8',
    foot: '#3fb548',
    trunk: '#9a5a2e',
    trim: '#ffffff',
    capband: '#1d2a8a',
    iris: '#ffd21f',
    flag: '#ff2e2e'
  }
  const items = shapes2d(),
    ink = '#111'
  const sil = silhouettes(ctx, items, (q) => {
    stroke(ctx, q, ink, 5.5)
    ctx.save()
    ctx.translate(1.3, 1.8)
    stroke(ctx, q, ink, 5.5)
    ctx.restore()
  })
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, H)
  for (const s of items) {
    const base = col(P, s.role)
    if (s.role === 'sky') {
      ctx.fillStyle = '#e9f8ff'
      path(ctx, s.pts)
      ctx.fill()
      ctx.fillStyle = '#58c6ff'
      for (let y = 0; y < 280; y += 7)
        for (let x = (y / 7) % 2 ? 3.5 : 0; x < W; x += 7) {
          const r = 3.2 * (1 - y / 300)
          if (r > 0.3) {
            ctx.beginPath()
            ctx.arc(x, y, r, 0, 6.28)
            ctx.fill()
          }
        }
      continue
    }
    if (s.role === 'shadow') {
      ctx.fillStyle = ink
      path(ctx, s.pts)
      ctx.fill()
      continue
    }
    if (s.role === 'eaveShade') {
      ctx.fillStyle = 'rgba(17,17,17,0.35)'
      path(ctx, s.pts)
      ctx.fill()
      continue
    }
    if (s.line) {
      stroke(ctx, s, ink, Math.max(1.3, s.w * 1.15))
      continue
    }
    sil(s)
    ctx.fillStyle = rgb(base)
    path(ctx, s.pts)
    ctx.fill()
    // halftone on the side away from the light; solid black "spotting" at the far edge of big forms
    if (s.group !== 'bg' && s.box.w > 12 && !SMALL.has(s.role) && !['eye', 'letter', 'trim', 'lid'].includes(s.role)) {
      ctx.save()
      path(ctx, s.pts)
      ctx.clip()
      ctx.fillStyle = rgb(ramp(base).darkest, 0.85)
      const b = s.box,
        step = s.role === 'ground' || s.role === 'path' ? 6 : 3.6
      for (let y = b.y; y < b.y + b.h; y += step)
        for (let x = b.x + ((y / step) % 2 ? step / 2 : 0); x < b.x + b.w; x += step) {
          const t = (((x - b.x) / b.w) * 0.6 + ((y - b.y) / b.h) * 0.8) / 1.4,
            r = Math.max(0, (t - 0.45) * 2.4) * step * 0.42
          if (r > 0.2) {
            ctx.beginPath()
            ctx.arc(x, y, r, 0, 6.28)
            ctx.fill()
          }
        }
      ctx.restore()
    }
    if (s.role === 'cloud' || s.role === 'sun' || s.role === 'hill' || s.role === 'hilltree') stroke(ctx, s, ink, 2)
    else if (!FLAT.has(s.role) && !['shine', 'cheek', 'spot', 'eaveShade'].includes(s.role)) stroke(ctx, s, ink, SMALL.has(s.role) ? 1.1 : 2.2)
    if (s.role === 'ground') stroke(ctx, { pts: s.pts.slice(0, -2), line: true }, ink, 2.6)
    if (glossy(s)) {
      const b = s.box
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.ellipse(b.x + b.w * 0.28, b.y + b.h * 0.26, b.w * 0.13, b.h * 0.07, -0.5, 0, 6.28)
      ctx.fill()
    }
  }
  ctx.strokeStyle = ink
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  for (const [x, y, l] of [
    [214, 300, 26],
    [208, 314, 34],
    [216, 328, 22]
  ]) {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - l, y)
    ctx.stroke()
  }
  // waving lines by the raised hand
  for (const [a, r] of [
    [-0.9, 18],
    [-0.4, 20],
    [0.1, 18]
  ]) {
    ctx.beginPath()
    ctx.arc(366, 254, r, a - 0.18, a + 0.18)
    ctx.stroke()
  }
  ctx.fillStyle = '#fff'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.ellipse(292, 176, 70, 27, 0, 0, 6.28)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(300, 199)
  ctx.lineTo(304, 226)
  ctx.lineTo(282, 201)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillRect(284, 195, 16, 8)
  ctx.fillStyle = ink
  ctx.font = 'italic 900 19px "Comic Neue", "Comic Sans MS", Impact, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('SPECIAL', 292, 174)
  ctx.fillText('DELIVERY!', 292, 194)
  ctx.lineWidth = 8
  ctx.strokeStyle = ink
  ctx.strokeRect(4, 4, W - 8, H - 8)
  return c
}

// recursive midpoint displacement of a closed polygon (after Tyler Hobbs' watercolour method)
function deform(pts, levels, variance, r) {
  let p = pts
  for (let l = 0; l < levels; l++) {
    const out = []
    for (let i = 0; i < p.length; i++) {
      const a = p[i],
        b = p[(i + 1) % p.length],
        g = (r() + r() + r() - 1.5) * 1.2 // roughly gaussian
      const g2 = (r() + r() + r() - 1.5) * 1.2
      out.push(a, [(a[0] + b[0]) / 2 + g * variance, (a[1] + b[1]) / 2 + g2 * variance])
    }
    p = out
    variance /= 2
  }
  return p
}

// ---------- watercolour ----------
export function watercolour() {
  const [c, ctx] = surface()
  ctx.drawImage(paperTex(W, H, '#fbf8f1', '#ddd5c3', 12, 30), 0, 0)
  const P = {
    sky: '#7cb8e0',
    hill: '#9cc58a',
    ground: '#86b86a',
    path: '#e8c890',
    leaves: '#5a9e56',
    roof: '#d0654c',
    wall: '#f2dcb8',
    frog: '#7cc35a',
    cap: '#de4a3a',
    mailbox: '#4f7fc0',
    bag: '#b07a48',
    sun: '#ffcf5a',
    belly: '#eef0b0',
    trim: '#f6efdf',
    foot: '#63a84c'
  }
  const items = shapes2d(),
    clouds = items.filter((q) => q.role === 'cloud')
  let i = 0
  for (const s of items) {
    i++
    if (s.role === 'cloud' || s.role === 'shine') continue
    const cc = col(P, s.role)
    if (s.role === 'sky') {
      for (let k = 0; k < 3; k++) {
        ctx.save()
        ctx.globalCompositeOperation = 'multiply'
        const g = ctx.createLinearGradient(0, 0, 0, 270)
        g.addColorStop(0, rgb(cc, 0.5))
        g.addColorStop(1, rgb(cc, 0.04))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.rect(0, 0, W, 280)
        for (const cl of clouds) {
          const p = cl.pts
          ctx.moveTo(p[0][0] + k * 2, p[0][1])
          for (let j = p.length - 1; j >= 0; j--) ctx.lineTo(p[j][0] + k * 2, p[j][1] + Math.sin(j + k) * 2)
        }
        ctx.fill('evenodd')
        ctx.restore()
      }
      continue
    }
    if (s.role === 'shadow' || s.role === 'eaveShade') {
      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      ctx.filter = 'blur(2px)'
      ctx.fillStyle = 'rgba(90,80,150,0.3)'
      path(ctx, s.pts, 3, i)
      ctx.fill()
      ctx.restore()
      continue
    }
    if (s.line) {
      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      stroke(ctx, s, rgb(mix(cc, [70, 60, 90], 0.3), 0.7), s.w * 0.9, 1.2, i)
      ctx.restore()
      continue
    }
    // Reserve white paper under each shape, then build the wash from many faint, differently deformed copies
    // of the outline (recursive midpoint displacement), so edges go soft and blotchy and pigment pools unevenly.
    const small = SMALL.has(s.role),
      size = Math.max(6, Math.min(s.box.w, s.box.h))
    if (s.role !== 'ground' && s.role !== 'hill') {
      ctx.fillStyle = '#fbf8f1'
      path(ctx, s.pts, 0, 1)
      ctx.fill()
    }
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    const rr = rng(i * 31 + 5),
      base = small ? s.pts : deform(s.pts, 1, size * 0.02, rr),
      layers = small ? 4 : 16
    for (let k = 0; k < layers; k++) {
      const poly = small ? base : deform(base, 2, size * (s.group === 'char' ? 0.022 : 0.045), rr)
      ctx.fillStyle = rgb(cc, small ? 0.3 : s.group === 'bg' ? 0.06 : s.group === 'char' ? 0.11 : 0.085)
      ctx.beginPath()
      poly.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.closePath()
      ctx.fill()
    }
    if (!small) {
      ctx.filter = 'blur(0.7px)'
      stroke(ctx, s, rgb(ramp(cc).dark, 0.4), 1.4, 1.5, i * 7)
      if (s.box.w > 12) {
        path(ctx, s.pts, 0, 1)
        ctx.clip()
        ctx.filter = 'blur(4px)'
        const b = s.box
        ctx.fillStyle = rgb(mix(ramp(cc).dark, [90, 80, 160], 0.35), 0.4)
        ctx.beginPath()
        ctx.ellipse(b.x + b.w * 0.85, b.y + b.h * 0.85, b.w * 0.55, b.h * 0.5, 0, 0, 6.28)
        ctx.fill()
      }
    }
    ctx.restore()
  }
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  const r = rng(5)
  for (let k = 0; k < 4000; k++) {
    ctx.fillStyle = `rgba(120,100,80,${r() * 0.12})`
    ctx.fillRect(r() * W, r() * H, 1, 1)
  }
  ctx.restore()
  let j = 0
  for (const s of items) {
    j++
    if (s.line || SMALL.has(s.role) || FLAT.has(s.role)) continue
    ctx.strokeStyle = 'rgba(70,60,60,0.38)'
    ctx.lineWidth = 0.8
    path(ctx, s.pts, 0.9, j + 90)
    ctx.stroke()
  }
  return c
}

// ---------- neon / synthwave ----------
export function neon() {
  const [c, ctx] = surface()
  const sky = ctx.createLinearGradient(0, 0, 0, 276)
  sky.addColorStop(0, '#07000f')
  sky.addColorStop(0.7, '#2a0838')
  sky.addColorStop(1, '#5a0f4f')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  ctx.beginPath()
  ctx.arc(300, 214, 96, Math.PI, 0)
  ctx.clip()
  const sg = ctx.createLinearGradient(0, 118, 0, 214)
  sg.addColorStop(0, '#fff200')
  sg.addColorStop(1, '#ff2bd6')
  ctx.fillStyle = sg
  ctx.fillRect(200, 110, 200, 110)
  ctx.fillStyle = '#2a0838'
  for (let k = 0; k < 7; k++) ctx.fillRect(200, 162 + k * 8, 200, 1 + k * 0.7)
  ctx.restore()
  ctx.fillStyle = '#0b0016'
  ctx.fillRect(0, 276, W, H)
  ctx.save()
  ctx.strokeStyle = 'rgba(0,240,255,0.5)'
  ctx.lineWidth = 1.1
  ctx.shadowColor = '#00f0ff'
  ctx.shadowBlur = 6
  for (let k = 0; k < 14; k++) {
    const y = 276 + Math.pow(k / 13, 2) * 126
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }
  for (let k = -16; k <= 16; k++) {
    ctx.beginPath()
    ctx.moveTo(320 + k * 12, 276)
    ctx.lineTo(320 + k * 90, 400)
    ctx.stroke()
  }
  ctx.restore()
  const K = {
    hill: '#ff2bd6',
    hilltree: '#b01fa0',
    trunk: '#ff8a00',
    leaves: '#39ff88',
    leavesBack: '#1fae5c',
    chimney: '#fff200',
    chimneySide: '#fff200',
    chimneyCap: '#fff200',
    wall: '#fff200',
    sidewall: '#c9bd00',
    roof: '#ff2bd6',
    roofEdge: '#ff2bd6',
    trim: '#ffffff',
    window: '#00f0ff',
    windowDim: '#00f0ff',
    door: '#00f0ff',
    post: '#ff8a00',
    mailbox: '#00f0ff',
    mailboxSide: '#00b8c4',
    flag: '#ff2bd6',
    foot: '#39ff88',
    frog: '#39ff88',
    belly: '#b6ffd2',
    eye: '#ffffff',
    iris: '#fff200',
    cap: '#ff2bd6',
    capband: '#ff2bd6',
    brim: '#ff2bd6',
    strap: '#ff8a00',
    bag: '#ff8a00',
    flap: '#ff8a00',
    letter: '#ffffff',
    cloud: '#7a3cff',
    lid: '#39ff88',
    foundation: '#fff200',
    flowerbox: '#ff8a00',
    fruit: '#ff2bd6',
    badge: '#fff200',
    tile: '#ff2bd6',
    plank: '#00f0ff',
    mullion: '#00f0ff',
    bark: '#ff8a00',
    mouth: '#39ff88',
    grass: '#00f0ff',
    slot: '#ffffff',
    flagpole: '#ff8a00',
    fold: '#ffffff'
  }
  const skip = new Set([
    'sky',
    'sun',
    'ground',
    'path',
    'shadow',
    'eaveShade',
    'spot',
    'cheek',
    'wallstone',
    'stone',
    'flower',
    'flower2',
    'shine',
    'pupil',
    'sill',
    'foundationSide',
    'buckle',
    'knob',
    'mortar',
    'nostril'
  ])
  const glow = (pts, k, closed, w1 = 7, w2 = 1.6, a = 0.95) => {
    const d = () => {
      ctx.beginPath()
      pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      if (closed) ctx.closePath()
    }
    ctx.save()
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = rgb(hex(k), 0.22)
    ctx.lineWidth = w1
    d()
    ctx.stroke()
    ctx.strokeStyle = rgb(hex(k), a)
    ctx.lineWidth = w2
    d()
    ctx.stroke()
    ctx.restore()
  }
  const items = shapes2d()
  for (const s of items) {
    if (skip.has(s.role)) continue
    const k = K[s.role] || '#00f0ff'
    if (s.line) {
      glow(s.pts, k, false, 3, 0.9, s.role === 'mouth' ? 0.95 : 0.5)
      continue
    }
    ctx.fillStyle = s.role === 'hill' ? 'rgba(20,0,30,0.92)' : s.role === 'cloud' ? 'rgba(20,0,40,0.5)' : '#0b0016'
    path(ctx, s.pts)
    ctx.fill()
    // a faint inner tint so forms read as lit glass, not just wire
    if (s.group !== 'bg') {
      ctx.save()
      path(ctx, s.pts)
      ctx.clip()
      const b = s.box,
        g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h)
      g.addColorStop(0, rgb(hex(k), 0.28))
      g.addColorStop(1, rgb(hex(k), 0.03))
      ctx.fillStyle = g
      ctx.fillRect(b.x, b.y, b.w, b.h)
      ctx.restore()
    }
    if (s.role === 'window' || s.role === 'windowDim' || s.role === 'iris') {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.shadowColor = k
      ctx.shadowBlur = 14
      ctx.fillStyle = rgb(hex(k), 0.55)
      path(ctx, s.pts)
      ctx.fill()
      ctx.restore()
    }
    const small = s.box.w < 14
    glow(s.role === 'hill' ? s.pts.slice(0, -2) : s.pts, k, s.role !== 'hill', small ? 4 : 7, small ? 1.1 : 1.6)
  }
  const p = items.find((s) => s.role === 'path').pts,
    half = p.length / 2
  for (const seg of [p.slice(0, half), p.slice(half)]) glow(seg, '#ff7be8', false, 6, 1.4)
  const r = rng(8)
  ctx.fillStyle = '#fff'
  for (let k = 0; k < 60; k++) {
    ctx.globalAlpha = r() * 0.8
    ctx.fillRect(r() * W, r() * 150, 1.2, 1.2)
  }
  ctx.globalAlpha = 1
  // bloom: a blurred copy added back, then scanlines
  const copy = canvas(W * S, H * S)
  copy.getContext('2d').drawImage(c, 0, 0)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'lighter'
  ctx.filter = 'blur(12px)'
  ctx.globalAlpha = 0.45
  ctx.drawImage(copy, 0, 0)
  ctx.restore()
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1)
  return c
}

// ---------- pixel art: rasterised at 320×200, hue-shifted ramps, selective outline ----------
function inside(pts, x, y) {
  let c = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i],
      [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
export function pixel() {
  const w = 320,
    h = 200,
    sc = W / w
  const items = shapes2d().filter((s) => !['shadow', 'eaveShade', 'grass', 'mortar', 'fold', 'nostril'].includes(s.role))
  const ids = new Int16Array(w * h).fill(-1)
  items.forEach((s, k) => {
    if (s.line) {
      // one-pixel lines
      for (let i = 0; i < s.pts.length - 1; i++) {
        const [x0, y0] = s.pts[i],
          [x1, y1] = s.pts[i + 1],
          n = Math.ceil((Math.hypot(x1 - x0, y1 - y0) / sc) * 1.5) + 1
        for (let t = 0; t <= n; t++) {
          const x = Math.floor((x0 + ((x1 - x0) * t) / n) / sc),
            y = Math.floor((y0 + ((y1 - y0) * t) / n) / sc)
          if (x >= 0 && y >= 0 && x < w && y < h) ids[y * w + x] = k
        }
      }
      return
    }
    const b = s.box,
      x0 = Math.max(0, Math.floor(b.x / sc)),
      x1 = Math.min(w - 1, Math.ceil((b.x + b.w) / sc)),
      y0 = Math.max(0, Math.floor(b.y / sc)),
      y1 = Math.min(h - 1, Math.ceil((b.y + b.h) / sc))
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(s.pts, (x + 0.5) * sc, (y + 0.5) * sc)) ids[y * w + x] = k
  })
  const P = {
    sky: '#5fcde4',
    hill: '#6abe30',
    ground: '#4b9a2a',
    path: '#d9a066',
    leaves: '#37946e',
    frog: '#99e550',
    cap: '#d95763',
    roof: '#ac3232',
    wall: '#eec39a',
    mailbox: '#5b6ee1',
    bag: '#8f563b',
    door: '#663931',
    trunk: '#8f563b',
    sun: '#fbf236',
    belly: '#eef6b0',
    foot: '#6abe30',
    trim: '#f7efe0',
    stone: '#9badb7',
    capband: '#3f3f74',
    iris: '#fbf236',
    flag: '#d95763',
    window: '#fbf236'
  }
  const ramps = items.map((s) => ramp(col(P, s.role)))
  const keyOf = items.map((s) => objKey(s))
  const img = new ImageData(w, h)
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : ids[y * w + x])
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = ids[y * w + x],
        s = items[k],
        R = ramps[k]
      let cc = R.base
      if (s.role === 'sky') cc = y < 40 ? ramp('#3f9fd6').base : y < 84 ? R.base : ramp('#9be1f0').base
      else if (s.role === 'ground' || s.role === 'hill') {
        const n = noise2(x * 0.5, y * 0.8, 3)
        cc = n > 0.86 ? R.light : n < 0.07 ? R.dark : R.base
      } else if (s.line) cc = s.role === 'mouth' ? ramp(col(P, 'frog')).darkest : R.base
      else if (!SMALL.has(s.role) && !FLAT.has(s.role)) {
        const b = s.box,
          t = ((x * sc - b.x) / Math.max(1, b.w)) * 0.55 + ((y * sc - b.y) / Math.max(1, b.h)) * 0.45
        cc = t < 0.3 ? R.light : t > 0.68 ? R.dark : R.base
        // selective outline: where this object meets something behind it. Darkest step on the shadow side, one lighter on the lit side.
        const mine = keyOf[k]
        const edge = (n) => n >= 0 && n < k && (mine ? keyOf[n] !== mine : items[n].role !== s.role)
        const inner = (n) => n >= 0 && n < k && mine && keyOf[n] === mine && !items[n].line && items[n].role !== s.role && !SMALL.has(items[n].role)
        const up = at(x, y - 1),
          lf = at(x - 1, y),
          dn = at(x, y + 1),
          rt = at(x + 1, y)
        if (edge(dn) || edge(rt)) cc = R.darkest
        else if (edge(up) || edge(lf)) cc = mix(R.darkest, R.dark, 0.5)
        else if (inner(dn) || inner(rt) || inner(up) || inner(lf)) cc = R.dark
      }
      const o = (y * w + x) * 4
      img.data[o] = cc[0]
      img.data[o + 1] = cc[1]
      img.data[o + 2] = cc[2]
      img.data[o + 3] = 255
    }
  const small = canvas(w, h)
  small.getContext('2d').putImageData(img, 0, 0)
  const out = canvas(W * S, H * S),
    o = out.getContext('2d')
  o.imageSmoothingEnabled = false
  o.drawImage(small, 0, 0, W * S, H * S)
  return out
}
