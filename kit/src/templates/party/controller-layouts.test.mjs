// @vitest-environment jsdom
// The shared phone layouts (controller-layouts.js): what each layout sends for a touch, and how the
// TV's settings (party.controls) change what the phone shows. The page runs against a stand-in for
// controller.js that records what it would send to the TV.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'

const source = readFileSync(join(import.meta.dirname, 'controller-layouts.js'), 'utf8')

// jsdom has no layout: every element is a 400×300 box at the origin, unless a test says otherwise.
let rects = new Map()
Element.prototype.getBoundingClientRect = function () {
  const r = rects.get(this) ?? { left: 0, top: 0, width: 400, height: 300 }
  return { ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top }
}
if (typeof PointerEvent === 'undefined') {
  globalThis.PointerEvent = class extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
    }
  }
}

let sent
let msgs
let posted
let listeners

/** A fresh page: the stand-in controller, then the layouts script. */
function boot({ controls, mine = {}, pub = {} } = {}) {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  rects = new Map()
  sent = []
  msgs = []
  posted = []
  listeners = {}
  window.controller = {
    me: { id: 'p1', name: 'Sam', color: '#4dd8a8', room: 'ABCD' },
    players: [],
    public: { ...pub, ...(controls ? { controls } : {}) },
    mine,
    on(type, fn) {
      ;(listeners[type] ??= []).push(fn)
      return () => (listeners[type] = listeners[type].filter((f) => f !== fn))
    },
    input: (v) => sent.push(structuredClone(v)),
    send: (d) => msgs.push(d),
    vibrate() {}
  }
  window.parent.postMessage = (m) => posted.push(m)
  new Function(source)()
}
/** The TV changed what this phone sees. */
function update({ controls, mine } = {}) {
  if (controls !== undefined) window.controller.public = { ...window.controller.public, controls }
  if (mine !== undefined) window.controller.mine = mine
  for (const fn of listeners.update ?? []) fn(window.controller)
}
const last = () => sent.at(-1)
const $ = (sel) => document.querySelector(sel)
const $$ = (sel) => [...document.querySelectorAll(sel)]
const fire = (el, type, x = 0, y = 0, id = 1) => el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: id, bubbles: true, cancelable: true }))
const btn = (b) => $(`#pp .pp-btn[data-b="${b}"]`)

beforeEach(() => boot())

describe('shared layouts: choosing and adjusting', () => {
  it('shows the classic layout when the TV picked none, with A, B, X and Y and a pause button', () => {
    expect($('#pp').dataset.layout).toBe('classic')
    expect(['a', 'b', 'x', 'y'].map((b) => Boolean(btn(b)))).toEqual([true, true, true, true])
    expect($('.pp-pause').hidden).toBe(false)
  })

  it('shows pad as classic with only A and B', () => {
    boot({ controls: { layout: 'pad' } })
    expect($('#pp').dataset.layout).toBe('classic')
    expect($$('.pp-btn').map((e) => e.dataset.b).sort()).toEqual(['a', 'b'])
  })

  it('renames and hides buttons from the settings, and drops the pause button on request', () => {
    boot({ controls: { layout: 'classic', labels: { a: 'Jump' }, hide: ['x', 'y'], pause: false } })
    expect(btn('a').textContent).toBe('Jump')
    expect(btn('x')).toBeNull()
    expect($('.pp-pause').hidden).toBe(true)
  })

  it('switches layout when the TV changes it, and a setting for this player wins over everyone’s', () => {
    update({ controls: { layout: 'twin' } })
    expect($('#pp').dataset.layout).toBe('twin')
    update({ mine: { controls: { layout: 'choices', choices: ['Yes', 'No'] } } })
    expect($('#pp').dataset.layout).toBe('choices')
    update({ mine: {} })
    expect($('#pp').dataset.layout).toBe('twin')
  })

  it('falls back to classic for a layout name it does not know', () => {
    boot({ controls: 'warp-drive' })
    expect($('#pp').dataset.layout).toBe('classic')
  })

  it('takes the theme as CSS variables, with the player’s colour as the default accent', () => {
    const root = $('#pp')
    expect(root.style.getPropertyValue('--pp-accent')).toBe('#4dd8a8')
    update({ controls: { layout: 'classic', theme: { accent: '#ff6b6b', bg: '#101020', font: 'serif', radius: 20 } } })
    expect(root.style.getPropertyValue('--pp-accent')).toBe('#ff6b6b')
    expect(root.style.getPropertyValue('--pp-bg')).toBe('#101020')
    expect(root.style.getPropertyValue('--pp-font')).toMatch(/serif/)
    expect(root.style.getPropertyValue('--pp-radius')).toBe('20%')
  })

  it('shows an icon only when it is a small inline SVG', () => {
    boot({ controls: { theme: { icons: { a: '<svg viewBox="0 0 1 1"><circle r="1"/></svg>', b: '<img src=x onerror=alert(1)>' } } } })
    expect(btn('a').querySelector('svg')).not.toBeNull()
    expect(btn('b').querySelector('img')).toBeNull()
    expect(btn('b').textContent).toBe('B')
  })
})

