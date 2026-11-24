// Six 3D styles for three.js (art-styles skill), each rendering the same model from model3d.js with its own
// geometry detail, materials, light and finishing pass. Each function returns a canvas at twice the 640×400 scene size.
import * as THREE from 'three'
import { W, H, rng, noise2, fbm, hex, mix, canvas, shapes2d, tiltShift, BAYER4, grain, vignette, col } from './core.js'
import { band } from './forms2d.js'
import { buildModel, pathCurve, pathHalfWidth } from './model3d.js'
import { lumpy } from './forms3d.js'

const OW = W * 2,
  OH = H * 2
let renderer
function getRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(1)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }
  return renderer
}
const C3 = (P, role) => {
  const [r, g, b] = col(P, role === 'leavesLight' ? 'leaves' : role)
  const c = new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace)
  if (role === 'leavesLight') c.offsetHSL(0.02, 0, 0.07)
  return c
}
function gradientTex(stops) {
  const c = canvas(4, 256),
    x = c.getContext('2d'),
    g = x.createLinearGradient(0, 0, 0, 256)
  stops.forEach(([t, k]) => g.addColorStop(t, k))
  x.fillStyle = g
  x.fillRect(0, 0, 4, 256)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
function noiseTex(size, fn, repeat = 1, nearest = false) {
  const c = canvas(size, size),
    x = c.getContext('2d'),
    id = x.createImageData(size, size)
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const [r, g, b] = fn(i, j),
        k = (j * size + i) * 4
      id.data[k] = r
      id.data[k + 1] = g
      id.data[k + 2] = b
      id.data[k + 3] = 255
    }
  x.putImageData(id, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  if (nearest) {
    t.magFilter = t.minFilter = THREE.NearestFilter
    t.generateMipmaps = false
  }
  return t
}
function camera(pos = [0.45, 1.55, 5.1], look = [0.45, 0.86, -0.5], fov = 40) {
  const c = new THREE.PerspectiveCamera(fov, W / H, 0.1, 100)
  c.position.set(...pos)
  c.lookAt(...look)
  return c
}
function sunLight(scene, { color = '#fff1d6', intensity = 2.2, pos = [-4, 6, 4], radius = 4, size = 2048 } = {}) {
  const d = new THREE.DirectionalLight(color, intensity)
  d.position.set(...pos)
  d.castShadow = true
  d.shadow.mapSize.set(size, size)
  d.shadow.radius = radius
  d.shadow.bias = -0.0006
  d.shadow.normalBias = 0.02
  Object.assign(d.shadow.camera, { left: -5.5, right: 5.5, top: 5.5, bottom: -5.5, near: 0.5, far: 25 })
  scene.add(d)
  return d
}
function sizeOf(g) {
  g.computeBoundingSphere()
  return g.boundingSphere.radius
}
function ground(scene, mat, seg = 1, hook) {
  let g = new THREE.PlaneGeometry(40, 40, seg, seg)
  g.rotateX(-Math.PI / 2)
  if (hook) g = hook(g)
  const m = new THREE.Mesh(g, mat)
  m.receiveShadow = true
  scene.add(m)
  return m
}
function addParts(scene, parts, matFor, geoHook) {
  const out = []
  for (const p of parts) {
    const g = geoHook ? geoHook(p.geo, p) : p.geo,
      m = new THREE.Mesh(g, matFor(p))
    m.castShadow = !p.far && !p.flat
    m.receiveShadow = !p.far
    m.userData.p = p
    scene.add(m)
    out.push(m)
  }
  return out
}
function render(scene, cam, w = OW, h = OH, o = {}) {
  const r = getRenderer()
  r.setSize(w, h, false)
  r.toneMapping = o.tone ?? THREE.ACESFilmicToneMapping
  r.toneMappingExposure = o.exposure ?? 1
  r.outputColorSpace = THREE.SRGBColorSpace
  r.render(scene, cam)
  const c = canvas(w, h)
  c.getContext('2d').drawImage(r.domElement, 0, 0, w, h)
  return c
}

// ---------- low-poly: faceted, moved vertices, ±8 % face colour, low sun ----------
export function lowPoly() {
  const scene = new THREE.Scene(),
    P = {
      ground: '#6ab04c',
      hill: '#8fcf6e',
      leaves: '#3f9e4d',
      frog: '#7cd34f',
      roof: '#eb4d4b',
      wall: '#f6e1b5',
      path: '#f0c27b',
      cap: '#f0932b',
      trunk: '#8a5a3a',
      foot: '#5fb53f',
      capband: '#2b3a6b',
      stone: '#b9b4a8'
    }
  scene.background = gradientTex([
    [0, '#4fa3e0'],
    [1, '#d9f1ff']
  ])
  scene.fog = new THREE.Fog('#cfe9f7', 9, 26)
  scene.add(new THREE.HemisphereLight('#bfe3ff', '#7a8a3a', 1.1))
  sunLight(scene, { intensity: 2.6, pos: [-5, 4.2, 3.5], radius: 1 })
  const rnd = rng(3),
    mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })
  const facet = (g, role, jitterAmt = 0) => {
    g = g.index ? g.toNonIndexed() : g.clone()
    const pos = g.attributes.position
    if (jitterAmt)
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i),
          y = pos.getY(i),
          z = pos.getZ(i),
          h = (a) => (noise2(x * 7.3 + a, y * 9.1 + z * 5.7, 4) - 0.5) * 2 * jitterAmt
        pos.setXYZ(i, x + h(1), y + h(9), z + h(17))
      }
    const base = C3(P, role),
      n = pos.count,
      cols = new Float32Array(n * 3),
      c = new THREE.Color()
    for (let i = 0; i < n; i += 3) {
      c.copy(base).offsetHSL(0, 0, (rnd() - 0.5) * 0.08)
      for (let k = 0; k < 3; k++) {
        cols[(i + k) * 3] = c.r
        cols[(i + k) * 3 + 1] = c.g
        cols[(i + k) * 3 + 2] = c.b
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3))
    g.computeVertexNormals()
    return g
  }
  ground(scene, mat, 14, (g) => {
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i),
        d = Math.hypot(x, z + 0.5)
      pos.setY(i, d > 4.5 ? (noise2(x * 0.4, z * 0.4, 2) - 0.5) * 0.5 - 0.02 : -0.02)
    }
    return facet(g, 'ground')
  })
  addParts(
    scene,
    buildModel('low'),
    () => mat,
    (g, p) => facet(g, p.role, p.lobe ? sizeOf(g) * 0.1 : 0)
  )
  return render(scene, camera())
}

