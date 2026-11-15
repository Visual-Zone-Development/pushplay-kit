---
name: local-multiplayer
description: Add or improve couch multiplayer for the game in this repo — 2–4 players on one screen with one input device each, a join screen where each device presses a button to claim a slot, what happens when a controller disconnects or a player joins late, player colours and markers, spawns, a shared camera and a HUD per player, co-op or versus rules, catch-up mechanics, rounds and a results screen; on a handheld, a PC, a TV or a tablet with several controllers. Use for "add local co-op", "make it 2 player", "versus mode", "my friends want to play together on one screen", "two controllers on my tablet", or improving a local multiplayer game. For online play use online-netcode.
---

# Local multiplayer

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the input API (how to read one controller at a time), the screen names, the checks and how to finish a change. Read the game's `DESIGN.md` and the Fellowship notes in [framework.md](../game-design/references/framework.md).

## 1. Decide the shape
- **2–4 players**, and the game still works with 1. More than 4 on one screen stops being readable.
- **Co-op or versus?** Co-op: shared goal, revive, shared lives or score. Versus: rounds, a score to win (first to 3–5), a quick rematch.
- **One shared screen** (no split screen on a small display): one arena that fits, or a camera that frames everyone (step 4).
- **Rounds of 1–3 minutes**, then a results screen that's fun to look at together.

## 2. One input device per player
- A **slot** (P1–P4) is bound to one device by the id the engine or system gives it, and each player's gameplay reads **only that device**. The merged view of all devices is for menus only. Use the engine's per-device input (every engine has one); the rules below are the same everywhere.
- Per device, read a move axis (left stick with a 20 % dead zone, else the d-pad), held buttons and pressed-this-frame buttons. Edge detection is per device: one player holding a button never hides another's press.
- The keyboard counts as one device and may be player 1's; say so on the join screen. Don't assume there is one (a tablet has none).
- Pause from any device pauses for everyone; the shared pause menu takes input from every device.
- Never rely on chords, or on buttons the system keeps for itself (Home / Guide, Start+Select style combinations).
- Mouse and touch can't join as extra players. If gameplay needs controllers, say "Needs controllers" on the title screen; menus still work with every input.
- **A tablet with several controllers** is the same couch: one slot per controller and nothing changes in the game. If the game also plays solo by touch, the on-screen controls belong to player 1 only and hide once a controller is used ([touch-controls](../touch-controls/SKILL.md)). Keep the join screen and HUD inside the safe area so rounded corners and a home bar don't cover a player's slot ([phone-layout.md](../touch-controls/references/phone-layout.md)).

## 3. Join screen, late joins and disconnects
- The join screen is a step between the title and play (part of the title screen or its own sub-step), not an online-style lobby; keep the project's screen names.
- One slot per player: "⟨confirm button⟩ to join" in each empty slot, the button name coming from the game's input-prompt helper and built every frame. A slot fills when a device that holds no slot presses confirm (it takes the lowest free slot), shows the player's colour and marker ("P2"), and back on that device leaves.
- Start when at least the minimum have joined: any joined player presses confirm again, or a 3 s countdown that a new join restarts.
- **Colour plus shape:** 4 distinct, colourblind-safe colours, each paired with a shape or number marker (P1–P4 icons above heads, the same marker on that player's HUD). Never colour alone.
- **Late joiner:** between rounds, any free device joins the same way. Mid-round, co-op lets them in at once (spawn beside the group with 2 s of invulnerability); versus shows "P3 joins next round" and keeps the round fair.
- **Disconnect:** the slot is kept, never crashed and never handed to another device silently. Pause with "P2: reconnect your controller, or press ⟨confirm⟩ on another to take over"; the same device coming back rebinds by itself, a free device claims the slot only by that press. Any remaining player can choose *Continue without P2* (the slot becomes a gap: character removed or idle, score kept). When every device is gone, stay paused.

## 4. Shared camera and HUD
- **Camera** (see the [camera](../camera/SKILL.md) skill): frame the box around all living players plus a margin of 10–15 % of the screen on each side; ease the zoom, never snap. Stop zooming out when a character would be smaller than about 5 % of the screen height; past that, hold the camera and deal with the straggler by rule: an edge arrow in their colour, then a pull or respawn beside the group after 2–3 s (co-op), or the screen edge as a wall or a hazard (versus).
- **HUD per player:** one block per slot at a fixed place in slot order (P1 top-left, P2 top-right, P3 bottom-left, P4 bottom-right, or four across the top), each in the player's colour with their marker, showing only that player's health, lives or score. Shared values (timer, team score) go top-centre once. An empty slot shows nothing during play. Sizes per target screen come from the `game-ui` skill's table; four blocks must fit at the largest text size.
- A marker above each character's head at all times in versus, and for 2 s after every spawn in co-op.

## 5. Fairness and fun
- **Catch-up mechanics:** the leader is a bigger target, trailing players respawn faster or get better pickups, rubber-banding in racers; keep it subtle.
- **Spawns:** spread evenly, never on top of an opponent, 1–2 s of invulnerability after respawn.
- **Moments to shine:** individual stats on the results screen (most hits, longest combo, "clutch save").
- **Readable chaos:** cap effects, keep each player's character distinct, and label who did what in big moments.

## 6. Build and verify
1. Say how many can play on the title screen and in DESIGN.md *Players*.
2. Per-player state in an array indexed by slot; Restart resets all players but keeps who joined.
3. Test with two real controllers, or with scripted fake devices fed from a timeline (the engine's input simulation, or the web harness below): join, play a round, results, rematch. Also test that 1 player alone still works, and 4 if the game allows it.
4. Disconnect a controller mid-game and reconnect it; disconnect them all; join late with a third device. Each case behaves as step 3 says.
5. Update DESIGN.md (Players, Controls, Changelog).
6. Run the project's checks and finish the change the way its rules say.

## In a web game
If the project's input layer has a per-controller view, use it. Otherwise read the Gamepad API directly, once per frame:

```js
const prev = [] // last frame's buttons, per pad index
function readPads() { // getGamepads() returns fresh snapshots each call
  const out = []
  for (const gp of navigator.getGamepads()) {
    if (!gp || !gp.connected || gp.mapping !== 'standard') continue
    const was = prev[gp.index] || [], now = gp.buttons.map((b) => b.pressed)
    const dz = (v) => (Math.abs(v) < 0.2 ? 0 : v) // stick dead zone
    out.push({
      index: gp.index,
      x: dz(gp.axes[0]) || (now[15] ? 1 : 0) - (now[14] ? 1 : 0), // stick, else d-pad
      y: dz(gp.axes[1]) || (now[13] ? 1 : 0) - (now[12] ? 1 : 0),
      held: (b) => !!now[b], pressed: (b) => !!now[b] && !was[b], // 0 A, 1 B, 2 X, 3 Y, 9 Start
    })
    prev[gp.index] = now
  }
  return out
}
```
- A slot remembers the pad's `index`, which stays the same while the pad is connected. Browsers only list a pad after its first button press, which is exactly what a join screen asks for.
- A disconnect is the `gamepaddisconnected` event, or the pad missing from `getGamepads()`.
- Keep off keys the browser uses itself (function keys, Escape in fullscreen).
- **Test harness:** a headless-browser script that replaces `navigator.getGamepads` before the page loads (Playwright's `page.addInitScript`) to return two fake pads (`{ index, connected: true, mapping: 'standard', axes, buttons: [{ pressed, value }] }`) whose buttons and axes follow a timeline; drop one from the list to test a disconnect.
