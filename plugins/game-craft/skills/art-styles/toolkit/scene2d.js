// The 2D scene every style draws (art-styles skill): a frog mail-courier, a tree, a cottage and a mailbox.
// It is a worked example of building subjects from shaped parts instead of bare primitives.
// Items are drawn in order. An item is a filled shape ({ role, pts }) or a detail line ({ role, pts, line: true, w }).
// group: bg (sky and far), env (world), char (the frog). part: the object it belongs to (tree, house, mailbox...).
import { ellipse, rect, roundRect, archRect, blob, unionOutline, capsule, paw, band, curve, lerp, rot, seeded } from './forms2d.js'

const W = 640,
  H = 400
const TAU = Math.PI * 2

export function shapes2d() {
  const S = []
  const add = (role, pts, group = 'env', part = '') => {
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x)
      y1 = Math.max(y1, y)
    }
    S.push({ role, pts, group, part, box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } })
    return S.at(-1)
  }
  const line = (role, pts, w = 1.5, group = 'env', part = '') => {
    const s = add(role, pts, group, part)
    s.line = true
    s.w = w
    return s
  }

  // ----- sky and far -----
  add('sky', rect(-80, -60, W + 160, H + 120), 'bg')
  add('sun', ellipse(540, 66, 30, 30), 'bg')
  add(
    'cloud',
    unionOutline(
      [
        [150, 84, 22],
        [176, 70, 28],
        [206, 78, 24],
        [232, 88, 16],
        [126, 90, 14]
      ],
      180,
      82,
      96,
      96
    ),
    'bg'
  )
  add(
    'cloud',
    unionOutline(
      [
        [318, 54, 13],
        [336, 46, 17],
        [356, 52, 14],
        [372, 58, 9]
      ],
      344,
      52,
      80,
      62
    ),
    'bg'
  )
  const hill = []
  for (let x = -80; x <= W + 80; x += 8) hill.push([x, 250 - 60 * Math.exp(-(((x - 300) / 190) ** 2)) - 26 * Math.exp(-(((x - 620) / 120) ** 2))])
  hill.push([W + 80, H + 60], [-80, H + 60])
  add('hill', hill, 'bg')
  // distant trees on the ridge, for depth
  for (const [x, y, r] of [
    [224, 206, 11],
    [244, 199, 14],
    [266, 195, 10],
    [372, 199, 12],
    [392, 207, 9]
  ])
    add('hilltree', blob(x, y, r, 5, 0.12, 40, 1.15, x), 'bg')
  const ground = []
  for (let x = -80; x <= W + 80; x += 8) ground.push([x, 276 + 5 * Math.sin(x / 70)])
  ground.push([W + 80, H + 60], [-80, H + 60])
  add('ground', ground)

  // ----- path with stepping stones -----
  const L = [],
    R = [],
    mid = []
  for (let i = 0; i <= 20; i++) {
    const t = i / 20,
      y = 420 - t * 130,
      cx = 296 + (466 - 296) * (t * t * 0.55 + t * 0.45) + Math.sin(t * 3.1) * 16,
      hw = 76 * (1 - t) + 15 * t
    L.push([cx - hw, y])
    R.unshift([cx + hw, y])
    mid.push([cx, y, hw])
  }
  add('path', [...L, ...R])
  for (const i of [2, 5, 9, 12, 15, 17]) {
    const [cx, y, hw] = mid[i]
    add('stone', ellipse(cx + (i % 2 ? hw * 0.3 : -hw * 0.25), y, hw * 0.34, hw * 0.13, 20), 'env', 'path')
  }
  // grass tufts and flowers
  const r = seeded(7)
  for (let k = 0; k < 46; k++) {
    const x = r() * W,
      y = 290 + r() * 104,
      pm = mid[Math.max(0, Math.min(20, Math.round((420 - y) / 6.5)))]
    if (Math.abs(x - pm[0]) < pm[2] + 10 || (Math.abs(x - 300) < 80 && Math.abs(y - 320) < 34)) continue
    const s = 4 + r() * 4
    if (k % 5 === 0) add('flower', ellipse(x, y, 2.6, 2.6, 10), 'env', 'grass')
    else
      line(
        'grass',
        [
          [x - s * 0.7, y - s],
          [x - s * 0.2, y],
          [x, y - s * 1.3],
          [x + s * 0.2, y],
          [x + s * 0.8, y - s * 0.9]
        ],
        1.3,
        'env',
        'grass'
      )
  }

  // ----- tree: back clusters, flared trunk with branches, front clusters -----
  for (const [x, y, rr] of [
    [70, 146, 32],
    [146, 144, 33],
    [108, 112, 37]
  ])
    add('leavesBack', blob(x, y, rr, 7, 0.11, 72, 0.95, x), 'env', 'tree')
  add(
    'trunk',
    [
      [66, 298],
      [82, 290],
      [91, 270],
      [94, 240],
      [91, 214],
      [74, 197],
      [64, 182],
      [71, 177],
      [86, 192],
      [98, 203],
      [103, 188],
      [100, 166],
      [107, 164],
      [110, 186],
      [112, 200],
      [124, 187],
      [137, 171],
      [143, 176],
      [131, 195],
      [119, 214],
      [117, 244],
      [120, 272],
      [128, 290],
      [146, 298],
      [118, 294],
      [106, 299],
      [94, 294]
    ],
    'env',
    'tree'
  )
  line('bark', curve([100, 284], [103, 256], [99, 228]), 1.3, 'env', 'tree')
  line('bark', curve([110, 276], [112, 258], [109, 240]), 1.1, 'env', 'tree')
  line('bark', curve([104, 222], [107, 212], [112, 204]), 1, 'env', 'tree')
  for (const [x, y, rr] of [
    [60, 172, 27],
    [154, 170, 28],
    [106, 152, 36],
    [82, 128, 26],
    [134, 126, 27]
  ])
    add('leaves', blob(x, y, rr, 7, 0.12, 72, 0.95, x * 0.7), 'env', 'tree')
  // a few apples for colour
  for (const [x, y] of [
    [84, 160],
    [128, 146],
    [150, 178]
  ])
    add('fruit', ellipse(x, y, 3.6, 3.6, 12), 'env', 'tree')

  // ----- cottage: front gable, side wall in perspective, roof with overhang and tiles -----
  add('chimney', rect(498, 114, 14, 40), 'env', 'house')
  add(
    'chimneySide',
    [
      [512, 114],
      [519, 112],
      [519, 150],
      [512, 154]
    ],
    'env',
    'house'
  )
  add(
    'chimneyCap',
    [
      [495, 109],
      [515, 109],
      [522, 107],
      [522, 113],
      [515, 115],
      [495, 115]
    ],
    'env',
    'house'
  )
  add(
    'sidewall',
    [
      [506, 206],
      [568, 194],
      [568, 272],
      [506, 286]
    ],
    'env',
    'house'
  )
  add(
    'wall',
    [
      [426, 286],
      [426, 206],
      [466, 160],
      [506, 206],
      [506, 286]
    ],
    'env',
    'house'
  )
  add(
    'foundation',
    [
      [424, 276],
      [508, 276],
      [508, 287],
      [424, 287]
    ],
    'env',
    'house'
  )
  add(
    'foundationSide',
    [
      [508, 276],
      [570, 263],
      [570, 273],
      [508, 287]
    ],
    'env',
    'house'
  )
  for (const x of [438, 456, 476, 492])
    line(
      'mortar',
      [
        [x, 277],
        [x, 286]
      ],
      1,
      'env',
      'house'
    )
  for (const [x, y, w] of [
    [431, 250, 9],
    [492, 262, 10],
    [430, 214, 8]
  ])
    add('wallstone', roundRect(x, y, w, 5.5, 2), 'env', 'house')
  add(
    'eaveShade',
    [
      [506, 206],
      [568, 194],
      [568, 203],
      [506, 216]
    ],
    'env',
    'house'
  )
  add(
    'roof',
    [
      [466, 150],
      [526, 138],
      [576, 202],
      [514, 214]
    ],
    'env',
    'house'
  )
  for (const t of [0.2, 0.36, 0.52, 0.68, 0.84]) line('tile', [lerp([466, 150], [514, 214], t), lerp([526, 138], [576, 202], t)], 1.2, 'env', 'house')
  for (let k = 0; k < 14; k++) {
    const t = 0.2 + (k % 5) * 0.16,
      u = 0.12 + ((k * 0.37) % 0.8),
      a = lerp(lerp([466, 150], [514, 214], t), lerp([526, 138], [576, 202], t), u),
      b = lerp(lerp([466, 150], [514, 214], t + 0.16), lerp([526, 138], [576, 202], t + 0.16), u)
    if (t + 0.16 <= 1) line('tile', [a, b], 0.9, 'env', 'house')
  }
  add(
    'trim',
    band(
      [
        [418, 216],
        [466, 150],
        [514, 216]
      ],
      7
    ),
    'env',
    'house'
  )
  add(
    'roofEdge',
    band(
      [
        [514, 214],
        [576, 202]
      ],
      5
    ),
    'env',
    'house'
  )
  // attic window
  add('trim', ellipse(466, 186, 11, 11, 24), 'env', 'house')
  add('window', ellipse(466, 186, 7.5, 7.5, 24), 'env', 'house')
  line(
    'mullion',
    [
      [466, 178.5],
      [466, 193.5]
    ],
    1.4,
    'env',
    'house'
  )
  line(
    'mullion',
    [
      [458.5, 186],
      [473.5, 186]
    ],
    1.4,
    'env',
    'house'
  )
  // door with frame, planks, knob and a step
  add('trim', archRect(451, 232, 30, 54), 'env', 'house')
  add('door', archRect(455, 236, 22, 50), 'env', 'house')
  for (const x of [461, 466, 471])
    line(
      'plank',
      [
        [x, 240],
        [x, 285]
      ],
      1,
      'env',
      'house'
    )
  add('knob', ellipse(473, 264, 2, 2, 10), 'env', 'house')
  add(
    'stone',
    [
      [447, 286],
      [485, 286],
      [488, 292],
      [444, 292]
    ],
    'env',
    'house'
  )
  // front windows either side of the door
  for (const x of [431, 486]) {
    add('trim', rect(x, 226, 16, 20), 'env', 'house')
    add('window', rect(x + 2.5, 228.5, 11, 15), 'env', 'house')
    line(
      'mullion',
      [
        [x + 8, 228.5],
        [x + 8, 243.5]
      ],
      1.2,
      'env',
      'house'
    )
    line(
      'mullion',
      [
        [x + 2.5, 236],
        [x + 13.5, 236]
      ],
      1.2,
      'env',
      'house'
    )
    add('sill', rect(x - 1.5, 246, 19, 3), 'env', 'house')
  }
  // side window with a flower box
  add(
    'trim',
    [
      [522, 218],
      [550, 212.5],
      [550, 240.5],
      [522, 246]
    ],
    'env',
    'house'
  )
  add(
    'windowDim',
    [
      [525, 220.5],
      [547, 216],
      [547, 237],
      [525, 241.5]
    ],
    'env',
    'house'
  )
  line(
    'mullion',
    [
      [536, 218.5],
      [536, 239.5]
    ],
    1.2,
    'env',
    'house'
  )
  line(
    'mullion',
    [
      [525, 231],
      [547, 226.5]
    ],
    1.2,
    'env',
    'house'
  )
  add(
    'flowerbox',
    [
      [520, 246],
      [552, 239.5],
      [552, 246.5],
      [520, 253]
    ],
    'env',
    'house'
  )
  for (let k = 0; k < 6; k++) add(k % 2 ? 'flower' : 'flower2', ellipse(524 + k * 5, 244.5 - k * 1.05, 2.6, 2.6, 10), 'env', 'house')

  // ----- mailbox -----
  add('post', rect(393, 252, 6, 42), 'env', 'mailbox')
  add(
    'mailboxSide',
    [
      [411, 240],
      [421, 236],
      [421, 250],
      [411, 254]
    ],
    'env',
    'mailbox'
  )
  add('mailbox', archRect(381, 226, 30, 28), 'env', 'mailbox')
  line(
    'slot',
    [
      [388, 242],
      [404, 242]
    ],
    1.8,
    'env',
    'mailbox'
  )
  line(
    'flagpole',
    [
      [414, 214],
      [414, 240]
    ],
    1.6,
    'env',
    'mailbox'
  )
  add(
    'flag',
    [
      [414, 213],
      [427, 216.5],
      [414, 220]
    ],
    'env',
    'mailbox'
  )

  // ----- the frog courier -----
  const C = 'char'
  add('shadow', ellipse(302, 346, 66, 9), C)
  add('frog', ellipse(256, 320, 25, 19, 30, 0, TAU, -0.5), C, 'haunch')
  add('frog', ellipse(344, 320, 25, 19, 30, 0, TAU, 0.5), C, 'haunch')
  add('foot', paw(246, 342, Math.PI * 0.88, 8, 10, 0.5, 3, 0.62), C)
  add('foot', paw(354, 342, Math.PI * 0.12, 8, 10, 0.5, 3, 0.62), C)
  // pear-shaped body, wider at the bottom
  add(
    'frog',
    ellipse(300, 304, 50, 40, 60).map(([x, y]) => [300 + (x - 300) * (1 + 0.12 * ((y - 304) / 40)), y]),
    C,
    'body'
  )
  for (const [x, y, rr] of [
    [262, 290, 4.5],
    [338, 300, 3.6],
    [256, 304, 3],
    [345, 288, 2.6]
  ])
    add('spot', blob(x, y, rr, 3, 0.2, 16, 1, x), C)
  add('belly', ellipse(300, 320, 32, 22, 40), C)
  // strap, letter and satchel on the hip
  add(
    'strap',
    band(
      [
        [332, 276],
        [300, 290],
        [270, 306]
      ],
      5.5
    ),
    C
  )
  add(
    'letter',
    [
      [238, 303],
      [260, 291],
      [268, 304],
      [246, 316]
    ],
    C
  )
  line(
    'fold',
    [
      [240, 304],
      [254, 305],
      [259, 293]
    ],
    0.9,
    C
  )
  add('bag', roundRect(234, 304, 40, 32, 6), C)
  add(
    'flap',
    [...roundRect(234, 304, 40, 16, 6).slice(0, 7), ...curve([274, 318], [254, 330], [234, 318], 12), ...roundRect(234, 304, 40, 16, 6).slice(21)],
    C
  )
  add('buckle', roundRect(250.5, 319, 7, 7, 1.5), C)
  // resting arm and hand
  add('frog', capsule(270, 298, 276, 334, 8.5, 6.5), C, 'arm')
  add('frog', paw(277, 340, Math.PI * 0.5, 6, 7.5, 0.55, 3, 0.7), C, 'hand')
  // waving arm and open hand
  add('frog', capsule(334, 294, 362, 262, 8.5, 6.5), C, 'arm')
  add('frog', paw(366, 255, -Math.PI * 0.36, 6.5, 9, 0.6, 3), C, 'hand')
  // eyes: bump, white, iris, pupil, catchlight, lid
  for (const x of [278, 322]) {
    add('frog', ellipse(x, 262, 18, 18, 36), C, 'eyebump')
    add('eye', ellipse(x, 261, 12.5, 12.5, 30), C)
    add('iris', ellipse(x + 1.5, 262, 8.2, 8.2, 24), C)
    add('pupil', ellipse(x + 2, 262.5, 4.6, 5.6, 20), C)
    add('shine', ellipse(x - 1.5, 258.5, 2.5, 2.5, 12), C)
    add('shine', ellipse(x + 5, 266, 1.2, 1.2, 8), C)
    add(
      'lid',
      ellipse(x, 261, 13.5, 13.5, 20, Math.PI + 0.25, TAU - 0.25).concat([
        [x + 10, 254],
        [x - 10, 254]
      ]),
      C
    )
  }
  // postal cap: crown, band, brim, badge (tilted a little)
  const tilt = (p) => rot(p, 300, 250, -0.1)
  add('cap', tilt(ellipse(300, 246, 21, 15, 24, Math.PI, TAU)), C)
  add('capband', tilt(rect(279, 244, 42, 7)), C)
  add('brim', tilt(ellipse(300, 252.5, 24, 5.5, 24)), C)
  add('badge', tilt(ellipse(300, 239, 4.2, 4.2, 14)), C)
  add('cheek', ellipse(264, 291, 7, 4.5, 16), C)
  add('cheek', ellipse(336, 291, 7, 4.5, 16), C)
  line('mouth', curve([272, 291], [300, 305], [328, 291], 18), 2.2, C)
  line(
    'mouth',
    [
      [269, 288],
      [272, 291]
    ],
    2,
    C
  )
  line(
    'mouth',
    [
      [331, 288],
      [328, 291]
    ],
    2,
    C
  )
  line(
    'nostril',
    [
      [295, 281],
      [296, 282]
    ],
    1.8,
    C
  )
  line(
    'nostril',
    [
      [305, 281],
      [304, 282]
    ],
    1.8,
    C
  )
  return S
}