// ---------- toon / cel: three bands, shadow band tinted, inverted-hull outlines, rim light ----------
export function toon() {
  const scene = new THREE.Scene(),
    P = {
      ground: '#78c26a',
      hill: '#a6dd8a',
      leaves: '#3fae6a',
      frog: '#6ddc5a',
      cap: '#ff6b6b',
      roof: '#ff8a5b',
      wall: '#fff0d0',
      mailbox: '#4ecdc4',
      path: '#ffe0a0',
      foot: '#4fc34a',
      trunk: '#9a6a48',
      belly: '#f6f7c6',
      capband: '#2d3047',
      bag: '#c4853f'
    }
  scene.background = gradientTex([
    [0, '#6ec6ff'],
    [0.7, '#c6ecff'],
    [1, '#fff6d8']
  ])
  // three steps at roughly 0.51 and 0.785 of the light term
  const steps = new Uint8Array(16 * 4)
  for (let i = 0; i < 16; i++) {
    const t = i / 15,
      v = t < 0.51 ? 150 : t < 0.785 ? 210 : 255
    steps.set([v, v, v, 255], i * 4)
  }
  const gm = new THREE.DataTexture(steps, 16, 1)
  gm.minFilter = gm.magFilter = THREE.NearestFilter
  gm.needsUpdate = true
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a86c0', 0.75))
  sunLight(scene, { color: '#fff4e0', intensity: 2.5, pos: [-3.5, 6, 5], radius: 1.5 })
  const mats = new Map()
  const matFor = (p) => {
    if (!mats.has(p.role))
      mats.set(
        p.role,
        p.glow ? new THREE.MeshBasicMaterial({ color: C3(P, p.role) }) : new THREE.MeshToonMaterial({ color: C3(P, p.role), gradientMap: gm })
      )
    return mats.get(p.role)
  }
  ground(scene, new THREE.MeshToonMaterial({ color: C3(P, 'ground'), gradientMap: gm }))
  const meshes = addParts(scene, buildModel('round'), matFor, (g, p) => (p.lobe ? lumpy(g, sizeOf(g) * 0.05, 3.2, 3) : g))
  const outline = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { thick: { value: 0.02 }, color: { value: new THREE.Color('#232447') } },
    vertexShader:
      'uniform float thick; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); mv.xyz += normalize(normalMatrix * normal) * 0.0042 * -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 color; void main(){ gl_FragColor = vec4(color,1.0); }'
  })
  for (const m of meshes) {
    const p = m.userData.p
    if (p.far || p.small || p.flat) continue
    scene.add(new THREE.Mesh(m.geometry, outline))
  }
  return render(scene, camera(), OW, OH, { tone: THREE.NoToneMapping })
}