describe('shared layouts: what they send', () => {
  it('holds A while pressed and counts the press', () => {
    fire(btn('a'), 'pointerdown')
    expect(last()).toMatchObject({ h: ['a'], c: { a: 1 } })
    fire(btn('a'), 'pointerup')
    expect(last().h).toBeUndefined()
    expect(last().c).toEqual({ a: 1 })
    expect(typeof last().n).toBe('string')
  })

  it('counts the pause button as a press of menu', () => {
    fire($('.pp-pause'), 'pointerdown')
    expect(last().c).toEqual({ menu: 1 })
  })

  it('turns a stick drag into x and y, with a small dead zone and the full range past it', () => {
    const zone = $('.pp-zone')
    fire(zone, 'pointerdown', 100, 150)
    fire(zone, 'pointermove', 104, 150) // a resting thumb
    expect(last()).toMatchObject({ x: 0, y: 0 })
    fire(zone, 'pointermove', 100 + 60, 150) // the edge of the stick
    expect(last()).toMatchObject({ x: 1, y: 0 })
    fire(zone, 'pointermove', 100, 150 - 90) // past the edge, up
    expect(last()).toMatchObject({ x: 0, y: -1 })
    fire(zone, 'pointerup', 100, 60)
    expect(last()).toMatchObject({ x: 0, y: 0 })
  })

  it('twin: the right stick aims and the triggers hold lt and rt', () => {
    update({ controls: 'twin' })
    const [, right] = $$('.pp-zone')
    fire(right, 'pointerdown', 300, 150, 2)
    fire(right, 'pointermove', 360, 150, 2)
    expect(last()).toMatchObject({ ax: 1, ay: 0 })
    fire($('.pp-trig[data-b="rt"]'), 'pointerdown', 0, 0, 3)
    expect(last()).toMatchObject({ h: ['rt'], c: { rt: 1 } })
  })

  it('dpad: a thumb up and to the right holds up and right; rolling to the left lets them go', () => {
    update({ controls: 'dpad' })
    const cross = $('.pp-cross')
    rects.set(cross, { left: 0, top: 0, width: 210, height: 210 })
    fire(cross, 'pointerdown', 105 + 60, 105 - 60)
    expect(last()).toMatchObject({ x: 1, y: -1, c: { right: 1, up: 1 } })
    expect(last().h.sort()).toEqual(['right', 'up'])
    fire(cross, 'pointermove', 105 - 80, 105)
    expect(last()).toMatchObject({ x: -1, y: 0, h: ['left'] })
    fire(cross, 'pointerup', 25, 105)
    expect(last()).toMatchObject({ x: 0, y: 0 })
    expect(last().h).toBeUndefined()
  })

  it('tap: every finger that lands is a press, and A stays held until the last one lifts', () => {
    update({ controls: { layout: 'tap', labels: { a: 'Flap' } } })
    const pad = $('.pp-full')
    expect(pad.textContent).toBe('Flap')
    fire(pad, 'pointerdown', 10, 10, 1)
    fire(pad, 'pointerdown', 20, 20, 2)
    expect(last()).toMatchObject({ h: ['a'], c: { a: 2 } })
    fire(pad, 'pointerup', 10, 10, 1)
    expect(last().h).toEqual(['a'])
    fire(pad, 'pointerup', 20, 20, 2)
    expect(last().h).toBeUndefined()
  })

  it('swipe: a drag past the threshold is one press of that way, a turn mid-drag is another, a short touch is A', () => {
    update({ controls: 'swipe' })
    const s = $('.pp-surface')
    fire(s, 'pointerdown', 200, 150)
    fire(s, 'pointermove', 260, 150)
    expect(last().c).toEqual({ right: 1 })
    fire(s, 'pointermove', 260, 90)
    expect(last().c).toEqual({ right: 1, up: 1 })
    fire(s, 'pointerup', 260, 90)
    fire(s, 'pointerdown', 100, 100)
    fire(s, 'pointerup', 102, 101)
    expect(last().c).toEqual({ right: 1, up: 1, a: 1 })
    expect(last().h).toBeUndefined()
  })

  it('slider: anywhere on the stage sets the value, and x follows it', () => {
    update({ controls: { layout: 'slider', hide: ['a'] } })
    const track = $('.pp-track')
    rects.set(track, { left: 0, top: 140, width: 400, height: 22 })
    fire($('.pp-stage'), 'pointerdown', 300, 40)
    expect(last()).toMatchObject({ v: 0.75, x: 0.5 })
    fire($('.pp-stage'), 'pointermove', 0, 40)
    expect(last()).toMatchObject({ v: 0, x: -1 })
  })

  it('slider with spring: back to the middle on release', () => {
    update({ controls: { layout: 'slider', spring: true, hide: ['a'] } })
    rects.set($('.pp-track'), { left: 0, top: 140, width: 400, height: 22 })
    fire($('.pp-stage'), 'pointerdown', 400, 40)
    expect(last().v).toBe(1)
    fire($('.pp-stage'), 'pointerup', 400, 40)
    expect(last().v).toBe(0.5)
  })

  it('trackpad: a drag adds to the totals, a quick tap is A and a two-finger tap is B', () => {
    update({ controls: { layout: 'trackpad', speed: 1 } })
    const s = $('.pp-surface')
    fire(s, 'pointerdown', 100, 100)
    expect(last().p).toEqual({ x: 0, y: 0, d: true })
    fire(s, 'pointermove', 140, 100)
    expect(last().p.x).toBeGreaterThan(0.1)
    expect(last().p.y).toBe(0)
    fire(s, 'pointerup', 140, 100)
    expect(last().p.d).toBe(false)
    expect(last().c).toBeUndefined() // a drag is not a click

    fire(s, 'pointerdown', 100, 100)
    fire(s, 'pointerup', 101, 100)
    expect(last().c).toEqual({ a: 1 })
    fire(s, 'pointerdown', 100, 100, 1)
    fire(s, 'pointerdown', 150, 100, 2)
    fire(s, 'pointerup', 100, 100, 1)
    fire(s, 'pointerup', 150, 100, 2)
    expect(last().c).toEqual({ a: 1, b: 1 })
  })

  it('choices: shows the prompt, this player’s card and the choices, and a tap sends the pick', () => {
    update({ controls: { layout: 'choices', prompt: 'Who did it?', choices: ['Alice', 'Bob'] } })
    update({ mine: { controls: { card: 'You are the spy', picked: 1 } } })
    expect($('.pp-prompt').textContent).toBe('Who did it?')
    expect($('.pp-card').textContent).toBe('You are the spy')
    const choices = $$('.pp-choice')
    expect(choices.map((c) => c.textContent)).toEqual(['Alice', 'Bob'])
    expect(choices[1].classList.contains('picked')).toBe(true)
    choices[0].click()
    expect(msgs).toEqual([{ pick: 0 }])
  })

  it('choices: also reads the older keys (public.prompt, public.choices, mine.secret)', () => {
    boot({ controls: 'choices', pub: { prompt: 'Pick a colour!', choices: ['Red', 'Blue'] }, mine: { secret: 'teapot' } })
    expect($('.pp-prompt').textContent).toBe('Pick a colour!')
    expect($('.pp-card').textContent).toBe('Your secret: teapot')
    expect($$('.pp-choice')).toHaveLength(2)
  })

  it('motion: asks the join page for the sensors, sends motion fields, and gives them back when the layout changes', () => {
    update({ controls: { layout: 'motion', btn: 'Swing', prompt: 'Hold it like a bat' } })
    expect(posted).toContainEqual({ type: 'motion', on: true })
    expect($('.pp-motion .pp-card').textContent).toBe('Hold it like a bat')
    expect($('.pp-big').textContent).toBe('Swing')
    expect(last()).toMatchObject({ a: false, st: 'waiting' })
    fire($('.pp-big'), 'pointerdown')
    expect(last()).toMatchObject({ a: true, c: { a: 1 } })
    update({ controls: 'classic' })
    expect(posted).toContainEqual({ type: 'motion', on: false })
    expect(last().st).toBeUndefined()
  })

  it('lets go of everything when the layout changes', () => {
    fire(btn('a'), 'pointerdown')
    expect(last().h).toEqual(['a'])
    update({ controls: 'tap' })
    expect(last().h).toBeUndefined()
  })
})
