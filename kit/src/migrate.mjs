// <kit> migrate [--dry]
// For a repo set up by a kit before v14, which copied itself into the repo: removes that copy and
// everything that came with it (the agent files, the kit's skills and guides, its tools, the npm
// scripts that ran it) and leaves the one workflow file that calls the shared build. The games,
// and anything the repo added itself (its own skills, tools, scripts, docs), are not touched.
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { brand, CMD, MANIFEST_SCHEMA_URL, OLD_AGENT_FILES, OLD_DOCS, OLD_DOCS_DIR, OLD_KIT_DIR, OLD_SCRIPTS, OLD_SKILLS, OLD_SKILLS_DIR, OLD_SKILLS_LINK, OLD_TOOLS, OLD_WORKFLOWS, WORKFLOW_FILE } from './config.mjs'
import { listGames, log, ROOT } from './repo.mjs'
import { callerWorkflow } from './workflow.mjs'

const dry = process.argv.includes('--dry')
const done = []
const kept = []
const at = (rel) => join(ROOT, rel)
const exists = (rel) => {
  try {
    lstatSync(at(rel))
    return true
  } catch {
    return false
  }
}
const remove = (rel, what = rel) => {
  if (!exists(rel)) return
  if (!dry) rmSync(at(rel), { recursive: true, force: true })
  done.push(`removed ${what}`)
}
/** Removes a folder that has nothing left in it, and its parent if that is now empty too. */
const prune = (rel) => {
  for (let dir = rel; dir && dir !== '.'; dir = dirname(dir)) {
    if (dry || !existsSync(at(dir)) || readdirSync(at(dir)).length) return
    rmSync(at(dir), { recursive: true })
  }
}

// 1. The kit's own copy.
remove(OLD_KIT_DIR, `${OLD_KIT_DIR}/ (the build kit's copy)`)

// 2. Agent files. A file the repo added lines to keeps those lines; the kit's part goes.
for (const file of OLD_AGENT_FILES) {
  if (!exists(file)) continue
  const text = readFileSync(at(file), 'utf8')
  // The kit's AGENTS.md is recognised by its title; its CLAUDE.md by importing it.
  if (file === 'AGENTS.md') {
    if (text.startsWith('# Making games in this repo')) remove(file)
    else kept.push(`${file} (not the kit's)`)
    continue
  }
  const own = text
    .split('\n')
    .filter((line) => line.trim() !== '@AGENTS.md' && !line.startsWith('Pick the skill by intent:'))
    .join('\n')
    .trim()
  if (!own) remove(file)
  else {
    if (!dry) writeFileSync(at(file), own + '\n')
    done.push(`${file}: removed the kit's lines, kept the repo's own`)
  }
}

// 3. The kit's skills (a link some kits made to them, too) and guides.
if (exists(OLD_SKILLS_LINK) && lstatSync(at(OLD_SKILLS_LINK)).isSymbolicLink()) {
  remove(OLD_SKILLS_LINK)
  prune(dirname(OLD_SKILLS_LINK))
}
const skills = OLD_SKILLS.filter((name) => exists(join(OLD_SKILLS_DIR, name)))
for (const name of skills) if (!dry) rmSync(at(join(OLD_SKILLS_DIR, name)), { recursive: true, force: true })
if (skills.length) done.push(`removed ${skills.length} kit skills from ${OLD_SKILLS_DIR}/`)
if (existsSync(at(OLD_SKILLS_DIR))) {
  const own = dry ? readdirSync(at(OLD_SKILLS_DIR)).filter((n) => !OLD_SKILLS.includes(n)) : readdirSync(at(OLD_SKILLS_DIR))
  if (own.length) kept.push(`${OLD_SKILLS_DIR}/${own.join(', ')} (the repo's own)`)
  else prune(OLD_SKILLS_DIR)
}
const docs = OLD_DOCS.filter((name) => exists(join(OLD_DOCS_DIR, name)))
for (const name of docs) if (!dry) rmSync(at(join(OLD_DOCS_DIR, name)))
if (docs.length) done.push(`removed ${docs.length} guides from ${OLD_DOCS_DIR}/`)
prune(OLD_DOCS_DIR)

// 4. Tools and workflows the kit installed.
for (const rel of [...OLD_TOOLS, ...OLD_WORKFLOWS]) remove(rel)
prune('tools')
remove('.env.example')

// 5. npm scripts that ran the kit. A package.json with nothing else left goes with them.
if (exists('package.json')) {
  const pkg = JSON.parse(readFileSync(at('package.json'), 'utf8'))
  const ranKit = (cmd) => typeof cmd === 'string' && (cmd.includes(OLD_KIT_DIR) || OLD_TOOLS.some((t) => cmd.includes(t)) || /node --test "tools\/\*\*/.test(cmd))
  const gone = OLD_SCRIPTS.filter((name) => ranKit(pkg.scripts?.[name]))
  for (const name of gone) delete pkg.scripts[name]
  if (pkg.scripts && !Object.keys(pkg.scripts).length) delete pkg.scripts
  // Games used to be npm workspaces so the template's Vite could build them; each Vite game has its own packages now.
  const viteGames = listGames().filter((g) => g.rel && existsSync(join(g.dir, 'package.json')))
  if (gone.length) done.push(`package.json: removed the scripts ${gone.join(', ')}`)
  const template = pkg.name === `${brand.slug}-games` || /show up in \w+ on your handheld/.test(pkg.description ?? '')
  const leftover = Object.keys(pkg).filter((k) => !['name', 'private', 'type', 'description', 'engines', 'workspaces', 'devDependencies'].includes(k))
  if (template && !leftover.length && !viteGames.length && listGames().every((g) => g.rel)) {
    remove('package.json')
    remove('package-lock.json')
    remove('node_modules', 'node_modules/')
  } else if (gone.length && !dry) writeFileSync(at('package.json'), JSON.stringify(pkg, null, 2) + '\n')
}

// 6. Manifests pointed at the schema inside the kit's copy.
for (const game of listGames()) {
  const manifest = JSON.parse(readFileSync(game.manifestPath, 'utf8'))
  if (typeof manifest.$schema !== 'string' || !manifest.$schema.includes(OLD_KIT_DIR)) continue
  if (!dry) writeFileSync(game.manifestPath, JSON.stringify({ ...manifest, $schema: MANIFEST_SCHEMA_URL }, null, 2) + '\n')
  done.push(`${game.rel ? game.rel + '/' : ''}${game.manifestPath.split(/[\\/]/).pop()}: $schema now points at the published schema`)
}

// 7. The one file that builds the games from now on.
const current = exists(WORKFLOW_FILE) ? readFileSync(at(WORKFLOW_FILE), 'utf8') : null
if (current !== callerWorkflow()) {
  if (!dry) {
    mkdirSync(dirname(at(WORKFLOW_FILE)), { recursive: true })
    writeFileSync(at(WORKFLOW_FILE), callerWorkflow())
  }
  done.push(`${WORKFLOW_FILE}: now calls the shared build`)
}

if (!done.length) log('Nothing to do: this repo holds no copy of the build kit.')
else {
  log(dry ? 'Would do:' : 'Done:')
  for (const line of done) log(`  ✓ ${line}`)
  for (const line of kept) log(`  – kept ${line}`)
  if (!dry) log(`\nRun \`${CMD} check\`, then commit. From now on the games are built by the shared build; there is nothing in this repo to update.`)
}
