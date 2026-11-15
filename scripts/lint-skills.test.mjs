// The rules in docs/writing-skills.md, checked on small fixture repos and on this repo itself.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { lint, listSkills } from './lint-skills.mjs'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'lint-skills-'))
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), text)
  }
  return root
}
const skill = (name, body = 'Body.', extra = '') => `---\nname: ${name}\ndescription: Does a thing. Use for "a thing".\n${extra}---\n\n# ${name}\n\n${body}\n`

test('every skill in this repo follows the rules', () => {
  assert.deepEqual(lint(REPO), [])
})

test('no skill name is used by both plugins, so they can be installed side by side in one flat folder', () => {
  const names = listSkills(REPO).map((s) => s.name)
  assert.equal(new Set(names).size, names.length)
  const root = fixture({ 'plugins/game-craft/skills/camera/SKILL.md': skill('camera'), 'plugins/pushplay/skills/camera/SKILL.md': skill('camera') })
  assert.match(lint(root).join('\n'), /pushplay\/camera: skill name also used in game-craft/)
})

test('a clean skill with a reference file and a sibling link passes', () => {
  const root = fixture({
    'plugins/game-craft/skills/camera/SKILL.md': skill('camera', 'See [notes](references/notes.md) and [feel](../game-feel/SKILL.md).'),
    'plugins/game-craft/skills/camera/references/notes.md': 'Notes.',
    'plugins/game-craft/skills/game-feel/SKILL.md': skill('game-feel')
  })
  assert.deepEqual(lint(root), [])
})

test('frontmatter must be name and description only, with the folder name, and parse as strict YAML', () => {
  const root = fixture({
    'plugins/game-craft/skills/a/SKILL.md': skill('a', 'Body.', 'allowed-tools: Bash\n'),
    'plugins/game-craft/skills/b/SKILL.md': skill('other'),
    'plugins/game-craft/skills/c/SKILL.md': 'No frontmatter.',
    'plugins/game-craft/skills/d/SKILL.md': '---\nname: d\ndescription: For a phone: thumb zones.\n---\n',
    'plugins/game-craft/skills/e/notes.md': 'A folder without a skill file.'
  })
  const problems = lint(root).join('\n')
  assert.match(problems, /game-craft\/a: frontmatter key "allowed-tools" is not portable/)
  assert.match(problems, /game-craft\/b: frontmatter name is "other"/)
  assert.match(problems, /game-craft\/c: SKILL\.md has no frontmatter/)
  assert.match(problems, /game-craft\/d: description has ": "/)
  assert.match(problems, /game-craft\/e: no SKILL\.md/)
})

test('paths that only exist in one layout, broken links and links into the other plugin are reported', () => {
  const root = fixture({
    'plugins/pushplay/skills/new-game/SKILL.md': skill(
      'new-game',
      'Run `node .claude/skills/new-game/scripts/x.mjs`, read docs/game-design/kickoff.md, [gone](references/gone.md), [craft](../../../game-craft/skills/camera/SKILL.md). Use AskUserQuestion.'
    ),
    'plugins/game-craft/skills/camera/SKILL.md': skill('camera')
  })
  const problems = lint(root).join('\n')
  assert.match(problems, /new-game\/SKILL\.md:\d+: path into \.claude\/skills/)
  assert.match(problems, /new-game\/SKILL\.md:\d+: docs\/game-design path/)
  assert.match(problems, /new-game\/SKILL\.md:\d+: names one agent's question tool/)
  assert.match(problems, /broken link: references\/gone\.md/)
  assert.match(problems, /link leaves the plugin's skills folder: \.\.\/\.\.\/\.\.\/game-craft/)
})

test('a general skill may not mention PushPlay, its commands or its runtime files; a PushPlay skill may', () => {
  const body = 'Run `npm run check`, read `pushplay.json`, call `input.label("a")` from input.js on the Steam Deck at 1280×800.'
  const root = fixture({
    'plugins/game-craft/skills/game-ui/SKILL.md': skill('game-ui', body),
    'plugins/game-craft/skills/game-ui/toolkit/hud.js': '// uses createMenu from menu.js\n',
    'plugins/pushplay/skills/cover-art/SKILL.md': skill('cover-art', body.replace('npm run check', 'pushplay check'))
  })
  const problems = lint(root)
  assert.ok(problems.length >= 6)
  assert.ok(problems.every((p) => p.startsWith('game-craft/game-ui/')), problems.join('\n'))
  assert.ok(problems.some((p) => p.includes('toolkit/hud.js')))
})

test('a PushPlay skill may not send an agent to npm scripts or a kit folder that game repos no longer have', () => {
  const body = 'Run `npm run check`, then read `.github/pushplay/config.mjs`.'
  const root = fixture({
    'plugins/pushplay/skills/improve-game/SKILL.md': skill('improve-game', body)
  })
  const problems = lint(root)
  assert.equal(problems.length, 2, problems.join('\n'))
  assert.ok(problems.every((p) => p.startsWith('pushplay/improve-game/')))
})
