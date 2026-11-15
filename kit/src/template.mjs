// node <kit>/template.mjs <folder>
// Writes the starter repo people get from "Use this template" on GitHub: exactly what
// `new-game` makes in an empty folder (a starter game, its manifest and art, the one workflow
// file), plus a README that says what to do next. Nothing else: no kit, no agent files.
// Made from new-game so the two can never drift apart; a test compares them.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { brand, DOCS_URL, MANIFEST_FILE, WORKFLOW_FILE } from './config.mjs'
import { log } from './repo.mjs'

export const TEMPLATE_GAME = {
  id: 'my-game',
  name: 'My Game',
  description: 'A starter game: a title screen, a pause menu and settings that work with every input. Make it yours.',
  tags: ['starter']
}

/** The command line as people without the kit installed run it. */
const NPX = `npx github:${brand.pluginRepo}`

export function templateReadme() {
  return `# ${TEMPLATE_GAME.name}

A starter game for [${brand.name}](https://${brand.domain}): it already has a title screen, a pause menu and a settings screen that work with a controller, a keyboard, a mouse and touch. Make it yours.

## From here to playing it

You can do all of this on github.com, with nothing installed.

1. Press **Use this template** on GitHub to make your own repo from this one (private is fine). Don't fork it: forks have Actions turned off.
2. Write your game in \`game.js\`. To edit on github.com, open the file, press the pencil, and press **Commit changes** when you are done: that is a push.
3. In \`${MANIFEST_FILE}\`, change \`"id"\` and \`"name"\` from \`${TEMPLATE_GAME.id}\` to your own (and the matching \`ID\` at the top of \`game.js\`; it names the game's saves), write a description and tags, and replace the two pictures in \`art/\`.
4. Every push builds and checks the game (\`${WORKFLOW_FILE}\` does that; there is nothing to set up). Open the repo's **Actions** tab: a green tick after about two minutes means it is published, and a red cross opens to say in plain words what is wrong. A change to a \`.md\` file alone doesn't start a build.
5. In ${brand.name}: **Add game → Connect GitHub**, then pick your repo. The game is in your library from then on, and every push updates it.

### On your computer (optional)

With [Node.js](https://nodejs.org) installed you can clone the repo and try the game before you push:

- Play it: \`${NPX} dev\`
- Check it: \`${NPX} check\` (it plays the game and tells you in plain words what is wrong; GitHub runs the same check on each push).

## What is in here

| File | What it is |
|---|---|
| \`index.html\`, \`game.js\` | The game. Start in \`game.js\`. |
| \`input.js\`, \`menu.js\`, \`fit.js\`, \`audio.js\`, \`save.js\`, \`settings.js\`, \`prompts.js\`, \`touch.js\` | Helpers the starter's screens are built on. Use them or not; refresh them with \`${NPX} update-runtime\`. |
| \`${MANIFEST_FILE}\` | What ${brand.name} shows about the game: name, description, tags, how it is played. |
| \`art/cover.svg\`, \`art/hero.svg\` | The library tile and the banner. |
| \`${WORKFLOW_FILE}\` | Builds, checks and publishes the game on every push. |

Everything ${brand.name} needs from a game, whatever it is made with: ${DOCS_URL}
`
}

if (process.argv[1] && import.meta.filename === resolve(process.argv[1])) {
  const out = process.argv[2] && resolve(process.argv[2])
  if (!out) {
    log('Usage: node template.mjs <folder>   (an empty or new folder)')
    process.exit(1)
  }
  if (existsSync(out) && readdirSync(out).some((f) => f !== '.git')) {
    log(`${out} isn't empty. The template is written from scratch: give it an empty folder.`)
    process.exit(1)
  }
  mkdirSync(out, { recursive: true })
  const made = spawnSync(process.execPath, [join(import.meta.dirname, 'new-game.mjs'), TEMPLATE_GAME.id, '--name', TEMPLATE_GAME.name], {
    encoding: 'utf8',
    env: { ...process.env, KIT_REPO_ROOT: out }
  })
  if (made.status !== 0) {
    log(made.stdout + made.stderr)
    process.exit(1)
  }
  // The starter says what it is, so a repo made from the template reads well in the library
  // before anything is changed. Its art stays the placeholder new-game writes.
  const manifestPath = join(out, MANIFEST_FILE)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  writeFileSync(manifestPath, JSON.stringify({ ...manifest, description: TEMPLATE_GAME.description, tags: TEMPLATE_GAME.tags }, null, 2) + '\n')
  writeFileSync(join(out, 'README.md'), templateReadme())
  log(`Wrote the template repo to ${out}`)
}
