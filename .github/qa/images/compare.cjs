const assert = require('node:assert/strict')
const path = require('node:path')
const { config, wait, save, launch, origin, safeUrl, preparePage } = require('./common.cjs')
const { summarize } = require('./statistics.cjs')
const { inspectHero } = require('./hero.cjs')
const result = {
  status: 'running', note: config.note, runs: [],
  conditions: { measured: 32, warmups: 8, pairsPerScenario: 4, order: 'AB/BA, all runs retained; no performance retries', cpu: 4, downMbps: 5, upMbps: 1, latencyMs: 80, viewport: '390x844 touch or1440x844;DPR1', cache: 'disabled; fresh browser process/context per opening; normal SW', observation: 'five seconds after load', catalog: 'SSR local with fixed public catalog, not production/API TTFB', cdn: 'real network, standard TLS, no mirrors or custom CA', marketing: 'blocked' }
}
const persist = () => save('comparison.json', result)
async function run (label, name, pathname, width, pair, warmup) {
  const row = { label, name, width, pair, warmup, startedAt: new Date().toISOString() }
  let browser, context, page, prepared
  const requests = new Map()
  try {
    browser = await launch()
    result.browser = await browser.version()
    prepared = await preparePage(browser, width)
    ;({ context, page } = prepared)
    const cdp = await page.createCDPSession()
    await cdp.send('Network.enable')
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 625000, uploadThroughput: 125000 })
    cdp.on('Network.requestWillBeSent', event => requests.set(event.requestId, { url: safeUrl(event.request.url), type: event.type, priority: event.request.initialPriority, initiator: event.initiator.type }))
    cdp.on('Network.responseReceived', event => {
      const request = requests.get(event.requestId)
      if (request) Object.assign(request, { status: event.response.status, mime: event.response.mimeType })
    })
    cdp.on('Network.loadingFinished', event => {
      const request = requests.get(event.requestId)
      if (request) request.bytes = event.encodedDataLength
    })
    await page.evaluateOnNewDocument(() => {
      window.qa = { lcp: [], shifts: [] }
      new PerformanceObserver(list => list.getEntries().forEach(entry => window.qa.lcp.push({ time: entry.startTime, url: entry.url, size: entry.size }))).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver(list => list.getEntries().forEach(entry => {
        if (!entry.hadRecentInput) window.qa.shifts.push({ time: entry.startTime, value: entry.value, nodes: entry.sources.map(source => ({ tag: source.node?.tagName, class: String(source.node?.className || '').slice(0, 150) })) })
      })).observe({ type: 'layout-shift', buffered: true })
    })
    const response = await page.goto(origin(label) + pathname, { waitUntil: 'load', timeout: 60000 })
    row.status = response.status()
    await wait(5000)
    Object.assign(row, await page.evaluate(() => {
      let cls = 0, total = 0, first = 0, last = 0
      for (const shift of window.qa.shifts) {
        if (shift.time - last > 1000 || shift.time - first > 5000) { total = 0; first = shift.time }
        total += shift.value; last = shift.time; cls = Math.max(cls, total)
      }
      const navigation = performance.getEntriesByType('navigation')[0]
      return {
        ...window.qa, cls, ttfb: navigation.responseStart, lcpMs: window.qa.lcp.at(-1)?.time ?? null,
        navigation: { duration: navigation.duration, responseEnd: navigation.responseEnd, transferSize: navigation.transferSize },
        dependencies: { jquery: typeof window.jQuery === 'function', popper: typeof window.Popper === 'function' },
        highCount: document.querySelectorAll('img[fetchpriority=high]').length,
        sw: navigator.serviceWorker.controller?.state ?? null
      }
    }))
    row.hero = await page.evaluate(inspectHero)
    row.afterTtfb = row.lcpMs === null ? null : row.lcpMs - row.ttfb
    row.errors = prepared.errors
    row.failures = prepared.failures
    row.requests = [...requests.values()]
    if (row.hero) row.hero.url = safeUrl(row.hero.url)
    for (const entry of row.lcp || []) if (entry.url) entry.url = safeUrl(entry.url)
    await page.screenshot({ path: path.join(config.reports, `${name}-${width}-${pair}-${label}.png`) })
    // Save the failing opening BEFORE any assertions. No dropped runs.
    result.runs.push(row); persist()
    assert.equal(row.status, 200)
    assert.ok(row.dependencies.jquery && row.dependencies.popper, 'Critical dependency unavailable')
    assert.ok(row.hero?.natural[0] > 0 && row.hero.natural[1] > 0)
    assert.ok(row.hero.visible, 'Primary image must be visible in viewport')
    assert.equal(row.lcp.at(-1)?.url, row.hero.url, 'Actual LCP must be the tested image')
    assert.ok(Number.isFinite(row.lcpMs))
    const heroRequests = row.requests.filter(request => request.type === 'Image' && request.url === row.hero.url)
    assert.equal(heroRequests.length, 1)
    if (label === 'candidate') {
      assert.equal(row.hero.priority, 'high'); assert.equal(row.highCount, 1); assert.equal(heroRequests[0].priority, 'High')
    }
  } catch (error) {
    row.fatal = error.message
    row.errors = prepared?.errors || []
    row.failures = prepared?.failures || []
    row.requests = [...requests.values()]
    if (page) await page.screenshot({ path: path.join(config.reports, `${name}-${width}-${pair}-${label}-failure.png`) }).catch(() => {})
    if (!result.runs.includes(row)) result.runs.push(row)
    persist()
    throw error
  } finally { if (browser) await browser.close() }
}
;(async () => {
  persist()
  const scenarios = [['home', '/', 390], ['product', config.product, 390], ['home', '/', 1440], ['product', config.product, 1440]]
  for (const [index, [name, pathname, width]] of scenarios.entries()) {
    for (const label of ['baseline', 'candidate']) await run(label, name, pathname, width, 0, true)
    for (let pair = 1; pair <= 4; pair++) for (const label of ((pair + index) % 2 ? ['baseline', 'candidate'] : ['candidate', 'baseline'])) await run(label, name, pathname, width, pair, false)
  }
  assert.equal(result.runs.length, 40)
  for (const [name, , width] of scenarios) {
    const rows = result.runs.filter(row => row.name === name && row.width === width)
    const source = url => new URL(url).pathname
    assert.equal(new Set(rows.map(row => source(row.hero.url))).size, 1, 'Image changed between openings')
    assert.equal(new Set(rows.map(row => JSON.stringify(row.hero.natural))).size, 1)
  }
  result.summaries = summarize(result.runs)
  result.javascriptErrorRuns = result.runs.filter(row => row.errors?.length).map(({ label, name, width, pair, warmup, errors }) => ({ label, name, width, pair, warmup, errors }))
  result.status = result.javascriptErrorRuns.length ? 'complete-needs-review' : 'complete'
  persist()
  if (result.javascriptErrorRuns.length) throw new Error('JavaScript exceptions recorded; full cohort retained for advisor review')
})().catch(error => { result.error = error.message; if (result.status === 'running') result.status = 'incomplete'; persist(); console.error(error.message); process.exitCode = 1 })
