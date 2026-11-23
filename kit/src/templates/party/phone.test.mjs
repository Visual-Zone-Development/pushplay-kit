// @vitest-environment jsdom
// The party runtime's phone-facing parts: phone-menus.js (the TV's menus published to phones, and
// phone taps fed into the same menu) and controller.js's built-in menu screen and safety card.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { brand } from '../../config.mjs'

// Filled copies inside the package (dist/ is gitignored) so vitest can import them.
const dir = join(import.meta.dirname, '../../../dist/party-test')
mkdirSync(dir, { recursive: true })
const fill = (from) => readFileSync(join(import.meta.dirname, from), 'utf8').replaceAll('{{SLUG}}', brand.slug)
writeFileSync(join(dir, 'menu.js'), fill('../shared/menu.js'))
writeFileSync(join(dir, 'phone-menus.js'), fill('phone-menus.js'))
const { createMenu } = await import(/* @vite-ignore */ join(dir, 'menu.js'))
const { createPhoneMenus } = await import(/* @vite-ignore */ join(dir, 'phone-menus.js'))

function setup() {
  const handlers = []
  const party = { public: {}, on: (e, f) => handlers.push(f) }
  const input = { pressed: () => false, navX: 0, navY: 0, pointer: { active: false }, mode: 'gamepad' }
  const phoneMenus = createPhoneMenus(party, input)
  const tap = (menu) => handlers.forEach((h) => h({ from: 'p1', data: { menu } }))
  const menu = createMenu([
    { id: 'resume', label: 'Resume' },
    { id: 'music', label: 'Music', type: 'toggle', value: true },
    { id: 'off', label: 'Hidden', disabled: true },
    { id: 'title', label: 'Quit to title' }
  ])
  return { party, phoneMenus, tap, menu }
}

describe('createPhoneMenus (TV)', () => {
  it('publishes the open menu for the phones: title, selection, items and values', () => {
    const { party, phoneMenus, menu } = setup()
    phoneMenus.publish(menu, 'Paused')
    expect(party.public.menu).toEqual({
      title: 'Paused',
      sel: 'resume',
      items: [
        { id: 'resume', label: 'Resume', value: null },
        { id: 'music', label: 'Music', value: 'On' },
        { id: 'title', label: 'Quit to title', value: null }
      ]
    })
    phoneMenus.publish(null)
    expect(party.public.menu).toBeNull()
  })

  it('a tap on an item chooses it, as if pressed on the TV', () => {
    const { phoneMenus, tap, menu } = setup()
    tap({ id: 'title' })
    expect(menu.update(phoneMenus.input(menu))).toBe('title')
    expect(menu.update(phoneMenus.input(menu))).toBeNull()
  })

  it('a step changes a value, and Back goes back', () => {
    const { phoneMenus, tap, menu } = setup()
    tap({ id: 'music', step: 1 })
    menu.update(phoneMenus.input(menu))
    expect(menu.value('music')).toBe(false)
    tap({ back: true })
    expect(menu.update(phoneMenus.input(menu))).toBe('back')
  })

  it('ignores disabled items and drops taps sent when no menu is open', () => {
    const { phoneMenus, tap, menu } = setup()
    tap({ id: 'off' })
    expect(menu.update(phoneMenus.input(menu))).toBeNull()
    tap({ id: 'resume' })
    phoneMenus.input(null)
    expect(menu.update(phoneMenus.input(menu))).toBeNull()
  })
})

describe('controller.js (phone)', () => {
  let sent
  let listeners = []
  /** A fresh phone page with controller.js loaded; tv(d) delivers a message from the TV. */
  function phone() {
    // A page loads controller.js once: drop the copy an earlier test loaded.
    for (const [type, fn] of listeners) window.removeEventListener(type, fn)
    listeners = []
    document.body.replaceChildren()
    sent = []
    window.parent.postMessage = (m) => m.type === 'send' && m.d.k === 'm' && sent.push(m.d.d)
    const add = window.addEventListener
    window.addEventListener = (type, fn, o) => (listeners.push([type, fn]), add.call(window, type, fn, o))
    // eslint-disable-next-line no-new-func
    new Function(fill('controller.js'))()
    window.addEventListener = add
    const tv = (d) => window.dispatchEvent(new MessageEvent('message', { source: window, data: { type: 'msg', d } }))
    return { controller: window.controller, tv }
  }
  const dialog = (name) => [...document.querySelectorAll('[role="dialog"]')].find((d) => d.getAttribute('aria-label') === name)
  const button = (root, text) => [...root.querySelectorAll('button')].find((b) => b.textContent === text || b.getAttribute('aria-label') === text)

  beforeEach(() => document.body.replaceChildren())

  it('shows the TV’s menu as buttons and sends taps back', () => {
    const { tv } = phone()
    tv({ k: 'P', s: { menu: { title: 'Paused', sel: 'resume', items: [{ id: 'resume', label: 'Resume', value: null }, { id: 'music', label: 'Music', value: 'On' }] } } })
    const menu = dialog('Paused')
    expect(menu).toBeTruthy()
    button(menu, 'Resume').click()
    button(menu, 'Music: more').click()
    expect(sent).toEqual([{ menu: { id: 'resume' } }, { menu: { id: 'music', step: 1 } }])
    tv({ k: 'p', p: [[['menu'], null]] })
    expect(dialog('Paused')).toBeUndefined()
  })

  it('leaves the menu to the game when controller.menuScreen is false', () => {
    const { controller, tv } = phone()
    controller.menuScreen = false
    tv({ k: 'P', s: { menu: { title: 'Paused', items: [{ id: 'resume', label: 'Resume', value: null }] } } })
    expect(dialog('Paused')).toBeUndefined()
  })

  it('shows the safety card when the TV asks, and I’m ready tells the TV and closes it', () => {
    const { tv } = phone()
    tv({ k: 'V', s: { safety: { title: 'Before you swing', tips: [{ title: 'Give yourself room', text: 'Keep clear.' }] } } })
    const card = dialog('Before you swing')
    expect(card.textContent).toContain('Give yourself room')
    button(card, 'I’m ready').click()
    expect(sent).toEqual([{ safe: true }])
    expect(dialog('Before you swing')).toBeUndefined()
  })
})
