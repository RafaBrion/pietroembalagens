const assert = require('node:assert/strict')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
function sameDocument (from, to) {
  const first = new URL(from), second = new URL(to)
  return first.origin === second.origin && first.pathname === second.pathname && first.search === second.search
}
function validateDocument (requested, frame, request, response) {
  assert.ok(request && response, 'Missing browser document request/response')
  assert.ok(sameDocument(requested, frame.url) && sameDocument(requested, request.url) && sameDocument(requested, response.url), 'Document URL mismatch')
  assert.equal(request.frameId, frame.id, 'Request must belong to main frame')
  assert.equal(response.frameId, frame.id, 'Response must belong to main frame')
  assert.equal(request.requestId, response.requestId, 'Document request identity mismatch')
  assert.ok(frame.loaderId, 'Missing document loader')
  assert.equal(request.loaderId, frame.loaderId, 'Request loader mismatch')
  assert.equal(response.loaderId, frame.loaderId, 'Response loader mismatch')
  assert.equal(response.status, 200, 'Document HTTP status must be 200')
}
async function trackNavigation (page) {
  const session = await page.createCDPSession()
  await session.send('Network.enable'); await session.send('Page.enable')
  const events = [], finished = new Set()
  session.on('Network.requestWillBeSent', e => { if (e.type === 'Document') events.push({ event: 'request', requestId: e.requestId, loaderId: e.loaderId, frameId: e.frameId, url: e.request.url }) })
  session.on('Network.responseReceived', e => { if (e.type === 'Document') events.push({ event: 'response', requestId: e.requestId, loaderId: e.loaderId, frameId: e.frameId, url: e.response.url, status: e.response.status, fromServiceWorker: e.response.fromServiceWorker }) })
  session.on('Network.loadingFinished', e => finished.add(e.requestId))
  session.on('Network.loadingFailed', e => events.push({ event: 'failed', requestId: e.requestId, error: e.errorText }))
  session.on('Page.frameNavigated', e => events.push({ event: 'frame', id: e.frame.id, parentId: e.frame.parentId, loaderId: e.frame.loaderId, url: e.frame.url }))
  session.on('Page.navigatedWithinDocument', e => events.push({ event: 'within-document', frameId: e.frameId, url: e.url }))
  const records = []
  async function begin (url) {
    const before = (await session.send('Page.getFrameTree')).frameTree.frame
    const record = { from: page.url(), requested: url, start: events.length, before: { id: before.id, loaderId: before.loaderId, url: before.url } }
    records.push(record)
    return record
  }
  async function complete (record, response) {
    record.to = page.url(); record.puppeteerStatus = response?.status() ?? null
    record.events = events.slice(record.start)
    assert.ok(sameDocument(record.requested, record.to), 'Unexpected navigation destination')
    if (response) {
      assert.equal(response.status(), 200, 'Browser navigation HTTP status must be 200')
      record.method = 'Puppeteer browser HTTP response'
      return response
    }
    const frame = (await session.send('Page.getFrameTree')).frameTree.frame
    record.events = events.slice(record.start)
    const documents = record.events.filter(e => e.event === 'response' && e.frameId === frame.id)
    const proof = documents.at(-1)
    const request = record.events.find(e => e.event === 'request' && e.requestId === proof?.requestId)
    validateDocument(record.requested, frame, request, proof)
    const deadline = Date.now() + 5000
    while (!finished.has(proof.requestId) && Date.now() < deadline) await wait(25)
    assert.ok(finished.has(proof.requestId), 'Document body did not finish within five seconds')
    const body = await session.send('Network.getResponseBody', { requestId: proof.requestId })
    record.method = 'CDP response/body of the same browser document (Puppeteer returned null)'
    record.document = { ...proof, committedFrame: { id: frame.id, loaderId: frame.loaderId, url: frame.url } }
    const text = body.base64Encoded ? Buffer.from(body.body, 'base64').toString('utf8') : body.body
    return { status: () => proof.status, text: async () => text }
  }
  function fail (record, error) {
    record.to = page.url(); record.events = events.slice(record.start); record.error = error.message
  }
  return { records, begin, complete, fail }
}
module.exports = { sameDocument, validateDocument, trackNavigation }
