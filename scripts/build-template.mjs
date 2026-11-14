// node scripts/build-template.mjs <out-dir>
// Writes the tree a PushPlay game repo is made of, minus the build kit: repo-files/ (AGENTS.md,
// CLAUDE.md, package.json, tools/, …) plus every skill of both plugins, flat, in .claude/skills/.
// The PushPlay release feeds this folder to the kit's zip step (kit.zip), and `npm run update-kit`
// installs it in game repos.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listSkills } from './lint-skills.mjs'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
export const SKILLS_DIR = '.claude/skills'
/** Left out of the copy in a game repo: the bundled kit (the repo already has it) and the skills' own tests. */
const skipped = (path) => basename(path) === 'kit.zip' || /\.test\.mjs$/.test(path)

export function buildTemplate(out, repo = REPO) {
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  cpSync(join(repo, 'repo-files'), out, { recursive: true })
  const names = []
  for (const skill of listSkills(repo)) {
    if (!existsSync(join(skill.dir, 'SKILL.md'))) continue
    cpSync(skill.dir, join(out, SKILLS_DIR, skill.name), { recursive: true, filter: (src) => !skipped(src) })
    names.push(skill.name)
  }
  return names
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] && resolve(process.argv[2])
  if (!out) {
    console.error('Usage: node scripts/build-template.mjs <out-dir>')
    process.exit(1)
  }
  if (existsSync(out) && readdirSync(out).length && !process.argv.includes('--force')) {
    console.error(`${out} isn't empty (pass --force to replace it)`)
    process.exit(1)
  }
  const names = buildTemplate(out)
  console.log(`Wrote ${names.length} skills and the repo files to ${out}`)
}
