// @vitest-environment jsdom
// Unit tests for the runtime modules games copy (input, menu, save, settings), run in jsdom.
// The templates carry the product name as {{SLUG}}, so they're filled in into a temp folder first.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { brand } from '../../config.mjs'

// Inside the package (dist/ is gitignored) so vitest can import the filled copies.
const dir = join(import.meta.dirname, '../../../dist/runtime-test')
mkdirSync(dir, { recursive: true })
for (const name of readdirSync(import.meta.dirname)) {
  if (name.endsWith('.js')) writeFileSync(join(dir, name), readFileSync(join(import.meta.dirname, name), 'utf8').replaceAll('{{SLUG}}', brand.slug))
}
const load = (name, variant = '') => import(/* @vite-ignore */ join(dir, name) + (variant ? `?${variant}` : ''))

const key = (type, code, extra = {}) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true, ...extra }))
const press = (code) => key('keydown', code)
const release = (code) => key('keyup', code)

let pads = []
Object.defineProperty(navigator, 'getGamepads', { value: () => pads, configurable: true })
const pad = (buttons = {}, axes = [0, 0, 0, 0]) => ({
  id: 'test',
  index: 0,
  connected: true,
  mapping: 'standard',
  axes,
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: Boolean(buttons[i]), value: buttons[i] ? 1 : 0 }))
})