// ---------- claymation: lumpy forms, thumbprints, soft sheen, warm key and cool rim ----------
export function clay() {
  const scene = new THREE.Scene(),
    P = {
      ground: '#7fb35a',
      hill: '#9cc96c',
      leaves: '#4f9e48',
      frog: '#6fc24c',
      belly: '#f0e9a8',
      cap: '#e2473a',
      roof: '#d0603f',
      wall: '#f2dfb8',
      path: '#e5c58a',
      mailbox: '#3f74c4',
      bag: '#a2683a',
      trunk: '#8a5a36',
      foot: '#5aa83f',
      stone: '#b7ad9c',
      trim: '#f7efdc'
    }
  scene.background = gradientTex([
    [0, '#f6c98e'],
    [0.6, '#f3dfb8'],
    [1, '#e9e2cf']
  ])
  // thumbprint texture: soft dents, concentric ridges around a few press points, pores
  const press = [
    [90, 120],
    [300, 80],
    [420, 330],
    [180, 400],
    [60, 300]
  ]
  const finger = noiseTex(
    512,
    (i, j) => {
      let v = 128 + (fbm(i / 46, j / 46, 2, 4) - 0.5) * 110
      for (const [px, py] of press) {
        const dd = Math.hypot(i - px, j - py)
        if (dd < 90) v += Math.sin(dd / 2.6 + fbm(i / 30, j / 30, 5, 2) * 5) * 16 * (1 - dd / 90)
      }
      v += (noise2(i * 0.9, j * 0.9, 8) - 0.5) * 22
      return [v, v, v]
    },
    2
  )
  scene.add(new THREE.HemisphereLight('#ffe9d0', '#6a5a4a', 0.9))
  sunLight(scene, { color: '#ffd9a8', intensity: 3.0, pos: [-4, 5, 5], radius: 4 })
  const rim = new THREE.DirectionalLight('#b8d4ff', 1.0)
  rim.position.set(4, 3, -4)
  scene.add(rim)
  const mats = new Map()
  const matFor = (p) => {
    if (!mats.has(p.role))
      mats.set(
        p.role,
        new THREE.MeshPhysicalMaterial({
          color: C3(P, p.role),
          roughness: 0.58,
          metalness: 0,
          sheen: 0.25,
          sheenRoughness: 0.7,
          bumpMap: finger,
          bumpScale: p.small ? 0.8 : 2.2
        })
      )
    return mats.get(p.role)
  }
  ground(scene, matFor({ role: 'ground' }), 160, (g) => lumpy(g, 0.07, 1.4, 5))
  // lumps: 2–6 % of each part's radius, at a frequency of about 2 / radius
  addParts(scene, buildModel('round'), matFor, (g, p) => {
    const r = sizeOf(g)
    return p.far || p.flat || r < 0.03 ? g : lumpy(g, r * (p.small ? 0.025 : p.lobe ? 0.07 : 0.045), Math.min(9, 2 / r), (r * 1000) | 0)
  })
  const img = render(scene, camera())
  const x = img.getContext('2d')
  vignette(x, OW, OH, 0.32)
  grain(x, OW, OH, 0.05)
  return img
}

