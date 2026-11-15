// End-to-end tests of the build kit against throwaway game repos (DRY_RUN: no GitHub calls).
// Each run builds games in headless Chromium, so these take a few seconds each.
import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BETA_RELEASE_TAG, BUILD_WORKFLOW, IGNORE_FILE, INDEX_ASSET, KIT_VERSION, MANIFEST_FILE, MANIFEST_SCHEMA_URL, RELEASE_TAG, releaseTagFor, RUNTIME_FILES, RUNTIME_HEADER, WORKFLOW_FILE } from './config.mjs'
import { buildWorkflow, kitFiles, kitTree } from './kit.mjs'

/** Where the tests keep the kit's scratch folder, so they can look inside it (by default it is outside the repo). */
const KIT_DIR = '.kit-test'
/** The product's short name, as the launcher's object and the build flag are called after it. */
const SLUG = basename(WORKFLOW_FILE, '.yml')

const SRC = import.meta.dirname
const SAMPLE = join(SRC, '../../samples/gamepad-tester')

function makeRepo(setup) {
  const root = mkdtempSync(join(tmpdir(), 'kit-repo-'))
  setup(root)
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root })
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'init'], { cwd: root })
  return root
}

function runKit(script, root, args = [], env = {}) {
  const result = spawnSync('node', [join(SRC, script), ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, KIT_REPO_ROOT: root, KIT_WORK_DIR: join(root, KIT_DIR, '.work'), ...env } })
  return { status: result.status, output: result.stdout + result.stderr }
}

function runCi(root) {
  const { status, output } = runKit('ci.mjs', root, [], { DRY_RUN: '1', BUILD_ALL: 'true' })
  const indexPath = join(root, KIT_DIR, '.work/release', INDEX_ASSET)
  return { status, output, index: existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : null }
}

const write = (file, contents) => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, typeof contents === 'string' ? contents : JSON.stringify(contents, null, 2))
}

/** A game that draws but has no menus, pause or save: enough to build, with warnings. */
const DRAW = `<canvas id=c width=320 height=200></canvas><script>const x=c.getContext('2d');x.fillStyle='#f80';x.fillRect(20,20,120,80)</script>`
/** A game following the window.__game convention that never pauses. */
const NO_PAUSE = `<canvas id=c width=320 height=200></canvas><script>
  const x=c.getContext('2d');x.fillStyle='#0af';x.fillRect(10,10,200,100)
  window.__game = { state: { screen: 'playing' }, TUNING: {} }
</script>`
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 500"><rect width="720" height="500" fill="#123"/><circle cx="360" cy="250" r="120" fill="#fb4"/></svg>`
const manifest = (id, extra = {}) => ({
  id,
  name: id,
  description: `A fixture game called ${id} for the kit tests.`,
  entry: { web: 'index.html' },
  tags: ['test'],
  inputs: ['gamepad', 'keyboard', 'mouse', 'touch'],
  ...extra
})

