const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const config = require('./config.cjs')
const [label, portText, mode] = process.argv.slice(2)
if (!['baseline', 'candidate', 'switch'].includes(label)) throw new Error('Invalid QA snapshot')
const initial = label === 'switch' ? 'baseline' : label
const cwd = path.join(config.root, initial)
process.chdir(path.join(cwd, '.functions'))
process.env.NODE_ENV = 'production'
process.env.STORE_DATA_FROM_CACHE = 'true'
if (mode !== '--live') {
  process.env.IMAGE_QA_CATALOG = path.join(config.root, 'catalog.json')
  require('./freeze.cjs')
}
const local = createRequire(path.join(cwd, '.functions/package.json'))
// Preserve a configured proxy for local checks; Actions normally has none.
if (process.env.HTTPS_PROXY || process.env.https_proxy) {
  const axios = local('axios')
  const ProxyAgent = local('https-proxy-agent')
  const agent = new ProxyAgent(process.env.https_proxy || process.env.HTTPS_PROXY)
  const adapter = axios.getAdapter(axios.defaults.adapter)
  axios.defaults.adapter = request => {
    if (new URL(request.url, request.baseURL).protocol === 'https:') {
      request.proxy = false
      request.httpsAgent = agent
    }
    return adapter(request)
  }
}
const express = local('express')
const app = express()
if (label === 'switch') {
  // One origin, immutable builds, and a rollback to the exact baseline.
  app.use((req, res, next) => {
    const state = JSON.parse(fs.readFileSync(path.join(config.root, 'switch.json')))
    if (!['baseline', 'candidate'].includes(state.label)) return res.sendStatus(500)
    return express.static(path.join(config.root, state.label, 'dist'), { extensions: ['html'], etag: false, lastModified: false, maxAge: 0 })(req, res, next)
  })
  app.use((req, res) => res.sendStatus(404))
} else {
  const handler = local('./index.js').ssr
  app.use(express.static(path.join(cwd, 'dist'), { extensions: ['html'] }))
  app.use((req, res) => Promise.resolve(handler(req, res)).catch(() => res.status(500).send('QA SSR failed; see server log')))
}
app.listen(Number(portText), '127.0.0.1', () => console.log('QA server ready', label, portText, mode === '--live' ? 'real API canary' : 'fixed public catalog'))