describe('input', async () => {
  const { input } = await load('input.js')
  beforeEach(() => {
    pads = []
    for (const code of ['Space', 'Escape', 'Backspace', 'KeyW', 'ArrowUp', 'ArrowDown', 'KeyR', 'KeyP', 'Enter']) release(code)
    input.update(1 / 60)
    input.update(1 / 60)
    input.mode = 'keyboard'
  })

  it('starts in keyboard mode outside the launcher and switches to what the player uses', () => {
    expect(input.mode).toBe('keyboard')
    expect(input.gamingMode).toBe(false)
    pads = [pad({ 0: true })]
    input.update(1 / 60)
    expect(input.mode).toBe('gamepad')
    expect(input.pressed('a')).toBe(true)
    expect(input.label('a')).toBe('A')
    pads = []
    input.update(1 / 60)
    press('Space')
    input.update(1 / 60)
    expect(input.mode).toBe('keyboard')
    expect(input.label('a')).toBe('Space')
    expect(input.stickLabel()).toBe('WASD / Arrows')
  })

  it('keeps menu (Escape, P, Start) apart from b (Backspace, B button)', () => {
    press('Escape')
    input.update(1 / 60)
    expect(input.pressed('menu')).toBe(true)
    expect(input.pressed('b')).toBe(false)
    release('Escape')
    input.update(1 / 60)
    press('Backspace')
    input.update(1 / 60)
    expect(input.pressed('b')).toBe(true)
    expect(input.held('menu')).toBe(false)
    release('Backspace')
    input.update(1 / 60)
    pads = [pad({ 9: true })]
    input.update(1 / 60)
    expect(input.pressed('start')).toBe(true)
    expect(input.pressed('menu')).toBe(true)
    expect(input.label('menu')).toBe('START')
    pads = []
    input.update(1 / 60)
    input.requestMenu()
    input.update(1 / 60)
    expect(input.pressed('menu')).toBe(true)
    input.update(1 / 60)
    expect(input.held('menu')).toBe(false)
  })

  it('tracks physical keys, so releasing W while ArrowUp is held keeps moving', () => {
    press('KeyW')
    press('ArrowUp')
    input.update(1 / 60)
    expect(input.y).toBe(-1)
    release('KeyW')
    input.update(1 / 60)
    expect(input.y).toBe(-1)
    release('ArrowUp')
    input.update(1 / 60)
    expect(input.y).toBe(0)
  })

  it('ignores modifier combos and counts a tap shorter than a frame', () => {
    key('keydown', 'Space', { ctrlKey: true })
    input.update(1 / 60)
    expect(input.held('a')).toBe(false)
    key('keyup', 'Space')
    press('Space')
    release('Space')
    input.update(1 / 60)
    expect(input.pressed('a')).toBe(true)
    input.update(1 / 60)
    expect(input.released('a')).toBe(true)
  })

  it('extendKeys adds aliases', () => {
    input.extendKeys({ KeyR: 'y' })
    press('KeyR')
    input.update(1 / 60)
    expect(input.pressed('y')).toBe(true)
    release('KeyR')
  })

  it('navY steps once, then repeats after 380 ms every 110 ms', () => {
    press('ArrowDown')
    input.update(0.016)
    expect(input.navY).toBe(1)
    let steps = 0
    for (let i = 0; i < 20; i++) {
      input.update(0.016)
      steps += input.navY
    }
    expect(steps).toBe(0) // 0.32 s: no repeat yet
    input.update(0.1)
    expect(input.navY).toBe(1) // 0.42 s: first repeat
    input.update(0.05)
    expect(input.navY).toBe(0)
    input.update(0.07)
    expect(input.navY).toBe(1) // 110 ms later
    release('ArrowDown')
    input.update(0.016)
    expect(input.navY).toBe(0)
  })

  it('fires onPause when every controller disconnects, and exposes per-pad state', () => {
    let paused = 0
    const off = input.onPause(() => paused++)
    pads = [pad({ 1: true }, [0.9, 0, 0, 0])]
    input.update(1 / 60)
    expect(input.pads[0].connected).toBe(true)
    expect(input.pads[0].pressed('b')).toBe(true)
    expect(input.pads[0].x).toBeCloseTo(0.9)
    expect(input.pads[1].connected).toBe(false)
    pads = []
    input.update(1 / 60)
    expect(paused).toBe(1)
    input.update(1 / 60)
    expect(paused).toBe(1)
    off()
  })

  it('inject adds an on-screen stick and buttons to the frame, with pressed and released', () => {
    let presses = 0
    const off = input.onAnyPress(() => presses++)
    press('KeyD')
    input.update(1 / 60)
    input.inject({ x: 0, y: 1, buttons: ['a'] })
    expect(input.x).toBeCloseTo(Math.SQRT1_2) // right from the key plus down from the stick, on the unit circle
    expect(input.y).toBeCloseTo(Math.SQRT1_2)
    expect(input.held('a')).toBe(true)
    expect(input.pressed('a')).toBe(true)
    release('KeyD')
    input.update(1 / 60)
    input.inject({ buttons: ['a'] })
    expect(input.pressed('a')).toBe(false)
    expect(input.held('a')).toBe(true)
    input.update(1 / 60)
    expect(input.released('a')).toBe(true)
    expect(input.x).toBe(0)
    expect(presses).toBeGreaterThanOrEqual(2) // the key and the injected button
    off()
  })

  it('pauses when the page is hidden or frozen (a phone locks its screen)', async () => {
    let paused = 0
    const off = input.onPause(() => paused++)
    window.dispatchEvent(new Event('pagehide'))
    document.dispatchEvent(new Event('freeze'))
    await new Promise((r) => setTimeout(r, 20))
    expect(paused).toBe(1) // both arrive together: one pause
    off()
  })

  it('maps pointer events through the canvas and switches to mouse or touch', () => {
    const canvas = document.createElement('canvas')
    canvas.getBoundingClientRect = () => ({ left: 100, top: 50, width: 640, height: 400 })
    document.body.appendChild(canvas)
    input.attach(canvas, 1280, 800)
    input.attach(canvas, 1280, 800) // idempotent
    const pointer = (type, extra) => window.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), { pointerId: 1, isPrimary: true, button: 0, pointerType: 'mouse', clientX: 420, clientY: 250, ...extra }))
    pointer('pointermove', { movementX: 3 })
    expect(input.mode).toBe('mouse')
    expect(input.pointer.x).toBe(640)
    expect(input.pointer.y).toBe(400)
    pointer('pointerdown', { pointerType: 'touch', pointerId: 7 })
    pointer('pointerup', { pointerType: 'touch', pointerId: 7 })
    input.update(1 / 60)
    expect(input.mode).toBe('touch')
    expect(input.pointer.pressed).toBe(true)
    expect(input.pointer.released).toBe(true)
    expect(input.label('a')).toBe('Tap')
    expect(input.label('menu')).toBe('≡')
    expect(input.stickLabel()).toBe('Drag')
    pointer('pointerdown', { button: 2 })
    input.update(1 / 60)
    expect(input.pressed('b')).toBe(true)
    input.mode = 'keyboard'
  })
})

