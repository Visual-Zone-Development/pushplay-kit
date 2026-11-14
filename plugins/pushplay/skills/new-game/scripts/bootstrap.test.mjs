// bootstrap.mjs against throwaway folders, using the kit.zip bundled with the skill.
// It installs the kit's npm packages, so it needs the npm registry (a few seconds each).
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const BOOTSTRAP = join(HERE, 'bootstrap.mjs')
const bundled = existsSync(join(HERE, '../kit.zip'))
const opts = { skip: bundled ? false : 'no kit.zip bundled with the skill yet', timeout: 300_000 }

const folder = () => mkdtempSync(join(tmpdir(), 'bootstrap-'))
function bootstrap(cwd, args = []) {
  const result = spawnSync('node', [BOOTSTRAP, ...args], { cwd, encoding: 'utf8' })
  return { status: result.status, output: result.stdout + result.stderr }
}
const json = (file) => JSON.parse(readFileSync(file, 'utf8'))

test('in an empty folder it sets up the whole project and makes the game at the root', opts, () => {
  const root = folder()
  const { status, output } = bootstrap(root, ['star-courier', '--name', 'Star Courier'])
  assert.equal(status, 0, output)
  for (const file of ['.github/pushplay/check.mjs', '.github/workflows/pushplay.yml', 'AGENTS.md', 'CLAUDE.md', '.claude/skills/new-game/SKILL.md', '.claude/skills/enemy-ai/SKILL.md', 'tools/art/generate.mjs', 'package.json', '.gitignore']) {
    assert.ok(existsSync(join(root, file)), file)
  }
  assert.ok(existsSync(join(root, '.agents/skills/new-game/SKILL.md')), 'skills reachable through .agents/skills')
  assert.equal(existsSync(join(root, '.claude/skills/new-game/kit.zip')), false, "the repo's copy of the skill carries no kit.zip")
  assert.equal(json(join(root, 'package.json')).scripts.check, 'node .github/pushplay/check.mjs')
  const manifest = json(join(root, 'pushplay.json'))
  assert.equal(manifest.id, 'star-courier')
  assert.equal(manifest.name, 'Star Courier')
  for (const file of ['index.html', 'game.js', 'input.js', 'menu.js', 'art/cover.svg']) assert.ok(existsSync(join(root, file)), file)
})

test('in a folder with its own package.json and files it adds what is missing and overwrites nothing of theirs', opts, () => {
  const root = folder()
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'my-site', scripts: { dev: 'my dev server', build: 'my build' } }, null, 2))
  writeFileSync(join(root, 'README.md'), '# My site')
  writeFileSync(join(root, '.gitignore'), 'secrets/\n')
  const { status, output } = bootstrap(root, ['snack-drop', '--workshop'])
  assert.equal(status, 0, output)
  const pkg = json(join(root, 'package.json'))
  assert.equal(pkg.name, 'my-site')
  assert.equal(pkg.scripts.dev, 'my dev server')
  assert.equal(pkg.scripts.build, 'my build')
  assert.equal(pkg.scripts.check, 'node .github/pushplay/check.mjs')
  assert.match(output, /kept your "dev" script/)
  assert.equal(readFileSync(join(root, 'README.md'), 'utf8'), '# My site')
  assert.match(readFileSync(join(root, '.gitignore'), 'utf8'), /^secrets\/\nnode_modules\//)
  assert.equal(json(join(root, 'games/snack-drop/pushplay.json')).id, 'snack-drop')
})

test('in a repo that already has the build kit it only makes the game', opts, () => {
  const root = folder()
  assert.equal(bootstrap(root, ['first-game', '--workshop']).status, 0)
  writeFileSync(join(root, 'AGENTS.md'), '# edited by the owner')
  const { status, output } = bootstrap(root, ['second-game'])
  assert.equal(status, 0, output)
  assert.doesNotMatch(output, /Setting up a PushPlay game repo/)
  assert.equal(readFileSync(join(root, 'AGENTS.md'), 'utf8'), '# edited by the owner')
  assert.equal(json(join(root, 'games/second-game/pushplay.json')).id, 'second-game')
})

test('with no game id it sets the project up and says how to make a game', opts, () => {
  const root = folder()
  const { status, output } = bootstrap(root)
  assert.equal(status, 0, output)
  assert.ok(existsSync(join(root, '.github/pushplay/new-game.mjs')))
  assert.equal(existsSync(join(root, 'pushplay.json')), false)
  assert.match(output, /npm run new-game <id>/)
})

test('it explains what to do when there is no kit to install from', () => {
  const root = folder()
  mkdirSync(join(root, 'sub'))
  const { status, output } = bootstrap(root, ['--kit', join(root, 'missing.zip'), 'demo'])
  assert.equal(status, 1)
  assert.match(output, /no kit\.zip at .*missing\.zip/)
  assert.match(output, /pushplay-releases/)
  assert.equal(existsSync(join(root, '.github')), false)
})
