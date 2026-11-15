// <kit> dev <game-id> [--host]
// Serves a game with live reload at http://localhost:5173 for playing in a browser.
// --host also listens on the LAN, to try the game on a phone or a handheld on the same Wi-Fi.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { CMD, LOCAL_RELAY_PORT } from './config.mjs'
import { startLocalRelay } from './local-relay.mjs'
import { findGame, listGames, log, readManifest, ROOT } from './repo.mjs'

const args = process.argv.slice(2)
const host = args.includes('--host')
const wanted = args.find((a) => !a.startsWith('--'))
const games = listGames()
const game = wanted ? findGame(wanted) : games.length === 1 ? games[0] : undefined
if (!game) {
  log(`Usage: ${CMD} dev <game-id> [--host]   (games: ${games.map((g) => g.id).join(', ') || 'none yet'})`)
  process.exit(1)
}
// Online games find this relay on their own when served from localhost: open two browser
// windows to play against yourself. Party games' relay also listens on the Wi-Fi, so phones
// can scan the QR code on the game's lobby screen.
const manifest = readManifest(game)
if (manifest.online || manifest.party) {
  await startLocalRelay(LOCAL_RELAY_PORT, { lan: Boolean(manifest.party) }).then(
    (r) =>
      log(
        manifest.party
          ? `Local party relay: phones on this Wi-Fi join at ${r.joinBase} (or scan the QR code in the game's lobby)`
          : `Local online relay on ws://localhost:${LOCAL_RELAY_PORT} (open the game in two windows to test online play)`
      ),
    (err) => log(`Couldn't start the local relay on port ${LOCAL_RELAY_PORT}: ${err.message}`)
  )
}
// A game with its own Vite (it has a build) is served by that one, so its config and plugins
// apply; any other game by the kit's, so a game repo needs nothing installed to be played.
const own = [game.dir, ROOT].map((dir) => join(dir, 'node_modules/vite/bin/vite.js')).find((file) => existsSync(file))
const vite = own ?? join(dirname(createRequire(import.meta.url).resolve('vite/package.json')), 'bin/vite.js')
const child = spawn(process.execPath, [vite, game.dir, '--port', '5173', ...(host ? ['--host'] : [])], { cwd: own ? ROOT : game.dir, stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))
