# ADR 0001: Shared phone controller layouts, and phones as controllers in any game

- Status: Accepted
- Date: 2026-11-26

## Context

Phones could already be controllers, but only in party games. `new-game --party --controller pad|custom|motion` copied a starter phone screen into the game as `controller.html`, which the game then owned. Every game's phone controller drifted from the others, a fix to the starter reached no existing game, and the input a game read was fixed at `{ x, y, a, b }`. A game that wasn't a party game couldn't take a phone at all, so someone without a controller couldn't play a one-player game with their phone.

The owner wants the same controllers across games, a few layouts to choose from, a way for makers to build their own when they must, and a way to connect a phone to any game, single-player included.

## Decision

1. **Layouts are runtime files, not starters.** The kit ships ten shared layouts in one file, `controller-layouts.js` (`classic`, `pad`, `twin`, `dpad`, `tap`, `swipe`, `slider`, `trackpad`, `choices`, `motion`). A party game that passes `controls` to `createParty` sends phones the kit's page: `controller.js` plus `controller-layouts.js`, identical in every game on a kit version. `update-runtime` keeps it current, and a phone caches it once for every game.
2. **Games adjust layouts with settings and a theme, and never fork them.** `party.controls(settings, id?)` picks the layout and sets labels, hidden buttons, the pause button, layout fields and a theme (colours, one of five system font stacks, corner radius, small inline SVG icons), for everyone or one player, at any time. Anything more is a custom `controller.html`, which stays supported unchanged. There is no command to copy a shared layout into a game.
3. **One gamepad view of every player.** `party.pad(id)` reads a phone on a layout and a controller plugged into the TV the same way (`x`, `y`, `aimX`, `aimY`, `value`, `pointer`, `held`, `pressed`, `released`). Layouts send their whole state, with presses as running counts per button and the trackpad as running totals, so lost or merged messages lose nothing and never double a press. `party.inputs` keeps its old shape for existing games.
4. **Phones in any game are pads.** `phone-pads.js` (`connectPhones(input, …)`) opens the same kind of room lazily, when the game first draws its "Connect a phone" card, and makes each phone a pad in `input.pads` through a new `input.addPad(read)`. The game's ordinary input (`input.x`, `held`, `pressed`, `onPause`) then includes it, so a one-player game needs no other change. This lives in the kit, not the launcher, so it works in a browser, on the website and in the launcher alike.
5. **The check covers both.** A party game on a layout must get a headless phone's button press into `party.pad(id)`; a `phone-pads.js` game must let a headless phone join and move `input.pads`. Both get a relay pass at build time.

## Consequences

- A layout fix reaches every game on its next `update-runtime`. A layout change is a runtime change: it must keep every layout's wire format readable by older `party.js` copies, or bump both together.
- Makers can't make a shared layout look entirely their own. That is deliberate: players learn one set of controllers. A game that needs more writes a custom phone screen and loses the shared page's caching and updates.
- `motion.js` becomes a runtime file. A game that already had its own copy keeps it, since `update-runtime` only refreshes copies with the runtime header.
- `party-controllers/pad.html` and `motion.html` are gone; existing games keep their copies as custom phone screens.
- Input travels through the relay (about 50–150 ms); ADR 0002 adds a direct link beside it.
- The manifest can't yet say a game takes phones (its schema comes from the launcher), so the stores can't label it. That is a follow-up in the launcher and the website.
