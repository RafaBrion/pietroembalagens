const { launch, preparePage, save } = require('./common.cjs')
const assert = require('node:assert/strict')
const { inspectHero } = require('./hero.cjs')
const { checkWorkerNavigation } = require('./worker-check.cjs')
;(async () => {
  const browser = await launch()
  try {
    const { page } = await preparePage(browser, 390)
    const cdp = await page.createCDPSession()
    await cdp.send('Network.enable')
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 625000, uploadThroughput: 125000 })
    await page.setContent('<title>QA browser readiness</title><p>Browser ready</p>')
    const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')
    await page.setContent('<div id="product-gallery"><div class="product__picture"><img width="10" height="10" src="' + image + '"></div></div>')
    await page.waitForFunction(() => document.querySelector('img').naturalWidth === 10)
    const ssr = await page.evaluate(inspectHero)
    assert.equal(ssr.mode, 'SSR'); assert.equal(ssr.visible, true)
    await page.evaluate(() => {
      const stage = document.createElement('div'); stage.className = 'gallery__stage'
      stage.append(document.querySelector('.product__picture')); document.body.append(stage)
    })
    const hydrated = await page.evaluate(inspectHero)
    assert.equal(hydrated.mode, 'hydrated'); assert.equal(hydrated.url, ssr.url)
    const navigation = await checkWorkerNavigation(browser)
    save('navigation-fixture.json', navigation)
    save('browser-runtime.json', { node: process.versions.node, puppeteer: require('puppeteer-core/package.json').version, browser: await browser.version(), executable: process.env.CHROME_BIN || '/usr/bin/google-chrome', tlsVerification: true, heroStates: 'SSR and hydrated fixture verified', workerNavigation: '200/body and negative 404 verified with standard service worker', check: 'launch/context/viewport/CDP throttling and hero reader; no storefront claim' })
  } finally { await browser.close() }
})().catch(error => { console.error(error.message); process.exitCode = 1 })