describe('build kit', () => {
  it('builds a single-game repo (manifest at the root, no build step)', () => {
    const root = makeRepo((r) => cpSync(SAMPLE, r, { recursive: true }))
    const { status, output, index } = runCi(root)
    expect(status, output).toBe(0)
    expect(index.layout).toBe('single')
    expect(index.kit).toBe(KIT_VERSION)
    const game = index.games['gamepad-tester']
    expect(game).toMatchObject({ name: 'Gamepad Tester', platform: 'web', error: null })
    expect(Object.keys(game.assets).sort()).toEqual(['cover', 'hero', 'screenshot', 'web'])
    expect(existsSync(join(root, KIT_DIR, '.work/dist/gamepad-tester-web.zip'))).toBe(true)
    // No window.__game and no menu.js: the pause and menu checks only warn.
    expect(output).toMatch(/window\.__game\.state\.screen is missing/)
    expect(output).toMatch(/nothing imports menu\.js/)
  }, 120_000)

  it("builds a single-game repo with its own npm build script", () => {
    const root = makeRepo((r) => {
      write(join(r, 'package.json'), { name: 'my-game', private: true, scripts: { build: 'node build.js' } })
      write(join(r, 'build.js'), `require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html',${JSON.stringify(DRAW)})`)
      write(join(r, MANIFEST_FILE), manifest('my-game', { name: 'My Game' }))
    })
    const { status, output, index } = runCi(root)
    expect(status, output).toBe(0)
    expect(index.games['my-game'].error).toBeNull()
  }, 120_000)

  it("builds everything on a brand-new repo's first push, and records where a promoted game came from", () => {
    const root = makeRepo((r) => {
      write(join(r, 'index.html'), DRAW)
      write(join(r, MANIFEST_FILE), manifest('orbit', { name: 'Orbit', movedFrom: 'vzd/workshop' }))
    })
    // The first push of a new repo: no previous commit, and the branch is the default branch.
    execFileSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: root })
    const { status, output } = runKit('ci.mjs', root, [], { DRY_RUN: '1', BUILD_ALL: '', BEFORE_SHA: '0'.repeat(40), DEFAULT_BRANCH: 'main' })
    expect(status, output).toBe(0)
    expect(output).not.toMatch(/No game changes to build/)
    const index = JSON.parse(readFileSync(join(root, KIT_DIR, '.work/release', INDEX_ASSET), 'utf8'))
    expect(index.games.orbit).toMatchObject({ error: null, movedFrom: 'vzd/workshop' })
  }, 120_000)

  it('builds a collection repo and records a broken game without losing the good one', () => {
    const root = makeRepo((r) => {
      write(join(r, 'games/good/index.html'), DRAW)
      write(join(r, 'games/good/tools/mock.py'), 'print(1)')
      write(join(r, 'games/good/notes.txt'), 'private')
      write(join(r, 'games/good', IGNORE_FILE), '# never shipped\nnotes.txt\n')
      write(join(r, 'games/good', MANIFEST_FILE), manifest('good', { name: 'Good Game' }))
      write(join(r, 'games/broken/index.html'), '<script>nope()</script>')
      write(join(r, 'games/broken', MANIFEST_FILE), manifest('broken'))
      write(join(r, 'games/untagged/index.html'), DRAW)
      write(join(r, 'games/untagged', MANIFEST_FILE), manifest('untagged', { tags: undefined }))
    })
    const { status, output, index } = runCi(root)
    expect(status).toBe(1)
    expect(index.layout).toBe('collection')
    expect(index.games.good.error).toBeNull()
    expect(index.games.broken.error.message).toMatch(/crashed: nope is not defined/)
    // Tags are asked for, not demanded: the game is built, with a note.
    expect(index.games.untagged.error).toBeNull()
    expect(output).toMatch(/untagged[\s\S]*⚠ .*add "tags"/)
    expect(output).toMatch(/Building: broken, good, untagged/)
    // Default skips and the ignore file keep tooling and notes out of the build.
    const out = join(root, KIT_DIR, '.work/out/good')
    expect(existsSync(join(out, 'index.html'))).toBe(true)
    expect(existsSync(join(out, 'tools'))).toBe(false)
    expect(existsSync(join(out, 'notes.txt'))).toBe(false)
  }, 150_000)

  it('fails a game that exposes window.__game but never pauses, and one that binds F10', () => {
    const root = makeRepo((r) => {
      write(join(r, 'games/stuck/index.html'), NO_PAUSE)
      write(join(r, 'games/stuck', MANIFEST_FILE), manifest('stuck'))
      write(join(r, 'games/f10/index.html'), DRAW)
      write(join(r, 'games/f10/input.js'), `${RUNTIME_HEADER}13 — a kit runtime file\nexport const input = {}`)
      write(join(r, 'games/f10/game.js'), `addEventListener('keydown', (e) => { if (e.key === 'F10') location.reload() })`)
      write(join(r, 'games/f10', MANIFEST_FILE), manifest('f10'))
      // The same binding in a game that doesn't use the kit's runtime files is only pointed out.
      write(join(r, 'games/own-engine/index.html'), DRAW)
      write(join(r, 'games/own-engine/game.js'), `addEventListener('keydown', (e) => { if (e.key === 'F10') location.reload() })`)
      write(join(r, 'games/own-engine', MANIFEST_FILE), manifest('own-engine'))
    })
    const { status, index, output } = runCi(root)
    expect(status).toBe(1)
    expect(index.games['own-engine'].error).toBeNull()
    expect(output).toMatch(/own-engine[\s\S]*⚠ game\.js binds F10/)
    expect(index.games.stuck.error.message).toMatch(/pressing Start during play didn't pause/)
    expect(index.games.stuck.error.message).toMatch(/Enter then Escape didn't pause/)
    expect(index.games.f10.error.message).toMatch(/binds F10/)
  }, 150_000)

  it('scaffolds a game that passes the check with every input, with "inputs" in its manifest', () => {
    const root = makeRepo((r) => mkdirSync(join(r, 'games')))
    const made = runKit('new-game.mjs', root, ['orb-run', '--name', 'Orb Run'])
    expect(made.status, made.output).toBe(0)
    const dir = join(root, 'games/orb-run')
    for (const file of RUNTIME_FILES) {
      expect(existsSync(join(dir, file)), file).toBe(true)
      expect(readFileSync(join(dir, file), 'utf8').startsWith(RUNTIME_HEADER)).toBe(true)
      expect(readFileSync(join(dir, file), 'utf8')).not.toContain('{{SLUG}}')
    }
    expect(readFileSync(join(dir, 'game.js'), 'utf8')).toContain("const ID = 'orb-run'")
    const m = JSON.parse(readFileSync(join(dir, MANIFEST_FILE), 'utf8'))
    expect(m.inputs).toEqual(['gamepad', 'keyboard', 'mouse', 'touch'])
    // What a person (or the AI) fills in before the first check.
    write(join(dir, MANIFEST_FILE), { ...m, description: 'Collect orbs before the clock runs out.', tags: ['arcade'] })
    write(join(dir, 'art/cover.svg'), SVG)
    write(join(dir, 'art/hero.svg'), SVG)
    const { status, output, index } = runCi(root)
    expect(status, output).toBe(0)
    expect(index.games['orb-run']).toMatchObject({ inputs: ['gamepad', 'keyboard', 'mouse', 'touch'], error: null })
    expect(output).not.toMatch(/⚠/)
  }, 150_000)

  it('scaffolds the game at the root of a repo with no games/ folder, and ships none of the repo files', () => {
    const root = makeRepo((r) => {
      write(join(r, 'AGENTS.md'), '# rules')
      write(join(r, 'CLAUDE.md'), '@AGENTS.md')
      write(join(r, 'docs/game-design/framework.md'), '# framework')
      write(join(r, 'package.json'), { name: 'template', private: true, scripts: { dev: 'node dev', check: 'node check' } })
    })
    const made = runKit('new-game.mjs', root, ['orb-run', '--name', 'Orb Run'])
    expect(made.status, made.output).toBe(0)
    expect(made.output).toMatch(/This repo is now that one game/)
    expect(made.output).toMatch(/ check → must pass/)
    expect(existsSync(join(root, 'games'))).toBe(false)
    const m = JSON.parse(readFileSync(join(root, MANIFEST_FILE), 'utf8'))
    expect(m).toMatchObject({ id: 'orb-run', $schema: MANIFEST_SCHEMA_URL })
    write(join(root, MANIFEST_FILE), { ...m, description: 'Collect orbs before the clock runs out.', tags: ['arcade'] })
    write(join(root, 'art/cover.svg'), SVG)
    write(join(root, 'art/hero.svg'), SVG)
    // A docs folder inside the game's own files still ships; only the repo's root copy is left out.
    write(join(root, 'levels/docs/intro.txt'), 'level notes the game loads')

    const { status, output, index } = runCi(root)
    expect(status, output).toBe(0)
    expect(index).toMatchObject({ layout: 'single', games: { 'orb-run': { error: null } } })
    const out = join(root, KIT_DIR, '.work/out/orb-run')
    expect(existsSync(join(out, 'index.html'))).toBe(true)
    for (const f of ['AGENTS.md', 'CLAUDE.md', 'docs', 'package.json']) expect(existsSync(join(out, f)), f).toBe(false)
    expect(existsSync(join(out, 'levels/docs/intro.txt'))).toBe(true)

    // One game per repo: a second one is refused.
    const again = runKit('new-game.mjs', root, ['another'])
    expect(again.status).toBe(1)
    expect(again.output).toMatch(/one game per repo/)
  }, 150_000)

  it('makes a fresh repo a workshop with --workshop, where later games go in games/ too', () => {
    const root = makeRepo((r) => write(join(r, 'AGENTS.md'), '# rules'))
    const first = runKit('new-game.mjs', root, ['orb-run', '--workshop'])
    expect(first.status, first.output).toBe(0)
    expect(first.output).toMatch(/This repo is a workshop/)
    expect(existsSync(join(root, 'games/orb-run', MANIFEST_FILE))).toBe(true)
    expect(existsSync(join(root, MANIFEST_FILE))).toBe(false)
    const second = runKit('new-game.mjs', root, ['tower-panic'])
    expect(second.status, second.output).toBe(0)
    expect(existsSync(join(root, 'games/tower-panic', MANIFEST_FILE))).toBe(true)
  })

  it('scaffolds an online game whose two copies meet and sync through the local relay', () => {
    const root = makeRepo((r) => mkdirSync(join(r, 'games')))
    const made = runKit('new-game.mjs', root, ['duel', '--online', '--players', '2-4'])
    expect(made.status, made.output).toBe(0)
    const dir = join(root, 'games/duel')
    expect(readFileSync(join(dir, 'game.js'), 'utf8')).toContain('createNet({ minPlayers: 2, maxPlayers: 4 })')
    for (const file of ['net.js', 'lobby.js', ...RUNTIME_FILES]) expect(existsSync(join(dir, file)), file).toBe(true)
    const manifest = JSON.parse(readFileSync(join(dir, MANIFEST_FILE), 'utf8'))
    expect(manifest).toMatchObject({ online: true, players: '2-4', tags: ['online multiplayer'], inputs: ['gamepad', 'keyboard', 'mouse', 'touch'] })

    // Placeholder art fails the check on purpose; generated art is fine for this test.
    const { art: _art, ...rest } = manifest
    write(join(dir, MANIFEST_FILE), { ...rest, description: 'Two players steer dots around a room together, online.' })
    const { status, output, index } = runCi(root)
    expect(status, output).toBe(0)
    expect(index.games.duel).toMatchObject({ online: true, error: null })
    expect(output).not.toMatch(/KB\/s through the relay/)
  }, 150_000)

  it('scaffolds a phone game that passes the touch-only phone pass, and fails one whose text is too small', () => {
    const root = makeRepo((r) => mkdirSync(join(r, 'games')))
    const bare = runKit('new-game.mjs', root, ['tap-tap', '--phone'])
    expect(bare.status).toBe(1)
    expect(bare.output).toMatch(/--phone portrait/)
    const made = runKit('new-game.mjs', root, ['tap-tap', '--phone', 'portrait', '--name', 'Tap Tap'])
    expect(made.status, made.output).toBe(0)
    expect(made.output).toMatch(/portrait phone game \(720×1280\)/)
    const dir = join(root, 'games/tap-tap')
    const code = readFileSync(join(dir, 'game.js'), 'utf8')
    expect(code).toContain('const W = 720')
    expect(code).toContain('const H = 1280')
    expect(code).toContain("orientation: 'portrait'")
    expect(code).toContain('createTouchControls')
    expect(existsSync(join(dir, 'touch.js'))).toBe(true)
    const m = JSON.parse(readFileSync(join(dir, MANIFEST_FILE), 'utf8'))
    expect(m).toMatchObject({ phone: { orientation: 'portrait' }, inputs: ['gamepad', 'keyboard', 'mouse', 'touch'] })
    write(join(dir, MANIFEST_FILE), { ...m, description: 'Collect orbs on your phone before the clock runs out.', tags: ['arcade'] })
    write(join(dir, 'art/cover.svg'), SVG)
    write(join(dir, 'art/hero.svg'), SVG)

    // A second phone game, landscape, whose HUD text is Deck-sized: the phone pass must say so.
    const small = runKit('new-game.mjs', root, ['tiny', '--phone', 'landscape'])
    expect(small.status, small.output).toBe(0)
    const tinyDir = join(root, 'games/tiny')
    expect(readFileSync(join(tinyDir, 'game.js'), 'utf8')).toContain('const W = 1280')
    write(join(tinyDir, 'game.js'), readFileSync(join(tinyDir, 'game.js'), 'utf8').replace('const UI = PHONE ? 1.35 : 1', 'const UI = 0.9'))
    const tm = JSON.parse(readFileSync(join(tinyDir, MANIFEST_FILE), 'utf8'))
    write(join(tinyDir, MANIFEST_FILE), { ...tm, description: 'A phone game with text that is too small to read.', tags: ['arcade'] })
    write(join(tinyDir, 'art/cover.svg'), SVG)
    write(join(tinyDir, 'art/hero.svg'), SVG)
    // And one that claims to be a phone game without touch.
    write(join(root, 'games/notouch/index.html'), DRAW)
    write(join(root, 'games/notouch', MANIFEST_FILE), manifest('notouch', { phone: { orientation: 'any' }, inputs: ['gamepad', 'keyboard'] }))

    const { status, output, index } = runCi(root)
    expect(status).toBe(1)
    expect(index.games['tap-tap']).toMatchObject({ error: null, phone: { orientation: 'portrait' } })
    expect(output).not.toMatch(/tap-tap[\s\S]*?⚠[\s\S]*?▶ tiny/)
    expect(existsSync(join(root, KIT_DIR, '.work/out/tap-tap/__art/screenshot-phone-portrait.png'))).toBe(true)
    expect(index.games.tiny.error.message).toMatch(/text is drawn too small to read: \d+px/)
    expect(index.games.notouch.error.message).toMatch(/"inputs" must include "touch"/)
  }, 200_000)

  it('fails the mouse-only pass when a game promising mouse play has no pause button to click', () => {
    const root = makeRepo((r) => {
      // Enter / A start it and Start / Esc pause it, but there is nothing to click.
      write(
        join(r, 'games/nobutton/index.html'),
        `<canvas id=c width=320 height=200></canvas><script type="module">
          const x=c.getContext('2d');x.fillStyle='#0af';x.fillRect(10,10,200,100)
          const state = { screen: 'title' }
          window.__game = { state, TUNING: {}, titleMenu: { rect: () => ({ x: 430, y: 420, w: 420, h: 64 }) } }
          addEventListener('keydown', (e) => { if (e.code === 'Enter' || e.code === 'Space') state.screen = 'playing'; if (e.code === 'Escape') state.screen = 'paused' })
          addEventListener('pointerup', () => { if (state.screen === 'title') state.screen = 'playing' })
          let pad = null
          const poll = () => { const p = navigator.getGamepads?.()[0]; if (p) { if (p.buttons[0]?.pressed && state.screen === 'title') state.screen = 'playing'; if (p.buttons[9]?.pressed && state.screen === 'playing') state.screen = 'paused' } requestAnimationFrame(poll) }
          poll()
        </script>`
      )
      write(join(r, 'games/nobutton', MANIFEST_FILE), manifest('nobutton'))
    })
    const { status, index } = runCi(root)
    expect(status).toBe(1)
    expect(index.games.nobutton.error.message).toMatch(/with only a mouse, clicking the on-screen pause button \(tried .*\) didn't pause/)
  }, 150_000)

  it('rejects duplicate or unknown inputs in the manifest', () => {
    const root = makeRepo((r) => {
      write(join(r, 'games/dup/index.html'), DRAW)
      write(join(r, 'games/dup', MANIFEST_FILE), manifest('dup', { inputs: ['gamepad', 'gamepad'] }))
      write(join(r, 'games/odd/index.html'), DRAW)
      write(join(r, 'games/odd', MANIFEST_FILE), manifest('odd', { inputs: ['wheel'] }))
    })
    const { status, index } = runCi(root)
    expect(status).toBe(1)
    expect(index.games.dup.error.message).toMatch(/inputs/)
    expect(index.games.odd.error.message).toMatch(/inputs/)
  }, 120_000)

  it('builds and checks without leaving a single file in the repo', () => {
    const root = makeRepo((r) => {
      write(join(r, 'index.html'), DRAW)
      write(join(r, MANIFEST_FILE), manifest('tidy'))
    })
    execFileSync('git', ['add', '-A'], { cwd: root })
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'the game'], { cwd: root })
    // No KIT_WORK_DIR here: the scratch folder is the default one, outside the repo.
    const result = spawnSync('node', [join(SRC, 'check.mjs')], { cwd: root, encoding: 'utf8', env: { ...process.env, KIT_REPO_ROOT: root, KIT_WORK_DIR: '' } })
    expect(result.status, result.stdout + result.stderr).toBe(0)
    expect(execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root, encoding: 'utf8' })).toBe('')
    const cover = /^\s+(\/\S+__art\/cover\.png)/m.exec(result.stdout)?.[1]
    expect(cover && existsSync(cover), result.stdout).toBe(true)
    expect(cover.startsWith(root)).toBe(false)
  }, 120_000)

  it('new-game leaves a repo with the game and one workflow file that calls the shared build, nothing else', () => {
    const root = makeRepo(() => {})
    expect(runKit('new-game.mjs', root, ['solo-game']).status).toBe(0)
    const files = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n')
    expect(files).toContain(WORKFLOW_FILE)
    expect(files.filter((f) => f.startsWith('.github/'))).toEqual([WORKFLOW_FILE])
    for (const stray of ['AGENTS.md', 'CLAUDE.md', 'package.json', 'README.md']) expect(files).not.toContain(stray)
    const workflow = readFileSync(join(root, WORKFLOW_FILE), 'utf8')
    expect(workflow).toContain(`uses: ${BUILD_WORKFLOW}`)
    expect(workflow).not.toMatch(/\{\{[A-Z_]+\}\}/)
    expect(workflow.split('\n').length).toBeLessThan(30)
    // A workflow the repo already has is its own: a second game doesn't rewrite it.
    const workshop = makeRepo((r) => write(join(r, WORKFLOW_FILE), '# mine'))
    expect(runKit('new-game.mjs', workshop, ['one', '--workshop']).status).toBe(0)
    expect(readFileSync(join(workshop, WORKFLOW_FILE), 'utf8')).toBe('# mine')
  })

  it('the kit as shipped is self-contained, with names from brand.json', () => {
    const files = kitTree()
    for (const name of ['ci.mjs', 'check.mjs', 'new-game.mjs', 'update-runtime.mjs', 'promote.mjs', 'art/generate.mjs', 'workflow.yml', 'workflow.mjs']) expect(files[name], name).toBeDefined()
    expect(files['manifest.schema.json']).toContain('"$schema"')
    expect(files['kit-index.schema.json']).toContain('"kit"')
    expect(JSON.parse(files['package-lock.json']).packages[''].dependencies).toEqual(JSON.parse(files['package.json']).dependencies)
    for (const file of RUNTIME_FILES) {
      const text = files[`templates/shared/${file}`]
      expect(text.startsWith(RUNTIME_HEADER), file).toBe(true)
      expect(text).not.toContain('{{SLUG}}')
    }
    expect(Object.keys(files).some((p) => p.endsWith('.test.mjs') || p.endsWith('zip.mjs') || p.endsWith('kit-lock.json') || p === 'build.yml')).toBe(false)
    expect(files['relay-rooms.mjs']).toContain('export class Relay')
    expect(files['templates/online/net.js']).toContain('export const NET_VERSION')
    expect(files['templates/online/game.js']).not.toContain('{{SLUG}}')
    // What the launcher's "Set up auto-builds" adds to a repo: the workflow file, and only that.
    expect(Object.keys(kitFiles())).toEqual([WORKFLOW_FILE])
  })

  it('update-runtime replaces headered runtime files, adds missing ones and warns about forked copies', () => {
    const root = makeRepo((r) => {
      write(join(r, 'games/headered/game.js'), 'import { input } from "./input.js"')
      write(join(r, 'games/headered/input.js'), `${RUNTIME_HEADER}1 — old\nexport const input = {}`)
      write(join(r, 'games/headered/menu.js'), `${RUNTIME_HEADER}1 — old\nexport const createMenu = () => {}`)
      write(join(r, 'games/headered', MANIFEST_FILE), manifest('headered'))
      write(join(r, 'games/forked/input.js'), '// my own tweaks\nexport const input = {}')
      write(join(r, 'games/forked/save.js'), '// the game\'s own save module\nexport const load = () => {}')
      write(join(r, 'games/forked', MANIFEST_FILE), manifest('forked'))
      write(join(r, 'games/plain/index.html'), DRAW)
      write(join(r, 'games/plain', MANIFEST_FILE), manifest('plain'))
    })
    const { status, output } = runKit('update-runtime.mjs', root)
    expect(status, output).toBe(0)
    const fresh = (file) => kitTree()[`templates/shared/${file}`]
    expect(readFileSync(join(root, 'games/headered/input.js'), 'utf8')).toBe(fresh('input.js'))
    expect(readFileSync(join(root, 'games/headered/menu.js'), 'utf8')).toBe(fresh('menu.js'))
    expect(readFileSync(join(root, 'games/headered/fit.js'), 'utf8')).toBe(fresh('fit.js'))
    expect(readFileSync(join(root, 'games/forked/input.js'), 'utf8')).toBe(fresh('input.js'))
    expect(readFileSync(join(root, 'games/forked/save.js'), 'utf8')).toContain("the game's own save module")
    expect(existsSync(join(root, 'games/plain/input.js'))).toBe(false)
    expect(output).toMatch(/replaced without a runtime header.*games\/forked\/input\.js/)
    expect(output).toMatch(/input\.extendKeys/)
    expect(output).toMatch(/kept .*games\/forked\/save\.js/)
    expect(runKit('update-runtime.mjs', root).output).toMatch(/already those of kit/)
  })

  it('promote makes the new repo from the game and the one workflow file, with no template', () => {
    const root = makeRepo((r) => {
      write(join(r, 'games/keeper/index.html'), DRAW)
      write(join(r, 'games/keeper/DESIGN.md'), '# Keeper')
      write(join(r, 'games/keeper', MANIFEST_FILE), manifest('keeper', { name: 'Keeper' }))
      write(join(r, 'games/other/index.html'), DRAW)
      write(join(r, 'games/other', MANIFEST_FILE), manifest('other'))
    })
    const out = join(mkdtempSync(join(tmpdir(), 'promoted-')), 'keeper')
    const { status, output } = runKit('promote.mjs', root, ['keeper', '--out', out, '--no-create', '--skip-check', '--keep'], { GITHUB_REPOSITORY: 'someone/workshop' })
    expect(status, output).toBe(0)
    const files = execFileSync('git', ['ls-files'], { cwd: out, encoding: 'utf8' }).trim().split('\n').sort()
    expect(files).toEqual(['.gitignore', WORKFLOW_FILE, 'DESIGN.md', 'README.md', 'index.html', MANIFEST_FILE].sort())
    const moved = JSON.parse(readFileSync(join(out, MANIFEST_FILE), 'utf8'))
    expect(moved.movedFrom).toBe('someone/workshop')
    expect(moved.$schema).toBe(MANIFEST_SCHEMA_URL)
    // On its own it is a one-game repo the kit builds.
    expect(runCi(out).index.games.keeper.error).toBeNull()
  }, 120_000)

  it('no message the kit prints tells a maker to use an agent, a skill or an npm script the repo does not have', () => {
    const text = Object.entries(kitTree())
      .filter(([name]) => name.endsWith('.mjs'))
      .map(([, contents]) => contents)
      .join('\n')
    const messages = [...text.matchAll(/(?:log|say|fail|push|warn|error)\(\s*(`[^`]*`|'[^']*'|"[^"]*")/g)].map((m) => m[1])
    expect(messages.length).toBeGreaterThan(100)
    for (const message of messages) {
      expect(message, message).not.toMatch(/npm run (check|dev|new-game|update-kit|setup|promote|art)\b/)
      expect(message, message).not.toMatch(/\bskill\b|AGENTS\.md|plugin/i)
    }
  })

})

describe('any kind of build', () => {
  /** A page that shows nothing for a while, like an engine export still loading. */
  const SLOW = `<canvas id=c width=320 height=200 style="background:#000"></canvas><script>
    setTimeout(() => { const x = c.getContext('2d'); x.fillStyle = '#3c8'; x.fillRect(30, 30, 200, 120) }, 6000)
  </script>`
  const ELF = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 0]), Buffer.alloc(56)])
  const writeBin = (file, bytes) => {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, bytes)
  }
  const zipList = (root, name) => execFileSync('unzip', ['-Z1', join(root, KIT_DIR, '.work/dist', name)], { encoding: 'utf8' })
  const zipFile = (root, name, file) => execFileSync('unzip', ['-p', join(root, KIT_DIR, '.work/dist', name), file], { encoding: 'utf8' })

  it('packages a web export an engine wrote to a folder, waiting for its first picture', () => {
    const root = makeRepo((r) => {
      write(join(r, 'project.godot'), '; not a JavaScript project')
      write(join(r, 'export/web/index.html'), SLOW)
      write(join(r, 'export/web/game.pck'), 'engine data')
      write(join(r, MANIFEST_FILE), manifest('slow-start', { build: { outputs: { web: 'export/web' } } }))
    })
    const { status, output, index } = runCi(root)
    expect(status, output).toBe(0)
    expect(index.games['slow-start'].platforms).toEqual(['web'])
    expect(index.games['slow-start'].platform).toBe('web')
    const files = zipList(root, 'slow-start-web.zip')
    expect(files).toContain('index.html')
    expect(files).toContain('game.pck')
    expect(files).not.toContain('project.godot')
    // Nothing in an engine's export is held to the kit's own conventions.
    expect(output).not.toMatch(/menu\.js|fit\.js|window\.__game =/)
  }, 150_000)

  it('notes pre-compressed files in a web build, which the phone app cannot serve', () => {
    const root = makeRepo((r) => {
      write(join(r, 'export/web/index.html'), DRAW)
      write(join(r, 'export/web/Build/game.wasm.br'), 'compressed')
      write(join(r, MANIFEST_FILE), manifest('packed', { build: { outputs: { web: 'export/web' } } }))
    })
    const { status, output } = runKit('check.mjs', root)
    expect(status).toBe(0)
    expect(output).toMatch(/⚠ this web build has pre-compressed files[\s\S]*not in the phone app/)
  }, 150_000)

  it('runs the build command the manifest names, in place of npm run build, and tells it this is the handheld build', () => {
    const root = makeRepo((r) => {
      write(join(r, 'package.json'), { name: 'own-release', private: true, scripts: { build: 'node -e "process.exit(1)"' } })
      write(join(r, 'make.mjs'), `import { mkdirSync, writeFileSync } from 'node:fs'
        mkdirSync('out/web', { recursive: true })
        writeFileSync('out/web/index.html', ${JSON.stringify(DRAW)} + '<!-- flag=' + process.env.${`${SLUG.toUpperCase()}_BUILD`} + ' -->')`)
      write(join(r, MANIFEST_FILE), manifest('own-release', { build: { command: 'node make.mjs', outputs: { web: 'out/web' } } }))
    })
    const { status, output } = runCi(root)
    expect(status, output).toBe(0)
    expect(zipFile(root, 'own-release-web.zip', 'index.html')).toContain('<!-- flag=1 -->')
  }, 150_000)

  it('builds the engine-export sample: a web build that loads slowly and a Linux build, with nothing JavaScript about the repo', () => {
    const root = makeRepo((r) => cpSync(join(SRC, '../../samples/engine-export'), r, { recursive: true }))
    const { status, output, index } = runCi(root)
    expect(status, output).toBe(0)
    expect(index.games['engine-export'].platforms).toEqual(['web', 'linux-x64'])
    expect(output).toMatch(/linux-x64 not played/)
  }, 150_000)

  it('says what is missing when an output folder or its entry file is not there', () => {
    const root = makeRepo((r) => {
      write(join(r, 'games/nofolder', MANIFEST_FILE), manifest('nofolder', { build: { outputs: { web: 'export/web' } } }))
      write(join(r, 'games/noentry/export/web/game.html'), DRAW)
      write(join(r, 'games/noentry', MANIFEST_FILE), manifest('noentry', { build: { outputs: { web: 'export/web' } } }))
      write(join(r, 'games/nooutput/export/web/index.html'), DRAW)
      write(join(r, 'games/nooutput', MANIFEST_FILE), manifest('nooutput', { entry: { web: 'index.html', 'linux-x64': 'game.x86_64' }, build: { outputs: { web: 'export/web' } } }))
    })
    const { status, index } = runCi(root)
    expect(status).toBe(1)
    expect(index.games.nofolder.error.message).toMatch(/build\.outputs\.web: the folder "export\/web" doesn't exist/)
    expect(index.games.noentry.error.message).toMatch(/entry\.web "index\.html" isn't in export\/web/)
    expect(index.games.nooutput.error.message).toMatch(/entry\.linux-x64 has no folder in build\.outputs/)
  }, 150_000)

  it('packages a native build next to the web one, each with its own manifest and art', () => {
    const root = makeRepo((r) => {
      write(join(r, 'export/web/index.html'), DRAW)
      writeBin(join(r, 'export/linux/game.x86_64'), ELF)
      write(join(r, 'export/linux/game.pck'), 'engine data')
      write(join(r, 'art/cover.svg'), SVG)
      write(
        join(r, MANIFEST_FILE),
        manifest('both', {
          entry: { web: 'index.html', 'linux-x64': 'game.x86_64' },
          build: { outputs: { web: 'export/web', 'linux-x64': 'export/linux' } },
          launch: { 'linux-x64': { args: ['--fullscreen'] } },
          art: { cover: 'art/cover.svg' }
        })
      )
    })
    const { status, output, index } = runCi(root)
    expect(status, output).toBe(0)
    const game = index.games.both
    expect(game.platforms).toEqual(['web', 'linux-x64'])
    expect(game.assets['linux-x64'].name).toBe('both-linux-x64.zip')
    expect(game.assets.web.name).toBe('both-web.zip')
    const shipped = JSON.parse(zipFile(root, 'both-linux-x64.zip', MANIFEST_FILE))
    expect(shipped.entry).toEqual({ 'linux-x64': 'game.x86_64' })
    expect(shipped.launch['linux-x64'].args).toEqual(['--fullscreen'])
    expect(shipped.build).toBeUndefined()
    expect(zipList(root, 'both-linux-x64.zip')).toContain('__art/cover.png')
    // The run bit survives, so the launcher can start it.
    expect(execFileSync('unzip', ['-Z', join(root, KIT_DIR, '.work/dist/both-linux-x64.zip'), 'game.x86_64'], { encoding: 'utf8' })).toMatch(/^-rwx/m)
    expect(JSON.parse(zipFile(root, 'both-web.zip', MANIFEST_FILE)).entry).toEqual({ web: 'index.html' })
  }, 150_000)

  it('packages a game with only a native build from its art, and refuses a file that is not a program', () => {
    const root = makeRepo((r) => {
      writeBin(join(r, 'games/native/bin/game'), ELF)
      write(join(r, 'games/native/art/cover.svg'), SVG)
      write(join(r, 'games/native/art/hero.svg'), SVG)
      write(join(r, 'games/native', MANIFEST_FILE), manifest('native', { entry: { 'linux-x64': 'game' }, build: { outputs: { 'linux-x64': 'bin' } }, art: { cover: 'art/cover.svg', hero: 'art/hero.svg' } }))
      write(join(r, 'games/notes/bin/game.exe'), 'just some text')
      write(join(r, 'games/notes/art/cover.svg'), SVG)
      write(join(r, 'games/notes/art/hero.svg'), SVG)
      write(join(r, 'games/notes', MANIFEST_FILE), manifest('notes', { entry: { 'windows-x64': 'game.exe' }, build: { outputs: { 'windows-x64': 'bin' } }, art: { cover: 'art/cover.svg', hero: 'art/hero.svg' } }))
      writeBin(join(r, 'games/noart/bin/game'), ELF)
      write(join(r, 'games/noart', MANIFEST_FILE), manifest('noart', { entry: { 'linux-x64': 'game' }, build: { outputs: { 'linux-x64': 'bin' } } }))
    })
    const { status, output, index } = runCi(root)
    expect(status).toBe(1)
    expect(index.games.native.error).toBeNull()
    expect(index.games.native.platforms).toEqual(['linux-x64'])
    expect(index.games.native.platform).toBeUndefined()
    expect(Object.keys(index.games.native.assets).sort()).toEqual(['cover', 'hero', 'linux-x64'])
    expect(output).toMatch(/native[\s\S]*not played: only web builds are play-tested/)
    expect(index.games.notes.error.message).toMatch(/entry\.windows-x64 "game\.exe" isn't a Windows program/)
    expect(index.games.noart.error.message).toMatch(/a game with no web build needs art\.cover and art\.hero/)
  }, 150_000)

  it('judges a game by what it does inside the launcher, so its normal release may reach the internet or open a dialog', () => {
    const page = (guard) => `${DRAW}<script>
      if (${guard}) { fetch('https://stats.example.com/hit').catch(() => {}); alert('rate us') }
    </script>`
    const root = makeRepo((r) => {
      write(join(r, 'games/guarded/index.html'), page(`!window.${SLUG}`))
      write(join(r, 'games/guarded', MANIFEST_FILE), manifest('guarded'))
      write(join(r, 'games/always/index.html'), page('true'))
      write(join(r, 'games/always', MANIFEST_FILE), manifest('always'))
    })
    const { status, index } = runCi(root)
    expect(status).toBe(1)
    expect(index.games.guarded.error).toBeNull()
    expect(index.games.always.error.message).toMatch(/loads https:\/\/stats\.example\.com\/hit from the internet/)
    expect(index.games.always.error.message).toMatch(/opened a alert\(\) dialog/)
  }, 150_000)

  it('serves engine files with the types and encodings browsers need, isolated when the game asks', async () => {
    const { serve } = await import('./server.mjs')
    const dir = mkdtempSync(join(tmpdir(), 'kit-serve-'))
    write(join(dir, 'index.html'), DRAW)
    write(join(dir, 'game.wasm.br'), 'compressed')
    write(join(dir, 'game.data.gz'), 'compressed')
    write(join(dir, 'game.pck'), 'data')
    const plain = await serve({ '/': dir })
    const isolated = await serve({ '/': dir }, {}, { isolated: true })
    try {
      const wasm = await fetch(`${plain.url}/game.wasm.br`, { headers: { 'accept-encoding': 'identity' } })
      expect(wasm.headers.get('content-type')).toBe('application/wasm')
      expect(wasm.headers.get('content-encoding')).toBe('br')
      const data = await fetch(`${plain.url}/game.data.gz`, { headers: { 'accept-encoding': 'identity' } })
      expect(data.headers.get('content-encoding')).toBe('gzip')
      expect((await fetch(`${plain.url}/game.pck`)).headers.get('content-type')).toBe('application/octet-stream')
      expect((await fetch(`${plain.url}/index.html`)).headers.get('cross-origin-embedder-policy')).toBeNull()
      const html = await fetch(`${isolated.url}/index.html`)
      expect(html.headers.get('cross-origin-opener-policy')).toBe('same-origin')
      expect(html.headers.get('cross-origin-embedder-policy')).toBe('require-corp')
    } finally {
      await plain.close()
      await isolated.close()
    }
  })
})

describe('a game that plays from the repo\'s normal releases', () => {
  const ELF = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 0]), Buffer.alloc(56)])
  const bare = { id: 'star-drift', name: 'Star Drift', release: { 'linux-x64': 'StarDrift-*-linux.zip', web: 'StarDrift-web.zip' } }
  /** What the shared build's "Files from this repo's release" step leaves behind. */
  const fetched = (root, platform, files) => {
    for (const [name, contents] of Object.entries(files)) {
      const file = join(root, KIT_DIR, '.work/from-release/star-drift', platform, name)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, contents)
    }
  }

  it('passes the check on a name and "release" alone, saying the files themselves are not checked', () => {
    const root = makeRepo((r) => {
      write(join(r, 'project.godot'), 'config_version=5')
      write(join(r, MANIFEST_FILE), bare)
    })
    const { status, output } = runKit('check.mjs', root)
    expect(status).toBe(0)
    expect(output).toMatch(/come from the repo's normal releases, so they aren't checked here/)
    expect(output).toMatch(new RegExp(`✓ ${MANIFEST_FILE.replace('.', '\\.')} is fine`))
    // What makes the game look better is suggested, never demanded.
    expect(output).toMatch(/⚠ .*add "tags"/)
    expect(output).not.toMatch(/✗/)
  })

  it('refuses "release" next to "build", and an entry with no release file', () => {
    const root = makeRepo((r) => write(join(r, MANIFEST_FILE), { ...bare, build: { command: 'make' }, entry: { 'windows-x64': 'Game.exe' } }))
    const { status, output } = runKit('check.mjs', root)
    expect(status).toBe(1)
    expect(output).toMatch(/"release" plays the game from the repo's normal releases, so there is nothing to build/)
    expect(output).toMatch(/entry\.windows-x64 has no file in "release"/)
  })

  it('reports a mistyped field alone, with the one it is closest to', () => {
    const root = makeRepo((r) => write(join(r, MANIFEST_FILE), { id: 'star-drift', name: 'Star Drift', relase: true }))
    const { status, output } = runKit('check.mjs', root)
    expect(status).toBe(1)
    expect(output).toMatch(/"relase" isn't a field\. Did you mean "release"\?/)
    expect(output.match(/✗/g)).toHaveLength(1)
    const platform = makeRepo((r) => write(join(r, MANIFEST_FILE), { ...bare, release: { linux: 'StarDrift-linux.zip' } }))
    expect(runKit('check.mjs', platform).output).toMatch(/release: "linux" isn't a field\. Did you mean "linux-x64"\?/)
  })

  it('refuses a path where a release file name belongs', () => {
    const root = makeRepo((r) => write(join(r, MANIFEST_FILE), { ...bare, release: { 'linux-x64': 'build/StarDrift-linux.zip' } }))
    const { status, output } = runKit('check.mjs', root)
    expect(status).toBe(1)
    expect(output).toMatch(/release\.linux-x64 "build\/StarDrift-linux\.zip" is a path\. Give the file's name as it appears in the release \(for example "StarDrift-linux\.zip"\)/)
  })

  it('leaves the published build alone on a push, and publishes nothing when there has never been one', () => {
    const root = makeRepo((r) => write(join(r, MANIFEST_FILE), bare))
    const { status, output, index } = runCi(root)
    expect(status).toBe(0)
    expect(output).toMatch(/Nothing to publish: the games here are packaged when a release is published/)
    expect(index).toBeNull()
  })

  it('packages the files of a published release, finding the program when no entry is named', () => {
    const root = makeRepo((r) => {
      write(join(r, 'art/cover.svg'), SVG)
      write(join(r, 'art/hero.svg'), SVG)
      write(join(r, MANIFEST_FILE), { ...bare, art: { cover: 'art/cover.svg', hero: 'art/hero.svg' } })
    })
    // The zip held one folder; the program sits beside its data file.
    fetched(root, 'linux-x64', { 'StarDrift/StarDrift.x86_64': ELF, 'StarDrift/StarDrift.pck': 'data' })
    fetched(root, 'web', { 'index.html': DRAW })
    const { status, output } = runKit('ci.mjs', root, [], { DRY_RUN: '1', EVENT_NAME: 'release', GITHUB_REF_NAME: 'v1.2.0', DEFAULT_BRANCH: 'main' })
    expect(output).toMatch(/Publishing to/)
    expect(status).toBe(0)
    const index = JSON.parse(readFileSync(join(root, KIT_DIR, '.work/release', INDEX_ASSET), 'utf8'))
    const game = index.games['star-drift']
    expect(game.platforms).toEqual(['web', 'linux-x64'])
    expect(game.version).toBe('v1.2.0')
    const shipped = JSON.parse(execFileSync('unzip', ['-p', join(root, KIT_DIR, '.work/dist/star-drift-linux-x64.zip'), MANIFEST_FILE], { encoding: 'utf8' }))
    expect(shipped.entry).toEqual({ 'linux-x64': 'StarDrift.x86_64' })
    expect(shipped.release).toBeUndefined()
  }, 150_000)

  it('asks for an entry when a release zip holds more than one program', () => {
    const root = makeRepo((r) => {
      write(join(r, 'art/cover.svg'), SVG)
      write(join(r, 'art/hero.svg'), SVG)
      write(join(r, MANIFEST_FILE), { ...bare, art: { cover: 'art/cover.svg', hero: 'art/hero.svg' } })
    })
    fetched(root, 'linux-x64', { game: ELF, editor: ELF })
    const { status, output } = runKit('ci.mjs', root, [], { DRY_RUN: '1', EVENT_NAME: 'release', GITHUB_REF_NAME: 'v1', DEFAULT_BRANCH: 'main' })
    expect(status).toBe(1)
    expect(output).toMatch(/the linux-x64 zip from the release has no single obvious program in it: say which file starts the game with "entry"/)
  })

  it('matches release files the way the launcher does', async () => {
    const { releaseFilesFor } = await import('./release-files.mjs')
    const names = ['StarDrift-1.2.0-linux.zip', 'StarDrift-1.2.0-windows.zip', 'StarDrift-source.zip', 'notes.txt']
    expect(releaseFilesFor(true, names)).toEqual({ 'linux-x64': 'StarDrift-1.2.0-linux.zip', 'windows-x64': 'StarDrift-1.2.0-windows.zip' })
    expect(releaseFilesFor({ 'linux-x64': 'stardrift-*-LINUX.zip', web: 'nope.zip' }, names)).toEqual({ 'linux-x64': 'StarDrift-1.2.0-linux.zip' })
  })

  it('tells a repo with no manifest what to add, for an existing game as well as a new one', () => {
    const root = makeRepo((r) => write(join(r, 'project.godot'), 'config_version=5'))
    const { status, output } = runKit('check.mjs', root)
    expect(status).toBe(1)
    expect(output).toMatch(new RegExp(`There is no ${MANIFEST_FILE.replace('.', '\\.')} here`))
    expect(output).toMatch(/A game you already have \(any engine\)/)
  })
})

describe('a brand-new game', () => {
  it('passes the check untouched and is published, with what is left to do before sharing it', () => {
    const root = makeRepo(() => {})
    expect(runKit('new-game.mjs', root, ['fresh-game']).status).toBe(0)
    const checked = runKit('check.mjs', root)
    expect(checked.output).not.toMatch(/✗/)
    expect(checked.output).toMatch(/⚠ .*add a "description"/)
    expect(checked.output).toMatch(/⚠ .*is still the placeholder/)
    expect(checked.output).toMatch(/Before you share it, give it a description, your own cover, your own banner and tags\./)
    expect(checked.status).toBe(0)
    const { status, index } = runCi(root)
    expect(status).toBe(0)
    expect(index.games['fresh-game'].error).toBeNull()
    expect(Object.keys(index.games['fresh-game'].assets)).toContain('web')
  }, 150_000)

  it('still fails without "inputs", which the check plays it by', () => {
    const root = makeRepo((r) => {
      write(join(r, 'index.html'), DRAW)
      write(join(r, MANIFEST_FILE), manifest('no-inputs', { inputs: undefined }))
    })
    const { status, output } = runKit('check.mjs', root)
    expect(status).toBe(1)
    expect(output).toMatch(/✗ .*add "inputs"/)
  })
})

describe('the template repo', () => {
  it('is what new-game makes in an empty folder plus a README, filled in enough to pass the check as it is', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'kit-template-')), 'repo')
    const made = spawnSync('node', [join(SRC, 'template.mjs'), out], { encoding: 'utf8' })
    expect(made.stdout + made.stderr).toMatch(/Wrote the template repo/)
    const fresh = makeRepo(() => {})
    expect(runKit('new-game.mjs', fresh, ['my-game', '--name', 'My Game']).status).toBe(0)
    const list = (root) => execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n').sort()
    execFileSync('git', ['init', '-q'], { cwd: out })
    expect(list(out)).toEqual([...list(fresh), 'README.md'].sort())
    // Only the manifest differs: the template's starter has a description and a tag.
    for (const file of list(fresh).filter((f) => f !== MANIFEST_FILE)) expect(readFileSync(join(out, file), 'utf8'), file).toBe(readFileSync(join(fresh, file), 'utf8'))
    const checked = runKit('check.mjs', out)
    expect(checked.output).toMatch(/All 1 game\(s\) passed/)
    expect(checked.output).toMatch(/Before you share it, give it your own cover and your own banner\./)
    expect(checked.status).toBe(0)
    const readme = readFileSync(join(out, 'README.md'), 'utf8')
    expect(readme).toMatch(/Add game → Connect GitHub/)
    expect(readme).not.toMatch(/AGENTS\.md|plugin install|skill/i)
  }, 150_000)

  it('refuses to write over a folder that already has files', () => {
    const out = mkdtempSync(join(tmpdir(), 'kit-template-'))
    writeFileSync(join(out, 'notes.txt'), 'mine')
    const made = spawnSync('node', [join(SRC, 'template.mjs'), out], { encoding: 'utf8' })
    expect(made.status).toBe(1)
    expect(made.stdout).toMatch(/isn't empty/)
  })
})

describe('release channels', () => {
  it('publishes the default branch to the stable release and `beta` to the beta release', () => {
    expect(releaseTagFor('main', 'main')).toBe(RELEASE_TAG)
    expect(releaseTagFor('beta', 'main')).toBe(BETA_RELEASE_TAG)
    expect(releaseTagFor('feature/x', 'main')).toBeNull()
    // A repo whose default branch is called beta: that's still the stable channel.
    expect(releaseTagFor('beta', 'beta')).toBe(RELEASE_TAG)
    expect(BETA_RELEASE_TAG).not.toBe(RELEASE_TAG)
  })

  it('the publish stage picks the release by branch (dry run)', () => {
    const publish = (branch) => {
      const root = makeRepo(() => {})
      write(join(root, KIT_DIR, '.work/dist/build-results.json'), { sha: 'a'.repeat(40), branch, buildNumber: 1, runUrl: null, games: [] })
      return runKit('ci.mjs', root, [], { DRY_RUN: '1', STAGE: 'publish', DEFAULT_BRANCH: 'main' })
    }
    const stable = publish('main')
    expect(stable.status, stable.output).toBe(0)
    expect(stable.output).toContain(`Publishing to ${RELEASE_TAG}`)
    const beta = publish('beta')
    expect(beta.status, beta.output).toBe(0)
    expect(beta.output).toContain(`Publishing to ${BETA_RELEASE_TAG}`)
    const other = publish('feature-x')
    expect(other.status, other.output).toBe(0)
    expect(other.output).toMatch(/only builds and checks; nothing published/)
  })

  it('the workflow publishes from the default and beta branches, one queue per release', () => {
    const workflow = buildWorkflow()
    expect(workflow).not.toMatch(/\{\{[A-Z_]+\}\}/)
    expect(workflow).toContain('workflow_call')
    expect(workflow).toMatch(/uses: actions\/checkout@[0-9a-f]{40}/)
    expect(workflow).toContain('persist-credentials: false')
    expect(workflow).toContain('id-token: write')
    expect(workflow).toContain("github.ref == 'refs/heads/beta'")
    expect(workflow).toContain("github.ref == format('refs/heads/{0}', github.event.repository.default_branch)")
    expect(workflow).toMatch(/group: \S+-publish-\$\{\{ github\.ref_name == 'beta' && 'beta' \|\| 'latest' \}\}/)
    expect(workflow).toContain(BETA_RELEASE_TAG)
  })
})
