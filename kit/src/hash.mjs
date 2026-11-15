import { createHash } from 'node:crypto'
import { WORKFLOW_FILE } from './config.mjs'
import { buildWorkflow, callerWorkflow, kitTree } from './kit.mjs'

/**
 * One hash over everything a release ships: the kit as it runs, the shared build workflow and
 * the workflow file a game repo keeps. kit-lock.json pins it (so KIT_VERSION is bumped when it
 * changes) and kit.zip carries it (so a test can tell the bundled zip is this source).
 */
export function kitHash() {
  const shipped = { ...Object.fromEntries(Object.entries(kitTree()).map(([path, contents]) => [`kit/${path}`, contents])), 'build.yml': buildWorkflow(), [WORKFLOW_FILE]: callerWorkflow() }
  const hash = createHash('sha256')
  for (const [path, contents] of Object.entries(shipped).sort(([a], [b]) => a.localeCompare(b))) hash.update(path).update('\0').update(contents).update('\0')
  return hash.digest('hex')
}
