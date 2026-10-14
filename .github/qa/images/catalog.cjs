const assert = require('node:assert/strict')
const crypto = require('node:crypto')

const hash = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex')

function validateCatalog (snapshot, paths) {
  assert.equal(snapshot.storeId, 51395)
  assert.ok(snapshot.storeData?.data?.store)
  for (const key of ['categories', 'grids', 'items']) assert.ok(Array.isArray(snapshot.storeData.data[key]), key)
  assert.equal(snapshot.routes.length, 2)
  for (const [index, resource] of ['products', 'categories'].entries()) {
    const { route, context } = snapshot.routes[index]
    assert.equal(route.path, paths[index])
    assert.equal(route.resource, resource)
    assert.match(route._id, /^[a-f0-9]{24}$/)
    assert.equal(context.resource, resource)
    assert.equal(context.body._id, route._id)
    assert.equal('/' + context.body.slug, route.path)
    assert.ok(context.body.name)
    if (resource === 'products') {
      assert.ok(context.body.sku)
      assert.ok(Array.isArray(context.body.pictures) && context.body.pictures.length)
      assert.ok(Array.isArray(context.body.variations) && context.body.variations.length)
      for (const size of ['normal', 'big']) {
        assert.equal(new URL(context.body.pictures[0][size]?.url).protocol, 'https:')
        assert.match(context.body.pictures[0][size].size, /^\d+x\d+$/)
      }
      for (const variation of context.body.variations) assert.ok(variation._id && variation.sku)
    }
  }
  return snapshot
}

// Isolated process only: original constructor/methods remain the fallback.
function frozenRouter (Original, snapshot) {
  return function FrozenRouter (...args) {
    const router = new Original(...args)
    const map = router.map.bind(router)
    const resolve = router.resolve.bind(router)
    router.map = (...args) => {
      const [pathname] = args
      const record = snapshot.routes.find(item => item.route.path === pathname)
      return record ? Promise.resolve(structuredClone(record.route)) : map(...args)
    }
    router.resolve = (...args) => {
      const [route] = args
      const record = snapshot.routes.find(item => item.route.resource === route?.resource && item.route._id === route?._id && item.route.path === route?.path)
      return record ? Promise.resolve(structuredClone(record.context)) : resolve(...args)
    }
    return router
  }
}

// Read JSON assigned by the actual SSR without evaluating page JavaScript.
function readContext (html) {
  const assignments = /window\._context\s*=\s*/g
  let match
  while ((match = assignments.exec(html))) {
    const start = assignments.lastIndex
    if (html[start] !== '{') continue
    let depth = 0, quoted = false, escaped = false
    for (let index = start; index < html.length; index++) {
      const char = html[index]
      if (quoted) {
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === '"') quoted = false
      } else if (char === '"') quoted = true
      else if (char === '{') depth++
      else if (char === '}' && --depth === 0) return JSON.parse(html.slice(start, index + 1))
    }
  }
  throw new Error('SSR context JSON missing')
}
module.exports = { hash, validateCatalog, frozenRouter, readContext }
