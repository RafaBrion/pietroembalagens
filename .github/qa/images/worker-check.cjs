const http = require('node:http')
const assert = require('node:assert/strict')
const { preparePage } = require('./common.cjs')
const { trackNavigation } = require('./navigation.cjs')
async function checkWorkerNavigation (browser) {
  const server = http.createServer((request, response) => {
    if (request.url === '/sw.js') {
      response.setHeader('Content-Type', 'application/javascript')
      response.end('self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",e=>e.waitUntil(clients.claim()));self.addEventListener("fetch",e=>{if(e.request.mode==="navigate")e.respondWith(fetch(e.request))})')
    } else {
      response.statusCode = request.url === '/missing' ? 404 : 200
      response.setHeader('Content-Type', 'text/html')
      response.end('<h1>' + request.url + '</h1>')
    }
  })
  server.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const origin = 'http://127.0.0.1:' + server.address().port
  const { page, context } = await preparePage(browser, 1440)
  const trace = await trackNavigation(page)
  const navigate = async pathname => {
    const record = await trace.begin(origin + pathname)
    const response = await page.goto(origin + pathname, { waitUntil: 'domcontentloaded' })
    return trace.complete(record, response)
  }
  try {
    for (const pathname of ['/', '/before-worker']) {
      const response = await navigate(pathname)
      assert.equal(response.status(), 200)
      assert.ok((await response.text()).includes('<h1>' + pathname + '</h1>'))
    }
    await page.evaluate(() => navigator.serviceWorker.register('/sw.js'))
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
    const response = await navigate('/with-worker')
    assert.equal(response.status(), 200)
    assert.ok((await response.text()).includes('<h1>/with-worker</h1>'))
    assert.equal(trace.records.at(-1).events.find(event => event.event === 'response').fromServiceWorker, true)
    await assert.rejects(navigate('/missing'), /HTTP status must be 200/)
    return { status: 'passed', records: trace.records }
  } finally {
    await context.close()
    await new Promise(resolve => server.close(resolve))
  }
}
module.exports = { checkWorkerNavigation }
