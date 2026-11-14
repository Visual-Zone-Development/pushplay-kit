# My PushPlay games

Games in this repo build themselves on every push and show up in [PushPlay](https://pushplay.gg) on your handheld, PC or phone.

Ask your coding agent for a game ("make me a game about …"). It reads [`AGENTS.md`](AGENTS.md) and the skills in `.claude/skills/`, asks a few questions, then builds the game, its cover art and runs the check.

| Command | What it does |
|---|---|
| `npm run setup` | First time in a fresh checkout: installs dependencies and the headless browser |
| `npm run new-game <id>` | Start a game (add `--workshop` to keep many games in `games/`) |
| `npm run dev` | Play it in a browser with live reload |
| `npm run check` | Build it and play it headlessly with every input; must pass before pushing |
| `npm run update-kit` | Move to the newest build kit, skills and runtime files |

Pushing the default branch publishes the build; other branches only run the check.
