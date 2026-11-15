---
name: kit-upgrade
description: Bring a PushPlay game repo up to date, only when the user asks. Two jobs — clean up a repo set up before kit v14 that still carries the kit's own copy (.github/pushplay, AGENTS.md, kit skills, tools/art, npm scripts) with pushplay migrate, and refresh a JavaScript game's runtime files (input.js, menu.js, fit.js and the rest) with pushplay update-runtime; then run the check on every game and fix what it flags. Use for "update the kit", "the launcher says it builds with an old copy of the kit", "clean up the old kit", "migrate this repo", "get the latest runtime files".
---

# Kit upgrade

Follow the `pushplay-rules` skill. `pushplay` is the command the `pushplay-rules` skill gives you. **Only run this when the user asks.** It touches shared files in every game, so work on a branch and commit separately from game changes.

The build kit no longer lives in game repos: a repo holds only its games, their `pushplay.json` and art, and one workflow file that calls the shared build. So there are two jobs left, and a repo may need one, both or neither:

| The repo has | Job |
|---|---|
| `.github/pushplay/` (the kit's old copy), and usually the kit's `AGENTS.md`, skills in `.claude/skills/`, `tools/art`, `tools/promote` and npm scripts such as `npm run check` | **A. Migrate** (section 1), then B if the user wants the newest runtime files |
| JavaScript games on the runtime files (`input.js`, `menu.js`, … next to `game.js`) | **B. Update the runtime files** (section 2) |
| Only engine exports or games on their own engine, and no `.github/pushplay/` | Nothing to do: say so |

The launcher shows a repo that still has the old copy as **"Builds with an old copy of the kit"**. Its **Set up auto-builds** pull request only swaps the workflow file, so the repo builds with the shared build; `pushplay migrate` does the full clean-up.

## 1. Migrate a repo set up before kit v14
1. Start from a clean working tree (`git status`), on a branch.
2. Run `pushplay migrate --dry` and **show the user what it would remove and what it would keep** before changing anything. It removes only what the old kit put there:
   - `.github/pushplay/` (the kit's copy), and the old `promote.yml` and `update-kit.yml` workflows
   - the kit's `AGENTS.md`, and the kit's lines in `CLAUDE.md` (a `CLAUDE.md` with nothing else left goes too)
   - the kit's skills in `.claude/skills/` and the link to them in `.agents/skills`
   - the kit's design guides in the repo's `docs/` folder (a doc of the repo's own stays)
   - `tools/art`, `tools/promote` and `.env.example`
   - the npm scripts that ran the kit (`setup`, `new-game`, `dev`, `check`, `update-kit`, `art`, `art:shots`, `promote`), and a `package.json` that held nothing else
   - it points each game's `$schema` at the published schema and writes `.github/workflows/pushplay.yml`, which calls the shared build
3. **What stays:** the games themselves, the repo's own skills, tools, scripts and docs, its own lines in `CLAUDE.md`, an `AGENTS.md` that isn't the kit's, and a Vite game's own `package.json`. The output lists these as "kept". If the user wants something on the remove list kept (a kit skill they edited, say), copy it under another name first.
4. With the user's yes, run `pushplay migrate`, read its whole output and look at `git status`.
5. `pushplay check` (it checks every game), and fix what it reports (section 3).
6. Commit on its own (`Remove the old copy of the build kit`) and push.

From then on **there is nothing in the repo to update**: every push is built by the shared build, and the rules and commands come from the PushPlay skills (or `npx github:Visual-Zone-Development/pushplay-kit <command>` with no skills installed).

## 2. Update a JavaScript game's runtime files
The runtime files are shared code copied into each JavaScript game when it was scaffolded. `pushplay update-runtime` brings them up to the current kit's:
1. Start from a clean working tree, on a branch, and run `pushplay update-runtime`. In every game built on the runtime files it:
   - **replaces** each file that carries the runtime header (`input.js`, `menu.js`, `fit.js`, `audio.js`, `save.js`, `settings.js`, `prompts.js`, `touch.js`, plus `net.js` and `lobby.js` in an online game and `party.js`, `party-lobby.js`, `qr.js`, `controller.js` and `net.js` in a party game)
   - **adds** a runtime file the game doesn't have yet (for example `touch.js`, the on-screen controls); it only does something when the game imports it
   - leaves games that aren't on the runtime files alone
2. Read its whole output. Two warnings need action:
   - **"replaced without a runtime header"**: an `input.js`, `menu.js`, `net.js` or `lobby.js` from an old kit, or one edited by hand, was overwritten. Look at `git diff` for that file and move the game's own change into `game.js` (key aliases via `input.extendKeys`, behaviour in the game's own code).
   - **"kept (the game's own file shares a runtime name)"**: the game wrote its own file under a runtime name; it was not touched. Nothing to do unless the game should be using the runtime's.
3. `pushplay check`, and fix what it reports (section 3).
4. Commit on its own (`Update the runtime files`) and push.

## 3. Check every game
1. `pushplay check` (all games); `pushplay setup` first if it says the headless browser is missing.
2. Fix each ✗ in the game that reports it, using the `debug-game` steps; newer rules (for example a newly required manifest field) are usually small manifest or code fixes. Bump each fixed game's patch `version` and add a Changelog line. Kit v10 added two passes: a **mouse-only** pass for every game (menus by click and the on-screen pause button; it backs the Desktop label, so an older game whose menus or pause button don't answer a click now fails) and a **phone pass** only for games with `phone` in their manifest. No existing game gets `phone` from the upgrade: the phone spaces (720×1280, 1280×720), `fit.safe` and `touch.js` are there to use when the user asks for a phone version (the `mobile-port` skill), and 1280×800 stays every game's default.
3. Look at a few of the screenshots whose paths the check prints, to make sure nothing renders differently.

## 4. Report
Commit any game fixes separately (`<Name>: fixes for the new kit`) and push. Tell the user what was removed and kept (after a migrate), which runtime files changed, which games needed fixes, and anything left to do.
