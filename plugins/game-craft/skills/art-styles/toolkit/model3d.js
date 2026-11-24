// The 3D scene every style renders (art-styles skill): frog courier, tree, cottage and mailbox, built from shaped
// parts instead of bare primitives. A worked example for three.js; the same part lists work in any engine.
// buildModel(detail) returns parts [{ role, key, geo (world space), far, small, lobe, flat }] in draw/priority order.
// detail: 'high' (smooth), 'round' (smooth, boxes rounded), 'low' (faceted), 'ps1' (very low).
import * as THREE from 'three'
import { loftGeo, limbGeo, roundedBox } from './forms3d.js'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(1, 1, 1))
function seeded(seed) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// the path from the front of the scene to the cottage door, and its half-width along the way
export const pathCurve = () => new THREE.CatmullRomCurve3([V(0.1, 0, 2.8), V(0.3, 0, 1.4), V(0.85, 0, 0.35), V(1.45, 0, -0.35), V(1.87, 0, -0.8)])
export const pathHalfWidth = (t) => 0.36 - 0.16 * t

export function buildModel(d = 'high') {
  const hi = d === 'high' || d === 'round',
    parts = []
  const add = (role, key, g, m, o = {}) => {
    if (m) g.applyMatrix4(m)
    parts.push({ role, key, geo: g, ...o })
    return g
  }
  const sph = (r) => {
    const g = hi ? new THREE.SphereGeometry(1, 40, 28) : d === 'ps1' ? new THREE.SphereGeometry(1, 8, 6) : new THREE.IcosahedronGeometry(1, 1)
    g.scale(r[0], r[1], r[2])
    return g
  }
  const ico = (r) => {
    const g = hi ? new THREE.SphereGeometry(1, 48, 32) : d === 'ps1' ? new THREE.IcosahedronGeometry(1, 1) : new THREE.IcosahedronGeometry(1, 1)
    g.scale(r, r, r)
    return g
  }
  const box = (s) => (d === 'round' ? roundedBox(s, Math.min(...s) * 0.25) : new THREE.BoxGeometry(...s))
  const cyl = (r1, r2, h, arc) => new THREE.CylinderGeometry(r1, r2, h, hi ? 32 : 8, 1, false, 0, arc ?? Math.PI * 2)
  const loft = (sec) => loftGeo(sec, hi ? 36 : d === 'ps1' ? 7 : 8, hi ? 5 : 1)
  const limb = (a, b, r1, r2) => limbGeo(a, b, r1, r2, hi ? 18 : 6)
  const tube = (pts, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => V(...p))), hi ? 28 : 8, r, hi ? 8 : 4)

  // ---------- far: hill, ridge trees, sun, clouds ----------
  add('hill', 'far', sph([7.5, 2.6, 2.2]), M(0.6, -1.0, -7.2), { far: true })
  for (const [x, y, r] of [
    [-1.9, 1.5, 0.42],
    [-1.2, 1.72, 0.55],
    [-0.5, 1.75, 0.4],
    [3.0, 1.62, 0.5],
    [3.7, 1.5, 0.38]
  ])
    add('hilltree', 'far', ico(r), M(x, y, -6.9), { far: true })
  add('sun', 'far', sph([0.9, 0.9, 0.9]), M(5.2, 5.4, -14), { far: true })
  for (const [x, y, z, r] of [
    [-3.6, 3.8, -10, [1.0, 0.5, 0.6]],
    [-2.8, 4.05, -10, [0.8, 0.62, 0.6]],
    [-2.0, 3.85, -10, [0.6, 0.42, 0.5]],
    [-4.4, 3.7, -10, [0.6, 0.4, 0.5]],
    [0.6, 4.6, -11, [0.7, 0.36, 0.5]],
    [1.2, 4.72, -11, [0.5, 0.4, 0.4]]
  ])
    add('cloud', 'far', sph(r), M(x, y, z), { far: true })

  // ---------- path ribbon, stepping stones, grass, flowers ----------
  const curve = pathCurve()
  {
    const pos = [],
      idx = [],
      uv = [],
      n = 24
    for (let i = 0; i <= n; i++) {
      const t = i / n,
        p = curve.getPoint(t),
        tg = curve.getTangent(t),
        w = pathHalfWidth(t),
        nx = tg.z,
        nz = -tg.x
      pos.push(p.x - nx * w, 0.012, p.z - nz * w, p.x + nx * w, 0.012, p.z + nz * w)
      uv.push(0, t * 4, 1, t * 4)
    }
    for (let i = 0; i < n; i++) {
      const a = i * 2
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    g.computeVertexNormals()
    add('path', 'ground', g, null, { flat: true, small: true })
  }
  ;[0.16, 0.34, 0.52, 0.7, 0.88].forEach((t, i) => {
    const p = curve.getPoint(t),
      tg = curve.getTangent(t),
      o = i % 2 ? 0.1 : -0.1
    add('stone', 'ground', sph([0.19 - t * 0.05, 0.035, 0.14 - t * 0.03]), M(p.x + tg.z * o, 0.02, p.z - tg.x * o, 0, i * 0.9, 0), {
      small: true,
      lobe: true
    })
  })
  const r = seeded(11)
  for (let k = 0; k < 70; k++) {
    const x = -4 + r() * 8,
      z = -2.6 + r() * 4.6
    let near =
      Math.hypot(x, z - 0.35) < 0.95 ||
      Math.hypot(x + 1.75, z + 1.1) < 0.5 ||
      (x > 1.2 && z < -0.4 && z > -2.7 && x < 3.4) ||
      Math.hypot(x - 1.15, z - 0.15) < 0.25
    for (let t = 0; t <= 1; t += 0.1) if (curve.getPoint(t).distanceTo(V(x, 0, z)) < 0.5) near = true
    if (near) continue
    if (k % 6 === 0) {
      add('grass', 'ground', cyl(0.008, 0.008, 0.14), M(x, 0.07, z), { small: true })
      add(k % 12 ? 'flower' : 'flower2', 'ground', sph([0.04, 0.03, 0.04]), M(x, 0.15, z), { small: true })
    } else
      for (let b = 0; b < 3; b++) {
        const h = 0.1 + r() * 0.1
        add('grass', 'ground', new THREE.ConeGeometry(0.018, h, 4), M(x + (b - 1) * 0.03, h / 2, z, (r() - 0.5) * 0.3, 0, (b - 1) * -0.35), {
          small: true
        })
      }
  }

  // ---------- tree ----------
  const T = M(-1.75, 0, -1.1)
  const at = (G, m) => G.clone().multiply(m)
  add(
    'trunk',
    'tree',
    loft([
      [0, 0.32, 0.3],
      [0.05, 0.22, 0.21],
      [0.16, 0.155, 0.15],
      [0.55, 0.125, 0.125, 0.02],
      [0.95, 0.11, 0.11, 0],
      [1.4, 0.07, 0.07]
    ]),
    T
  )
  for (const [b, tip] of [
    [
      [0, 0.82, 0],
      [-0.5, 1.36, 0.08]
    ],
    [
      [0, 0.9, 0],
      [0.5, 1.4, 0.1]
    ],
    [
      [0, 0.78, 0.02],
      [0.02, 1.28, 0.38]
    ]
  ])
    add('trunk', 'tree', limb(b, tip, 0.07, 0.04), T)
  for (const [x, y, z, rr, role] of [
    [-0.25, 1.75, -0.36, 0.48, 'leavesBack'],
    [0.3, 1.8, -0.3, 0.45, 'leavesBack'],
    [0, 1.92, 0, 0.6, 'leaves'],
    [-0.54, 1.52, 0.1, 0.46, 'leaves'],
    [0.54, 1.55, 0.12, 0.47, 'leaves'],
    [0, 1.45, 0.42, 0.42, 'leaves'],
    [-0.3, 2.02, 0.26, 0.36, 'leavesLight'],
    [0.26, 2.08, 0.16, 0.33, 'leavesLight']
  ])
    add(role, 'tree', ico(rr), at(T, M(x, y, z)), { lobe: true })
  for (const [x, y, z] of [
    [-0.42, 1.52, 0.52],
    [0.5, 1.42, 0.55],
    [0.12, 1.86, 0.6],
    [-0.1, 1.3, 0.8]
  ])
    add('fruit', 'tree', sph([0.055, 0.055, 0.055]), at(T, M(x, y, z)), { small: true })

  // ---------- cottage: foundation, walls, gable, slab roof with overhang and shingle rows, trims, openings ----------
  const Hh = M(2.25, 0, -1.5, 0, -0.5, 0),
    ha = (m) => at(Hh, m)
  add('foundation', 'house', box([1.52, 0.16, 1.32]), ha(M(0, 0.08, 0)))
  add('wall', 'house', new THREE.BoxGeometry(1.4, 1.0, 1.2), ha(M(0, 0.66, 0)))
  {
    const sh = new THREE.Shape([new THREE.Vector2(-0.7, 0), new THREE.Vector2(0.7, 0), new THREE.Vector2(0, 0.62)])
    add('wall', 'house', new THREE.ExtrudeGeometry(sh, { depth: 1.2, bevelEnabled: false }), ha(M(0, 1.16, -0.6)))
  }
  const a = Math.atan2(0.62, 0.7),
    SL = Math.hypot(0.7, 0.62) + 0.22
  for (const sx of [-1, 1]) {
    const dir = [sx * Math.cos(a), -Math.sin(a)],
      nrm = [sx * Math.sin(a), Math.cos(a)]
    const P = (t, off) => [dir[0] * t + nrm[0] * off, 1.78 + dir[1] * t + nrm[1] * off]
    let [x, y] = P(SL / 2, 0.04)
    add('roof', 'house', box([SL + 0.04, 0.08, 1.62]), ha(M(x, y, 0, 0, 0, -sx * a)))
    for (let k = 0; k < 5; k++) {
      ;[x, y] = P(0.14 + k * 0.215 + 0.1, 0.092 - k * 0.001)
      add(k % 2 ? 'roof' : 'roofEdge', 'house', box([0.2, 0.035, 1.64]), ha(M(x, y, 0, 0, 0, -sx * a + sx * 0.07)), { small: true })
    }
    for (const z of [0.82, -0.82]) {
      ;[x, y] = P(SL / 2, -0.03)
      add('trim', 'house', box([SL, 0.1, 0.035]), ha(M(x, y, z, 0, 0, -sx * a)))
    }
  }
  add('roofEdge', 'house', box([0.14, 0.07, 1.66]), ha(M(0, 1.86, 0)))
  add('chimney', 'house', box([0.22, 0.62, 0.22]), ha(M(0.4, 1.78, -0.28)))
  add('chimneyCap', 'house', box([0.3, 0.07, 0.3]), ha(M(0.4, 2.12, -0.28)))
  // door
  add('trim', 'house', box([0.44, 0.76, 0.06]), ha(M(0, 0.54, 0.6)))
  add('door', 'house', box([0.33, 0.67, 0.06]), ha(M(0, 0.5, 0.62)))
  for (const x of [-0.08, 0, 0.08]) add('plank', 'house', new THREE.BoxGeometry(0.01, 0.62, 0.012), ha(M(x, 0.5, 0.652)), { small: true })
  add('knob', 'house', sph([0.025, 0.025, 0.025]), ha(M(0.11, 0.5, 0.665)), { small: true })
  add('stone', 'house', box([0.56, 0.09, 0.24]), ha(M(0, 0.045, 0.74)))
  // front windows, attic window
  for (const x of [-0.47, 0.47]) {
    add('trim', 'house', box([0.27, 0.33, 0.06]), ha(M(x, 0.8, 0.6)))
    add('window', 'house', new THREE.BoxGeometry(0.19, 0.25, 0.06), ha(M(x, 0.8, 0.612)), { small: true, glow: true })
    add('mullion', 'house', new THREE.BoxGeometry(0.022, 0.25, 0.02), ha(M(x, 0.8, 0.645)), { small: true })
    add('mullion', 'house', new THREE.BoxGeometry(0.19, 0.022, 0.02), ha(M(x, 0.8, 0.645)), { small: true })
    add('sill', 'house', box([0.32, 0.045, 0.1]), ha(M(x, 0.62, 0.64)), { small: true })
  }
  add('trim', 'house', cyl(0.125, 0.125, 0.06), ha(M(0, 1.4, 0.6, Math.PI / 2, 0, 0)))
  add('window', 'house', cyl(0.085, 0.085, 0.06), ha(M(0, 1.4, 0.612, Math.PI / 2, 0, 0)), { small: true, glow: true })
  add('mullion', 'house', new THREE.BoxGeometry(0.02, 0.17, 0.02), ha(M(0, 1.4, 0.645)), { small: true })
  add('mullion', 'house', new THREE.BoxGeometry(0.17, 0.02, 0.02), ha(M(0, 1.4, 0.645)), { small: true })
  // side window with a flower box
  add('trim', 'house', box([0.06, 0.35, 0.42]), ha(M(0.7, 0.82, 0)))
  add('windowDim', 'house', new THREE.BoxGeometry(0.06, 0.27, 0.34), ha(M(0.712, 0.82, 0)), { small: true, glow: true })
  add('mullion', 'house', new THREE.BoxGeometry(0.02, 0.27, 0.022), ha(M(0.745, 0.82, 0)), { small: true })
  add('mullion', 'house', new THREE.BoxGeometry(0.02, 0.022, 0.34), ha(M(0.745, 0.82, 0)), { small: true })
  add('flowerbox', 'house', box([0.12, 0.09, 0.48]), ha(M(0.78, 0.6, 0)))
  for (let k = 0; k < 6; k++)
    add(k % 2 ? 'flower' : 'flower2', 'house', sph([0.045, 0.04, 0.045]), ha(M(0.78, 0.67 + (k % 3) * 0.012, -0.19 + k * 0.076)), { small: true })

  // ---------- mailbox ----------
  const Mb = M(1.15, 0, 0.15, 0, -0.3, 0),
    ma = (m) => at(Mb, m)
  add('post', 'mailbox', box([0.075, 0.72, 0.075]), ma(M(0, 0.36, 0)))
  add('mailbox', 'mailbox', box([0.23, 0.13, 0.38]), ma(M(0, 0.77, 0)))
  add('mailbox', 'mailbox', cyl(0.115, 0.115, 0.38, Math.PI), ma(M(0, 0.83, 0, Math.PI / 2, Math.PI / 2, 0)))
  add('slot', 'mailbox', new THREE.BoxGeometry(0.13, 0.016, 0.01), ma(M(0, 0.84, 0.192)), { small: true })
  add('flagpole', 'mailbox', new THREE.BoxGeometry(0.016, 0.22, 0.016), ma(M(0.125, 0.92, 0.08)), { small: true })
  add('flag', 'mailbox', box([0.012, 0.08, 0.12]), ma(M(0.125, 0.99, 0.02)), { small: true })

  // ---------- the frog courier (faces +z) ----------
  const F = M(0, 0, 0.35, 0, 0.14, 0),
    fa = (m) => at(F, m ?? M()),
    K = 'char'
  for (const sx of [-1, 1]) {
    add('frog', K, sph([0.19, 0.2, 0.3]), fa(M(sx * 0.45, 0.2, 0.0, 0, sx * 0.45, 0))) // thigh
    add('foot', K, sph([0.14, 0.04, 0.2]), fa(M(sx * 0.52, 0.04, 0.4, 0, sx * 0.4, 0))) // webbed foot
    for (let k = -1; k <= 1; k++) {
      const an = sx * 0.4 + k * 0.42,
        tip = [sx * 0.52 + Math.sin(an) * 0.3, 0.035, 0.4 + Math.cos(an) * 0.3]
      add('foot', K, limb([sx * 0.52, 0.035, 0.42], tip, 0.035, 0.03), fa(), { small: true })
      add('foot', K, sph([0.05, 0.03, 0.05]), fa(M(...tip)), { small: true })
    }
  }
  add(
    'frog',
    K,
    loft([
      [0.02, 0.2, 0.18, 0],
      [0.08, 0.4, 0.36, 0],
      [0.22, 0.5, 0.44, 0.02],
      [0.38, 0.5, 0.43, 0.04],
      [0.52, 0.46, 0.39, 0.07],
      [0.64, 0.42, 0.35, 0.1],
      [0.74, 0.34, 0.29, 0.11],
      [0.81, 0.2, 0.18, 0.1],
      [0.84, 0.05, 0.05, 0.1]
    ]),
    fa(),
    { hero: true }
  )
  add('belly', K, sph([0.33, 0.27, 0.16]), fa(M(0, 0.33, 0.335)))
  for (const [x, y, z, ry] of [
    [-0.38, 0.62, 0.02, -1.3],
    [0.36, 0.7, 0.0, 1.3],
    [-0.2, 0.78, -0.08, -0.6],
    [0.44, 0.4, 0.12, 1.2]
  ])
    add('spot', K, sph([0.06, 0.06, 0.02]), fa(M(x, y, z, 0, ry, 0)), { small: true })
  // strap, satchel and letter
  add(
    'strap',
    K,
    tube(
      [
        [0.36, 0.6, 0.16],
        [0.16, 0.5, 0.47],
        [-0.14, 0.4, 0.5],
        [-0.42, 0.36, 0.42],
        [-0.56, 0.4, 0.3]
      ],
      0.028
    ),
    fa(),
    { small: true }
  )
  const B = at(F, M(-0.62, 0.3, 0.3, 0, 0.3, 0.1)),
    ba = (m) => at(B, m)
  add('letter', K, box([0.03, 0.2, 0.26]), ba(M(0.025, 0.2, -0.02, 0.18, 0, 0.1)))
  add('bag', K, box([0.15, 0.3, 0.36]), ba(M(0, 0, 0)))
  add('flap', K, box([0.04, 0.17, 0.375]), ba(M(-0.07, 0.075, 0)))
  add('buckle', K, box([0.025, 0.055, 0.055]), ba(M(-0.095, 0.0, 0)), { small: true })
  // resting arm and hand with three padded fingers
  add('frog', K, limb([-0.4, 0.5, 0.22], [-0.33, 0.1, 0.52], 0.09, 0.07), fa())
  add('frog', K, sph([0.085, 0.045, 0.085]), fa(M(-0.33, 0.05, 0.56)))
  for (let k = -1; k <= 1; k++) {
    const an = -0.1 + k * 0.5,
      tip = [-0.33 + Math.sin(an) * 0.17, 0.035, 0.56 + Math.cos(an) * 0.17]
    add('frog', K, limb([-0.33, 0.04, 0.56], tip, 0.03, 0.026), fa(), { small: true })
    add('frog', K, sph([0.042, 0.03, 0.042]), fa(M(...tip)), { small: true })
  }
  // waving arm and open hand
  add('frog', K, limb([0.4, 0.52, 0.18], [0.66, 0.92, 0.3], 0.09, 0.07), fa())
  add('frog', K, sph([0.09, 0.09, 0.045]), fa(M(0.69, 0.99, 0.31)))
  for (let k = -1; k <= 1; k++) {
    const an = 0.3 + k * 0.5,
      tip = [0.69 + Math.sin(an) * 0.19, 0.99 + Math.cos(an) * 0.19, 0.32]
    add('frog', K, limb([0.69, 0.99, 0.31], tip, 0.03, 0.027), fa(), { small: true })
    add('frog', K, sph([0.045, 0.045, 0.035]), fa(M(...tip)), { small: true })
  }
  // eyes: bump, white, iris, flattened pupil, catchlight, lid shell
  for (const sx of [-1, 1]) {
    const E = [sx * 0.205, 0.87, 0.3]
    add('frog', K, sph([0.17, 0.17, 0.17]), fa(M(sx * 0.2, 0.85, 0.2)))
    add('eye', K, sph([0.125, 0.125, 0.125]), fa(M(...E)))
    add('iris', K, sph([0.078, 0.078, 0.03]), fa(M(E[0] + 0.012, E[1] - 0.005, E[2] + 0.102)), { small: true })
    add('pupil', K, sph([0.042, 0.052, 0.02]), fa(M(E[0] + 0.016, E[1] - 0.006, E[2] + 0.122)), { small: true })
    add('shine', K, sph([0.018, 0.018, 0.01]), fa(M(E[0] - 0.012, E[1] + 0.026, E[2] + 0.134)), { small: true })
    const lid = new THREE.SphereGeometry(0.134, hi ? 28 : 8, hi ? 14 : 4, 0, Math.PI * 2, 0, Math.PI * 0.34)
    add('lid', K, lid, fa(M(E[0], E[1], E[2], 0.1, 0, sx * 0.18)), { small: true })
  }
  // mouth, nostrils, cheeks
  {
    const pts = []
    for (let i = 0; i <= 12; i++) {
      const x = -0.3 + i * 0.05
      pts.push([x, 0.6 - 0.065 * (1 - (x / 0.3) ** 2), 0.088 + 0.372 * Math.sqrt(1 - (x / 0.445) ** 2) + 0.004])
    }
    add('mouth', K, tube(pts, 0.012), fa(), { small: true })
  }
  for (const sx of [-1, 1]) {
    add('nostril', K, sph([0.012, 0.012, 0.008]), fa(M(sx * 0.05, 0.71, 0.418)), { small: true })
    add('cheek', K, sph([0.06, 0.04, 0.012]), fa(M(sx * 0.31, 0.6, 0.352, 0, sx * 0.75, 0)), { small: true })
  }
  // postal cap: crown, band, brim, badge
  const C = at(F, M(0, 0.93, 0.08, -0.1, 0, -0.1)),
    ca = (m) => at(C, m)
  {
    const crown = new THREE.SphereGeometry(1, hi ? 32 : 8, hi ? 12 : 3, 0, Math.PI * 2, 0, Math.PI / 2)
    crown.scale(0.17, 0.13, 0.17)
    add('cap', K, crown, ca(M(0, 0.05, 0)))
  }
  add('capband', K, cyl(0.173, 0.173, 0.06), ca(M(0, 0.03, 0)))
  {
    const brim = cyl(0.15, 0.15, 0.02)
    brim.scale(1, 1, 0.85)
    add('brim', K, brim, ca(M(0, 0.005, 0.14)))
  }
  add('badge', K, sph([0.036, 0.036, 0.015]), ca(M(0, 0.035, 0.172)), { small: true })
  return parts
}
