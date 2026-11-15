// The art generator must never call a paid image API before the person paying has agreed to the cost.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { MANIFEST_FILE } from '../config.mjs'

const ID = 'art-approval'
const FAKE_FETCH = join(import.meta.dirname, 'fake-fetch.test-helper.mjs')
let root

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'kit-art-'))
  mkdirSync(join(root, 'games', ID, 'art'), { recursive: true })
  writeFileSync(join(root, 'games', ID, MANIFEST_FILE), JSON.stringify({ id: ID, name: ID, entry: { web: 'index.html' } }))
  writeFileSync(join(root, 'games', ID, 'art', 'prompts.json'), JSON.stringify({ style: 'Test style.', quality: 'medium', assets: [{ id: 'rock' }, { id: 'tree' }] }))
})

/** Runs the generator with a fake OpenAI key and a fetch that records calls; stdin is a pipe, as for an agent. */
function art(...args) {
  const env = { ...process.env, OPENAI_API_KEY: 'not-a-real-key', KIT_REPO_ROOT: root, KIT_WORK_DIR: join(root, '.work') }
  for (const k of ['GEMINI_API_KEY', 'REPLICATE_API_TOKEN', 'ART_PROVIDER']) delete env[k]
  const r = spawnSync(process.execPath, ['--import', FAKE_FETCH, join(import.meta.dirname, 'generate.mjs'), ID, ...args], { env, cwd: root, encoding: 'utf8' })
  return { code: r.status, out: r.stdout + r.stderr, called: r.stdout.includes('FAKE-FETCH') }
}

describe('generating art with the maker’s own image key', () => {
  it('without --approve it shows the cost, asks for agreement and calls nothing', () => {
    const r = art()
    expect(r.code, r.out).toBe(2)
    expect(r.called).toBe(false)
    expect(r.out).toMatch(/about \$0\.10/)
    expect(r.out).toMatch(/Nothing was charged/)
    expect(r.out).toMatch(/--approve 0\.10/)
    expect(existsSync(join(root, 'games', ID, 'assets', 'art'))).toBe(false)
  })

  it('an --approve amount below the estimate is refused and calls nothing', () => {
    const r = art('--approve', '0.05')
    expect(r.code).toBe(2)
    expect(r.called).toBe(false)
    expect(r.out).toMatch(/more than the \$0\.05 approved/)
  })

  it('--dry shows the prompts and the cost and calls nothing', () => {
    const r = art('--dry')
    expect(r.code).toBe(0)
    expect(r.called).toBe(false)
    expect(r.out).toMatch(/Nothing was generated or charged/)
  })

  it('an --approve amount that covers the estimate goes ahead and calls the provider', () => {
    expect(art('--approve', '$0.10').called).toBe(true)
  })
})
