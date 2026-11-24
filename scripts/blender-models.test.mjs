// The blender-models skill's scripts: every one compiles, and the maths that needs no Blender passes its unit tests.
// The scripts that drive Blender are exercised by the skill's own selftest.py, which needs Blender and is not run here.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'plugins', 'game-craft', 'skills', 'blender-models', 'scripts')
const python = ['python3', 'python'].find((name) => spawnSync(name, ['--version']).status === 0)

test('Python is available to check the Blender scripts', () => {
  assert.ok(python, 'These tests need Python 3 on the PATH (python3 or python).')
})

test('every Blender script is valid Python', { skip: !python }, () => {
  for (const file of readdirSync(SCRIPTS).filter((name) => name.endsWith('.py'))) {
    const run = spawnSync(python, ['-c', 'import ast, sys; ast.parse(open(sys.argv[1], encoding="utf-8").read(), sys.argv[1])', join(SCRIPTS, file)], { encoding: 'utf8' })
    assert.equal(run.status, 0, `${file}: ${run.stderr}`)
  }
})

test('the gap, stretch, foot-slide, loop, weight-rule and skeleton maths pass their unit tests', { skip: !python }, () => {
  const run = spawnSync(python, ['-B', 'metrics_test.py'], { cwd: SCRIPTS, encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr)
  assert.match(run.stderr, /Ran \d+ tests[\s\S]*OK/)
})
