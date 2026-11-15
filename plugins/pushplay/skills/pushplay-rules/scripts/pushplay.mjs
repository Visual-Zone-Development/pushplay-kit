#!/usr/bin/env node
// The PushPlay command line: runs the build kit against the folder you are in.
//
//   pushplay new-game <id> [--workshop] [--vite] [--online | --party] [--phone portrait|landscape] [--name "Title"]
//   pushplay dev [id] [--host]        play a game in a browser, with live reload
//   pushplay check [id ...]           build the games and play them headlessly; must pass before pushing
//   pushplay setup                    install the headless browser the check plays games in
//   pushplay art [id] [--dry] …       painted art from your own image API key (asks before it costs anything)
//   pushplay art-shots [id]           render a game's cover, banner and art pages to look at
//   pushplay update-runtime           bring the runtime files of JavaScript games up to this kit's
//   pushplay promote <id> …           move a workshop game into its own repo
//   pushplay where                    print the folder the kit is unpacked in (its templates, its Playwright)
//   pushplay version
//
// "pushplay" here is this file: `node <this file> check`, or with no install at all
// `npx github:Visual-Zone-Development/pushplay-kit check`.
//
// The kit is the kit.zip next to this folder. It is unpacked once per version into a cache in your
// home folder (never into the game's repo), where its packages are installed.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ZIP = process.env.PUSHPLAY_KIT_ZIP ?? join(HERE, '../kit.zip')
const SCRIPTS = {
  'new-game': 'new-game.mjs',
  dev: 'dev.mjs',
  check: 'check.mjs',
  art: 'art/generate.mjs',
  'art-shots': 'art/shots.mjs',
  'update-runtime': 'update-runtime.mjs',
  promote: 'promote.mjs'
}
const [command, ...args] = process.argv.slice(2)
const say = (line = '') => console.log(line)
const fail = (line, code = 1) => {
  console.error(`pushplay: ${line}`)
  process.exit(code)
}
const usage = () => readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => /^\/\/ {3}pushplay /.test(l)).map((l) => l.slice(3)).join('\n')

if (!command || command === 'help' || command === '--help' || command === '-h') {
  say(`Usage:\n${usage()}`)
  process.exit(0)
}
if (!['setup', 'version', 'where'].includes(command) && !SCRIPTS[command]) fail(`unknown command "${command}".\n${usage()}`, 2)
if (!existsSync(ZIP)) fail(`the build kit is missing (${ZIP}). Reinstall the PushPlay skills, or run: npx github:Visual-Zone-Development/pushplay-kit ${command}`)

// One unpacked kit per kit.zip, keyed by its contents, so a new version never runs over an old one.
const cacheRoot = process.env.PUSHPLAY_CACHE ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'pushplay')
const home = join(cacheRoot, `kit-${createHash('sha256').update(readFileSync(ZIP)).digest('hex').slice(0, 12)}`)
const kit = join(home, 'kit')
if (!existsSync(join(home, '.ready'))) {
  say('Unpacking the PushPlay build kit (once per version)…')
  const stage = `${home}.${process.pid}.tmp`
  rmSync(stage, { recursive: true, force: true })
  mkdirSync(stage, { recursive: true })
  const tar = spawnSync('tar', ['-xf', ZIP, '-C', stage], { encoding: 'utf8' })
  if (tar.status !== 0) {
    const unzip = spawnSync('unzip', ['-q', ZIP, '-d', stage], { encoding: 'utf8' })
    if (unzip.status !== 0) fail(`couldn't unpack ${ZIP}: ${(tar.stderr || unzip.stderr || 'tar and unzip both failed').trim()}`)
  }
  const install = spawnSync('npm', ['ci', '--prefix', join(stage, 'kit'), '--no-audit', '--no-fund'], { stdio: ['ignore', 'ignore', 'inherit'], shell: process.platform === 'win32' })
  if (install.status !== 0) {
    rmSync(stage, { recursive: true, force: true })
    fail("couldn't install the kit's packages (npm ci failed). Check the connection to the npm registry and try again.")
  }
  writeFileSync(join(stage, '.ready'), new Date().toISOString())
  // Two commands started at once both unpack; the first to finish wins and the other's copy is
  // dropped, so a kit that is already in use is never replaced under it.
  if (existsSync(join(home, '.ready'))) rmSync(stage, { recursive: true, force: true })
  else {
    rmSync(home, { recursive: true, force: true })
    try {
      renameSync(stage, home)
    } catch (err) {
      if (!existsSync(join(home, '.ready'))) throw err
      rmSync(stage, { recursive: true, force: true })
    }
  }
}
const version = JSON.parse(readFileSync(join(home, 'kit.json'), 'utf8')).kit

if (command === 'where') {
  say(kit)
  process.exit(0)
}
if (command === 'version') {
  say(`PushPlay build kit v${version}`)
  process.exit(0)
}

/** The headless browser the check plays games in. Returns whether it is there now. */
function browser({ quiet = false } = {}) {
  const result = spawnSync(process.execPath, [join(kit, 'node_modules/playwright/cli.js'), 'install', 'chromium'], { stdio: quiet ? 'ignore' : 'inherit' })
  writeFileSync(join(home, '.browser'), result.status === 0 ? 'installed' : 'unavailable')
  return result.status === 0
}
if (command === 'setup') {
  if (!browser()) fail("couldn't download the headless browser. Set KIT_BROWSER to a Chrome or Chromium on this machine, or push and let GitHub Actions run the check.")
  say('The headless browser is installed: `pushplay check` now plays the games.')
  process.exit(0)
}
// The first check fetches the browser by itself; where that is blocked the kit says what it skipped.
if (command === 'check' && !process.env.KIT_BROWSER && !existsSync(join(home, '.browser'))) {
  say('Getting the headless browser the check plays games in (once)…')
  browser({ quiet: true })
}

const invoked = process.env.npm_command === 'exec' ? 'npx github:Visual-Zone-Development/pushplay-kit' : 'pushplay'
const run = spawnSync(process.execPath, [join(kit, SCRIPTS[command]), ...args], {
  stdio: 'inherit',
  env: { ...process.env, KIT_REPO_ROOT: process.env.KIT_REPO_ROOT || process.cwd(), KIT_COMMAND: process.env.KIT_COMMAND || invoked }
})
process.exit(run.status ?? 1)
