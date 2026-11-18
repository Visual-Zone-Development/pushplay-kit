# piecewise in a PushPlay game

The general `piecewise` skill splits a bundled request into small jobs, each with its own check and sign-off. This page gives the PushPlay side.

- **Build each job** with the `improve-game` skill's *Direct change* steps 1–4: the design sanity check, the existing style, the neighbouring systems and `pushplay check`. Leave its step 5 (*Record it*) for the end of the pass, so the version is bumped once.
- **Seen jobs:** the check's screenshot is one variant. Take the rest from a debug hook the game exposes, in the same headless browser, or ask the owner to try it on their device.
- **Felt jobs:** the owner plays it on the target device. The `playtest` skill's bots can show the numbers first.
- **Branches:** pushing the default branch publishes the game. Run the pass on a branch, and merge only after every job is signed off and the branch's own build is green.
- **Close the pass** with *Record it* from the `improve-game` skill: bump `version` (minor if any job added a feature), add one Changelog line per job in DESIGN.md, then commit.
