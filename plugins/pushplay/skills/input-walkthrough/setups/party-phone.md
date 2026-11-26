---
id: party-phone
name: Party game phone
summary: A guest's phone joining a party game: its shared layout or custom controller.html screen, touch only.
browser: --device mobile
inputs: touch
optional: true
---

Run this only for party games: games made with `--party` (`party.js`, and
either a shared layout set with `party.controls` or a custom `controller.html`).
For them, run it instead of the generic `phone-touch` setup.

## How to play
Start the TV side (`index.html`) in a separate browser with `--viewport 1920x1080`
and reach the lobby. Then open the phone page with the join URL the lobby
shows (read it with `eval` or from the screenshot of the QR area), and use
`tap` and `fill` on the phone only. Typing a name is allowed here: it runs on a
phone.

## What must be true
- A guest can join from the phone without instructions, and the TV shows them in the lobby.
- Every phone control is at least about 44×44 px, works by tap, and responds visibly.
- The phone screen fits portrait without sideways scrolling, and says so clearly if it needs landscape.
- If the phone page reloads or the phone locks and comes back, the guest can rejoin.
- On a shared layout, every control the game uses does something on the TV, the labels say what
  (`labels`), buttons the game doesn't use are hidden (`hide`), and the pause button pauses.
- Each phase the TV goes through shows a phone screen that fits it (a `choices` vote, back to the
  gamepad after).
