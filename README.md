# PushPlay plugin

Skills that teach a coding agent to make games. Two plugins in one repo:

| Plugin | What it is | Skills |
|---|---|---|
| **game-craft** | Game-making craft for any web game (canvas 2D, three.js, any framework). It never mentions PushPlay. | 30: design briefs, game feel, physics, camera, enemy AI, levels, bosses, progression, story and dialogue, art direction, pixel art, 2D and 3D assets, environments, audio, UI, touch controls, local and online multiplayer, playtesting, performance, accessibility, localization, release notes |
| **pushplay** | Everything specific to [PushPlay](https://pushplay.gg), the launcher that plays your games on a Steam Deck, Legion Go, PC and phone. It builds on game-craft. | 14: starting a whole game project from one request, improving and debugging games, the manifest, the runtime files, library art and screenshots, checking every input, phone and party play, the build kit, promoting a game to its own repo |

Skills are plain [Agent Skills](https://agentskills.io) (`SKILL.md` with `name` and `description`), so they work in any agent that reads them.

## Install

**Claude Code**

```
/plugin marketplace add Visual-Zone-Development/pushplay-plugin
/plugin install game-craft@pushplay
/plugin install pushplay@pushplay
```

Install `game-craft` alone for the craft skills in any project. `pushplay` expects `game-craft` next to it.

**Codex, Copilot, Cursor, Gemini CLI and other agents**

```
npx skills add Visual-Zone-Development/pushplay-plugin
```

It lists the skills and installs the ones you pick into your agent's skills folder. Gemini CLI can also install a folder of skills directly: `gemini skills install https://github.com/Visual-Zone-Development/pushplay-plugin --path plugins/game-craft/skills`.

## Make a PushPlay game

In an empty folder (or any repo), with the `pushplay` skills installed, ask:

> Make me a game about a frog delivering mail.

The `new-game` skill asks a few questions, then sets up the whole project from the kit bundled with it (the build kit and GitHub workflow, `AGENTS.md`, every skill, the tools and npm scripts), scaffolds the game and builds it. Push the repo to GitHub and the game builds itself and shows up in PushPlay.

**From a phone or a cloud agent,** where plugins often aren't loaded, start from the template instead: [pushplay-games](https://github.com/Visual-Zone-Development/pushplay-games) → **Use this template**. It is this repo's output, committed: the same kit and the same skills, already in place.

### In a game repo, the skills are committed

A PushPlay game repo carries its own copy of every skill in `.claude/skills/` (with `.agents/skills` pointing at it), pinned to the build kit it uses, so every agent and every cloud session sees them with nothing installed. `npm run update-kit` refreshes them. If you also have these plugins installed, each skill shows up twice inside a game repo: disable the plugins for that project (in Claude Code: `/plugin`).

## Layout

```
.claude-plugin/marketplace.json   the marketplace: both plugins
plugins/game-craft/skills/        the general skills
plugins/pushplay/skills/          the PushPlay skills (new-game/kit.zip is the bundled project kit)
repo-files/                       what a game repo starts with besides skills: AGENTS.md, CLAUDE.md, package.json, tools/, …
scripts/                          lint-skills.mjs (the rules), build-template.mjs (what game repos get), tests
docs/writing-skills.md            how to write and place a skill
```

## Working on the skills

```
npm run lint     # every skill against docs/writing-skills.md
npm test         # the lint and template tests, and new-game's bootstrap in throwaway folders (needs the npm registry)
```

Read [docs/writing-skills.md](docs/writing-skills.md) first. The short version: a skill is general (game-craft) or PushPlay-specific (pushplay), never both; paths are relative to the skill folder; and a skill added here needs a line in `repo-files/AGENTS.md`.

Skills reach game repos with the next PushPlay release: it builds `kit.zip` from this repo and the build kit, attaches it to the release for `npm run update-kit`, and commits it to `plugins/pushplay/skills/new-game/kit.zip`.
