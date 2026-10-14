const { launch, preparePage, save } = require('./common.cjs')
;(async () => {
  const browser = await launch()
  try {
    const { page } = await preparePage(browser, 390)
    const cdp = await page.createCDPSession()
    await cdp.send('Network.enable')
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 625000, uploadThroughput: 125000 })
    await page.setContent('<title>QA browser readiness</title><p>Browser ready</p>')
    save('browser-runtime.json', { node: process.versions.node, puppeteer: require('puppeteer-core/package.json').version, browser: await browser.version(), executable: process.env.CHROME_BIN || '/usr/bin/google-chrome', tlsVerification: true, check: 'launch/context/viewport/CDP throttling; no storefront claim' })
  } finally { await browser.close() }
})().catch(error => { console.error(error.message); process.exitCode = 1 })
