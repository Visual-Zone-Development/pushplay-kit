// node <kit>/check.mjs [game-id ...]
// Validates, builds, plays (headless: controller, keyboard-only, touch-only, mouse-only, a denser
// 1280×720 @2× screen, and for phone games a touch-only phone at 3×) and renders art for games.
// With no ids, checks every game. Exit code 1 if any game has errors.
// Without a headless browser (its download blocked), the static checks still run and the rest is
// skipped with a note; KIT_BROWSER=/path/to/chrome uses an installed browser instead.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ART, brand, CHECK_RUN_MS, CMD, DOCS_URL, MANIFEST_FILE, VIEWPORT, VIEWPORT_PHONE } from './config.mjs'
import { display, listGames, log, layout, ROOT } from './repo.mjs'
import { ART_DIR, buildGame, launchBrowser } from './pipeline.mjs'

/** "a, b and c". */
const list = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0])

const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const games = listGames()
if (!games.length) {
  log(`There is no ${MANIFEST_FILE} here, so there is nothing to check yet.`)
  log(`  A game you already have (any engine): add a ${MANIFEST_FILE} at the top of the repo. ${DOCS_URL}`)
  log(`  A new JavaScript game: ${CMD} new-game <id>`)
  process.exit(1)
}
const selected = wanted.length ? games.filter((g) => wanted.includes(g.id)) : games
const unknown = wanted.filter((id) => !games.some((g) => g.id === id))
if (unknown.length) {
  log(`Unknown game(s): ${unknown.join(', ')}. Games: ${games.map((g) => g.id).join(', ')}`)
  process.exit(1)
}

let browser = null
try {
  browser = await launchBrowser()
} catch (err) {
  log(`⚠ No headless browser (${String(err.message).split('\n')[0]}).`)
  log(`  Static checks only. Run \`${CMD} setup\` to install one, or set KIT_BROWSER to a Chrome/Chromium executable.`)
}
let failed = 0
for (const game of selected) {
  log(`\n▶ ${game.id}`)
  try {
    const result = await buildGame(game, browser, { pack: false })
    for (const w of result.warnings) log(`  ⚠ ${w}`)
    if (result.fromRelease) {
      log(`  ✓ ${MANIFEST_FILE} is fine. Connect GitHub in ${brand.name} and watch this repo to play the newest release.`)
      continue
    }
    if (result.skipped) {
      log('  ✓ builds (not played: no browser)')
      if (result.share?.length) log(`  Before you share it, give it ${list(result.share)}.`)
      continue
    }
    // Outside the repo (nothing the check does leaves files in it), so the full path.
    const art = (name) => join(result.out, ART_DIR, `${name}.png`)
    log(`  ✓ ${result.platforms.includes('web') ? 'playable' : 'packaged'}. Look at the art${result.platforms.includes('web') ? ' and screenshot' : ''} to make sure ${result.platforms.includes('web') ? 'they look' : 'it looks'} right:`)
    log(`    ${art('cover')}  (library tile, ${ART.cover.width}×${ART.cover.height})`)
    log(`    ${art('hero')}  (detail banner, ${ART.hero.width}×${ART.hero.height})`)
    if (result.platforms.includes('web')) log(`    ${art('screenshot')}  (the game after ${CHECK_RUN_MS / 1000}s at ${VIEWPORT.width}×${VIEWPORT.height})`)
    if (result.share?.length) log(`  Before you share it, give it ${list(result.share)}.`)
    const phone = result.manifest.phone?.orientation
    for (const o of phone === 'any' ? ['portrait', 'landscape'] : phone ? [phone] : []) {
      const v = VIEWPORT_PHONE[o]
      log(`    ${art(`screenshot-phone-${o}`)}  (on a ${o} phone, ${v.width}×${v.height} @${v.deviceScaleFactor}x, touch only)`)
    }
  } catch (err) {
    failed++
    log(`  ✗ ${String(err.message).replaceAll('\n', '\n  ✗ ')}`)
  }
}
await browser?.close()
log(failed ? `\n${failed} of ${selected.length} game(s) need fixes.` : `\nAll ${selected.length} game(s) passed.`)
process.exit(failed ? 1 : 0)
