# Writing skills in this repo

This repo holds two plugins. Every skill belongs to exactly one, and `node scripts/lint-skills.mjs` enforces the rules below.

| Plugin | What goes in it |
|---|---|
| `plugins/game-craft` | Craft that helps any game, in any engine or language (Godot, Unity, Rust, Love2D, plain JavaScript, three.js) and on any device: design, feel, art, audio, AI, levels. It never mentions PushPlay. |
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

**Anyone making a game should be able to use these**, whatever they build with. So a skill is one of two kinds, and says which:

- **A craft skill** (game feel, camera, enemy AI, levels, UI, audio, design, playtesting, performance, accessibility, multiplayer, touch, story): its topic is the same in every engine. The body leads with what holds anywhere: the numbers, named techniques, checklists and definition of done, written as behaviour ("a jump pressed up to 100 ms before landing still fires"), not as one engine's API. Anything that only works in a browser (code, a tool, an API name, a test harness) goes under a heading that says so, such as `## In a web game`, after the engine-neutral part. A reader with a Godot or Rust game must be able to stop before that heading and still have the whole method.
- **A stack skill** (`canvas2d-assets`, `threejs-models`, `character-models`, `babylonjs-scenes`, `blender-models`, and toolkits written in JavaScript): it is about one technology. Its description names that technology in the first clause, so it never triggers for a game built with something else.

The lint enforces the first kind: in a craft skill's `SKILL.md`, a browser-only term (`Playwright`, `localStorage`, `navigator.`, `requestAnimationFrame`, `DevTools`, `AudioContext`, `Web Audio`, `document.`, `addEventListener`, `Vite`, an `npm` command) may only appear under a heading that names the web, a browser, canvas or three.js.

More that keeps a craft skill general:

- **Steps that need the game running** (render and compare, a bot playthrough, a profile) are described by what to capture and judge. Then say how in a web game (the scripts here), and for other engines say: use the engine's own way to run headless or capture a frame, or ask the user for a screenshot.
- **Sizes are stated per target**, not as one device: text and targets for a phone held in the hand, a handheld, a desktop window, a TV across the room.
- **The project's layout is the project's.** `DESIGN.md`, `STYLE.md` and a `TUNING` object are this plugin's conventions and fine to name; file names like `game.js` or `index.html` are examples, never assumptions.
- **No product words:** not "the launcher", "the library tile", "the cover", "the check" as proper nouns, and no names of particular games as examples that the reader can't see.

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

## Catalogues of sheets

A skill that is a catalogue (as `art-styles` is, with one style sheet per look) keeps `references/_sheet-template.md` and one file per entry next to it. The lint checks two things for every sheet: it has each `## ` section the template has, and `SKILL.md` links to it (its row in the picker table). Files starting with `_` and `external.md` are not sheets.

- A sheet says what holds in any engine first. Code and browser names go under its last section, `## In a web game`.
- A sheet is a starting point: it opens by saying the game's own references and `STYLE.md` win, and it gives rules with numbers, not a list of things the reader must do.
- A sheet names where its techniques came from, with links. Take techniques from other people's skills and write-ups; copy no code or text without checking the licence.
- `external.md` lists other people's skills as optional further reading. A skill may suggest one to the user; it never installs one unasked.

## Extra rules for `pushplay`

- **The plugin is optional.** What PushPlay requires of a game is written in `docs/pushplay-build.md`, for people with no agent. A skill can explain more and do the work, but a requirement that exists only in a skill is a bug.
- **A game repo holds only the game:** its files, `pushplay.json`, its art and one workflow file. No skill tells an agent to add anything else for PushPlay's sake: no `AGENTS.md`, no kit folder, no npm scripts, no skills.
- **One command.** Everything runs through `pushplay <command>` (`check`, `dev`, `controllers`, `new-game`, `setup`, `art`, `art-shots`, `update-runtime`, `promote`, `where`), which the `pushplay-rules` skill defines as `node <skill-dir>/scripts/pushplay.mjs`. Other skills say once, near the top, "`pushplay` is the command the `pushplay-rules` skill gives you", and then just write the command. Never `npm run check` and the like: game repos have no such scripts.
- **Rules live in `pushplay-rules`.** Other skills start with "Follow the `pushplay-rules` skill" and link to its reference files for detail.
- **Any kind of game.** PushPlay takes engine exports and native builds as well as JavaScript. A skill that only applies to JavaScript games built on the runtime files says so at the top, and says what to do otherwise.
- **PushPlay must not change a game's normal release.** Where a skill adds something for the launcher (an exit item, no analytics, a key that is reserved), it shows how to keep it out of the normal release: `if (window.pushplay)` in a web game, `PUSHPLAY=1` in a native one, `PUSHPLAY_BUILD=1` at build time.

## Files built from the kit

`plugins/pushplay/skills/pushplay-rules/kit.zip` (the build kit the command line unpacks), `.github/workflows/build.yml`, `schema/manifest.schema.json` and `docs/workflow.yml` are written by `npm run kit:build` from `kit/`. Never edit them by hand.
