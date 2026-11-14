# Writing skills in this repo

This repo holds two plugins. Every skill belongs to exactly one, and `node scripts/lint-skills.mjs` enforces the rules below.

| Plugin | What goes in it |
|---|---|
| `plugins/game-craft` | Craft that helps any web game (canvas 2D, three.js, any framework): design, feel, art, audio, AI, levels. It never mentions PushPlay. |
| `plugins/pushplay` | Everything specific to PushPlay: the manifest, the runtime files, the check, library art, the launcher's rules, the build kit. |

## Rules for every skill

- **Frontmatter is `name` and `description` only.** `name` equals the folder name. Other keys stop the skill loading in some agents.
- **Paths are relative to the skill folder.** A skill is installed in different places by different agents (`.claude/skills/<name>/` in a game repo, a plugin cache or `.agents/skills/` elsewhere). Never write `.claude/skills/...` or `docs/game-design/...`.
  - In prose and links: `[references/framework.md](references/framework.md)`, or a sibling in the same plugin: `[3d.md](../threejs-models/references/3d.md)`.
  - In commands: `node <skill-dir>/scripts/shot.mjs …`, and for a sibling in the same plugin `node <skill-dir>/../model-asset/scripts/shot.mjs …`. Say once near the top of the skill: "`<skill-dir>` is the folder this file is in."
  - Links never cross plugins: the other plugin may not be installed next to this one. Name the other skill instead ("use the `enemy-ai` skill").
- **Scripts find the project from the working directory**, never from their own location, and say what to install if a dependency (such as Playwright) is missing.
- **No agent-specific tool names.** Write "ask the user (with a question tool if you have one)", not the name of one agent's tool.
- **No names of private skills or plugins.**

## Extra rules for `game-craft`

A general skill describes the craft and leaves the project's APIs to the project. It starts with this line (adjusted to name what matters for the skill):

> Follow the project's own rules first (its `AGENTS.md` or platform guide): they decide the APIs, the screen size, the checks and how to finish a change.

and its last step is "Run the project's checks and finish the change the way its rules say", not a list of commands.

Say what the game needs, not which kit call provides it:

| Instead of | Write |
|---|---|
| `settings.data.reducedShake` | the game's reduced shake / flash setting |
| `settings.data.textScale` | the game's text-size setting |
| `input.label('a')`, `drawPrompts` | the game's input-prompt helper (never literal key names) |
| `menu.js`, `createMenu` | the game's menu system |
| `save.data`, `createSave` | the game's save data |
| `audio.tone()`, `audio.js` buses | the game's audio layer (its SFX and music buses) |
| `fitCanvas`, 1280×800 | the game's logical resolution and scaling layer |
| Steam Deck, Legion Go | the target device (a handheld with an integrated GPU, say) |
| `window.__game.jumpTo()` | a debug hook the game exposes |
| `npm run check`, `npm run dev` | the project's checks, the project's dev server |

These stay, because they are this plugin's own conventions and any project can use them: `DESIGN.md` (the design brief), `STYLE.md` (the art style sheet), a `TUNING` object for gameplay numbers, `AGENTS.md`.

When a general skill has a recipe that only makes sense with PushPlay's runtime files, the recipe goes on that skill's page in the PushPlay plugin: `plugins/pushplay/skills/pushplay-runtime/references/craft/<skill>.md`. Every game-craft skill has a page there, even if it only says "nothing beyond AGENTS.md".

## What a game repo gets

`node scripts/build-template.mjs <out>` writes what a PushPlay game repo is made of, minus the build kit: everything in `repo-files/` (the game repo's `AGENTS.md`, `CLAUDE.md`, `package.json`, `tools/`, …) plus every skill of both plugins, flat, in `.claude/skills/`. The PushPlay release turns that folder and the build kit into `kit.zip`, which `npm run update-kit` installs in game repos.

- Skill names are unique across both plugins, because they share one folder there.
- `repo-files/AGENTS.md` is the game repo's rule book and names every skill in its *Skills* section; a test fails when a skill is added without a line there.
- `plugins/pushplay/skills/new-game/kit.zip` is that same `kit.zip`, committed by the PushPlay release so `new-game` can set up a whole project with no download. Never edit or rebuild it by hand; it is left out of the copy that goes into game repos.
