// 3D shape builders for three.js (art-styles skill): what to reach for instead of a bare sphere, box or cylinder.
// loftGeo: a body from cross-sections. limbGeo: a tapered limb with rounded ends. roundedBox: a box with soft edges.
// lumpy: push a surface in and out with noise (clay, foliage, stones).
import * as THREE from 'three'
import { fbm } from './core.js'

const V = (x, y, z) => new THREE.Vector3(x, y, z)

// Loft elliptical cross-sections [y, rx, rz, dz = 0, dx = 0] into a closed mesh; sub > 1 smooths between sections.
export function loftGeo(sections, seg = 32, sub = 1) {
  let S = sections.map((s) => [s[0], s[1], s[2], s[3] || 0, s[4] || 0])
  if (sub > 1) {
    const out = [],
      cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)
    for (let i = 0; i < S.length - 1; i++) {
      const a = S[Math.max(0, i - 1)],
        b = S[i],
        c = S[i + 1],
        d = S[Math.min(S.length - 1, i + 2)]
      for (let k = 0; k < sub; k++)
        out.push(b.map((_, q) => (q === 1 || q === 2 ? Math.max(0.001, cr(a[q], b[q], c[q], d[q], k / sub)) : cr(a[q], b[q], c[q], d[q], k / sub))))
    }
    out.push(S.at(-1))
    S = out
  }
  const pos = [],
    uv = [],
    idx = [],
    y0 = S[0][0],
    y1 = S.at(-1)[0],
    row = seg + 1
  for (const [y, rx, rz, dz, dx] of S)
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2
      pos.push(dx + Math.sin(a) * rx, y, dz - Math.cos(a) * rz)
      uv.push(j / seg, (y - y0) / (y1 - y0 || 1))
    }
  for (let i = 0; i < S.length - 1; i++)
    for (let j = 0; j < seg; j++) {
      const a = i * row + j,
        b = a + row
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  for (const [i, flip] of [
    [0, true],
    [S.length - 1, false]
  ]) {
    const c = pos.length / 3
    pos.push(S[i][4], S[i][0], S[i][3])
    uv.push(0.5, i ? 1 : 0)
    for (let j = 0; j < seg; j++) {
      const a = i * row + j
      flip ? idx.push(c, a + 1, a) : idx.push(c, a, a + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  const n = g.attributes.normal // weld the seam's normals so no line shows
  for (let i = 0; i < S.length; i++) {
    const a = i * row,
      b = a + seg,
      x = n.getX(a) + n.getX(b),
      y = n.getY(a) + n.getY(b),
      z = n.getZ(a) + n.getZ(b),
      l = Math.hypot(x, y, z) || 1
    n.setXYZ(a, x / l, y / l, z / l)
    n.setXYZ(b, x / l, y / l, z / l)
  }
  return g
}
export function roundedBox(size, r) {
  const g = new THREE.BoxGeometry(...size, 8, 8, 8),
    pos = g.attributes.position,
    v = new THREE.Vector3()
  const hx = size[0] / 2 - r,
    hy = size[1] / 2 - r,
    hz = size[2] / 2 - r
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const c = V(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z))),
      d = v.clone().sub(c)
    if (d.length() > 1e-6) d.setLength(r)
    pos.setXYZ(i, c.x + d.x, c.y + d.y, c.z + d.z)
  }
  g.computeVertexNormals()
  return g
}

// A tapered limb from a to b ([x, y, z]) with rounded ends: arms, legs, fingers, branches.
export function limbGeo(a, b, r1, r2, seg = 18) {
  const A = V(...a),
    B = V(...b),
    len = A.distanceTo(B)
  const g = loftGeo(
    [
      [-r1 * 0.92, r1 * 0.4, r1 * 0.4],
      [-r1 * 0.55, r1 * 0.84, r1 * 0.84],
      [0, r1, r1],
      [len, r2, r2],
      [len + r2 * 0.55, r2 * 0.84, r2 * 0.84],
      [len + r2 * 0.92, r2 * 0.4, r2 * 0.4]
    ],
    seg,
    1
  )
  g.applyMatrix4(new THREE.Matrix4().compose(A, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), B.clone().sub(A).normalize()), V(1, 1, 1)))
  return g
}

// Push vertices along their normals by noise of their position. Vertices at the same position move together,
// so indexed geometry and UV seams do not crack. amount is in world units; freq of about 2 / radius gives hand-sized lumps.
export function lumpy(g, amt, freq, seed = 1) {
  const pos = g.attributes.position,
    nrm = g.attributes.normal,
    v = new THREE.Vector3(),
    n = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    n.fromBufferAttribute(nrm, i)
    const d = (fbm(v.x * freq + v.z * 0.7 * freq + 31, v.y * freq + v.z * freq * 0.3 + 17, seed, 3) - 0.5) * 2 * amt
    pos.setXYZ(i, v.x + n.x * d, v.y + n.y * d, v.z + n.z * d)
  }
  g.computeVertexNormals()
  return g
}
