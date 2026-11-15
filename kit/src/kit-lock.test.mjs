// kit-lock.json pins a hash of everything the kit ships. When the kit changes, KIT_VERSION must
// change with it (game repos compare it to tell whether their kit is outdated), and the lock is
// refreshed with: npm run kit:lock
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { KIT_VERSION, KIT_ZIP_PATH } from './config.mjs'
import { published } from './kit.mjs'
import { kitHash } from './hash.mjs'

const lockFile = join(import.meta.dirname, 'kit-lock.json')

describe('kit-lock', () => {
  it('matches the shipped files, and KIT_VERSION was bumped when they changed', () => {
    const hash = kitHash()
    const lock = existsSync(lockFile) ? JSON.parse(readFileSync(lockFile, 'utf8')) : { kit: 0, hash: '' }
    if (process.env.UPDATE_KIT_LOCK) {
      // UPDATE_KIT_LOCK=force re-locks without a bump: for more changes to a version that hasn't shipped yet.
      if (hash !== lock.hash && KIT_VERSION === lock.kit && process.env.UPDATE_KIT_LOCK !== 'force') {
        throw new Error(`the kit's files changed but KIT_VERSION is still ${KIT_VERSION}: bump it in config.mjs first (or UPDATE_KIT_LOCK=force if v${KIT_VERSION} hasn't shipped yet)`)
      }
      writeFileSync(lockFile, JSON.stringify({ kit: KIT_VERSION, hash }, null, 2) + '\n')
      return
    }
    const hint = 'bump KIT_VERSION in config.mjs (if not done yet) and run: npm run kit:lock'
    expect(hash, `the kit's shipped files changed (templates/, *.mjs, workflow, schemas, brand): ${hint}`).toBe(lock.hash)
    expect(KIT_VERSION, `KIT_VERSION (${KIT_VERSION}) differs from kit-lock.json (${lock.kit}): ${hint}`).toBe(lock.kit)
  })

  it('the files this repo publishes from the kit are up to date (npm run kit:build)', () => {
    const repo = join(import.meta.dirname, '../..')
    const hint = 'run: npm run kit:build'
    for (const [rel, contents] of Object.entries(published())) expect(readFileSync(join(repo, rel), 'utf8'), `${rel} is behind the kit: ${hint}`).toBe(contents)
    const bundled = JSON.parse(execFileSync('unzip', ['-p', join(repo, KIT_ZIP_PATH), 'kit.json'], { encoding: 'utf8' }))
    expect(bundled, `${KIT_ZIP_PATH} is behind the kit: ${hint}`).toEqual({ kit: KIT_VERSION, hash: kitHash() })
  })
})