// The palette styles start from, and how the detail roles derive from the main ones.
export const NATURAL = {
  sky: '#8fd3f4',
  sun: '#ffd25e',
  cloud: '#ffffff',
  hill: '#93c47d',
  ground: '#6fae5a',
  path: '#e6c88f',
  trunk: '#7a5232',
  leaves: '#4f9a4a',
  chimney: '#a26a52',
  roof: '#c8553d',
  wall: '#f3e3c3',
  window: '#ffd98a',
  door: '#7b4a2e',
  post: '#6b4a30',
  mailbox: '#3d6fb6',
  flag: '#e8403a',
  shadow: '#000000',
  foot: '#4f9a3c',
  frog: '#6cc04a',
  belly: '#e9f2b8',
  eye: '#ffffff',
  pupil: '#1c1c24',
  cheek: '#f29a8e',
  mouth: '#23331c',
  cap: '#e4473b',
  strap: '#6b3f22',
  bag: '#9a6236',
  letter: '#fbf6ea',
  trim: '#fbf1dc',
  stone: '#b9b1a2',
  iris: '#e8b83a',
  shine: '#ffffff',
  badge: '#f2c14e',
  capband: '#2b3a6b',
  flower: '#f06d8a',
  flower2: '#ffd24a',
  fruit: '#e4473b'
}
// role -> [base role, lightness shift]
const DERIVE = {
  hilltree: ['hill', -0.1],
  leavesBack: ['leaves', -0.1],
  chimneySide: ['chimney', -0.12],
  chimneyCap: ['stone', -0.08],
  sidewall: ['wall', -0.14],
  foundation: ['stone', 0],
  foundationSide: ['stone', -0.13],
  wallstone: ['wall', -0.12],
  roofEdge: ['roof', -0.14],
  windowDim: ['window', -0.12],
  sill: ['trim', -0.1],
  flowerbox: ['door', 0.04],
  mailboxSide: ['mailbox', -0.14],
  spot: ['frog', -0.12],
  flap: ['bag', -0.1],
  buckle: ['badge', 0],
  lid: ['frog', -0.04],
  brim: ['cap', -0.14],
  knob: ['badge', 0],
  eaveShade: ['wall', -0.3],
  // detail lines take a dark version of what they sit on
  grass: ['ground', -0.16],
  bark: ['trunk', -0.16],
  mortar: ['stone', -0.25],
  tile: ['roof', -0.18],
  mullion: ['trim', -0.02],
  plank: ['door', -0.14],
  slot: ['mailbox', -0.25],
  flagpole: ['post', 0],
  fold: ['letter', -0.3],
  nostril: ['frog', -0.3]
}
export function colorOf(P, role, hexToRgb, toHsl, fromHsl) {
  if (P[role]) return hexToRgb(P[role])
  const d = DERIVE[role]
  if (!d) return hexToRgb(NATURAL[role] || '#888888')
  const [h, s, l] = toHsl(colorOf(P, d[0], hexToRgb, toHsl, fromHsl))
  return fromHsl([h + (d[1] < 0 ? -6 : 4), s, l + d[1]])
}
