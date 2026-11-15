# Working on the PushPlay plugin

This repo is everything on the making side of PushPlay. It holds the build kit that builds, checks and publishes every PushPlay game (`kit/`), and two plugins of agent skills: `plugins/game-craft` (general game-making, never mentions PushPlay) and `plugins/pushplay` (everything specific to PushPlay). The [README](README.md) says what they are and how they are installed.

- **Before writing or moving a skill, read [docs/writing-skills.md](docs/writing-skills.md).** It decides which plugin a skill belongs to, how paths are written and what a general skill may not say.
- `npm run lint` checks every skill against those rules; `npm test` adds the tests of the command line, the session hook and the build kit. Both must pass before pushing.
- **The plugin is optional for game makers.** Everything PushPlay needs from a game is written in [docs/pushplay-build.md](docs/pushplay-build.md), for people with no agent. A skill may go further than that page, but must never be the only place a requirement is written.
- **Game repos hold only the game:** its files, `pushplay.json`, its art and one workflow file. No skill may tell an agent to add anything else PushPlay-specific to a repo (no `AGENTS.md`, no kit folder, no npm scripts).
- **The build kit lives in `kit/`** ([kit/README.md](kit/README.md)). After any change there run `npm run kit:build`, which repacks `plugins/pushplay/skills/pushplay-rules/kit.zip` and rewrites `.github/workflows/build.yml`, `docs/workflow.yml` and `schema/manifest.schema.json`. Never edit those four by hand; a test fails while they are behind. Bump `KIT_VERSION` when what ships changes.
- `npm test` needs the kit's packages (`npm run kit:install`) and a headless browser (`npx playwright install chromium`, or `KIT_BROWSER`).
- A push to `main` that passes the tests moves the `v1` tag, which every game repo's workflow calls. So `main` is what games build with: don't push a kit change you haven't run the tests on.
- A change to a skill reaches people when they update the plugin. A change to the kit reaches every game on its next push.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (`Visual-Zone-Development/pushplay-kit`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
