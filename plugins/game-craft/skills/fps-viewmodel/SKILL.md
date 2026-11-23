---
name: fps-viewmodel
description: Build or fix the first-person view of a 3D game, in any engine - the arms and gun on screen, hands that stay on the grips, reload and throw animations, aiming down sights, muzzle flash, and tracers. Use when hands float, clip or splay off a gun, a reload or grenade throw looks wrong, the sights block the view, the muzzle flash or tracers start in the wrong place or lag while strafing, or tracers look like streaks of wire. Not for third-person character animation (use animate-asset) or general juice (use game-feel).
---

# First-person viewmodel

Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the engine, the frame budget and the checks.

The viewmodel is everything drawn in your hands: arms, gloves, gun, muzzle
flash. It's the one thing on screen the whole game, so small errors read as
"cheap". Work from **data** (where things go on each gun) and **pure
functions** (how things move over time), and check every **variant** by eye.

## 1. Rig layout

```
camera
└─ viewmodel root   own render layer drawn after the world, depth cleared, one uniform scale
   └─ gun holder    sway, bob, recoil, reload and throw offsets go here
      └─ gun        the model, swapped per weapon
         └─ points  grip, fore, mag, sight, muzzle (named nodes, per gun, from a data table)
```

- Keep one **grips table**: per gun, the local position of each point, read off
  renders of the gun (front, side, top) rather than guessed. Optional per-gun
  fields: `hip` (where the gun sits unzoomed), `oneHand`, `twist`, `reloadTilt`.
- Arms are meshes with the **palm at their origin**, parented to `grip` (right)
  and `fore` (left), so the hands are on the gun by construction.

## 2. Hands on the gun

Pinning the palm isn't enough: a baked arm pose made for one gun points the
forearm wrong on the next, and arms sweep across the view.

- **Aim each forearm every frame** from the palm back to an **elbow anchor**
  (a fixed point in camera space, low and outside the view). Rotate by the
  shortest arc from the mesh's own forearm axis to that direction. Measure
  that axis from the mesh (the centroid of its far vertices from the palm);
  mirror x if the importer changes handedness.
- Rigged arms do better: two-bone IK to the same targets (Babylon
  `BoneIKController`, three.js `CCDIKSolver`, Godot `SkeletonIK3D`).
- **Pistols:** hold one-handed (the left hand waits below the view and comes
  up only to reload or throw), unless the art is built for a two-hand grip.
- **Roll** the hand about the forearm, per gun, until the fingers wrap the
  grip. Tune it by eye with a debug override, then store it in the table.
- During a throw, swing the elbow anchor back and out, so the forearm points
  forward like a real overhand throw.

## 3. Reload and throw as pure functions

Write the choreography without the engine: `reloadPose(t)` and
`throwPose(t)`, with `t` from 0 to 1, returning numbers (gun roll, pitch,
drop, side; how far the hand has moved to the mag; hand offset; whether a
grenade is held). The viewmodel turns them into transforms.

- **Reload beats:** tilt toward the camera, hand to the mag, mag out, drop
  out of view (dip the gun to hide the swap), new mag in with a shove,
  chamber or slap, settle. A **beats** table (`magOut` at 0.3, and so on)
  fires a sound as `t` crosses each one.
- **Throw:** grenade visible in the hand, cock back, release, follow-through,
  back to the gun. Spawn the hand's grenade in code; hide it on release.
- Fit the animation around the gameplay timing. If the projectile leaves on
  the button press, put the release in the first frames, and ask the owner
  before adding a wind-up delay, because that changes the gameplay.
- Scale the whole reload per gun (`reloadTilt`): a big roll that suits a
  rifle shows open fingers on a pistol.
- **Tests:** both poses rest (all zeros) at `t` = 0 and 1 and with no action;
  the beats fire once each, in order, across a frame-stepped run.

## 4. Aiming down sights

Line up the **centre of the optic's window** with the eye (not the top of the
rail) at a comfortable distance, and screenshot every gun zoomed. If an optic
is a solid model, or the gun body still fills the view, do it Halo's way:
drop the gun and hide it past a zoom threshold, and draw the zoomed reticle
on the HUD.

## 5. Muzzle flash, shots and tracers

- **Parent your own muzzle flash to the muzzle point**, so it moves with the
  gun and inherits the viewmodel's scale. Size it in viewmodel units. Before
  disposing a gun on a weapon swap, detach pooled effects from its points.
- **Shots start at this frame's muzzle.** In most engines the camera's
  transform updates when the frame is drawn, so a world position read during
  the update is a frame old, and it trails behind while you strafe or turn.
  Take the muzzle's offset in camera space and apply it to the current eye
  position and aim.
- **Tracers are short bolts**, about 2–3 m long, that fly along the shot at
  speed, not a line drawn along the whole path. Pool them; one new mesh and
  material per shot causes hitches. Fade a bolt out within about 1.5 m of the
  camera, so shots at the player don't smear across the screen.
- Other players' tracers start at their gun (low and to the side of their
  eyes), not at their head.

## 6. Check every variant

Add a debug hook that can override the viewmodel's inputs (zoom, reload `t`,
throw `t`, speed), freeze the simulation, hide the HUD and slow effects. Then
capture a **pose sheet**: every gun at hip and zoomed, reload start, mid and
end, throw cocked and released. Look at each frame, and zoom in on the hands.

Tune hand and gun positions with a live inspector behind the debug flag: a function that places the gun for a given yaw, pitch and distance, and a switch that hides the arms, so a number changes without a reload. Keep the table the third-person model uses too, so the two views can't drift apart.

Where a position can be computed two ways, compare them in code (for
example, the predicted muzzle against the rendered muzzle node). A check that
covers one gun of five covers one-fifth of the change.

Run the project's checks and finish the change the way its rules say.