describe('input inside the launcher', () => {
  it('takes the launcher\'s input mode and pause events', async () => {
    let pauseCb
    globalThis[brand.slug] = { version: '1', gamingMode: true, inputMode: 'gamepad', onPause: (cb) => (pauseCb = cb), onResume: () => {} }
    const { input } = await load('input.js', 'launcher')
    expect(input.mode).toBe('gamepad')
    expect(input.gamingMode).toBe(true)
    let paused = 0
    input.onPause(() => paused++)
    pauseCb()
    expect(paused).toBe(1)
    expect(input.paused).toBe(true)
    await new Promise((r) => setTimeout(r, 60))
    window.dispatchEvent(new CustomEvent(`${brand.slug}:pause`))
    expect(paused).toBe(2)
    window.dispatchEvent(new CustomEvent(`${brand.slug}:resume`))
    expect(input.paused).toBe(false)
    delete globalThis[brand.slug]
  })
})

/** A stand-in for input.js: pressed buttons and nav steps for one frame. */
const fakeInput = (pressed = [], extra = {}) => ({
  navX: 0,
  navY: 0,
  mode: 'keyboard',
  pointer: { active: false },
  pressed: (b) => pressed.includes(b),
  held: () => false,
  ...extra
})

describe('menu', async () => {
  const { createMenu } = await load('menu.js')

  it('navigates, chooses and goes back on b or menu', () => {
    const menu = createMenu([
      { id: 'play', label: 'Play' },
      { id: 'settings', label: 'Settings' }
    ])
    expect(menu.update(fakeInput([], { navY: 1 }))).toBeNull()
    expect(menu.selected.id).toBe('settings')
    expect(menu.update(fakeInput(['a']))).toBe('settings')
    expect(menu.update(fakeInput([], { navY: 1 }))).toBeNull() // wraps
    expect(menu.selected.id).toBe('play')
    expect(menu.update(fakeInput(['b']))).toBe('back')
    expect(menu.update(fakeInput(['menu']))).toBe('back')
  })

  it('changes range, toggle and choice items with left/right and reports values', () => {
    const changes = []
    const menu = createMenu([
      { id: 'vol', label: 'Volume', type: 'range', value: 0.8, min: 0, max: 1, step: 0.1, format: (v) => `${Math.round(v * 100)}%`, onChange: (v) => changes.push(v) },
      { id: 'shake', label: 'Shake', type: 'toggle', value: false },
      { id: 'size', label: 'Size', type: 'choice', value: 1, options: [{ value: 1, label: 'Normal' }, { value: 1.5, label: 'Large' }] }
    ])
    expect(menu.update(fakeInput([], { navX: 1 }))).toBeNull()
    expect(menu.value('vol')).toBeCloseTo(0.9)
    menu.update(fakeInput([], { navX: 1 }))
    menu.update(fakeInput([], { navX: 1 }))
    expect(menu.value('vol')).toBe(1) // clamped
    expect(changes).toEqual([0.9, 1])
    expect(menu.display(menu.items[0])).toBe('100%')
    expect(menu.update(fakeInput(['a']))).toBeNull() // a does nothing on a range
    menu.select('shake')
    menu.update(fakeInput(['a']))
    expect(menu.value('shake')).toBe(true)
    menu.update(fakeInput(['lb']))
    expect(menu.value('shake')).toBe(false)
    menu.select('size')
    menu.update(fakeInput([], { navX: -1 }))
    expect(menu.value('size')).toBe(1.5)
    expect(menu.display(menu.items[2])).toBe('Large')
  })

  it('tapping the left or right half of a value row changes it; tapping an action chooses it', () => {
    const menu = createMenu([
      { id: 'vol', label: 'Volume', type: 'range', value: 0.5, min: 0, max: 1, step: 0.1 },
      { id: 'back', label: 'Back' }
    ])
    const tap = (x, y) => fakeInput([], { mode: 'touch', pointer: { active: true, x, y, pressed: false, released: true } })
    expect(menu.update(tap(500, 450))).toBeNull()
    expect(menu.value('vol')).toBeCloseTo(0.4)
    expect(menu.update(tap(800, 450))).toBeNull()
    expect(menu.value('vol')).toBeCloseTo(0.5)
    expect(menu.update(tap(640, 530))).toBe('back')
  })

  it('adds "Quit to library" to a pause menu only inside the launcher, and quits through it', async () => {
    const pause = () => [
      { id: 'resume', label: 'Resume' },
      { id: 'title', label: 'Quit to title' }
    ]
    expect(createMenu(pause()).items.map((i) => i.id)).toEqual(['resume', 'title'])

    let quits = 0
    globalThis[brand.slug] = { quit: () => quits++ }
    const inside = await load('menu.js', 'launcher')
    const menu = inside.createMenu(pause(), { y: 300 })
    expect(menu.items.map((i) => i.label)).toEqual(['Resume', 'Quit to title', 'Quit to library'])
    expect(menu.rect(0).y).toBe(261) // half a row up, still centred
    menu.select(inside.QUIT_TO_LIBRARY)
    expect(menu.update(fakeInput(['a']))).toBeNull() // the game never sees it
    expect(quits).toBe(1)
    // A title menu (it has 'play') gets it too, so a game's first screen has a way out.
    expect(inside.createMenu([{ id: 'play', label: 'Play' }]).items.map((i) => i.label)).toEqual(['Play', 'Quit to library'])
    // Not on other menus, unless asked; and a pause menu can opt out.
    expect(inside.createMenu([{ id: 'again', label: 'Again' }]).items).toHaveLength(1)
    expect(inside.createMenu([{ id: 'go', label: 'Go' }], { quitToLibrary: true }).items).toHaveLength(2)
    expect(inside.createMenu(pause(), { quitToLibrary: false }).items).toHaveLength(2)
    delete globalThis[brand.slug]
  })
})

