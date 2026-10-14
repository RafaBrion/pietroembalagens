const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const yaml = require('yaml')
const { validateCatalog, frozenRouter, readContext } = require('./catalog.cjs')
const { summarize } = require('./statistics.cjs')

function fixture () {
  return {
    storeId: 51395, storeData: { data: { store: { name: 'Public shop' }, categories: [], grids: [], items: [] } },
    routes: ['products', 'categories'].map((resource, index) => ({
      route: { path: '/' + resource, resource, _id: String(index + 1).repeat(24) },
      context: { resource, body: { _id: String(index + 1).repeat(24), slug: resource, name: resource, sku: 'test', pictures: [{ normal: { url: 'https://example.com/normal.avif', size: '350x350' }, big: { url: 'https://example.com/big.avif', size: '700x700' } }], variations: [{ _id: 'variation1', sku: 'sku1' }] } }
    }))
  }
}
test('catalog rejects invalid/failed route bodies instead of recording a successful fixture', () => {
  const source = fixture()
  assert.equal(validateCatalog(source, ['/products', '/categories']), source)
  for (const mutate of [s => { s.routes[0].context.body._id = 'wrong' }, s => { s.routes[0].context.body.slug = 'changed' }, s => { s.routes[0].context.body.pictures = [] }, s => { s.routes[0].route.resource = 'customers' }, s => { s.routes.pop() }]) {
    const broken = structuredClone(source); mutate(broken)
    assert.throws(() => validateCatalog(broken, ['/products', '/categories']))
  }
})
test('frozen router intercepts only exact successful routes, clones on every call, delegates the rest', async () => {
  const calls = []
  class Original {
    constructor (id) {
      this.id = id
      this.map = pathname => { calls.push(['map', pathname]); return Promise.resolve('live map') }
      this.resolve = route => { calls.push(['resolve', route]); return Promise.resolve('live body') }
    }
  }
  const source = fixture(), Router = frozenRouter(Original, source), router = new Router(51395)
  const route = await router.map('/products')
  route.path = '/mutated'
  assert.equal((await router.map('/products')).path, '/products')
  const body = await router.resolve(source.routes[0].route)
  body.body.name = 'mutation'
  assert.equal((await router.resolve(source.routes[0].route)).body.name, 'products')
  assert.equal(await router.map('/other'), 'live map')
  assert.equal(await router.resolve({ ...source.routes[0].route, path: '/other' }), 'live body')
  assert.equal(await router.resolve({ ...source.routes[0].route, _id: 'unknown' }), 'live body')
  assert.equal(router.id, 51395)
  assert.equal(calls.length, 3)
})
test('paired statistics retain slow outcomes and exclude only predeclared warmups', () => {
  const runs = [100, 200, 300, 1000].flatMap((lcp, index) => ['baseline', 'candidate'].map(label => ({ name: 'home', width: 390, pair: index + 1, warmup: false, label, lcpMs: label === 'baseline' ? 100 : lcp, cls: 0, ttfb: 10, afterTtfb: lcp - 10 })))
  runs.push({ ...runs[1], warmup: true, pair: 0, lcpMs: 999999 })
  const result = summarize(runs)[0]
  assert.equal(result.candidate.lcpMs, 250)
  assert.deepEqual(result.pairs.map(pair => pair.lcpDelta), [0, 100, 200, 900])
  assert.equal(result.pairedMedianDelta, 150)
})
test('SSR identity reader handles nested JSON/escaped braces without evaluating scripts', () => {
  const context = { resource: 'products', body: { _id: 'id', name: 'a } brace " quote', pictures: [{ normal: { url: 'https://example.com/picture' } }] } }
  assert.deepEqual(readContext('window._context === undefined; window._context = ' + JSON.stringify(context) + ';throw new Error("must not execute")'), context)
  assert.throws(() => readContext('<html>404</html>'), /missing/)
})
test('workflow stays on the isolated branch with read-only permissions and no deployment credentials', () => {
  const filename = path.resolve(__dirname, '../../workflows/validate-images.yml')
  const source = fs.readFileSync(filename, 'utf8'), workflow = yaml.parse(source)
  assert.deepEqual(Object.keys(workflow.on).sort(), ['push', 'workflow_dispatch'])
  assert.deepEqual(workflow.on.push.branches, ['test/entrega-4-actions'])
  assert.deepEqual(workflow.permissions, { contents: 'read' })
  assert.ok(!JSON.stringify(workflow.jobs.validate.env).includes('runner.temp'), 'runner context is unavailable in job env')
  assert.match(workflow.jobs.validate.if, /github\.ref == 'refs\/heads\/test\/entrega-4-actions'/)
  const checkout = workflow.jobs.validate.steps.find(step => step.uses === 'actions/checkout@v4')
  assert.equal(checkout.with['persist-credentials'], false)
  assert.equal(checkout.with.ref, '${{ github.sha }}')
  assert.ok(!/secrets\.|id-token:|firebase deploy|pull_request_target|git push/.test(source))
  const artifact = workflow.jobs.validate.steps.find(step => step.uses === 'actions/upload-artifact@v4')
  assert.equal(artifact.if, 'always()')
  assert.equal(artifact.with.path, '${{ env.IMAGE_QA_REPORTS }}/')
})
