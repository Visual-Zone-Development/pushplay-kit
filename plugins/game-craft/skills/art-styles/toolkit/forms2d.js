// 2D shape builders (art-styles skill). Each returns a closed outline as a list of [x, y] points, so the same
// shape can be filled, outlined, wobbled, rasterised to pixels or extruded into a card.
// Use them instead of bare ellipses and rectangles: a limb is a tapered capsule, a hand is a paw with fingers,
// foliage and clouds are unions of circles, straps and trims are bands along a line.
const TAU = Math.PI * 2

export function ellipse(cx, cy, rx, ry, n = 48, a0 = 0, a1 = TAU, rot = 0) {
  const pts = [],
    full = Math.abs(a1 - a0 - TAU) < 1e-6,
    c = Math.cos(rot),
    s = Math.sin(rot)
  for (let i = 0; i < (full ? n : n + 1); i++) {
    const a = a0 + ((a1 - a0) * i) / n,
      x = Math.cos(a) * rx,
      y = Math.sin(a) * ry
    pts.push([cx + x * c - y * s, cy + x * s + y * c])
  }
  return pts
}
export const rect = (x, y, w, h) => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h]
]
export function roundRect(x, y, w, h, r) {
  const pts = [],
    c = [
      [x + w - r, y + r, -Math.PI / 2],
      [x + w - r, y + h - r, 0],
      [x + r, y + h - r, Math.PI / 2],
      [x + r, y + r, Math.PI]
    ]
  for (const [cx, cy, a0] of c)
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2)
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
    }
  return pts
}
export function archRect(x, y, w, h) {
  const r = w / 2,
    pts = [[x, y + h]]
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI
    pts.push([x + r + Math.cos(a) * r, y + r + Math.sin(a) * r])
  }
  pts.push([x + w, y + h])
  return pts
}
// leafy / cloudy outline: a circle whose radius bumps k times
export function blob(cx, cy, r, k, amp, n = 72, sy = 1, phase = 0) {
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU,
      rr = r * (1 + amp * Math.abs(Math.sin(a * k * 0.5 + phase)))
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sy])
  }
  return pts
}
// outline of a union of circles, sampled from a centre (for clouds)
export function unionOutline(circles, cx, cy, n = 96, floor = Infinity) {
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU,
      dx = Math.cos(a),
      dy = Math.sin(a)
    let best = 0
    for (const [x, y, r] of circles) {
      const ox = cx - x,
        oy = cy - y,
        b = ox * dx + oy * dy,
        c = ox * ox + oy * oy - r * r,
        disc = b * b - c
      if (disc >= 0) best = Math.max(best, -b + Math.sqrt(disc))
    }
    pts.push([cx + dx * best, Math.min(floor, cy + dy * best)])
  }
  return pts
}
// a limb: a tapered capsule from (x1,y1) radius r1 to (x2,y2) radius r2
export function capsule(x1, y1, x2, y2, r1, r2, n = 10) {
  const a = Math.atan2(y2 - y1, x2 - x1),
    pts = []
  for (let i = 0; i <= n; i++) {
    const t = a + Math.PI / 2 + (i / n) * Math.PI
    pts.push([x1 + Math.cos(t) * r1, y1 + Math.sin(t) * r1])
  }
  for (let i = 0; i <= n; i++) {
    const t = a - Math.PI / 2 + (i / n) * Math.PI
    pts.push([x2 + Math.cos(t) * r2, y2 + Math.sin(t) * r2])
  }
  return pts
}
// a webbed hand or foot: a palm with finger bumps fanned around dir
export function paw(cx, cy, dir, palm, len, spread = 0.55, fingers = 3, sy = 1, n = 60) {
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    let r = palm
    for (let f = 0; f < fingers; f++) {
      const fa = dir + (f - (fingers - 1) / 2) * spread
      let d = Math.atan2(Math.sin(a - fa), Math.cos(a - fa))
      const b = Math.max(0, 1 - (d / 0.3) ** 2)
      r = Math.max(r, palm + len * Math.pow(b, 0.8))
    }
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * sy])
  }
  return pts
}
// a band of width w along a polyline (straps, trims)
export function band(line, w) {
  const L = [],
    R = []
  for (let i = 0; i < line.length; i++) {
    const p = line[Math.max(0, i - 1)],
      q = line[Math.min(line.length - 1, i + 1)]
    const dx = q[0] - p[0],
      dy = q[1] - p[1],
      l = Math.hypot(dx, dy) || 1,
      nx = -dy / l,
      ny = dx / l
    L.push([line[i][0] + (nx * w) / 2, line[i][1] + (ny * w) / 2])
    R.unshift([line[i][0] - (nx * w) / 2, line[i][1] - (ny * w) / 2])
  }
  return [...L, ...R]
}
export const curve = (p0, p1, p2, n = 14) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n,
      u = 1 - t
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]
  })
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
export const rot = (pts, cx, cy, a) =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)])
export function seeded(seed) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}
