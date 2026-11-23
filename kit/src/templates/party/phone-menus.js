// {{SLUG}} runtime v21 — shared runtime file, replaced by update-runtime; don't edit
// Every menu on the TV, on the phones too: nobody should have to get up and touch the TV (or the
// tablet hosting the party) to resume, restart, change a setting or quit.
//
// The TV publishes whichever menu.js menu is open (party.public.menu: its title, its items and
// their current values). controller.js shows it on every phone as buttons and sends taps back as
// { menu: { id } } (choose), { menu: { id, step: ±1 } } (change a value) or { menu: { back: true } }.
// Each tap is fed into that same menu as if it were pressed on the TV, so everything the menu does
// (Quit to library inside the launcher, onChange handlers, settings saving) happens the same way.
//
//   const phoneMenus = createPhoneMenus(party, input)
//   each frame, for the menu on screen:   const choice = menu.update(phoneMenus.input(menu), dt)
//   with no menu on screen:               phoneMenus.input(null)
//   once per frame:                       phoneMenus.publish(menu, 'Paused')   or   phoneMenus.publish(null)

const VALUE_TYPES = new Set(['toggle', 'range', 'choice'])

export function createPhoneMenus(party, input) {
  const queue = []
  let injected = null
  party.on('msg', ({ data }) => {
    if (data && typeof data.menu === 'object' && data.menu) queue.push(data.menu)
  })
  // The real input, plus this frame's phone tap: A to choose, B to go back, left/right to change.
  const merged = new Proxy(input, {
    get(target, key) {
      if (key === 'pressed') return (b) => Boolean(injected?.[b]) || target.pressed(b)
      if (key === 'navX') return injected?.navX || target.navX
      const v = target[key]
      return typeof v === 'function' ? v.bind(target) : v
    }
  })
  return {
    /** The input to update `menu` with this frame, carrying one queued phone tap (if any). */
    input(menu) {
      injected = null
      const tap = queue.shift()
      if (!menu) {
        queue.length = 0 // taps for a menu that has closed
        return merged
      }
      if (tap?.back) injected = { b: true }
      else if (typeof tap?.id === 'string' && menu.items.some((i) => i.id === tap.id && !i.disabled)) {
        menu.select(tap.id)
        injected = tap.step ? { navX: Math.sign(Number(tap.step)) || 0 } : { a: true }
      }
      return merged
    },
    /** Show this menu on every phone (or none). */
    publish(menu, title = '') {
      party.public.menu = menu
        ? {
            title,
            sel: menu.selected?.id ?? null,
            items: menu.items.filter((i) => !i.disabled).map((i) => ({ id: i.id, label: i.label, value: VALUE_TYPES.has(i.type) ? menu.display(i) : null }))
          }
        : null
    }
  }
}
