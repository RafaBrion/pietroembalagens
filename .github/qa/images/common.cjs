const fs = require('node:fs')
const path = require('node:path')
const puppeteer = require('puppeteer-core')
const config = require('./config.cjs')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const save = (file, value) => {
  fs.mkdirSync(config.reports, { recursive: true })
  fs.writeFileSync(path.join(config.reports, file), JSON.stringify(value, null, 2))
}
const launch = () => puppeteer.launch({ executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', headless: true, acceptInsecureCerts: false, args: ['--no-sandbox'] })
const origin = label => 'http://127.0.0.1:' + config.ports[label]
const safeUrl = value => {
  try { const url = new URL(value); return url.origin + url.pathname } catch { return String(value) }
}
async function preparePage (browser, width) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  const errors = []
  const failures = []
  const blocked = new Set()
  await page.setViewport({ width, height: 844, deviceScaleFactor: 1, isMobile: width < 500, hasTouch: width < 500 })
  await page.setCacheEnabled(false)
  page.on('pageerror', error => errors.push({ message: error.message, stack: error.stack }))
  await page.setRequestInterception(true)
  page.on('request', request => {
    const host = new URL(request.url()).hostname
    if (/(google-analytics|googletagmanager|facebook|doubleclick|t\.pietroembalagens)/.test(host)) {
      blocked.add(request.url())
      return request.abort()
    }
    return request.continue()
  })
  page.on('requestfailed', request => {
    if (!blocked.has(request.url())) failures.push({ url: safeUrl(request.url()), type: request.resourceType(), error: request.failure()?.errorText })
  })
  return { page, context, errors, failures }
}
module.exports = { config, wait, save, launch, origin, safeUrl, preparePage }