// ---------- papercraft: a card diorama. Box-fold cottage, slotted two-card tree, layered-collage frog on a prop card ----------
export function papercraft() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#cdbb9c')
  const P = {
    sky: '#a9d3dc',
    sun: '#f6c453',
    cloud: '#fbf7ee',
    hill: '#9cc08a',
    ground: '#7fb062',
    path: '#e8cf9c',
    trunk: '#8a5b3a',
    leaves: '#4f8f4f',
    wall: '#f2e2c4',
    roof: '#cf5c43',
    mailbox: '#3f6fae',
    frog: '#74b956',
    belly: '#ecf0c0',
    cap: '#d9443a',
    bag: '#9a6236',
    foot: '#57934a',
    trim: '#fbf3e2',
    stone: '#b9b1a2'
  }
  const fibre = noiseTex(
    256,
    (i, j) => {
      const v = 226 + (fbm(i / 6, j / 6, 3, 3) - 0.5) * 46 + (noise2(i * 1.9, j * 1.9, 6) - 0.5) * 24
      return [v, v, v - 4]
    },
    1
  )
  // paper: matte, a fibre print on the faces, cut edges at half the face colour
  const mats = new Map()
  const paper = (role, tone = 1) => {
    const k = role + tone
    if (!mats.has(k)) {
      const c = C3(P, role).multiplyScalar(tone)
      mats.set(k, [new THREE.MeshLambertMaterial({ color: c, map: fibre }), new THREE.MeshLambertMaterial({ color: c.clone().multiplyScalar(0.5) })])
    }
    return mats.get(k)
  }
  const card = (pts, t, role, tone = 1) => {
    const m = new THREE.Mesh(
      new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: t, bevelEnabled: false, curveSegments: 4 }),
      paper(role, tone)
    )
    m.castShadow = m.receiveShadow = true
    return m
  }
  // a standing collage: 2D items become stacked cards; big parts step forward more than small ones, so layers cast shadows
  const collage = (items, k, ox, oy, { flat = false, tone = 1 } = {}) => {
    const g = new THREE.Group()
    let z = 0
    for (const s of items) {
      const small = s.line || s.box.w * k < 0.09,
        pts = (s.line ? band(s.pts, Math.max(1.3, s.w)) : s.pts).map(([x, y]) => [(x - ox) * k, (oy - y) * k])
      const m = card(pts, small ? 0.008 : 0.018, s.role, tone)
      if (!flat) z += small ? 0.0035 : 0.013
      m.position.z = z
      g.add(m)
    }
    return g
  }
  scene.add(new THREE.HemisphereLight('#fff4e6', '#a89070', 0.55))
  sunLight(scene, { color: '#ffd6a0', intensity: 3.0, pos: [-5, 3.2, 5], radius: 6 })
  const fill = new THREE.DirectionalLight('#c8d8ff', 1.1)
  fill.position.set(1.5, 1.5, 6)
  scene.add(fill)
  // table and base board
  const table = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#cdbb9c', map: fibre }))
  table.position.y = -0.12
  table.receiveShadow = true
  scene.add(table)
  const board = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.12, 8.6), paper('ground')[0])
  board.position.set(0.4, -0.06, -1.3)
  board.receiveShadow = true
  board.castShadow = true
  scene.add(board)
  // path card and stepping stones, lying flat
  {
    const cv = pathCurve(),
      L = [],
      R = []
    for (let i = 0; i <= 24; i++) {
      const t = i / 24,
        p = cv.getPoint(t),
        tg = cv.getTangent(t),
        w = pathHalfWidth(t) * 1.05
      L.push([p.x - tg.z * w, -(p.z + tg.x * w)])
      R.unshift([p.x + tg.z * w, -(p.z - tg.x * w)])
    }
    const m = card([...L, ...R], 0.02, 'path')
    m.rotation.x = -Math.PI / 2
    m.castShadow = false
    scene.add(m)
    ;[0.16, 0.34, 0.52, 0.7, 0.88].forEach((t, i) => {
      const p = cv.getPoint(t),
        pts = []
      for (let a = 0; a < 14; a++) pts.push([Math.cos((a / 14) * 6.283) * (0.18 - t * 0.05), Math.sin((a / 14) * 6.283) * (0.13 - t * 0.03)])
      const st = card(pts, 0.016, 'stone')
      st.rotation.x = -Math.PI / 2
      st.rotation.z = i
      st.position.set(p.x + (i % 2 ? 0.1 : -0.1), 0.02, p.z)
      scene.add(st)
    })
  }
  // box-fold cottage and mailbox: the shared model, in paper
  for (const p of buildModel('high')) {
    if (p.key !== 'house' && p.key !== 'mailbox') continue
    const m = new THREE.Mesh(
      p.geo,
      p.glow
        ? new THREE.MeshLambertMaterial({ color: C3(P, p.role), emissive: C3(P, p.role), emissiveIntensity: 0.25, map: fibre })
        : paper(p.role)[0]
    )
    m.castShadow = m.receiveShadow = true
    scene.add(m)
  }
  const items = shapes2d()
  // tree: the printed collage on one card, and a second plain card slotted through it at 90 degrees
  {
    const parts = items.filter((s) => s.part === 'tree'),
      k = 2.5 / 223,
      tree = new THREE.Group()
    tree.add(collage(parts, k, 106, 298))
    const cross = collage(
      parts.filter((s) => !s.line && s.role !== 'fruit'),
      k,
      106,
      298,
      { flat: true, tone: 0.88 }
    )
    cross.rotation.y = Math.PI / 2
    cross.position.x = 0.01
    tree.add(cross)
    tree.position.set(-1.75, 0, -1.1)
    tree.rotation.y = -0.4
    scene.add(tree)
  }
  // frog: a layered collage leaning on a prop card that stands behind it
  {
    const parts = items.filter((s) => s.group === 'char' && s.role !== 'shadow'),
      k = 1.22 / 116,
      frog = new THREE.Group()
    const front = collage(parts, k, 300, 347)
    front.rotation.x = -0.07
    frog.add(front)
    const prop = []
    for (let a = 0; a <= 16; a++) prop.push([Math.cos((a / 16) * Math.PI) * 0.26 - 0.26, Math.sin((a / 16) * Math.PI) * 0.62])
    const back = card(prop, 0.02, 'frog', 0.85)
    back.rotation.y = -Math.PI / 2
    back.position.set(0.01, 0, 0)
    frog.add(back)
    frog.position.set(0, 0, 0.42)
    frog.rotation.y = -0.22
    scene.add(frog)
  }
  // backdrop: sky, hill, ridge trees, clouds and sun as cards standing behind the board
  {
    const kb = 0.02,
      far = items.filter((s) => s.group === 'bg')
    for (const s of far) {
      let pts =
        s.role === 'sky'
          ? [
              [-400, -300],
              [1040, -300],
              [1040, 300],
              [-400, 300]
            ]
          : s.pts.map(([x, y]) => [x <= -80 ? -400 : x >= 720 ? 1040 : x, Math.min(y, 300)])
      const m = card(
        pts.map(([x, y]) => [(x - 320) * kb, (276 - y) * kb]),
        0.03,
        s.role
      )
      m.position.set(0.4, 0, s.role === 'sky' ? -6.6 : s.role === 'sun' ? -6.35 : s.role === 'cloud' ? -6.2 : s.role === 'hill' ? -5.6 : -5.5)
      if (s.role === 'sky') m.castShadow = false
      scene.add(m)
    }
  }
  // grass: little folded V cards
  const r = rng(6)
  for (let i = 0; i < 46; i++) {
    const x = -4.2 + r() * 9,
      z = -2.6 + r() * 4.8
    if (Math.hypot(x, z - 0.4) < 0.95 || (x > 0 && x < 3.6 && z < 0.4) || Math.hypot(x + 1.75, z + 1.1) < 0.5) continue
    const h = 0.1 + r() * 0.1,
      m = card(
        [
          [-0.05, 0],
          [-0.07, h],
          [-0.01, h * 0.4],
          [0.02, h * 1.2],
          [0.04, h * 0.4],
          [0.08, h * 0.9],
          [0.05, 0]
        ],
        0.006,
        'ground',
        0.8
      )
    m.position.set(x, 0, z)
    m.rotation.y = (r() - 0.5) * 1.2
    scene.add(m)
  }
  return tiltShift(render(scene, camera([1.5, 2.9, 8.6], [0.5, 0.85, -0.8], 27), OW, OH, { exposure: 0.88 }), 0.38, 9, 1.12)
}

