# PushPlay for game makers

[PushPlay](https://pushplay.gg) is a launcher that plays your games on a Steam Deck, a Legion Go, a PC and a phone. This repo holds everything a game needs from the outside to get there, so that your game's repo holds only your game.

## Start here

Pick the line that is you. Each one ends the same way: in PushPlay, **Add game → Connect GitHub**, pick your repo, and the game is in your **Library**. You need a GitHub account and the game pushed to a repo on it.

**I have never made a game.** Install a coding agent and the skills ([below](#with-a-coding-agent)), open it in an empty folder and type: *"Make me a game about a frog delivering mail."* It asks a few questions, writes the game, checks it, and helps you put it on GitHub.

**I can code and want to start one.**

1. Press **Use this template** on the [starter repo](https://github.com/Visual-Zone-Development/pushplay-games), or in an empty folder run `npx github:Visual-Zone-Development/pushplay-kit new-game my-game`.
2. Play it: `npx github:Visual-Zone-Development/pushplay-kit dev`
3. Write your game in `game.js`. Fill in the description and tags in `pushplay.json` and replace the two pictures in `art/`.
4. Check it: `npx github:Visual-Zone-Development/pushplay-kit check`
5. Push to GitHub.
6. In PushPlay: Add game → Connect GitHub → pick the repo.

**I have a game already, in any engine, and it publishes releases.** Do step 6 and it plays: the launcher takes the zips from your normal releases. To give it a name, tags and art, add one file, `pushplay.json`:

```json
{
  "id": "star-drift",
  "name": "Star Drift",
  "description": "Race a little ship through asteroid fields.",
  "tags": ["racing", "space"],
  "release": { "linux-x64": "StarDrift-linux.zip", "windows-x64": "StarDrift-windows.zip" }
}
```

No workflow, no second export, nothing in your normal build.

**I want every version checked, and the game on Discover and phones.** Add [one small workflow file](docs/workflow.yml), or press **Set up auto-builds** on the game's page in PushPlay (or in Settings, under the repo), which opens a pull request with it. It checks every push (or packages every release you publish) and publishes to its own `pushplay-latest` prerelease. Your releases and your "Latest" badge are not touched.

The [build guide](docs/pushplay-build.md) has the detail and a worked example per engine: Godot, Unity, GameMaker, Rust or C++, Love2D, Ren'Py, plain JavaScript.

## What a game repo holds

Your game, and at most three things for PushPlay:

```
pushplay.json                     name, description, tags, inputs, where the build is
art/cover.*  art/hero.*           the library tile and the banner (optional; SVG, PNG, JPG or WebP)
.github/workflows/pushplay.yml    about 20 lines: calls the shared build (optional)
…                                 your game, built however you build it
```

No build tools, no agent files, no scripts.

PushPlay reads `pushplay.json` first, for every kind of game. Change the name, the description or the tags there and the library follows, with no new build.

## What is in this repo

| What is here | For |
|---|---|
| [The build guide](docs/pushplay-build.md) | What PushPlay needs from a game, whatever it is built with |
| The shared build (`.github/workflows/build.yml`) | The one job a game repo's workflow file calls to be checked and published |
| The command line (`npx github:Visual-Zone-Development/pushplay-kit <command>`) | The same check on your own machine, a dev server, a starter game |
| The manifest schema (`schema/manifest.schema.json`) | Editors and agents, for `pushplay.json` |
| Two sets of agent skills (`plugins/`) | Optional: a coding agent that does all of it for you |

## The command line

```
npx github:Visual-Zone-Development/pushplay-kit <command>
```

| Command | What it does |
|---|---|
| `check [id]` | Build the games and play them headlessly. A game with the workflow file is only published when this passes |
| `dev [id]` | Play a game in a browser with live reload |
| `new-game <id>` | Start a JavaScript game with working title, pause and settings screens for every input |
| `setup` | Install the headless browser the check plays games in |
| `art`, `art-shots` | Painted art from your own image API key (it asks before it costs anything); render your art to look at |
| `update-runtime` | Refresh the runtime files of a game made with `new-game` |
| `promote <id>` | Move a game out of a workshop repo into its own repo |

The kit is unpacked once into a cache in your home folder. Nothing it does leaves a file in your repo.

## With a coding agent

Two plugins of [Agent Skills](https://agentskills.io):

| Plugin | What it is |
|---|---|
| **game-craft** | 28 skills of game-making craft: design briefs, game feel, physics, camera, enemy AI, levels, bosses, progression, story and dialogue, art direction, pixel art, 2D and 3D assets, environments, audio, UI, touch controls, multiplayer, playtesting, performance, accessibility, localization. It never mentions PushPlay. |
| **pushplay** | The PushPlay side: the rules every PushPlay game follows, starting a game from one request, setting up an existing game in any engine, the manifest, library art, checking every input, phone and party play. It uses game-craft for the craft. |

**Claude Code.** Start it (`claude` in a terminal, or the desktop app), then type these three lines into its message box, one at a time. Each answers with a line saying what was added.

```
/plugin marketplace add Visual-Zone-Development/pushplay-kit
/plugin install game-craft@pushplay
/plugin install pushplay@pushplay
```

**Codex, Copilot, Cursor, Gemini CLI and other agents**

```
npx skills add Visual-Zone-Development/pushplay-kit -g
```

Install them for yourself (`-g`), not into the game's repo. Then start the agent in an empty folder (for a new game) or in your game's folder, and ask:

> Make me a game about a frog delivering mail.

> Set up my Godot game for PushPlay. I already have a release workflow; don't change it.

In a repo that has a `pushplay.json`, the pushplay plugin tells the agent at the start of a session which skill holds the rules, since the repo itself carries none.

## Layout

```
docs/pushplay-build.md            the build guide (no agent needed)
docs/workflow.yml                 the workflow file a game repo keeps
.github/workflows/build.yml       the shared build
schema/manifest.schema.json       the manifest's JSON Schema
kit/                              the build kit: the check, the packaging, the runtime files, the command line's commands
samples/                          two small games the kit's tests build
plugins/game-craft/skills/        general game-making skills
plugins/pushplay/skills/          PushPlay skills; pushplay-rules holds the command line and the packed kit (kit.zip)
plugins/pushplay/hooks/           the session-start note for game repos
scripts/lint-skills.mjs           the rules skills are held to (docs/writing-skills.md)
```

`build.yml`, `workflow.yml`, the schema and `kit.zip` are built from `kit/` by `npm run kit:build`; don't edit them by hand. Game repos call the build at the `v1` tag, which moves to `main` when its tests pass.

## Working on it

```
npm install && npm run kit:install   # once
npm run lint                         # every skill against docs/writing-skills.md
npm test                             # the lint, the command line, the session hook and the kit (needs a headless browser)
npm run kit:build                    # after changing anything in kit/
npm run template -- ../pushplay-games  # rewrite the starter repo behind "Use this template" (an empty checkout)
```

Read [docs/writing-skills.md](docs/writing-skills.md) before touching a skill and [kit/README.md](kit/README.md) before touching the kit.
