# design-doc in a PushPlay game

The general `design-doc` skill walks the owner through a full design doc, section by section. This page gives the PushPlay side. The rules are in the `pushplay-rules` skill.

- **Section 3 (players, platforms and inputs):** use the PushPlay kickoff, [kickoff.md](../../../new-game/references/kickoff.md) in the `new-game` skill. The target devices, the logical resolution and the inputs every game supports are fixed by the `pushplay-rules` skill, so play them back instead of asking about them.
- **The brief template:** start from [DESIGN.template.md](../../../new-game/references/DESIGN.template.md) in the `new-game` skill, and add the sections the design-doc outline lists.
- **Definition of done:** use [complete-game.md](../../../new-game/references/complete-game.md).
- **Section 10 (tech):** online and party play need the PushPlay relay. Its limits are in [online-and-party.md](../../../pushplay-rules/references/online-and-party.md).
- **After approval:** for a new game, continue with step 5 of the `new-game` skill (build in milestones); for an existing one, use the `piecewise` skill with the `improve-game` skill's *Direct change* steps for each job.
