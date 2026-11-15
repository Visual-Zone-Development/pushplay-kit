import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { brand, BETA_RELEASE_TAG, BUILD_WORKFLOW, DOCS_URL, RELEASE_TAG } from './config.mjs'

/** The one workflow file a game repo keeps: it calls the shared build. */
export function callerWorkflow() {
  return readFileSync(join(import.meta.dirname, 'workflow.yml'), 'utf8')
    .replaceAll('{{NAME}}', brand.name)
    .replaceAll('{{SLUG}}', brand.slug)
    .replaceAll('{{RELEASE_TAG}}', RELEASE_TAG)
    .replaceAll('{{BETA_RELEASE_TAG}}', BETA_RELEASE_TAG)
    .replaceAll('{{BUILD_WORKFLOW}}', BUILD_WORKFLOW)
    .replaceAll('{{DOCS_URL}}', DOCS_URL)
}
