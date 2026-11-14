# Working on the PushPlay plugin

This repo is where the agent skills for making games are written. It holds two plugins: `plugins/game-craft` (general game-making, never mentions PushPlay) and `plugins/pushplay` (everything specific to PushPlay). The [README](README.md) says what they are and how they are installed.

- **Before writing or moving a skill, read [docs/writing-skills.md](docs/writing-skills.md).** It decides which plugin a skill belongs to, how paths are written and what a general skill may not say.
- `npm run lint` checks every skill against those rules; `npm test` adds the template and bootstrap tests. Both must pass before pushing.
- `repo-files/` is what a PushPlay game repo starts with besides the skills. `repo-files/AGENTS.md` is the **game repo's** rule book, not this repo's: it is long, and it must name every skill in its *Skills* section (a test checks).
- `plugins/pushplay/skills/new-game/kit.zip` is written by the PushPlay release. Don't edit, rebuild or delete it by hand.
- A game repo carries its own copy of the skills, refreshed by `npm run update-kit` from the next PushPlay release. A change here reaches games then, not on push.
- `pushplay-games` (the template) is generated from this repo and the build kit; don't edit skills there.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (`Visual-Zone-Development/pushplay-plugin`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
