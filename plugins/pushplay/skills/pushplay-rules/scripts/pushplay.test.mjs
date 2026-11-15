// The command line against throwaway folders, with the kit.zip bundled next to it.
// The first run installs the kit's npm packages into a cache made for the test (needs the npm registry).
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const RUNNER = join(HERE, 'pushplay.mjs')
const cache = mkdtempSync(join(tmpdir(), 'pushplay-cache-'))
const opts = { skip: existsSync(join(HERE, '../kit.zip')) ? false : 'no kit.zip bundled yet', timeout: 300_000 }

const folder = () => {
  const dir = mkdtempSync(join(tmpdir(), 'pushplay-run-'))
  spawnSync('git', ['init', '-q'], { cwd: dir })
  return dir
}
/** Runs the command line in `cwd`. KIT_BROWSER points nowhere, so `check` does its static checks without fetching a browser. */
function pushplay(cwd, ...args) {
  const result = spawnSync('node', [RUNNER, ...args], { cwd, encoding: 'utf8', env: { ...process.env, PUSHPLAY_CACHE: cache, KIT_BROWSER: '/nonexistent/chromium', KIT_REPO_ROOT: '', KIT_COMMAND: '' } })
  return { status: result.status, output: result.stdout + result.stderr }
}
const untracked = (cwd) => spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd, encoding: 'utf8' }).stdout.trim().split('\n').filter(Boolean).sort()

test('new-game in an empty folder leaves the game and one workflow file, and nothing else', opts, () => {
  const root = folder()
  const made = pushplay(root, 'new-game', 'star-courier', '--name', 'Star Courier')
  assert.equal(made.status, 0, made.output)
  const files = untracked(root)
  assert.deepEqual(files.filter((f) => f.startsWith('.')), ['.github/workflows/pushplay.yml'])
  for (const file of ['pushplay.json', 'index.html', 'game.js', 'input.js', 'menu.js', 'art/cover.svg']) assert.ok(files.includes(file), file)
  for (const stray of ['AGENTS.md', 'CLAUDE.md', 'package.json', 'README.md']) assert.ok(!files.includes(stray), stray)
  assert.ok(!existsSync(join(root, 'node_modules')))
  assert.match(readFileSync(join(root, '.github/workflows/pushplay.yml'), 'utf8'), /uses: Visual-Zone-Development\/pushplay-plugin\/\.github\/workflows\/build\.yml@v1/)
  assert.match(made.output, /pushplay check → must pass/)
})

test('check runs from the kit’s cache and writes nothing into the repo', opts, () => {
  const root = folder()
  pushplay(root, 'new-game', 'tidy')
  const before = untracked(root)
  const checked = pushplay(root, 'check')
  assert.equal(checked.status, 1, checked.output) // the starter still has its placeholder art and no description
  assert.match(checked.output, /▶ tidy/)
  assert.match(checked.output, /art\/cover\.svg is still the placeholder/)
  assert.deepEqual(untracked(root), before)
})

test('the kit is unpacked once per version, outside the repo', opts, () => {
  const root = folder()
  const first = pushplay(root, 'version')
  assert.match(first.output, /PushPlay build kit v\d+/)
  assert.doesNotMatch(pushplay(root, 'version').output, /Unpacking/)
  const kit = pushplay(root, 'where').output.trim().split('\n').pop()
  assert.ok(kit.startsWith(cache), kit)
  assert.ok(existsSync(join(kit, 'check.mjs')))
  assert.ok(existsSync(join(kit, 'node_modules/playwright/package.json')))
  assert.deepEqual(readdirSync(root).filter((f) => f !== '.git'), [])
})

test('migrate, from the command line, strips an old in-repo kit', opts, () => {
  const root = folder()
  pushplay(root, 'new-game', 'old-one', '--workshop')
  writeFileSync(join(root, 'AGENTS.md'), '# Making games in this repo\n')
  spawnSync('mkdir', ['-p', join(root, '.github/pushplay')])
  writeFileSync(join(root, '.github/pushplay/check.mjs'), '// old kit')
  const dry = pushplay(root, 'migrate', '--dry')
  assert.match(dry.output, /Would do:/)
  assert.ok(existsSync(join(root, 'AGENTS.md')))
  assert.equal(pushplay(root, 'migrate').status, 0)
  assert.ok(!existsSync(join(root, 'AGENTS.md')))
  assert.ok(!existsSync(join(root, '.github/pushplay')))
  assert.ok(existsSync(join(root, 'games/old-one/pushplay.json')))
})

test('help lists the commands, and an unknown one is refused with them', () => {
  const help = pushplay(folder(), 'help')
  assert.equal(help.status, 0)
  for (const command of ['new-game', 'dev', 'check', 'setup', 'art', 'update-runtime', 'promote', 'migrate']) assert.match(help.output, new RegExp(`pushplay ${command}\\b`))
  const wrong = pushplay(folder(), 'update-kit')
  assert.equal(wrong.status, 2)
  assert.match(wrong.output, /unknown command "update-kit"/)
})
