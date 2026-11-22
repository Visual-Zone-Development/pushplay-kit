// Tests for shapes.mjs, driven through its command line the way the screen-shapes skill uses it.
// Run:  node --test plugins/pushplay/skills/screen-shapes/scripts/
// Needs Playwright with Chromium (set PW_MODULE to a Playwright package folder to use a project copy).

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SHAPES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'shapes.mjs')
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'shapes-test-'))

// A 1280×800 canvas scaled to fit and centred (bars on any other shape), and one that grows to the window.
const page = (fill) => `<!doctype html><body style="margin:0;background:#000;overflow:hidden"><canvas id="c"></canvas><script>
  const c = document.getElementById('c')
  function size() {
    const s = Math.min(innerWidth / 1280, innerHeight / 800)
    const w = ${fill} ? innerWidth : 1280 * s, h = ${fill} ? innerHeight : 800 * s
    Object.assign(c.style, { position: 'absolute', left: (innerWidth - w) / 2 + 'px', top: (innerHeight - h) / 2 + 'px', width: w + 'px', height: h + 'px' })
    c.__fit = { w: Math.round(w / s), h: Math.round(h / s), minW: 1280, minH: 800, fill: ${fill} }
  }
  size(); addEventListener('resize', size)
</script>`

let server
let base
before(async () => {
  server = http.createServer((req, res) => res.writeHead(200, { 'content-type': 'text/html' }).end(page(req.url.includes('fill'))))
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => server.close())

const run = (url, only) =>
  new Promise((resolve) => execFile(process.execPath, [SHAPES, url, '--only', only, '--out', out, '--wait', '100'], (err, stdout, stderr) => resolve({ code: err ? err.code : 0, stdout, stderr })))

test('reports bars at the sides on a TV for a game drawn at a fixed 1280×800', async () => {
  const r = await run(`${base}/fixed`, 'deck,tv')
  assert.equal(r.code, 1, r.stdout + r.stderr)
  assert.match(r.stdout, /✓ fills\s+deck\/first/)
  assert.match(r.stdout, /✗ bars left 96px, right 96px\s+tv\/first .*space 1280×800 \(fixed\)/)
  assert.ok(fs.existsSync(path.join(out, 'tv-first.png')))
})

test('passes a game that fills every shape, and reports the space it grew to', async () => {
  const r = await run(`${base}/fill`, 'tv,ipad,phone-portrait')
  assert.equal(r.code, 0, r.stdout + r.stderr)
  assert.match(r.stdout, /✓ fills\s+tv\/first .*space 1422×800 \(fill, min 1280×800\)/)
  assert.match(r.stdout, /✓ fills\s+ipad\/first .*space 1280×960/)
  assert.match(r.stdout, /Every shape is filled/)
})
