// npm run kit:build   (node kit/src/zip.mjs [--out /abs/path/kit.zip] [--publish /abs/path/to/repo])
// Packs the kit as it runs from outside a game repo (kit.zip: kit/ and kit.json with { kit, hash })
// and writes the files this repo publishes from it: kit.zip next to the command line that unpacks
// it, the shared build workflow, the workflow file a game repo keeps, and the manifest schema.
// Run it after changing anything in kit/; a test fails while the published files are behind.
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { KIT_VERSION, KIT_ZIP_PATH } from './config.mjs'
import { kitHash } from './hash.mjs'
import { kitTree, published } from './kit.mjs'

const args = process.argv.slice(2)
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const publish = resolve(option('--publish') ?? join(import.meta.dirname, '../..'))
const out = resolve(option('--out') ?? join(publish, KIT_ZIP_PATH))

const stage = mkdtempSync(join(tmpdir(), 'kit-zip-'))
try {
  const tree = kitTree()
  for (const [rel, contents] of Object.entries(tree)) {
    const dest = join(stage, 'kit', rel)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, contents)
  }
  writeFileSync(join(stage, 'kit.json'), JSON.stringify({ kit: KIT_VERSION, hash: kitHash() }, null, 2) + '\n')

  mkdirSync(dirname(out), { recursive: true })
  rmSync(out, { force: true })
  const zip = spawnSync('zip', ['-qr', '-X', out, '.'], { cwd: stage, encoding: 'utf8' })
  if (zip.status !== 0) {
    console.error(`zip failed: ${zip.stderr}`)
    process.exit(1)
  }
  console.log(`Wrote ${out} (kit v${KIT_VERSION})`)

  if (!option('--out')) {
    for (const [rel, contents] of Object.entries(published(tree))) {
      mkdirSync(dirname(join(publish, rel)), { recursive: true })
      writeFileSync(join(publish, rel), contents)
      console.log(`Wrote ${rel}`)
    }
  }
} finally {
  rmSync(stage, { recursive: true, force: true })
}