describe('save', async () => {
  const { createSave, createSettings, SETTINGS_DEFAULTS } = await load('save.js')
  beforeEach(() => localStorage.clear())

  it('keys by id and version, survives bad data, and migrates older versions', () => {
    const s1 = createSave('demo', 1, { best: 0 })
    expect(s1.key).toBe('demo-save-v1')
    s1.data.best = 7
    expect(s1.save()).toBe(true)
    localStorage.setItem('demo-save-v2', '{not json')
    const broken = createSave('demo', 2, { best: 0, runs: 0 })
    expect(broken.data).toEqual({ best: 7, runs: 0 }) // falls back to v1 without a migrate hook
    localStorage.removeItem('demo-save-v2')
    const s2 = createSave('demo', 2, { best: 0, runs: 0 }, (old, v) => ({ best: old.best * 10, runs: v }))
    expect(s2.migrated).toBe(true)
    expect(s2.data).toEqual({ best: 70, runs: 1 })
    s2.reset()
    expect(s2.data).toEqual({ best: 0, runs: 0 })
  })

  it('settings share the save shape, with the standard defaults', () => {
    const settings = createSettings('demo', { hard: false })
    expect(settings.key).toBe('demo-settings-v1')
    expect(settings.data).toEqual({ ...SETTINGS_DEFAULTS, hard: false })
    expect(SETTINGS_DEFAULTS).toEqual({ master: 1, music: 0.8, sfx: 1, reducedShake: false, textScale: 1 })
    expect(typeof settings.load).toBe('function')
    expect(typeof settings.save).toBe('function')
    expect(typeof settings.reset).toBe('function')
    settings.data.music = 0.3
    settings.save()
    expect(createSettings('demo').data.music).toBe(0.3)
  })
})

