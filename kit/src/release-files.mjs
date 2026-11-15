// A game whose manifest has "release" plays from the repo's normal GitHub releases: nothing is
// built for it. This finds which file of a release is which platform's build, and (in the shared
// build, when a release is published) fetches and unpacks them so the kit can check and package
// them like any other build:
//   node <kit>/release-files.mjs        (CI only; needs the `gh` CLI and GH_TOKEN)
// The matching here is the launcher's (packages/shared/src/library.ts and manifest.ts), so a
// game gets the same files with or without the workflow.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brand } from './config.mjs'

export const PLATFORMS = ['web', 'linux-x64', 'linux-arm64', 'windows-x64', 'darwin-arm64', 'darwin-x64']

/** Zips in a release that aren't builds of the game. */
const NOT_A_BUILD = new Set(['src', 'source', 'sources', 'symbols', 'symbol', 'debug', 'pdb', 'dsym', 'server', 'dedicated'])

/** The platforms an ordinary build name points at, from words like "linux", "win64" or "macos-arm64". */
function platformsFromName(name) {
  const words = new Set(name.toLowerCase().replace(/\.zip$/, '').split(/[^a-z0-9]+/))
  const has = (...w) => w.some((x) => words.has(x))
  const arm = has('arm64', 'aarch64', 'arm', 'applesilicon')
  const intel = has('x64', 'amd64', 'x86', 'intel')
  if (has('web', 'html', 'html5', 'browser', 'webgl', 'wasm')) return ['web']
  if (has('win', 'win32', 'win64', 'windows')) return ['windows-x64']
  if (has('mac', 'macos', 'osx', 'darwin', 'apple', 'applesilicon')) {
    if (arm && !intel) return ['darwin-arm64']
    if (intel && !arm && !has('universal')) return ['darwin-x64']
    return ['darwin-arm64', 'darwin-x64']
  }
  if (has('linux', 'linux64', 'steamos', 'deck', 'steamdeck', 'appimage', 'x11')) return arm ? ['linux-arm64'] : ['linux-x64']
  return []
}

/** Whether a release file name matches a "release" entry (`*` is any run of characters; case is ignored). */
export function matchesReleaseFile(pattern, name) {
  const re = new RegExp('^' + pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i')
  return re.test(name)
}

/**
 * Which file of a release is each platform's build: { platform: fileName }. `release` is the
 * manifest's value: `true` goes by the names, an object names the files.
 */
export function releaseFilesFor(release, names) {
  const found = {}
  if (release && typeof release === 'object') {
    for (const platform of PLATFORMS) {
      const name = release[platform] && names.find((n) => matchesReleaseFile(release[platform], n))
      if (name) found[platform] = name
    }
    return found
  }
  for (const p of PLATFORMS) if (names.includes(`${brand.assetPrefix ?? `${brand.slug}-`}${p}.zip`)) found[p] = `${brand.assetPrefix ?? `${brand.slug}-`}${p}.zip`
  const zips = names.filter((n) => /\.zip$/i.test(n) && !n.toLowerCase().split(/[^a-z0-9]+/).some((w) => NOT_A_BUILD.has(w)))
  for (const name of zips) for (const p of platformsFromName(name)) found[p] ??= name
  return found
}

/** A zip that holds one folder and nothing else is that folder. */
function unwrap(dir) {
  const entries = readdirSync(dir)
  return entries.length === 1 && statSync(join(dir, entries[0])).isDirectory() ? join(dir, entries[0]) : dir
}

/** Where a game's files from a release are unpacked, per platform (null when they weren't fetched). */
export function releaseFolder(workDir, id, platform) {
  const dir = join(workDir, 'from-release', id, platform)
  return existsSync(dir) ? unwrap(dir) : null
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { listGames, log, readManifest, ROOT, WORK_DIR } = await import('./repo.mjs')
  const repo = process.env.GITHUB_REPOSITORY
  const gh = (...args) => execFileSync('gh', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const games = listGames().filter((game) => {
    try {
      return Boolean(readManifest(game).release)
    } catch {
      return false
    }
  })
  if (!games.length) {
    log('No game here plays from the repo\'s releases ("release" in its manifest); nothing to fetch.')
    process.exit(0)
  }
  // The release that was just published, or (run by hand) the newest one that isn't a prerelease.
  let tag = process.env.RELEASE_TAG_NAME
  if (!tag) {
    try {
      tag = JSON.parse(gh('api', `repos/${repo}/releases/latest`)).tag_name
    } catch {
      log(`${repo} has no published release yet, so there are no game files to fetch.`)
      process.exit(0)
    }
  }
  const names = JSON.parse(gh('release', 'view', tag, '--repo', repo, '--json', 'assets')).assets.map((a) => a.name)
  for (const game of games) {
    const files = releaseFilesFor(readManifest(game).release, names)
    if (!Object.keys(files).length) {
      log(`${game.id}: release ${tag} has no file that matches "release" in its manifest (files: ${names.join(', ') || 'none'})`)
      continue
    }
    for (const [platform, name] of Object.entries(files)) {
      const dir = join(WORK_DIR, 'from-release', game.id, platform)
      const tmp = join(WORK_DIR, 'from-release', '.download')
      rmSync(dir, { recursive: true, force: true })
      rmSync(tmp, { recursive: true, force: true })
      mkdirSync(dir, { recursive: true })
      gh('release', 'download', tag, '--repo', repo, '--pattern', name, '--dir', tmp)
      const unzip = spawnSync('unzip', ['-q', join(tmp, name), '-d', dir], { encoding: 'utf8' })
      if (unzip.status !== 0) {
        log(`${game.id}: couldn't unpack ${name}: ${unzip.stderr.trim()}`)
        rmSync(dir, { recursive: true, force: true })
        continue
      }
      log(`${game.id}: ${platform} from ${name} (${tag})`)
    }
  }
}
