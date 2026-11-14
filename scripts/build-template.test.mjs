// What a game repo gets from this repo: the repo files plus every skill of both plugins, flat.
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { buildTemplate, SKILLS_DIR } from './build-template.mjs'
import { listSkills } from './lint-skills.mjs'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(mkdtempSync(join(tmpdir(), 'template-')), 'out')
const names = buildTemplate(out)

const walk = (dir) => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]))

test('the template holds every skill of both plugins in one flat skills folder', () => {
  const expected = listSkills(REPO).map((s) => s.name).sort()
  assert.deepEqual([...names].sort(), expected)
  assert.deepEqual(readdirSync(join(out, SKILLS_DIR)).sort(), expected)
  for (const name of ['new-game', 'pushplay-manifest', 'pushplay-runtime', 'game-design', 'enemy-ai']) {
    assert.ok(existsSync(join(out, SKILLS_DIR, name, 'SKILL.md')), name)
  }
})

test('it carries the files a game repo starts with', () => {
  for (const file of ['AGENTS.md', 'CLAUDE.md', 'README.md', 'package.json', '.gitignore', '.env.example', 'tools/art/generate.mjs', 'tools/promote/promote.mjs', '.github/workflows/promote.yml']) {
    assert.ok(existsSync(join(out, file)), file)
  }
  const pkg = JSON.parse(readFileSync(join(out, 'package.json'), 'utf8'))
  for (const script of ['setup', 'new-game', 'dev', 'check', 'update-kit', 'art', 'promote']) assert.ok(pkg.scripts[script], script)
  assert.equal(readFileSync(join(out, 'CLAUDE.md'), 'utf8').trim(), '@AGENTS.md')
})

test('the bundled kit and the skills\' own tests stay out of game repos', () => {
  const files = walk(out)
  assert.equal(files.filter((f) => f.endsWith('kit.zip')).length, 0)
  assert.equal(files.filter((f) => f.endsWith('.test.mjs') && f.includes(SKILLS_DIR)).length, 0)
})

test('every link and skill path in AGENTS.md points at something the template contains', () => {
  const text = readFileSync(join(out, 'AGENTS.md'), 'utf8')
  const links = [...text.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1].split('#')[0]).filter((t) => t && !/^[a-z][a-z0-9+.-]*:/i.test(t))
  assert.ok(links.length > 10)
  for (const link of links) assert.ok(existsSync(resolve(out, link)), `AGENTS.md links to ${link}`)
  assert.doesNotMatch(text, /docs\/game-design/)
})

test('every skill AGENTS.md routes to exists, and every skill is routed to', () => {
  const text = readFileSync(join(out, 'AGENTS.md'), 'utf8')
  const section = text.slice(text.indexOf('## Skills'), text.indexOf('## Game rules'))
  const routed = new Set([...section.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)*)`/g)].map((m) => m[1]))
  for (const name of names) assert.ok(routed.has(name), `AGENTS.md doesn't mention the ${name} skill`)
  for (const arrow of section.matchAll(/→ `([a-z0-9-]+)`/g)) assert.ok(names.includes(arrow[1]), `AGENTS.md routes to a skill that doesn't exist: ${arrow[1]}`)
})