// A frog designed on the voxel grid (facing +z): whole-voxel limbs at least 2 thick, 4x4 eyes with a 2x2 pupil
// and one catchlight voxel, a one-voxel mouth line, features recoloured on the surface instead of added as geometry.
function voxFrog(put) {
  const B = new Map(),
    K = (x, y, z) => x + ',' + y + ',' + z,
    set = (x, y, z, r) => B.set(K(x, y, z), [x, y, z, r])
  const ell = (cx, cy, cz, rx, ry, rz, role) => {
    for (let x = Math.ceil(cx - rx); x <= cx + rx; x++)
      for (let y = Math.max(0, Math.ceil(cy - ry)); y <= cy + ry; y++)
        for (let z = Math.ceil(cz - rz); z <= cz + rz; z++)
          if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1) set(x, y, z, role)
  }
  const box = (x0, x1, y0, y1, z0, z1, role) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, role)
  }
  const front = (x, y) => {
    for (let z = 16; z >= -16; z--) if (B.has(K(x, y, z))) return z
    return null
  }
  const paint = (x, y, role) => {
    const z = front(x, y)
    if (z !== null) set(x, y, z, role)
  }
  ell(0, 6.5, 0, 9.5, 7, 8, 'frog')
  ell(0, 12, 1, 8, 5.5, 7, 'frog') // body and head, one mass
  for (const sx of [-1, 1]) {
    ell(sx * 9, 3, -1, 3.5, 3.5, 5, 'frog')
    box(sx > 0 ? 8 : -12, sx > 0 ? 12 : -8, 0, 0, 3, 8, 'foot')
    for (const t of [8, 10, 12]) set(sx * t, 0, 9, 'foot')
  }
  for (let x = -6; x <= 6; x++) for (let y = 1; y <= 10; y++) if ((x / 6.5) ** 2 + ((y - 5.5) / 5) ** 2 <= 1) paint(x, y, 'belly')
  for (let x = -6; x <= 6; x++) paint(x, 11, 'mouth')
  paint(-7, 12, 'mouth')
  paint(7, 12, 'mouth')
  paint(-8, 11, 'cheek')
  paint(8, 11, 'cheek')
  for (let x = 8; x >= -9; x--) paint(x, Math.round(4 + ((x + 9) * 6) / 17), 'strap')
  // satchel and letter on the hip
  box(-14, -12, 3, 8, -5, 1, 'bag')
  box(-14, -14, 6, 8, -5, 1, 'flap')
  box(-14, -12, 8, 8, -5, 1, 'flap')
  set(-14, 5, -2, 'buckle')
  box(-13, -13, 9, 11, -4, -1, 'letter')
  // resting arm and hand, waving arm and hand: 2 voxels thick, fingers 1
  for (let y = 9; y >= 1; y--) {
    const z = 3 + Math.floor((9 - y) / 3)
    box(-9, -8, y, y, z, z + 1, 'frog')
  }
  box(-9, -5, 0, 0, 6, 8, 'frog')
  for (const x of [-9, -7, -5]) set(x, 0, 9, 'frog')
  for (let t = 0; t <= 8; t++) {
    const x = 8 + Math.round(t * 0.75)
    box(x, x + 1, 9 + t, 9 + t, 2, 3, 'frog')
  }
  box(13, 17, 18, 20, 2, 3, 'frog')
  box(13, 13, 21, 22, 2, 3, 'frog')
  box(15, 15, 21, 23, 2, 3, 'frog')
  box(17, 17, 21, 22, 2, 3, 'frog')
  // eyes: bump, 4x4 white, 2x2 pupil, one catchlight in the same corner of both
  for (const sx of [-1, 1]) {
    ell(sx * 5, 17, 2, 3.4, 3.4, 3.2, 'frog')
    for (let x = sx > 0 ? 3 : -6; x <= (sx > 0 ? 6 : -3); x++) for (let y = 15; y <= 18; y++) paint(x, y, 'eye')
    const px = sx > 0 ? 4 : -5
    for (const x of [px, px + 1]) for (const y of [16, 17]) paint(x, y, 'pupil')
    paint(px, 17, 'shine')
  }
  // cap: dome, band, brim, badge
  for (let x = -3; x <= 3; x++)
    for (let y = 18; y <= 21; y++)
      for (let z = -3; z <= 3; z++) if ((x / 3.7) ** 2 + (z / 3.7) ** 2 + ((y - 18) / 3.7) ** 2 <= 1) set(x, y, z, y === 18 ? 'capband' : 'cap')
  for (let x = -3; x <= 3; x++) for (let z = 4; z <= 6; z++) if (!(z === 6 && Math.abs(x) === 3)) set(x, 18, z, 'brim')
  set(0, 19, 4, 'badge')
  set(0, 20, 3, 'badge')
  for (const [x, y, z, r] of B.values()) put(x, y, z, r)
}

