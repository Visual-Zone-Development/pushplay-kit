# ADR 0002: A direct link for phone input, with the relay as the fallback

- Status: Accepted
- Date: 2026-11-26

## Context

Phones reach a game through PushPlay's relay on Railway: phone → relay → game over WebSockets. That works on any network (a phone on mobile data, a TV behind a firewall), but every press makes a round trip to the server: about 50–150 ms. With the shared gamepad layouts (ADR 0001), phones are now meant for action games too, where that delay is felt. Usually the phone and the game are on the same Wi-Fi a few metres apart.

## Decision

1. **Input also takes a WebRTC data channel where both sides can open one.** The phone's join page says it can in its hello (`{k:'hi', rtc: 1}`). `party.js` offers a data channel (unordered, no retransmits), and the offer, answer and ICE candidates travel as `{k:'rtc'}` inside the relay's existing `send`. **The relay's protocol and server don't change**, and a phone socket still sends only `party-join`, `send` and `leave`.
2. **The relay copy always goes too.** The join page numbers every input message (`q`) and sends it on the channel, when open, and through the relay. `party.js` keeps the first copy of each number and drops older or repeated ones, so a lost channel message (no retransmits) never leaves a button stuck, a channel that never opens costs nothing, and a channel that drops mid-game is a non-event. A reloaded page says hello again and numbering restarts.
3. **Only input.** The controller page, shared state, views, menus and messages stay on the relay, where delivery is reliable and ordered.
4. **The link lives in the join page,** never in the controller frame, which keeps `connect-src 'none'`. Custom `controller.html` pages get the faster path without changing.
5. **No outside servers by default.** ICE uses host candidates only, which is enough on the same Wi-Fi. A game can name STUN servers (`createParty({ stun })`) to try a direct link across networks. There is no TURN server: the relay is the fallback. `createParty({ direct: false })` turns the link off; `?rtc=0` on the join page does the same from the phone's side.

## Consequences

- On the same Wi-Fi, a phone's input takes about 5–20 ms instead of 50–150 ms. Elsewhere it behaves as before.
- Relay traffic doesn't drop, because the relay copy still goes. That's the price of losing nothing when the channel misbehaves; it could later be thinned (for example only state changes, not repeats) if relay cost matters.
- Browsers may hide local addresses behind mDNS names, which some networks can't resolve, so the direct link won't open everywhere. That is fine by design: the relay carries on.
- `relay-public/shell.js` changes in the launcher repo first (`apps/relay/public/`) and is copied into the kit. The relay must be deployed for players' phones to get the new join page; until then, games simply stay on the relay.
- `party.players[i].link` (`'direct' | 'relay'`) tells a game and its tests which way a phone's input comes.
