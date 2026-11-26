// The controller gallery (pushplay controllers): every shared layout opens in it from the real
// phone page, and what a press sends shows in the panel, read the way party.pad(id) reads it.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CONTROLLER_LAYOUTS } from './config.mjs'
import { galleryHtml, sharedPage } from './controllers.mjs'
import { launchBrowser } from './pipeline.mjs'

describe('the shared phone page', () => {
  it('carries the controller runtime and the layouts, with no stray end of script inside them', () => {
    const page = sharedPage()
    expect(page.match(/<\/script>/g)).toHaveLength(2)
    expect(page).toContain('window.controller = controller')
    expect(page).toContain('const LAYOUTS = {')
    expect(page).not.toContain('{{SLUG}}')
  })
})

describe('the controller gallery', () => {
  let browser
  let page
  beforeAll(async () => {
    browser = await launchBrowser()
    page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
    await page.setContent(galleryHtml())
    await page.waitForFunction(() => document.querySelector('iframe')?.contentDocument?.querySelector('#pp'))
  }, 60_000)
  afterAll(() => browser?.close())

  const phone = () => page.frames().find((f) => f !== page.mainFrame())
  const layoutShown = () => phone().evaluate(() => document.querySelector('#pp')?.dataset.layout)

  it('has a tab for every layout, and each shows its layout on the phone', async () => {
    const tabs = await page.$$eval('#tabs button', (bs) => bs.map((b) => b.dataset.name))
    expect(tabs).toEqual(CONTROLLER_LAYOUTS)
    for (const name of CONTROLLER_LAYOUTS) {
      await page.click(`#tabs button[data-name="${name}"]`)
      await expect.poll(layoutShown).toBe(name === 'pad' ? 'classic' : name)
    }
  }, 60_000)

  it('shows a held button and its press in the panel', async () => {
    await page.click('#tabs button[data-name="classic"]')
    await expect.poll(layoutShown).toBe('classic')
    const a = await phone().locator('.pp-btn[data-b="a"]').boundingBox()
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
    await page.mouse.down()
    await expect.poll(() => page.textContent('#reads')).toMatch(/held\s*a/)
    await expect.poll(() => page.textContent('#reads')).toMatch(/pressed\s*a/)
    await page.mouse.up()
    await expect.poll(() => page.textContent('#reads')).toMatch(/held\s*—/)
  }, 30_000)

  it('lets you try knocks on a layout that has them, without a phone', async () => {
    await page.click('#tabs button[data-name="twin"]')
    await expect.poll(layoutShown).toBe('twin')
    expect(await page.isVisible('#knock-right')).toBe(true)
    await page.click('#knock-right')
    await expect.poll(() => page.textContent('#reads')).toMatch(/pressed\s*rt/)
    await page.click('#tabs button[data-name="classic"]')
    expect(await page.isVisible('#knock-right')).toBe(false)
  }, 30_000)

  it('applies settings typed into the panel', async () => {
    await page.click('#tabs button[data-name="classic"]')
    await page.fill('#settings', JSON.stringify({ layout: 'classic', labels: { a: 'Kick' }, hide: ['x', 'y'] }))
    await expect.poll(() => phone().evaluate(() => document.querySelector('.pp-btn[data-b="a"]')?.textContent)).toBe('Kick')
    expect(await phone().evaluate(() => document.querySelector('.pp-btn[data-b="x"]'))).toBeNull()
  }, 30_000)
})