// ---------- voxel: the low-detail model sampled into cubes, per-cube jitter, ambient occlusion ----------
export function voxel() {
  const scene = new THREE.Scene(),
    P = { ground: '#5fae4a', hill: '#86c46a', leaves: '#3f9a46', frog: '#6cc84a', path: '#e3c084', roof: '#cf4f3c', foot: '#4fa83c' }
  scene.background = gradientTex([
    [0, '#5bb2ef'],
    [1, '#d8f0ff']
  ])
  scene.fog = new THREE.Fog('#cfe8f7', 12, 30)
  scene.add(new THREE.HemisphereLight('#cfe8ff', '#6a7a4a', 1.0))
  sunLight(scene, { intensity: 2.4, radius: 1 })
  const parts = buildModel('low'),
    basic = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const ray = new THREE.Raycaster(),
    down = new THREE.Vector3(0, -1, 0)
  function sample(list, [x0, x1], [z0, z1], v, top) {
    const meshes = list.map((p, i) => {
      const m = new THREE.Mesh(p.geo, basic)
      m.userData.i = i
      m.updateMatrixWorld()
      return m
    })
    const grid = new Map(),
      key = (a, b, c) => a + ',' + b + ',' + c
    for (let ix = 0; ix < (x1 - x0) / v; ix++)
      for (let iz = 0; iz < (z1 - z0) / v; iz++) {
        ray.set(new THREE.Vector3(x0 + (ix + 0.5) * v, top, z0 + (iz + 0.5) * v), down)
        const by = new Map()
        for (const h of ray.intersectObjects(meshes, false)) {
          const k = h.object.userData.i
          if (!by.has(k)) by.set(k, [])
          by.get(k).push(h.point.y)
        }
        for (const [k, ys] of [...by].sort((a, b) => a[0] - b[0])) {
          const p = list[k]
          if (p.flat) {
            grid.set(key(ix, -1, iz), 'path')
            continue
          }
          ys.sort((a, b) => b - a)
          for (let q = 0; q < ys.length; q += 2) {
            const hi = ys[q],
              lo = ys[q + 1] ?? hi - v * 0.5
            for (
              let iy = Math.max(0, Math.floor(lo / v + 0.15));
              iy <= Math.max(Math.floor(lo / v + 0.15), Math.floor(hi / v - 0.15)) && iy < 120;
              iy++
            )
              grid.set(key(ix, iy, iz), p.role)
          }
        }
      }
    return { grid, key, x0, z0, v }
  }
  const v = 0.05,
    tooFine = new Set([
      'grass',
      'shine',
      'lid',
      'nostril',
      'spot',
      'cheek',
      'mullion',
      'plank',
      'knob',
      'slot',
      'flagpole',
      'buckle',
      'strap',
      'mouth',
      'iris'
    ])
  const near = sample(
    parts.filter((p) => !p.far && p.key !== 'char' && !tooFine.has(p.role)),
    [-3.4, 3.8],
    [-2.9, 2.6],
    v,
    4
  )
  voxFrog((x, y, z, role) => near.grid.set(near.key(Math.round(3.4 / v) + x, y, Math.round((0.35 + 2.9) / v) + z), role))
  for (let ix = 0; ix < 7.2 / v; ix++)
    for (let iz = 0; iz < 5.5 / v; iz++) if (!near.grid.has(near.key(ix, -1, iz))) near.grid.set(near.key(ix, -1, iz), 'ground')
  const far = sample(
    parts.filter((p) => p.far).map((p) => ({ ...p, geo: p.geo })),
    [-7.5, 9],
    [-15, -4.5],
    0.3,
    9
  )
  const box = new THREE.BoxGeometry(1, 1, 1),
    rr = rng(9)
  for (const { grid, key, x0, z0, v: s } of [near, far]) {
    const list = [...grid].filter(([k]) => {
      const [a, b, c] = k.split(',').map(Number)
      return !(
        grid.has(key(a + 1, b, c)) &&
        grid.has(key(a - 1, b, c)) &&
        grid.has(key(a, b + 1, c)) &&
        grid.has(key(a, b - 1, c)) &&
        grid.has(key(a, b, c + 1)) &&
        grid.has(key(a, b, c - 1))
      )
    })
    const mesh = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial(), list.length),
      m = new THREE.Matrix4(),
      c = new THREE.Color()
    list.forEach(([k, role], i) => {
      const [a, b, cc] = k.split(',').map(Number)
      m.makeScale(s, s, s)
      m.setPosition(x0 + (a + 0.5) * s, (b + 0.5) * s, z0 + (cc + 0.5) * s)
      mesh.setMatrixAt(i, m)
      // ambient occlusion: darker for each neighbour in the ring above
      let occ = 0
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1]
      ])
        if (grid.has(key(a + dx, b + 1, cc + dz))) occ++
      c.copy(C3(P, role)).multiplyScalar((0.93 + rr() * 0.12) * (1 - occ * 0.055))
      mesh.setColorAt(i, c)
    })
    mesh.castShadow = s < 0.2
    mesh.receiveShadow = true
    scene.add(mesh)
  }
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: C3(P, 'ground') }))
  plane.position.y = -v - 0.001
  plane.receiveShadow = true
  scene.add(plane)
  return render(scene, camera())
}

