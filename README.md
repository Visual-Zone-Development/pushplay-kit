# PushPlay for game makers

[PushPlay](https://pushplay.gg) is a launcher that plays your games on a Steam Deck, a Legion Go, a PC and a phone. This repo holds everything a game needs from the outside to get there, so that your game's repo holds only your game.

| What is here | For |
|---|---|
| [The build guide](docs/pushplay-build.md) | What PushPlay needs from a game, whatever it is built with. Start here. |
| The shared build (`.github/workflows/build.yml`) | The one job every game repo calls to be built, checked and published |
| The command line (`npx github:Visual-Zone-Development/pushplay-plugin <command>`) | The same check on your own machine, a dev server, a starter game |
| The manifest schema (`schema/manifest.schema.json`) | Editors and agents, for `pushplay.json` |
| Two sets of agent skills (`plugins/`) | Optional: a coding agent that does all of it for you |

## What your game's repo holds

Your game, and three things for PushPlay: a manifest, two pictures and one small workflow file.

```
pushplay.json                     name, description, tags, inputs, where the build is
art/cover.svg  art/hero.svg       the library tile and the banner
.github/workflows/pushplay.yml    about 20 lines: calls the shared build
…                                 your game, built however you build it
```

Nothing else: no build tools, no agent files, no scripts. Your own release workflow keeps working as it does. PushPlay's builds go to their own release (`pushplay-latest`, a prerelease), so your releases and your "Latest" badge are not touched.

## Three ways in, none of them needing an agent

| | You do | You get |
|---|---|---|
| **Follow the repo as it is** | Nothing. In PushPlay: Add game → Follow a GitHub account. | A plain HTML game plays from its latest commit; any game plays from the zips on its normal releases. No check, a generated cover. |
| **Add the three files** | Write `pushplay.json`, add art, copy [the workflow file](docs/workflow.yml). The launcher's **Set up auto-builds** opens a pull request that does the last two for you. | Every push is built, played headlessly and published, with a build per platform you supply. |
| **Check before you push** | `npx github:Visual-Zone-Development/pushplay-plugin check` | The same check on your machine, with the problems in plain words. |

Any engine works: Godot, Unity, GameMaker, a Rust or C++ binary, Love2D, Ren'Py, or plain JavaScript. Your own build makes the files and the manifest says where they are. The [build guide](docs/pushplay-build.md) has a worked example for each.

## The command line

```
npx github:Visual-Zone-Development/pushplay-plugin <command>
```

| Command | What it does |
|---|---|
| `check [id]` | Build the games and play them headlessly; must pass before pushing |
| `dev [id]` | Play a game in a browser with live reload |
| `new-game <id>` | Start a JavaScript game with working title, pause and settings screens for every input |
| `setup` | Install the headless browser the check plays games in |
| `art`, `art-shots` | Painted art from your own image API key (it asks before it costs anything); render your art to look at |
| `update-runtime` | Refresh the runtime files of a game made with `new-game` |
| `promote <id>` | Move a game out of a workshop repo into its own repo |
| `migrate` | Clean up a repo that still carries an old copy of the build kit |

The kit is unpacked once into a cache in your home folder. Nothing it does leaves a file in your repo.

## With a coding agent (optional)

Two plugins of [Agent Skills](https://agentskills.io):

| Plugin | What it is |
|---|---|
| **game-craft** | 30 skills of game-making craft for any web game: design briefs, game feel, physics, camera, enemy AI, levels, bosses, progression, story and dialogue, art direction, pixel art, 2D and 3D assets, environments, audio, UI, touch controls, multiplayer, playtesting, performance, accessibility, localization. It never mentions PushPlay. |
| **pushplay** | The PushPlay side: the rules every PushPlay game follows, starting a game from one request, setting up an existing game in any engine, the manifest, library art, checking every input, phone and party play. It uses game-craft for the craft. |

**Claude Code**

```
/plugin marketplace add Visual-Zone-Development/pushplay-plugin
/plugin install game-craft@pushplay
/plugin install pushplay@pushplay
```

**Codex, Copilot, Cursor, Gemini CLI and other agents**

```
npx skills add Visual-Zone-Development/pushplay-plugin -g
```

Install them for yourself (`-g`), not into the game's repo. Then, in an empty folder or in your game's repo, ask:

> Make me a game about a frog delivering mail.

> Set up my Godot game for PushPlay. I already have a release workflow; don't change it.

In a repo that has a `pushplay.json`, the pushplay plugin tells the agent at the start of a session which skill holds the rules, since the repo itself carries none.

## Layout

```
docs/pushplay-build.md            the build guide (no agent needed)
docs/workflow.yml                 the workflow file a game repo keeps
.github/workflows/build.yml       the shared build
schema/manifest.schema.json       the manifest's JSON Schema
plugins/game-craft/skills/        general game-making skills
plugins/pushplay/skills/          PushPlay skills; pushplay-rules holds the command line and the kit (kit.zip)
plugins/pushplay/hooks/           the session-start note for game repos
scripts/lint-skills.mjs           the rules skills are held to (docs/writing-skills.md)
```

`build.yml`, `workflow.yml`, the schema and `kit.zip` are written by the PushPlay release, which also moves the `v1` tag game repos call. Don't edit them here.

## Working on the skills

```
npm run lint     # every skill against docs/writing-skills.md
npm test         # the lint, the command line in throwaway folders, the session hook
```

Read [docs/writing-skills.md](docs/writing-skills.md) first.
