# Party games: the TV and phones

A party game runs on the handheld or PC that's plugged into the TV. Everyone else joins from
their phone: they scan the QR code on the lobby screen, or open the address shown there in any
browser and type the four-letter room code. Controllers plugged into the machine can join too,
so the same game plays with phones, pads, or a mix.

Scaffold one with `pushplay new-game <id> --party`. Phones show one of the kit's shared layouts
(`--controller classic`, the default, or `pad`, `twin`, `dpad`, `tap`, `swipe`, `slider`,
`trackpad`, `choices`, `motion`): see [controllers.md](controllers.md), and try them with
`pushplay controllers`. Use `--controller custom` only when phones need a screen no layout gives
(a hand of cards, a drawing pad, a typed answer). `motion` is for when the phone's motion sensors
are the controller (tilt, a steering wheel, swings; see [motion.md](motion.md)).

## How it works

```
TV (game.js)                                     each phone (a shared layout, or controller.html)
  party.update() every frame
  reads party.pad(id), party.pressed(id,'a')    ←─ controller.input({...})
  party.controls({ layout, … }, id?) ───────────→  which layout, its labels and theme
  party.on('msg', ({ from, data }))             ←─ controller.send({ pick: 2 })
  writes party.public  ─────────────────────────→  controller.public   (every phone)
  writes party.view(id) ────────────────────────→  controller.mine     (that phone only)
  party.send(id, data) ─────────────────────────→  controller.on('msg')
  everything else stays on the TV
```

- **The TV runs the whole game.** Phones only show what they're sent and send back taps.
- **Phones see only what you send them.** `party.public` is for everyone (prompt, choices,
  whose turn, the timer). `party.view(id)` is for one player (their cards, their secret role,
  their answer). Anything else, like the full deck or other players' answers, never leaves the TV,
  so nobody can peek. **Never put a secret in `party.public`.**
- **Changes only.** About 20 times a second the TV sends each phone what changed in `public` and
  its view. Write them freely; keep them to what phones show.
- **Inputs look the same from every player.** `party.pad(id)` is a gamepad for a phone on a
  shared layout and for a local controller alike (`x`, `y`, `aimX`, `aimY`, `value`, `pointer`,
  `held(b)`, `pressed(b)`, `released(b)`). `party.inputs[id]` is what a custom `controller.html`
  sent, as sent.

## A custom phone screen

Only when no shared layout fits ([controllers.md](controllers.md)). `controller.html` sits next to `index.html` (in `public/` for a Vite game). It's one file with
its styles and script inline. The TV sends it to each phone, where it runs sandboxed with no
network: no CDNs, no fetch, images as `data:` URLs. The kit adds `controller.js` to the top,
which defines a global `controller`:

| API | |
|---|---|
| `controller.me` | `{ id, name, color, room }` |
| `controller.players` | `[{ id, name, color, kind, connected }]` |
| `controller.public`, `controller.mine` | What the TV shares with everyone, and with this phone only |
| `controller.on('update', fn)` | After any of the above change: re-render here |
| `controller.on('msg', fn)` | One-off messages from `party.send` |
| `controller.input({...})` | Held controls; sent when they change (at most 30 a second) |
| `controller.send(data)` | A one-off message: a choice, a typed answer, a finished drawing |
| `controller.vibrate(ms)` | A buzz, where the phone supports it |

While the TV's lobby is open, a built-in screen shows who's in and gives the first player a
Start button. Set `controller.lobbyScreen = false` to draw your own.

While the TV has a menu open (`party.public.menu`, from `phone-menus.js`), a built-in screen shows
it as buttons (‹ › for values) and sends taps back. Set `controller.menuScreen = false` to draw
your own: render `public.menu` (`{ title, sel, items: [{ id, label, value }] }`, `value` null for
an action) and send `{ menu: { id } }`, `{ menu: { id, step: ±1 } }` or `{ menu: { back: true } }`.

When the TV asks this phone for the safety card (`party.view(id).safety = { title, tips }`, which
`motion.safety.hold()` sets in a motion game), a built-in card covers the screen until the player
taps I'm ready, which sends `{ safe: true }`. Set `controller.safetyScreen = false` to draw your own.

Design for a phone held in one hand on a couch: big tap targets (at least 56 px), one decision
per screen, text people can read at arm's length, portrait for custom screens. Text fields are
fine here (unlike in the TV game). Show the player's colour (`controller.me.color`) so they can
find themselves on the TV.

## Recipes