// ---------- PS1-era: vertex snapping, affine textures, low resolution, 15-bit colour with dither, fog ----------
export function ps1() {
  const raw = (h) => {
    const [r, g, b] = typeof h === 'string' ? hex(h) : h
    return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.LinearSRGBColorSpace)
  }
  const scene = new THREE.Scene(),
    fog = raw('#8fa3b3')
  scene.background = new THREE.Color('#8fa3b3')
  const lw = 320,
    lh = 200,
    cam = camera([0.45, 1.5, 4.9], [0.45, 0.86, -0.5], 44)
  const lightDir = new THREE.Vector3(-0.5, 0.8, 0.5).normalize()
  const two = (a, b, f) => (i, j) => (f(i, j) ? a : b)
  const tex = {
    ground: noiseTex(
      32,
      (i, j) => {
        const n = noise2(i * 0.6, j * 0.6, 1)
        return n > 0.65 ? [120, 170, 70] : n < 0.25 ? [60, 110, 45] : [88, 140, 58]
      },
      20,
      true
    ),
    path: noiseTex(
      32,
      two([200, 170, 120], [175, 145, 100], (i, j) => noise2(i * 0.8, j * 0.8, 2) > 0.6),
      3,
      true
    ),
    trunk: noiseTex(
      32,
      two([80, 52, 32], [120, 82, 50], (i) => i % 8 < 2),
      2,
      true
    ),
    leaves: noiseTex(
      32,
      two([70, 150, 70], [40, 110, 50], (i, j) => noise2(i * 0.9, j * 0.9, 3) > 0.55),
      2,
      true
    ),
    wall: noiseTex(
      32,
      two([150, 130, 110], [222, 202, 172], (i, j) => j % 8 === 0 || (i + (j >> 3) * 4) % 16 === 0),
      2,
      true
    ),
    roof: noiseTex(
      32,
      two([110, 40, 30], [190, 70, 52], (i, j) => j % 6 < 1 || (i + (Math.floor(j / 6) % 2) * 4) % 8 === 0),
      2,
      true
    ),
    frog: noiseTex(
      32,
      two([70, 140, 50], [110, 190, 70], (i, j) => noise2(i * 0.5, j * 0.5, 9) > 0.72),
      2,
      true
    ),
    door: noiseTex(
      32,
      two([70, 40, 24], [120, 74, 44], (i) => i % 8 === 0),
      1,
      true
    ),
    stone: noiseTex(
      32,
      two([120, 116, 108], [170, 164, 152], (i, j) => noise2(i * 0.7, j * 0.7, 4) > 0.6),
      1,
      true
    ),
    plain: noiseTex(8, () => [255, 255, 255], 1, true)
  }
  const alias = { leavesBack: 'leaves', leavesLight: 'leaves', hilltree: 'leaves', hill: 'ground', foundation: 'stone', chimney: 'wall' }
  const tint = { leavesBack: '#b8c8b8', leavesLight: '#e8ffd8', hilltree: '#a8c0a8', hill: '#c8e8b8', chimney: '#d8a890' }
  const P = {}
  const mats = new Map()
  const matFor = (p) => {
    if (mats.has(p.role)) return mats.get(p.role)
    const t = tex[alias[p.role] || p.role],
      m = new THREE.ShaderMaterial({
        uniforms: {
          map: { value: t || tex.plain },
          color: { value: t ? raw(tint[p.role] || '#ffffff') : raw(col(P, p.role === 'leavesLight' ? 'leaves' : p.role)) },
          lightDir: { value: lightDir },
          fogColor: { value: fog },
          res: { value: new THREE.Vector2(lw / 2, lh / 2) },
          rep: { value: (t || tex.plain).repeat.x },
          flat1: { value: p.glow ? 1 : 0 }
        },
        vertexShader: `uniform vec3 lightDir; uniform vec2 res; uniform float rep; uniform float flat1; varying vec3 vUvw; varying float vLight; varying float vFog;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vec4 clip = projectionMatrix * mv;
          clip.xy = floor(clip.xy / clip.w * res) / res * clip.w;        // snap to the low-res grid: the wobble
          gl_Position = clip; vUvw = vec3(uv * rep * clip.w, clip.w);     // affine: undo perspective correction
          vec3 n = normalize(mat3(modelMatrix) * normal); vLight = mix(0.5 + 0.7 * max(dot(n, lightDir), 0.0), 1.15, flat1);
          vFog = smoothstep(5.0, 13.0, -mv.z); }`,
        fragmentShader: `uniform sampler2D map; uniform vec3 color; uniform vec3 fogColor; varying vec3 vUvw; varying float vLight; varying float vFog;
        void main(){ vec3 c = texture2D(map, vUvw.xy / vUvw.z).rgb * color * vLight; gl_FragColor = vec4(mix(c, fogColor, vFog), 1.0); }`
      })
    mats.set(p.role, m)
    return m
  }
  ground(scene, matFor({ role: 'ground' }), 24)
  addParts(
    scene,
    buildModel('ps1').filter((p, i) => p.role !== 'grass' || i % 2 === 0),
    matFor
  )
  const img = render(scene, cam, lw, lh, { tone: THREE.NoToneMapping })
  const x = img.getContext('2d'),
    d = x.getImageData(0, 0, lw, lh)
  for (let y = 0; y < lh; y++)
    for (let i = 0; i < lw; i++) {
      const o = (y * lw + i) * 4,
        t = (BAYER4[(y % 4) * 4 + (i % 4)] - 0.5) * 8
      for (let ch = 0; ch < 3; ch++) d.data[o + ch] = Math.max(0, Math.min(255, Math.round((d.data[o + ch] + t) / 8) * 8))
    }
  x.putImageData(d, 0, 0)
  const out = canvas(OW, OH),
    oc = out.getContext('2d')
  oc.imageSmoothingEnabled = false
  oc.drawImage(img, 0, 0, OW, OH)
  return out
}
