const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { config, launch, origin, save } = require('./common.cjs')
const result = { status: 'running', note: config.note, transitions: [], errors: [], failures: [] }
const state = label => fs.writeFileSync(path.join(config.root, 'switch.json'), JSON.stringify({ label }))
async function update (page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    const start = performance.now(), trace = []
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Worker update timeout: ' + JSON.stringify(trace))), 60000)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        const worker = navigator.serviceWorker.controller
        const activated = () => {
          trace.push({ state: worker.state, ms: Math.round(performance.now() - start) })
          if (worker.state === 'activated') { clearTimeout(timer); resolve({ state: worker.state, trace }) }
        }
        worker.addEventListener('statechange', activated)
        activated()
      }, { once: true })
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker.addEventListener('statechange', () => trace.push({ installing: worker.state, ms: Math.round(performance.now() - start) }))
      }, { once: true })
      registration.update().catch(error => { clearTimeout(timer); reject(error) })
    })
  })
}
;(async () => {
  state('baseline')
  const browser = await launch()
  const context = await browser.createBrowserContext()
  // All pages intentionally share this context and origin for real PWA updates.
  async function page () {
    const page = await context.newPage()
    page.on('pageerror', error => result.errors.push({ message: error.message, stack: error.stack }))
    page.on('response', response => {
      if (response.status() >= 400 && /\.(js|css|woff2)(\?|$)/.test(response.url())) result.failures.push({ url: response.url().split('?')[0], status: response.status() })
    })
    await page.setRequestInterception(true)
    page.on('request', request => /(google-analytics|googletagmanager|facebook|doubleclick|t\.pietroembalagens)/.test(new URL(request.url()).hostname) ? request.abort() : request.continue())
    return page
  }
  try {
    const app = await page()
    await app.goto(origin('switch') + '/app/#/cart', { waitUntil: 'networkidle2' })
    await app.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated', { timeout: 30000 })
    const home = await page()
    await home.goto(origin('switch') + '/index.html', { waitUntil: 'networkidle2' })
    assert.equal(await home.$eval('.banner-slider img', image => image.fetchPriority), 'auto')
    state('candidate')
    result.transitions.push(await update(app)); save('pwa.json', result)
    await app.evaluate(() => { location.hash = '#/account/' })
    await app.waitForSelector('#spa input[type=email]', { timeout: 20000 })
    await home.reload({ waitUntil: 'networkidle2' })
    assert.equal(await home.$eval('.banner-slider img', image => image.fetchPriority), 'high')
    assert.equal(await home.$eval('.banner-slider', element => element.classList.contains('pe-h2--boxes-after')), true)
    const fresh = await page()
    await fresh.goto(origin('switch') + '/', { waitUntil: 'networkidle2' })
    assert.equal(await fresh.$eval('.banner-slider img', image => image.fetchPriority), 'high')
    const cdp = await home.createCDPSession()
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
    try {
      result.offline = await home.evaluate(async () => {
        const html = await fetch('/index.html'), body = await html.text()
        const css = await fetch(document.querySelector('link[rel=stylesheet]').href)
        return { html: html.status, css: css.status, high: body.includes('fetchpriority="high"'), reserved: body.includes('pe-h2--boxes-after'), guard: (await css.text()).includes('@supports selector(:has(*))') }
      })
      assert.deepEqual(result.offline, { html: 200, css: 200, high: true, reserved: true, guard: true })
    } finally { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }) }
    save('pwa.json', result)
    state('baseline')
    result.transitions.push(await update(fresh))
    await home.reload({ waitUntil: 'networkidle2' })
    assert.equal(await home.$eval('.banner-slider img', image => image.fetchPriority), 'auto')
    assert.equal(await home.$eval('.banner-slider', element => element.classList.contains('pe-h2--boxes-after')), false)
    await app.evaluate(() => { location.hash = '#/cart' })
    await app.waitForFunction(() => /carrinho/i.test(document.querySelector('#spa').textContent), { timeout: 20000 })
    for (const asset of ['/assets/pe-checkout-enhancements.27a9b0b1a9f9.js', '/assets/fonts/quicksand-latin.2add7d60b1cd.woff2']) {
      const response = await fetch(origin('switch') + asset)
      assert.equal(response.status, 200)
      assert.ok((await response.arrayBuffer()).byteLength > 0)
    }
    await home.screenshot({ path: path.join(config.reports, 'pwa-after-rollback.png') })
    assert.deepEqual(result.errors, [])
    assert.deepEqual(result.failures, [])
    result.status = 'passed'
  } catch (error) { result.status = 'failed'; result.error = error.message; throw error }
  finally { save('pwa.json', result); await browser.close() }
})().catch(error => { console.error(error.message); process.exitCode = 1 })