**Prompt, answer, vote (Quiplash-style).** `party.view(id).prompt` gives each player their
prompt, and the phone sends `{ answer }` from a text field. On the TV, collect answers in a
TV-only object, then put the anonymous options in `party.public.choices` and take votes as
`{ vote: i }`. Reveal who wrote what on the TV only.

**Hidden hands (cards, roles).** Deal on the TV; write each hand into `party.view(id).hand`. The
table, discard pile and whose turn go in `party.public`. When a player plays a card the phone
sends `{ play: cardId }`; check it's really in their hand on the TV.

**Drawing.** The phone draws on a `<canvas>` and sends the strokes when done, as compact point
lists (`{ strokes: [[x, y, x, y, …], …] }`, numbers rounded, coordinates 0–1000). Messages over
about 12 KB are refused, so send a long drawing in a few parts. The TV redraws them.

**Phones as gamepads (brawlers, racers, shooters).** Use a shared layout (`classic`, `twin`, `dpad`)
and read `party.pad(id)`, which reads local controllers the same way. Phone input takes 50–150 ms to reach the TV, which
is fine for party brawlers and bumper games and wrong for precise aiming. Keep the action on
the TV, where everyone's looking.

**Votes between rounds.** Switch every phone to `party.controls({ layout: 'choices', prompt,
choices })`, take `{ pick: i }` from `party.on('msg')`, mark each player's pick with
`party.controls({ picked: i }, id)`, then switch back. The party starter does this.

**Phones as motion controllers (tilt, steer, swing, bowl).** Use `--controller motion` and the
`motion-controls` skill. Gestures are detected and timed on the phone, and the TV syncs to the
phone's clock, so timing games (batting, rhythm) work despite the delay; pointing at the screen
doesn't (see [motion.md](../../pushplay-runtime/references/motion.md)). [Motion Lab](https://github.com/Visual-Zone-Development/motion-lab) is the worked example.

**Turn-based with spectators.** Leave the party unlocked so late arrivals join as watchers, or
`party.lock()` once the game starts. Seats of players who drop (locked phone, Wi-Fi) are kept
for two minutes: show them dimmed (`connected: false`) and skip their turn rather than ending
the game.

## Screens and flow

`title` → `lobby` → `playing` ↔ `paused`, with `state.screen` and `window.__game` exposed as in
every game. The lobby (`party-lobby.js`) shows the address, room code, QR code and everyone
who's in; A on the TV, or Start on the first phone, begins once `minPlayers` are in. With a mouse
or touch (a tablet hosting with no controller) it draws real Start and Back buttons and a click or
tap on them works: Start stays dimmed until `minPlayers` are in, Back leaves for the title.
`lobby.buttons` gives their rects (`{ start, back, retry }`) for tests. During play,
`drawJoinBadge(ctx, party, x, y)` keeps the code on screen for latecomers. Pausing freezes the
game (the TV runs it): set `party.public.paused = true` so phones can say so. "End party" in the
pause menu calls `party.close()`, which tells every phone the game ended.

**Every TV menu works from the phones.** Nobody should have to get up and touch the TV, or the
tablet hosting, to resume, restart, change a setting or quit. `phone-menus.js` does it for any
`menu.js` menu (the party starter wires the pause and settings menus):

```js
const phoneMenus = createPhoneMenus(party, input)
// each frame, for the menu on screen (its update() gets the phones' taps as presses):
const choice = pauseMenu.update(phoneMenus.input(pauseMenu), dt)
// screens with no menu: phoneMenus.input(null)
// once per frame, what the phones show:
if (state.screen === 'paused') phoneMenus.publish(pauseMenu, 'Paused')
else if (state.screen === 'settings' && state.from === 'paused') phoneMenus.publish(settingsScreen.menu, 'Settings')
else if (state.screen === 'gameover') phoneMenus.publish(overMenu, 'Game over')
else phoneMenus.publish(null)
```

Taps go into the same menu, so Quit to library (inside the launcher), `onChange` and settings
saving behave exactly as on the TV. Any phone can work them, not just whoever is playing. Every
shared layout has a pause button: pause when any player's `party.pad(id).pressed('menu')`. A custom
screen needs one too (`controller.send({ pause: true })`).

## Testing

- `pushplay dev`: the local relay listens on your Wi-Fi, so scan the lobby's QR code with a
  real phone. Open the join address in a few browser windows (one per player) to test alone.
- `pushplay check`: headless phones join by code, press a button on the game's shared layout
  (it must reach `party.pad(id)`), send input, must each see exactly their own `party.view(id)`,
  and one reloads to check it gets its seat back.
- Test menus from the phone side: a phone pauses, opens Settings, changes a value, goes Back
  and resumes, all through `{ menu }` messages, without a key pressed on the TV.
