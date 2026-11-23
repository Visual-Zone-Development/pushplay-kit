// Checks every skill in plugins/*/skills against the rules in docs/writing-skills.md.
// Usage: node scripts/lint-skills.mjs [repo-root]   (exits 1 when it finds problems)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const TEXT = /\.(md|mjs|js|json|html|css|txt)$/
const FRONTMATTER_KEYS = ['name', 'description']

// Anywhere in the repo: paths that only exist in one agent's layout or in the old template.
const BANNED_EVERYWHERE = [
  [/\.claude\/skills\/[\w<*]/, 'path into .claude/skills (use a path relative to the skill folder)'],
  [/docs\/game-design/, 'docs/game-design path (the docs live in skill references/ folders)'],
  [/AskUserQuestion/, 'names one agent\'s question tool (say "ask the user")'],
]

// In game-craft only: anything that ties a general skill to PushPlay.
const BANNED_IN_GENERAL = [
  [/pushplay/i, 'PushPlay'],
  [/npm run /, 'npm run command'],
  [/\b(input|menu|fit|audio|save|settings|prompts|touch|net|lobby|party|controller)\.js\b/, 'kit runtime file name'],
  [/\.github\//, '.github path'],
  [/\blauncher\b/i, 'launcher'],
  [/Steam Deck|Legion Go|\bDeck\b/, 'device name'],
  [/1280\s*[×x]\s*800/, 'the kit\'s logical resolution'],
  [/\b(fitCanvas|drawPrompts|createMenu|createSave|createSettings|createSettingsScreen|createAudio|createTouchControls)\b/, 'kit API'],
  [/\binput\.(label|stickLabel|dpadLabel|extendKeys|requestMenu|onPause|attach|pads|gamingMode)\b/, 'kit input API'],
  [/\b(settings|save)\.data\b/, 'kit settings/save API'],
  [/\baudio\.(tone|noise|play|load|setVolume)\b/, 'kit audio API'],
  [/window\.__game/, 'the kit\'s debug hook'],
]

// In a craft skill of game-craft: terms that only exist in a browser. They belong under a heading
// that says the part is about the web (docs/writing-skills.md), so a reader with another engine
// can stop before it. Stack skills are about one technology and may use them anywhere.
const STACK_SKILLS = ['canvas2d-assets', 'threejs-models', 'character-models', 'babylonjs-scenes']
const WEB_ONLY = [
  [/\bPlaywright\b/, 'Playwright'],
  [/\blocalStorage\b/, 'localStorage'],
  [/\bnavigator\./, 'navigator.'],
  [/\brequestAnimationFrame\b/, 'requestAnimationFrame'],
  [/\bDevTools\b/, 'DevTools'],
  [/\bAudioContext\b|\bWeb Audio\b/, 'Web Audio'],
  [/\bdocument\.|\baddEventListener\b/, 'DOM API'],
  [/\bVite\b/, 'Vite'],
  [/\bnpm (install|i|run|ci)\b/, 'npm command']
]
const WEB_HEADING = /\b(web|browser|canvas|three\.js|javascript)\b/i

/** Lines of a craft skill's SKILL.md that use a browser-only term outside a web section. */
export function webOnlyOutsideWebSections(text) {
  const found = []
  let inWeb = false
  let level = 0
  text.split(/\r?\n/).forEach((line, i) => {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      // A web section lasts until the next heading of the same or a higher level.
      if (inWeb && heading[1].length > level) return
      inWeb = WEB_HEADING.test(heading[2])
      level = heading[1].length
      return
    }
    if (inWeb) return
    for (const [pattern, what] of WEB_ONLY) if (pattern.test(line)) found.push([i + 1, what])
  })
  return found
}

// In the PushPlay plugin: what game repos don't have.
const BANNED_IN_PLATFORM = [
  [/npm run (check|dev|new-game|update-kit|art|art:shots|promote|setup)\b/, 'npm script game repos don\'t have (write the pushplay command)'],
  [/\.github\/pushplay/, 'the build kit\'s old folder inside a repo (the kit runs from outside it)']
]

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(path))
    else out.push(path)
  }
  return out
}

