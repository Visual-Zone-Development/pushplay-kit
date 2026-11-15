# Menus, leaving the game, pause and flow

For a JavaScript game built on the runtime files.

## Menus (`menu.js`)

- `createMenu(items, opts)`; items are `{ id, label, disabled? }` or value items `{ id, label, type: 'toggle' | 'range' | 'choice', value, min, max, step, options, onChange }`.
- Each frame: `const action = menu.update(input, dt)` returns the chosen item id, `'back'` (B or `menu`) or `null`; then `menu.draw(ctx)`. Read values with `menu.value(id)`; `menu.select(id)`, `menu.selected`, `menu.items` for custom drawing.
- It moves with d-pad, stick, arrows and WASD; chooses with A, Space, Enter, click or tap; goes back with B, Backspace, Esc/Start or right-click; highlights on hover; left/right, LB/RB, the arrow buttons and taps change values.
- Use it for **every** menu: title, pause, settings, game over, level select. A custom menu must do all of the above, including touch.
- Inside the launcher, a menu with a `resume` item (the pause menu) gets **Quit to library** added at the end by itself (see below). Don't add your own.

## Leaving your game

Players must always be able to get back to their library, including people who never read a hint. There are two ways out, and a game on the runtime files has both without writing any code:

- **The game's own pause menu.** Inside the launcher, `menu.js` ends the pause menu (any menu with a `resume` item) with **Quit to library**. Choosing it asks the launcher to close the game, so `game.js` never sees it, and it isn't there outside the launcher (in a browser, `pushplay dev`, the game's normal release). Keep the item id `resume` for the pause menu and you get it. A pause menu without `resume` can ask for it with `createMenu(items, { quitToLibrary: true })`; a game that really can't be left mid-way (rare) can opt out with `{ quitToLibrary: false }`.
- **The launcher's menu.** Holding Start+Select, F10, holding Esc for 1 s, or the ≡ button the launcher draws for mouse and touch open the launcher's own menu (Resume, Restart game, Quit game) over any game. It pauses the game first (`input.onPause`). The launcher shows how at launch and again whenever the player presses the game's pause.

So:
- **Don't build an "exit to launcher" of your own** and never bind F10, Start+Select or a held Esc.
- **"Quit to title" stays inside the game** (to the title screen). Name in-game exits by where they lead ("Back to the arcade", "Quit to title"); the library exit is the runtime's.
- **A pause menu not built with `menu.js`** (a custom menu, a game ported from another engine) adds the same item itself, shown only inside the launcher: `if (window.pushplay?.quit) items.push({ id: 'library', label: 'Quit to library' })`, and on choosing it calls `window.pushplay.quit()`. Always use `?.`: outside the launcher `window.pushplay` is undefined.

## Exit and pause

- **The launcher owns quitting.** The game's own Quit to library and the launcher's menu are the only ways out.
- **Launcher contract:** `window.pushplay?.{ version, gamingMode, inputMode, quit(), restart(), onPause(cb), onResume(cb) }` plus window events `pushplay:pause` / `pushplay:resume`. `input.js` already wires these: use `input.onPause(cb)` and `input.paused`.
- **Auto-pause:** `input.onPause(cb)` fires when the launcher overlay opens, the window loses focus or is hidden (`visibilitychange`: a phone's screen lock, a call, switching apps), or all controllers disconnect. The callback must switch to the pause screen and save (see [saves-and-audio.md](saves-and-audio.md)); `audio.js` mutes on its own. Never auto-resume: the player presses Resume.
- **Pause menu = Resume, Restart, Settings, Quit to title**, in that order, built with `menu.js` (inside the launcher it then shows Quit to library last, on its own). `menu` (Start / Esc / P / on-screen button) opens it from gameplay and `'back'` resumes. Quit to title goes to the title screen, not out of the game. The game is fully frozen while paused (no timers, physics or spawns advance).
- **On-screen pause button:** a ≥ 56×56 px button in a corner during gameplay that calls `input.requestMenu()`; it's how mouse and touch players pause. The starter has one; keep it.
- Never use `alert()`, `confirm()`, `prompt()`, `window.open()` or new tabs; they block every input. Draw confirmations in-game.

## Flow

- Screens: `title` → `playing` ↔ `paused` → `gameover`, plus `settings` (and `lobby` between `title` and `playing` in an online or party game). Keep the current one in `state.screen` with exactly those names, and expose `window.__game = { state, TUNING }` (the check presses Start and expects `'paused'`).
- The check's touch pass taps the title menu through `window.__game.titleMenu` (the starter exposes it), so keep that getter if you move the title menu.
- The title screen is the first thing drawn, and its menu is how the game starts. Game over shows score, best and retries in one press.
- Restart (from pause or game over) resets everything the run touched: timers, particles, audio loops, RNG seed if seeded.
