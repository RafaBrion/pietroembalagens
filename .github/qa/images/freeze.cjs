// Loaded only by the QA build/server processes, never by the storefront.
if (process.env.IMAGE_QA_CATALOG) {
  const fs = require('node:fs')
  const { createRequire } = require('node:module')
  const path = require('node:path')
  const { validateCatalog, frozenRouter } = require('./catalog.cjs')
  const config = require('./config.cjs')
  const snapshot = validateCatalog(JSON.parse(fs.readFileSync(process.env.IMAGE_QA_CATALOG)), [config.product, config.category])
  const local = createRequire(path.join(process.cwd(), 'package.json'))
  const filename = local.resolve('@ecomplus/storefront-router')
  const Original = local(filename)
  require.cache[filename].exports = frozenRouter(Original, snapshot)
}
