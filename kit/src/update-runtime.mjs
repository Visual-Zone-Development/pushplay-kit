// <kit> update-runtime
// Brings the runtime modules in every game (input.js, menu.js, fit.js, …) up to this kit's: files
// that carry the runtime header are replaced, missing ones are added, and a file the game wrote
// itself under the same name is left alone (with a note).
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { brand, CMD, KIT_VERSION, ONLINE_RUNTIME_FILES, PARTY_RUNTIME_FILES, RUNTIME_FILES, RUNTIME_HEADER_RE } from './config.mjs'
import { listGames, log } from './repo.mjs'

/** Runtime files that old kits shipped without a header; games forked them, so they're replaced anyway. */
const LEGACY_RUNTIME = new Set(['input.js', 'menu.js', 'net.js', 'lobby.js'])
const templates = join(import.meta.dirname, 'templates')
// In the source the templates carry the product name as a placeholder; a packed kit has it filled in.
const fresh = (group, file) => readFileSync(join(templates, group, file), 'utf8').replaceAll('{{SLUG}}', brand.slug).replaceAll('{{BRAND}}', brand.name)

const replaced = []
const added = []
const forked = []
const kept = []
for (const game of listGames()) {
  const codeDir = existsSync(join(game.dir, 'src/game.js')) ? join(game.dir, 'src') : game.dir
  if (!RUNTIME_FILES.some((f) => existsSync(join(codeDir, f)))) continue // not built on the runtime: leave it alone
  // Party games (they have party.js) get the party modules too; online games (net.js) the online ones
  // (a party game's net.js as well: party.js builds on it; its lobby is party-lobby.js).
  const party = existsSync(join(codeDir, 'party.js'))
  const online = existsSync(join(codeDir, 'net.js'))
  const onlineFiles = online ? ONLINE_RUNTIME_FILES.filter((f) => f === 'net.js' || existsSync(join(codeDir, f))) : []
  const files = [...RUNTIME_FILES.map((f) => ['shared', f]), ...(party ? PARTY_RUNTIME_FILES.map((f) => ['party', f]) : []), ...onlineFiles.map((f) => ['online', f])]
  for (const [group, file] of files) {
    const dest = join(codeDir, file)
    const text = fresh(group, file)
    const rel = `${game.rel ? game.rel + '/' : ''}${codeDir === game.dir ? '' : 'src/'}${file}`
    if (!existsSync(dest)) {
      writeFileSync(dest, text)
      added.push(rel)
      continue
    }
    const current = readFileSync(dest, 'utf8')
    if (current === text) continue
    if (RUNTIME_HEADER_RE.test(current)) {
      writeFileSync(dest, text)
      replaced.push(rel)
    } else if (LEGACY_RUNTIME.has(file)) {
      writeFileSync(dest, text)
      forked.push(rel)
    } else kept.push(rel)
  }
}
if (replaced.length) log(`✓ replaced: ${replaced.join(', ')}`)
if (added.length) log(`✓ added: ${added.join(', ')}`)
if (forked.length) {
  log(`⚠ replaced without a runtime header (an old kit's copy, or hand-edited): ${forked.join(', ')}`)
  log(`  game-specific key aliases go through input.extendKeys({ KeyR: 'y' }) in game.js; re-add any other local changes there`)
}
if (kept.length) log(`⚠ kept (the game's own file shares a runtime name): ${kept.join(', ')}`)
if (!replaced.length && !added.length && !forked.length) log(`The runtime files are already those of kit v${KIT_VERSION}.`)
else log(`\nRuntime files are now those of kit v${KIT_VERSION}. Run \`${CMD} check\`, then commit.`)