describe('settings screen', async () => {
  const { createSettings } = await load('save.js')
  const { createSettingsScreen } = await load('settings.js')

  it('builds on menu v2, writes the settings and returns back', () => {
    localStorage.clear()
    const settings = createSettings('demo')
    const calls = []
    const audio = { setVolume: (bus, v) => calls.push([bus, v]), tone: () => {} }
    const screen = createSettingsScreen({ settings, audio, extra: [{ id: 'hard', label: 'Hard mode', type: 'toggle', value: false }] })
    expect(screen.menu.items.map((i) => i.id)).toEqual(['master', 'music', 'sfx', 'reducedShake', 'textScale', 'hard', 'back'])
    expect(screen.update(fakeInput([], { navX: -1 }))).toBeNull()
    expect(settings.data.master).toBeCloseTo(0.9)
    expect(calls).toEqual([['master', 0.9]])
    screen.menu.select('hard')
    screen.update(fakeInput(['a']))
    expect(settings.data.hard).toBe(true)
    expect(screen.update(fakeInput(['b']))).toBe('back')
    expect(JSON.parse(localStorage.getItem('demo-settings-v1')).hard).toBe(true)
  })
})

describe('touch controls', async () => {
  const { createTouchControls } = await load('touch.js')
  /** A stand-in input: pointers by id, plus what inject() received. */
  const fake = (mode = 'touch', space = { w: 720, h: 1280 }, safe = null) => {
    const injected = []
    return {
      mode,
      x: 0,
      y: 0,
      space,
      canvas: safe ? { __fit: { safe } } : null,
      pointers: new Map(),
      inject(v) {
        injected.push(v)
      },
      injected,
      finger(id, x, y, down = true) {
        if (down) this.pointers.set(id, { id, x, y, down: true, type: 'touch' })
        else this.pointers.delete(id)
      }
    }
  }

  it('turns a finger in the left zone into a stick and fingers on the buttons into held buttons, only in touch mode', () => {
    const input = fake()
    const touch = createTouchControls(input, { buttons: ['a', 'b'] }) // the space comes from input.attach
    const a = touch.buttonAt('a')
    const b = touch.buttonAt('b')
    expect(a.r).toBeGreaterThanOrEqual(32) // a 64 px target at least
    expect(b.x).toBeGreaterThan(a.x)
    expect(b.y).toBeLessThan(a.y)
    expect(a.x + a.r).toBeLessThanOrEqual(720)

    touch.update()
    expect(touch.active).toBe(false)
    expect(input.injected.at(-1)).toEqual({ x: 0, y: 0, buttons: [] })

    input.finger(1, 150, 1000) // down in the stick zone: the base lands under the finger
    input.finger(2, a.x + 10, a.y - 10) // on A
    touch.update()
    expect(touch.active).toBe(true)
    expect(touch.owns(1)).toBe(true)
    expect(touch.stick).toMatchObject({ active: true, ox: 150, oy: 1000, x: 0, y: 0 })
    expect(touch.held('a')).toBe(true)
    expect(input.injected.at(-1)).toEqual({ x: 0, y: 0, buttons: ['a'] })

    input.finger(1, 150 + 70, 1000) // full right
    input.finger(2, b.x, b.y) // the thumb slid onto B
    touch.update()
    expect(touch.stick.x).toBeCloseTo(1)
    expect(touch.stick.y).toBeCloseTo(0)
    expect(input.injected.at(-1).buttons).toEqual(['b'])

    input.finger(1, 150 + 140, 1000) // past the rim: the base follows
    touch.update()
    expect(touch.stick.ox).toBeCloseTo(150 + 70)
    expect(touch.stick.x).toBeCloseTo(1)

    input.finger(1, 0, 0, false)
    input.finger(2, 0, 0, false)
    touch.update()
    expect(touch.active).toBe(false)
    expect(input.injected.at(-1)).toEqual({ x: 0, y: 0, buttons: [] })

    // A mouse user clicking in the stick zone is not steering, and a disabled control ignores everything.
    input.mode = 'mouse'
    input.finger(3, 150, 1000)
    touch.update()
    expect(touch.active).toBe(false)
    input.mode = 'touch'
    touch.enabled = false
    touch.update()
    expect(touch.active).toBe(false)
    expect(touch.visible).toBe(false)
  })

  it('lays out up to four buttons as a pad, clear of fit.safe, and can leave the stick out', () => {
    const insets = { top: 0, right: 0, bottom: 100, left: 0 }
    const input = fake('touch', { w: 1280, h: 720 }, insets) // fit.safe reaches it through the canvas
    const touch = createTouchControls(input, { buttons: ['a', 'b', 'x', 'y', 'lb'], stick: false })
    const ids = ['a', 'b', 'x', 'y'].map((id) => touch.buttonAt(id))
    expect(touch.buttonAt('lb')).toBeNull() // four at most
    const [a, b, x, y] = ids
    expect(y.y).toBeLessThan(a.y)
    expect(x.x).toBeLessThan(b.x)
    expect(Math.max(...ids.map((p) => p.y + p.r))).toBeLessThanOrEqual(720 - 100)
    insets.bottom = 0
    expect(touch.buttonAt('a').y).toBeGreaterThan(a.y) // insets are read live
    input.finger(1, 200, 600) // no stick: a finger in the left zone does nothing
    touch.update()
    expect(touch.active).toBe(false)
    input.finger(1, 0, 0, false)
    // Drawing only happens in touch mode, and never throws on a plain 2D context stand-in.
    const calls = []
    const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? null : (...args) => calls.push(k)) , set: () => true })
    touch.draw(ctx)
    expect(calls.filter((k) => k === 'arc').length).toBe(4) // four buttons, no stick
    input.mode = 'keyboard'
    calls.length = 0
    touch.draw(ctx)
    expect(calls).toEqual([])
  })

  it('follows a space that grows with the screen (fit fill), unless the game fixed its size', () => {
    const input = fake('touch', { w: 720, h: 1280 })
    const touch = createTouchControls(input, { buttons: ['a'], stick: false })
    const before = touch.buttonAt('a').y
    input.space = { w: 720, h: 1600 } // a taller phone
    touch.update()
    expect(touch.buttonAt('a').y).toBeCloseTo(before + 320)
    const pinned = createTouchControls(fake('touch', { w: 720, h: 1280 }), { buttons: ['a'], stick: false, h: 1280 })
    const y = pinned.buttonAt('a').y
    pinned.update()
    expect(pinned.buttonAt('a').y).toBe(y)
  })
})

