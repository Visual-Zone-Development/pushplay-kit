---
id: phone-pads
name: Phone as a controller
summary: A phone joining a game that isn't a party game (phone-pads.js) and playing it, touch only on the phone.
browser: --device mobile
inputs: touch
optional: true
---

Run this only for games that take phones as controllers: they have `phone-pads.js` (made with
`--phones`, or a game that imports it). Party games use `party-phone` instead.

## How to play
Start the game in a separate browser with `--viewport 1920x1080` and open its "Connect a phone"
screen with the keyboard or a controller (that browser is the TV; using it to reach the card is
allowed). Read the join URL with `eval` (`window.__kitPhones.phones.joinUrl`) or from the
screenshot of the card. Then open it on the phone, and from there on use `tap` and `fill` on the
phone only: start a game and play it from the phone. Typing a name is allowed here: it runs on a
phone.

## What must be true
- The connect screen is reachable from the title and from the pause menu, and shows a QR code,
  the address and the room code large enough to read across a room.
- The phone joins without instructions, the TV shows it as connected, and the game can be
  started and played from the phone alone, menus included (the phone's stick and A move through
  them like a controller's).
- The layout fits the game: no button the game ignores, labels that say what each does, and the
  pause button pauses.
- Locking the phone pauses the game; unlocking it carries on with the same phone.
- With no phone ever connected, the game never opens the room (nothing on the network).
