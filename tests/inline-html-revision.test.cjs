const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const webpack = require('webpack')
const { RawSource } = require('webpack-sources')

function fixture (t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pietro-inline-revision-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const write = (name, body) => {
    fs.mkdirSync(path.dirname(path.join(directory, name)), { recursive: true })
    fs.writeFileSync(path.join(directory, name), body)
  }
  write('storefront.webpack.js', fs.readFileSync(path.join(__dirname, '../storefront.webpack.js')))
  fs.symlinkSync(path.join(__dirname, '../node_modules'), path.join(directory, 'node_modules'), 'dir')
  write('entry.js', 'window.example = true\n')
  write('template/pages/@/head.ejs', '<script src="/assets/pe-checkout-enhancements.123abc.js"></script>')
  write('template/public/assets/pe-checkout-enhancements.123abc.js', 'window.checkout = true\n')
  const customCode = { html_head: '<script>window.head = true</script>', html_body: '<script>window.menu = 1</script>' }
  const update = () => write('content/code.json', JSON.stringify(customCode))
  update()
  const config = require(path.join(directory, 'storefront.webpack.js'))
  const workerBody = 'self.skipWaiting(); self.example = "unchanged cache policy";\n'
  async function build ({ devMode = false, worker = true } = {}) {
    const plugins = worker ? [{ apply (compiler) {
      compiler.hooks.emit.tap('WorkerFixture', compilation => { compilation.assets['sw.js'] = new RawSource(workerBody) })
    } }] : []
    const stats = await new Promise((resolve, reject) => webpack({
      mode: devMode ? 'development' : 'production',
      entry: path.join(directory, 'entry.js'),
      output: { path: path.join(directory, 'dist'), filename: 'bundle.js', hashFunction: 'sha256' },
      devtool: false,
      optimization: { minimize: false },
      plugins: plugins.concat(config({ devMode }).plugins)
    }, (error, stats) => error ? reject(error) : resolve(stats)))
    assert.equal(stats.hasErrors(), false, stats.toString({ all: false, errors: true }))
    return worker ? fs.readFileSync(path.join(directory, 'dist/sw.js'), 'utf8') : null
  }
  return { customCode, update, build, workerBody }
}

test('inline body updates change the emitted worker while its runtime/cache body stays unchanged', async t => {
  const f = fixture(t)
  const first = await f.build()
  assert.match(first, /^self\.__PE_CHECKOUT_HTML_REVISION = "[a-f0-9]{64}";\n/)
  assert.equal(first.slice(first.indexOf('\n') + 1), f.workerBody)
  assert.equal(await f.build(), first, 'same input produces the same worker')
  f.customCode.html_body = '<script>window.menu = 2</script>'
  f.update()
  const next = await f.build()
  assert.notEqual(next, first, 'PWA must discover the changed inline body')
  assert.equal(next.slice(next.indexOf('\n') + 1), f.workerBody)
})

test('moving code between head/body still changes the worker revision', async t => {
  const f = fixture(t)
  f.customCode.html_head = 'first'
  f.customCode.html_body = 'second'
  f.update()
  const first = await f.build()
  f.customCode.html_head = 'firstsecond'
  f.customCode.html_body = ''
  f.update()
  assert.notEqual(await f.build(), first)
})

test('a missing production worker fails explicitly while development can run without a worker', async t => {
  const f = fixture(t)
  await assert.rejects(f.build({ worker: false }), /Expected production service worker/)
  await f.build({ worker: false, devMode: true })
})