describe('fit', async () => {
  const { fitCanvas } = await load('fit.js')

  it('sizes a 2D canvas to the window, keeps 1280×800 coordinates and centres it', () => {
    const canvas = document.createElement('canvas')
    const transforms = []
    canvas.getContext = () => ({ setTransform: (...args) => transforms.push(args), imageSmoothingEnabled: true })
    window.innerWidth = 1920
    window.innerHeight = 1080
    const fit = fitCanvas(canvas, { letterbox: '#123' })
    expect(fit.scale).toBe(1.35)
    expect(canvas.width).toBe(1728)
    expect(canvas.style.left).toBe('96px')
    expect(canvas.style.top).toBe('0px')
    expect(transforms.at(-1)).toEqual([1.35, 0, 0, 1.35, 0, 0])
    expect(fit.toGame(96 + 135, 540)).toEqual({ x: 100, y: 400 })
    expect(document.body.style.background).toBe('rgb(17, 34, 51)')
  })

  it('fits the phone spaces, reports safe-area insets in game units and asks for an orientation without throwing', () => {
    const canvas = document.createElement('canvas')
    canvas.getContext = () => ({ setTransform: () => {}, imageSmoothingEnabled: true })
    // A 390×844 phone at 3×: the 720×1280 portrait space scales by 0.5417 and fills the width.
    window.innerWidth = 390
    window.innerHeight = 844
    window.devicePixelRatio = 3
    // jsdom has no env(): stand in for the browser's safe-area insets (47 px notch, 34 px home bar).
    const realGCS = window.getComputedStyle
    window.getComputedStyle = (el) => (el.getAttribute?.('aria-hidden') === 'true' ? { getPropertyValue: (p) => ({ 'padding-top': '47px', 'padding-bottom': '34px' })[p] ?? '0px' } : realGCS(el))
    const locks = []
    Object.defineProperty(window.screen, 'orientation', { value: { lock: (o) => (locks.push(o), Promise.reject(new Error('not fullscreen'))), addEventListener: () => {} }, configurable: true })
    try {
      const fit = fitCanvas(canvas, { w: 720, h: 1280, orientation: 'portrait' })
      expect(fit.scale).toBeCloseTo(390 / 720)
      expect(fit.dpr).toBe(2) // capped by maxDpr
      expect(fit.orientation).toBe('portrait')
      expect(fit.top).toBe(Math.round((844 - 1280 * (390 / 720)) / 2))
      // The letterbox bars (about 75 px top and bottom) absorb the notch and the home bar.
      expect(fit.safe).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
      expect(fit.insets).toBe(fit.safe)
      expect(canvas.__fit).toBe(fit)
      expect(locks).toEqual(['portrait'])

      // A taller phone with no bars: the insets reach the canvas, in game units.
      window.innerHeight = 1280 * (390 / 720)
      fit.resize()
      expect(fit.safe.top).toBeCloseTo(47 / fit.scale)
      expect(fit.safe.bottom).toBeCloseTo(34 / fit.scale)
      expect(fit.safe.left).toBe(0)
    } finally {
      window.getComputedStyle = realGCS
      window.innerWidth = 1920
      window.innerHeight = 1080
      window.devicePixelRatio = 1
    }
  })

  it('fills any screen with fill: the asked-for space is the least, never stretched', async () => {
    const canvas = document.createElement('canvas')
    const transforms = []
    canvas.getContext = () => ({ setTransform: (...args) => transforms.push(args), imageSmoothingEnabled: true })
    const sizes = []
    try {
      // A tall phone (Pixel 9 Pro XL, 412×918): the width sets the scale, the height grows.
      window.innerWidth = 412
      window.innerHeight = 918
      const fit = fitCanvas(canvas, { w: 720, h: 1280, fill: true })
      fit.onResize((f) => sizes.push([f.w, f.h]))
      expect(fit.fill).toBe(true)
      expect([fit.minW, fit.minH]).toEqual([720, 1280])
      expect(fit.w).toBe(720)
      expect(fit.h).toBe(Math.floor(918 / (412 / 720)))
      expect(canvas.style.top).toBe('0px')
      expect(canvas.style.left).toBe('0px')
      // One unit is the same size both ways: never stretched.
      const [sx, , , sy] = transforms.at(-1)
      expect(sx).toBeCloseTo(sy)
      expect(fit.toGame(206, 0)).toEqual({ x: 360, y: 0 })

      // A small phone (360×780) and a tablet (768×1024): never smaller than 720×1280.
      window.innerWidth = 360
      window.innerHeight = 780
      fit.resize()
      expect(fit.w).toBe(720)
      expect(fit.h).toBe(Math.floor(780 / (360 / 720)))
      window.innerWidth = 768
      window.innerHeight = 1024
      fit.resize()
      expect(fit.h).toBe(1280)
      expect(fit.w).toBe(Math.floor(768 / (1024 / 1280)))
      expect(fit.w).toBeGreaterThan(720)
      expect(sizes.at(-1)).toEqual([fit.w, fit.h])

      // Touch maps into the live space.
      const { input } = await load('input.js', 'fill')
      canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 768, height: 1024 })
      input.attach(canvas, 720, 1280)
      expect(input.space).toEqual({ w: fit.w, h: fit.h })
      window.innerWidth = 412
      window.innerHeight = 918
      fit.resize()
      expect(input.space).toEqual({ w: 720, h: fit.h })
    } finally {
      window.innerWidth = 1920
      window.innerHeight = 1080
    }
  })

  it('leaves the drawing buffer of a WebGL canvas alone', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 800
    canvas.getContext = () => null // already has a WebGL context
    const fit = fitCanvas(canvas, { maxDpr: 1 })
    expect(fit.ctx).toBeNull()
    expect(canvas.width).toBe(1280)
    expect(canvas.style.width).toBe('1728px')
  })
})
