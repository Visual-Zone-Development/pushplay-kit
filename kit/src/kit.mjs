import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { brand, BETA_RELEASE_TAG, BUILD_WORKFLOW, DOCS_URL, KIT_ZIP_PATH, RELEASE_TAG, WORKFLOW_FILE } from './config.mjs'
import { callerWorkflow } from './workflow.mjs'

export { callerWorkflow }

const SRC = import.meta.dirname
const PKG = join(SRC, '..')
/** Files that pack or pin the kit, or ship beside it and not in it. */
const NOT_SHIPPED = new Set(['kit.mjs', 'zip.mjs', 'hash.mjs', 'build.yml', 'kit-lock.json'])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (!name.endsWith('.test.mjs') && !name.endsWith('.test-helper.mjs') && !NOT_SHIPPED.has(name)) out.push(full)
  }
  return out
}

const kitPackage = () => JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'))

/** The shared build, published at .github/workflows/build.yml and called by every game repo. */
export const buildWorkflow = () =>
  readFileSync(join(SRC, 'build.yml'), 'utf8')
    .replaceAll('{{NAME}}', brand.name)
    .replaceAll('{{SLUG}}', brand.slug)
    .replaceAll('{{RELEASE_TAG}}', RELEASE_TAG)
    .replaceAll('{{BETA_RELEASE_TAG}}', BETA_RELEASE_TAG)
    .replaceAll('{{BUILD_WORKFLOW}}', BUILD_WORKFLOW)
    .replaceAll('{{PLUGIN_REPO}}', brand.pluginRepo)
    .replaceAll('{{BUILD_REF}}', brand.buildRef)
    .replaceAll('{{KIT_ZIP}}', KIT_ZIP_PATH)
    .replaceAll('{{DOCS_URL}}', DOCS_URL)
    .replaceAll('{{PLAYWRIGHT}}', kitPackage().dependencies.playwright)

/** Everything a game repo keeps for builds, as { repoRelativePath: contents }: one workflow file. */
export function kitFiles() {
  return { [WORKFLOW_FILE]: callerWorkflow() }
}

/**
 * The kit as it runs, as { pathInsideTheKit: contents }: its scripts, the runtime templates (with
 * the product name filled in from brand.json), its package.json and lockfile.
 */
export function kitTree() {
  const files = {}
  for (const file of walk(SRC)) {
    const rel = relative(SRC, file).split('\\').join('/')
    const text = readFileSync(file, 'utf8')
    files[rel] = rel.startsWith('templates/') ? text.replaceAll('{{SLUG}}', brand.slug).replaceAll('{{BRAND}}', brand.name) : text
  }
  files['package.json'] = readFileSync(join(PKG, 'package.json'), 'utf8')
  files['package-lock.json'] = readFileSync(join(PKG, 'package-lock.json'), 'utf8')
  return files
}

/** The text files this repo publishes from the kit, as { repoRelativePath: contents }. */
export function published(tree = kitTree()) {
  return {
    '.github/workflows/build.yml': buildWorkflow(),
    'docs/workflow.yml': callerWorkflow(),
    'schema/manifest.schema.json': tree['manifest.schema.json']
  }
}
