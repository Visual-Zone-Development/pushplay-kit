# Glossary

Domain vocabulary for the PushPlay build kit and its skills. This is a single-context repo: one glossary, one `docs/adr/`. Use these terms in issues, tests, docs and code, and avoid the listed synonyms. Terms are added when they are settled; this file starts with phones as controllers (ADR 0001, ADR 0002).

## Phones as controllers

**Controller layout**
What a phone shows when it is a controller: a screen of controls that sends input to the game. Either a *shared layout* or a *custom phone screen*. Avoid: "skin", "template" (a starter file is a template; a layout is not copied).

**Controls settings**
What a game may change about a shared layout without making its own: which layout, `labels`, `hide`, `pause`, the layout's own fields (`prompt`, `choices`, `card`, `picked`, `vertical`, `spring`, `speed`, `btn`, `cfg`) and `theme`. Set from the game with `party.controls(settings, id?)` or `phones.controls(...)`; they reach the phone as `public.controls` and `mine.controls`, the player's own winning. Avoid: "config", "options".

**Custom phone screen**
A game's own `controller.html`: one file, everything inline, for what no shared layout does (a hand of cards, a drawing pad, a typed answer). A party game uses either shared layouts or a custom phone screen, never both. Avoid: "custom controller" for a shared layout with settings changed.

**Direct link**
A WebRTC data channel between a phone's join page and the game, opened through the relay where both can, that carries the phone's input (only input) faster than the relay. The relay copy always goes too; the first to arrive wins. `party.players[i].link` is `'direct'` or `'relay'`. Avoid: "P2P mode", "LAN mode" (it also works across networks with STUN).

**Join page**
The page a phone opens from the QR code or the address and room code (`/j/<CODE>` on the relay). It joins the room and runs the controller layout in a sandboxed frame with no network. Avoid: "lobby" (the lobby is the TV's screen).

**Knock**
A sharp fingertip tap on the phone's edge, read from its motion sensors, that a shared layout with `knocks` on turns into one press of a button (by default LT/RT on `twin`, LB/RB elsewhere). A press only, never held. Avoid: "side tap" in code, "squeeze" (phones can't sense one).

**Party game**
A game that runs on the machine plugged into a TV while everyone plays from a phone or a plugged-in controller (`--party`, `"party": true`, `party.js`). Avoid: "TV game", "Jackbox game".

**Phone pad**
A phone acting as one more controller in a game that isn't a party game, through `phone-pads.js`: it is a pad in `input.pads`, read like a plugged-in controller. Avoid: "virtual gamepad" (that is the browser automation used in tests), "remote".

**Press count**
How a layout sends presses: a running count per button (`c: { a: 3 }`), so a press that went down and up between two messages still reads as one frame of `pressed`, and none is counted twice. Avoid: "event", "tap message".

**Room code**
The four letters (no I or O) a phone types on the join page to reach a game. The QR code holds the same room in a link. Avoid: "PIN", "party code".

**Shared layout**
One of the kit's controller layouts (`classic`, `pad`, `twin`, `dpad`, `tap`, `swipe`, `slider`, `trackpad`, `choices`, `motion`) in `controller-layouts.js`. A runtime file: the same in every game on a kit version, kept current by `update-runtime`, never edited or forked in a game. Avoid: "stock pad", "default controller".
