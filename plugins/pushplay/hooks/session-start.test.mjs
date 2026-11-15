import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { notice } from './session-start.mjs'

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'session-start.mjs')
function folder(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'hook-'))
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), text)
  }
  return root
}

test('says nothing in a folder that has nothing to do with PushPlay', () => {
  assert.equal(notice(folder({ 'package.json': '{}', 'src/index.js': '' })), '')
  const run = spawnSync('node', [HOOK], { cwd: folder(), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: '' } })
  assert.equal(run.status, 0)
  assert.equal(run.stdout, '')
})

test('in a game repo it names the skill that holds the rules the repo no longer carries', () => {
  const text = notice(folder({ 'pushplay.json': '{}', 'game.js': '' }))
  assert.match(text, /This repo is a PushPlay game/)
  assert.match(text, /load the pushplay-rules skill/)
})

test('in a workshop it counts the games', () => {
  const text = notice(folder({ 'games/one/pushplay.json': '{}', 'games/two/pushplay.json': '{}', 'games/notes/readme.md': '' }))
  assert.match(text, /workshop with 2 games/)
})

test('it reads the project folder the session gives it', () => {
  const root = folder({ 'games/one/pushplay.json': '{}' })
  const run = spawnSync('node', [HOOK], { cwd: tmpdir(), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: root } })
  assert.match(run.stdout, /workshop with 1 game in/)
})
