const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { spawn, spawnSync } = require('node:child_process')
const { config, launch, preparePage, save, wait, safeUrl } = require('./common.cjs')
const { readContext } = require('./catalog.cjs')
const children = []
const result = { status: 'running', note: config.note, canaries: [], health: [], phases: {}, proxyPresent: Boolean(process.env.HTTPS_PROXY || process.env.https_proxy) }
function server (label, port, live = false) {
  const descriptor = fs.openSync(path.join(config.reports, `${label}-${live ? 'live' : 'fixed'}-server.log`), 'a')
  const child = spawn(process.execPath, [path.join(__dirname, 'serve.cjs'), label, String(port), ...(live ? ['--live'] : [])], { env: process.env, stdio: ['ignore', descriptor, descriptor] })
  fs.closeSync(descriptor)
  children.push(child)
  return child
}
async function ready (port) {
  for (let i = 0; i < 40; i++) {
    try { const response = await fetch('http://127.0.0.1:' + port + '/'); if (response.status === 200) return } catch {}
    await wait(250)
  }
  throw new Error('QA server not ready on port ' + port)
}
async function stop (child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  await new Promise(resolve => { child.once('exit', resolve); child.kill('SIGTERM') })
}
async function probe (label, port, pathname, real) {
  const row = { label, pathname, source: real ? 'real SSR/API canary' : 'SSR local with fixed public catalog' }
  const browser = await launch()
  const prepared = await preparePage(browser, 390)
  try {
    const response = await prepared.page.goto('http://127.0.0.1:' + port + pathname, { waitUntil: 'networkidle2', timeout: 45000 })
    row.status = response.status()
    if (pathname === config.product) {
      const context = readContext(await response.text())
      const snapshot = JSON.parse(fs.readFileSync(path.join(config.root, 'catalog.json')))
      const expected = snapshot.routes[0].context.body
      row.product = Object.fromEntries(['_id', 'sku', 'slug', 'name'].map(key => [key, context.body[key]]))
      assert.equal(context.resource, 'products')
      for (const key of ['_id', 'sku', 'slug', 'name']) assert.equal(row.product[key], expected[key], 'Unexpected PDP ' + key)
      row.expectedHero = safeUrl(expected.pictures[0].normal.url)
    }
    await prepared.page.waitForFunction(() => {
      const image = document.querySelector('.banner-slider img') || document.querySelector('.gallery__stage .product__picture img')
      return image?.complete && image.naturalWidth > 0
    }, { timeout: 20000 })
    row.hero = await prepared.page.$eval('.banner-slider img, .gallery__stage .product__picture img', image => ({ url: image.currentSrc, natural: [image.naturalWidth, image.naturalHeight], priority: image.fetchPriority }))
    row.hero.url = safeUrl(row.hero.url)
    if (row.expectedHero) assert.equal(row.hero.url, row.expectedHero, 'Unexpected actual PDP photo')
    row.dependencies = await prepared.page.evaluate(() => typeof window.jQuery === 'function' && typeof window.Popper === 'function')
    assert.equal(row.status, 200)
    assert.ok(row.dependencies)
    assert.deepEqual(prepared.errors, [], 'JavaScript exception in SSR probe')
    row.passed = true
    await prepared.page.screenshot({ path: path.join(config.reports, `${label}-${real ? 'live' : 'fixed'}-${pathname === '/' ? 'home' : 'product'}-probe.png`) })
  } catch (error) { row.passed = false; row.error = error.message }
  finally { row.errors = prepared.errors; row.failures = prepared.failures; await browser.close() }
  return row
}
;(async () => {
  fs.mkdirSync(config.reports, { recursive: true })
  save('execution.json', result)
  // The purpose of this workflow is a runner outside the cloud proxy.
  if (process.env.GITHUB_ACTIONS === 'true') assert.equal(result.proxyPresent, false, 'Unexpected proxy in Actions runner')
  for (const label of ['baseline', 'candidate']) {
    server(label, config.ports[label])
    await ready(config.ports[label])
    const canary = server(label, config.ports.canary, true)
    try {
      await ready(config.ports.canary)
      result.canaries.push(await probe(label, config.ports.canary, config.product, true))
    } finally { await stop(canary) }
    for (const pathname of ['/', config.product]) result.health.push(await probe(label, config.ports[label], pathname, false))
    save('execution.json', result)
  }
  fs.writeFileSync(path.join(config.root, 'switch.json'), JSON.stringify({ label: 'baseline' }))
  server('switch', config.ports.switch)
  await ready(config.ports.switch)
  const healthy = result.health.every(row => row.passed)
  // Sequential phases: no builds or other browsers during the benchmark.
  for (const phase of healthy ? ['browser', 'pwa', 'compare'] : ['pwa']) {
    const descriptor = fs.openSync(path.join(config.reports, phase + '.log'), 'a')
    const run = spawnSync(process.execPath, [path.join(__dirname, phase + '.cjs')], { stdio: ['ignore', descriptor, descriptor], env: process.env, timeout: 25 * 60 * 1000 })
    fs.closeSync(descriptor)
    result.phases[phase] = { status: run.status, signal: run.signal, error: run.error?.message }
    save('execution.json', result)
  }
  result.status = healthy && result.canaries.every(row => row.passed) && Object.values(result.phases).every(phase => phase.status === 0) ? 'passed-for-review' : 'blocked'
  if (result.status === 'blocked') process.exitCode = 1
})().catch(error => { result.status = 'blocked'; result.error = error.message; console.error(error.message); process.exitCode = 1 })
  .finally(async () => { for (const child of children) await stop(child); save('execution.json', result) })
