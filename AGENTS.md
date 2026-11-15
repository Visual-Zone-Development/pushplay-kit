# Working on the PushPlay plugin

This repo is where the agent skills for making games are written. It holds two plugins: `plugins/game-craft` (general game-making, never mentions PushPlay) and `plugins/pushplay` (everything specific to PushPlay). The [README](README.md) says what they are and how they are installed.

- **Before writing or moving a skill, read [docs/writing-skills.md](docs/writing-skills.md).** It decides which plugin a skill belongs to, how paths are written and what a general skill may not say.
- `npm run lint` checks every skill against those rules; `npm test` adds the tests of the command-line runner and the session hook. Both must pass before pushing.
- **The plugin is optional for game makers.** Everything PushPlay needs from a game is written in [docs/pushplay-build.md](docs/pushplay-build.md), for people with no agent. A skill may go further than that page, but must never be the only place a requirement is written.
- **Game repos hold only the game:** its files, `pushplay.json`, its art and one workflow file. No skill may tell an agent to add anything else PushPlay-specific to a repo (no `AGENTS.md`, no kit folder, no npm scripts).
- These files are written by the PushPlay release (from the launcher's repo); don't edit, rebuild or delete them by hand: `plugins/pushplay/skills/pushplay-rules/kit.zip` (the build kit), `.github/workflows/build.yml` (the shared build every game repo calls), `schema/manifest.schema.json` and `docs/workflow.yml`. The release also moves the `v1` tag that game repos call.
- A change to a skill reaches people when they update the plugin. A change to the kit reaches every game on its next push.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (`Visual-Zone-Development/pushplay-plugin`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
