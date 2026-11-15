# Controls and input hints

For a JavaScript game built on the runtime files. `pushplay` is the command the `pushplay-rules` skill gives you.

## Controls: every input, alone

Games are played on a Steam Deck or Legion Go with their built-in controls, on Linux, Windows and Mac PCs with a controller, a keyboard, a mouse or a touchscreen, and on phones and tablets with touch or a Bluetooth controller. **Every menu and screen must work with each of those alone.** Gameplay must work with a controller and with a keyboard; mouse and touch gameplay are expected too, unless the genre genuinely can't (then omit them from the manifest's `inputs` and say so on the title screen).

`input.js`: call `input.update()` once at the top of every frame, and `input.attach(canvas, 1280, 800)` once at startup (it maps mouse and touch into game space; the check warns if it's missing).

| `input` button | Controller | Keyboard | Mouse / touch | Use it for |
|---|---|---|---|---|
| `a` | A | Space, Enter | click, tap | confirm, jump, main action |
| `b` | B | Backspace | right-click | back in menus; **free for gameplay** (dash, cancel, secondary) |
| `x` | X | Shift | | secondary action |
| `y` | Y | F | | secondary action |
| `lb` / `rb` | LB / RB | Q / E | | cycle, tabs, rotate |
| `lt` / `rt` | LT / RT | Z / C | | hold actions, triggers |
| `select` | Select / View | Tab | | map, scoreboard, extra info |
| `up` `down` `left` `right` | d-pad | arrows, WASD | | discrete steps |
| `menu` (virtual) | Start | Esc, P | on-screen pause button → `input.requestMenu()` | **pause and menu only** |

- `input.x`, `input.y` (−1..1): left stick + d-pad + WASD/arrows. `input.aimX`, `input.aimY`: right stick. `input.navX`, `input.navY`: stepped with key repeat, for menus and grids. `input.pointer` (mouse or primary touch, in 1280×800 game space) and `input.pointers` for multitouch.
- `input.held(b)`, `input.pressed(b)`, `input.released(b)`. Use `pressed()` for one-shot actions.
- **Pause is `menu`, back is `b`. They are different buttons.** Esc always pauses and never acts as B; B/Backspace never pauses. So B is a normal gameplay button and a stray Esc can't cancel a run.
- **Never bind F10, Start+Select, or a held Esc.** The launcher uses them to open its own menu (see [menus-and-exit.md](menus-and-exit.md)). Nothing in the game may depend on a chord of two buttons.
- Game-specific key aliases go through `input.extendKeys({ KeyR: 'y' })` in `game.js`, never through an edit to `input.js`.
- Nothing may need hover, a double-click, a scroll wheel, a modifier chord or typed text: a controller has none of them. (A party game's phone screen, `controller.html`, may use text fields: it runs on a phone.) Pointer-driven ideas (aiming, dragging, placing) also need a stick-driven cursor or snapping between targets.
- **Local multiplayer** uses `input.pads[i]` (`{ index, connected, x, y, aimX, aimY, held(), pressed() }`), one per controller; player 1 may also use the keyboard. Join screen: `${input.label('a')} to join`, one slot per pad that pressed. The merged `input.*` view is for menus only in a multiplayer game. Tag it `"local multiplayer"` and set `players` to e.g. `"2-4"`. Several controllers on one tablet work the same way.
- **On-screen controls** (`touch.js`): when touch-only gameplay needs a stick or buttons, `const touch = createTouchControls(input, { stick: true, buttons: ['a', 'b'], labels: { a: 'Jump' } })`; call `touch.update()` right after `input.update()` and `touch.draw(ctx)` last during play. It writes `input.x / y` and `held / pressed / released` for up to four round ≥ 64 px buttons in the thumb zones, and draws nothing unless `input.mode === 'touch'`, so a controller on a tablet hides it. Don't read `input.pointer` for movement as well. See the `touch-controls` skill and [phone.md](../../pushplay-runtime/references/phone.md).

## Input hints

- Prompts come from the runtime, never from hard-coded names: `input.label('a')` → "A" on a controller, "Space" on a keyboard, "Tap" on touch (and a click label with a mouse); `input.label('menu')` → "START" / "Esc" / the pause button; `input.stickLabel()` and `input.dpadLabel()` name the movement input for the current mode.
- Legends, where one is really needed: `drawPrompts(ctx, input, [['a', 'Jump'], ['x', 'Dash']], opts)` from `prompts.js` draws icons for the current mode. Place it beside what it explains, never as a row along the bottom edge.
- **No prompt row along the bottom of the screen.** Don't park a strip of button prompts (`drawPrompts(...)` at `y: H - 40`) under menus, the title, results or play: it sits in the thumb zone, collides with menus (inside the launcher the title and pause menus gain a "Quit to library" row), and says nothing a menu doesn't already show. Teach a control once, in place, next to the thing it acts on (beside the board, on the button, over the object), and stop showing it once it has been used. On touch and mouse show no prompts at all: taps and clicks land on things that already look pressable. The starter from `pushplay new-game` draws a bottom prompt row on its title, settings and play screens; remove it when you build the game.
- `input.mode` is `'gamepad' | 'keyboard' | 'mouse' | 'touch'`, follows the last device used, and starts as `'gamepad'` inside the launcher's gaming mode (`input.gamingMode`, `input.usingGamepad`). Build prompt strings every frame, not once at load, so they switch when the player changes device.
- Title screen: the menu is the way in, so it needs no "press to start" line and no pause hint (the on-screen pause button and the launcher teach pausing). If you do write a start line, build it from `input.label('a')` (on touch it reads "Tap", so phrase it as `${input.label('a')} to start`). Leave room under the title menu for the launcher's extra "Quit to library" row. If gameplay doesn't support mouse or touch, say so there ("Needs a controller or keyboard").
- Never write "Press A", "Space", "LB/RB", "Click" or "Tap" as literal text in the game.