export function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text)
  if (!match) return null
  const fields = {}
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line)
    if (kv) fields[kv[1]] = kv[2].trim()
  }
  return fields
}

export function listSkills(root) {
  const skills = []
  const pluginsDir = join(root, 'plugins')
  if (!existsSync(pluginsDir)) return skills
  for (const plugin of readdirSync(pluginsDir).sort()) {
    const skillsDir = join(pluginsDir, plugin, 'skills')
    if (!existsSync(skillsDir)) continue
    for (const name of readdirSync(skillsDir).sort()) {
      const dir = join(skillsDir, name)
      if (statSync(dir).isDirectory()) skills.push({ plugin, name, dir, skillsDir })
    }
  }
  return skills
}

function checkLinks(file, text, skillsDir, problems, where) {
  const body = text.replace(/```[\s\S]*?```/g, '')
  for (const match of body.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1].split('#')[0]
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue
    const path = resolve(dirname(file), target)
    if (!path.startsWith(skillsDir + sep)) problems.push(`${where}: link leaves the plugin's skills folder: ${match[1]}`)
    else if (!existsSync(path)) problems.push(`${where}: broken link: ${match[1]}`)
  }
}

export function lint(root) {
  const problems = []
  const seen = new Map()
  for (const skill of listSkills(root)) {
    const id = `${skill.plugin}/${skill.name}`
    if (seen.has(skill.name)) problems.push(`${id}: skill name also used in ${seen.get(skill.name)}`)
    seen.set(skill.name, skill.plugin)

    const skillFile = join(skill.dir, 'SKILL.md')
    if (!existsSync(skillFile)) { problems.push(`${id}: no SKILL.md`); continue }
    const fields = parseFrontmatter(readFileSync(skillFile, 'utf8'))
    if (!fields) problems.push(`${id}: SKILL.md has no frontmatter`)
    else {
      if (fields.name !== skill.name) problems.push(`${id}: frontmatter name is "${fields.name}"`)
      if (!fields.description) problems.push(`${id}: frontmatter has no description`)
      // Unquoted YAML: a colon followed by a space, or a space followed by #, ends the value or breaks strict parsers.
      else if (!/^["']/.test(fields.description) && /: | #/.test(fields.description)) problems.push(`${id}: description has ": " or " #" in it, which strict YAML parsers reject (reword it)`)
      for (const key of Object.keys(fields)) {
        if (!FRONTMATTER_KEYS.includes(key)) problems.push(`${id}: frontmatter key "${key}" is not portable`)
      }
    }

    for (const file of walk(skill.dir)) {
      // A skill's own tests aren't shipped to game repos and name the layouts they test.
      if (!TEXT.test(file) || file.endsWith('.test.mjs')) continue
      const where = `${skill.plugin}/${relative(skill.skillsDir, file).split(sep).join('/')}`
      const text = readFileSync(file, 'utf8')
      const banned =
        skill.plugin === 'game-craft'
          ? [...BANNED_EVERYWHERE, ...BANNED_IN_GENERAL]
          : [...BANNED_EVERYWHERE, ...BANNED_IN_PLATFORM]
      text.split(/\r?\n/).forEach((line, i) => {
        for (const [pattern, what] of banned) {
          if (pattern.test(line)) problems.push(`${where}:${i + 1}: ${what}`)
        }
      })
      if (skill.plugin === 'game-craft' && !STACK_SKILLS.includes(skill.name) && file === skillFile) {
        for (const [line, what] of webOnlyOutsideWebSections(text)) problems.push(`${where}:${line}: ${what} outside a web section (put browser-only parts under a heading that names the web)`)
      }
      if (file.endsWith('.md')) checkLinks(file, text, skill.skillsDir, problems, where)
    }
  }
  return problems
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..'))
  const only = process.argv[3]
  const problems = lint(root).filter((p) => !only || p.startsWith(only))
  for (const problem of problems) console.log(problem)
  console.log(problems.length ? `\n${problems.length} problem(s)` : 'skills OK')
  process.exit(problems.length ? 1 : 0)
}
