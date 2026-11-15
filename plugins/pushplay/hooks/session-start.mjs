#!/usr/bin/env node
// Runs when a session starts. A PushPlay game repo carries no agent instructions of its own, so
// when the folder holds a PushPlay game this says so and names the skill with the rules. In any
// other folder it prints nothing.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** What to tell the agent about `root`, or '' when it isn't a PushPlay game repo. */
export function notice(root) {
  const games = []
  if (existsSync(join(root, 'pushplay.json'))) games.push('.')
  const dir = join(root, 'games')
  if (existsSync(dir)) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && existsSync(join(dir, entry.name, 'pushplay.json'))) games.push(`games/${entry.name}`)
    }
  }
  if (!games.length) return ''
  const what = games.length === 1 && games[0] === '.' ? 'This repo is a PushPlay game (pushplay.json at its root).' : games.length ? `This repo is a PushPlay workshop with ${games.length} game${games.length === 1 ? '' : 's'} in games/.` : 'This repo was set up for PushPlay games.'
  const lines = [
    `${what} The repo carries no instructions of its own: before making, changing, checking or publishing a game here, load the pushplay-rules skill. It has the rules every PushPlay game follows, the \`pushplay\` command (check, dev, new-game) and which skill to use for what.`
  ]
  return lines.join('\n')
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const text = notice(process.env.CLAUDE_PROJECT_DIR ?? process.cwd())
  if (text) console.log(text)
}
