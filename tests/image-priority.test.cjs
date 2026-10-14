const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ejs = require('ejs')
const root = path.resolve(__dirname, '..')
const pages = path.join(root, 'template/pages')
const render = (file, locals) => ejs.renderFile(path.join(pages, file + '.ejs'), locals, {
  async: true,
  includer: name => ({ filename: path.join(pages, name + '.ejs') })
})
const slide = (name, extra = {}) => ({ img: `/img/${name}.webp`, mobile_img: `/img/${name}-mobile.webp`, alt: name, ...extra })
const section = slides => ({ type: 'banner-slider', slides })
const helpers = sections => ({
  pageName: 'home', state: { sections }, cms: () => ({}), dictionary: key => key,
  tryImageSize: src => src.includes('mobile') ? { width: 1000, height: 375 } : { width: 1920, height: 400 }
})
const highCount = html => (html.match(/fetchpriority="high"/g) || []).length

test('only the first displayed slide of the first enabled home section is high priority', async () => {
  const hero = section([slide('hero'), slide('second')])
  const below = section([slide('below')])
  const _ = helpers([null, { enabled: false }, hero, below])
  const html = await render('@/sections/banner-slider', { _, opt: hero })
  assert.equal(highCount(html), 1)
  assert.match(html, /fetchpriority="high"\s+loading="eager"/)
  assert.match(html, /class="lozad fade img-fluid"/)
  assert.equal(highCount(await render('@/sections/banner-slider', { _, opt: below })), 0)
})

test('a banner after another enabled section and banners outside home keep their normal priority', async () => {
  const banner = section([slide('banner')])
  const _ = helpers([{ type: 'page-title' }, banner])
  assert.equal(highCount(await render('@/sections/banner-slider', { _, opt: banner })), 0)
  _.state.sections = [banner]
  _.pageName = 'pages'
  assert.equal(highCount(await render('@/sections/banner-slider', { _, opt: banner })), 0)
})

test('scheduling selects the first active slide and no active slides render no image', async () => {
  const hero = section([
    slide('future', { start: '2999-01-01' }),
    slide('expired', { end: '2000-01-01' }),
    slide('active'), slide('later')
  ])
  const _ = helpers([hero])
  const html = await render('@/sections/banner-slider', { _, opt: hero })
  assert.equal(highCount(html), 1)
  assert.ok(!html.includes('/img/future.') && !html.includes('/img/expired.'))
  assert.match(html, /src="\/img\/active.png"/)
  hero.slides = [slide('expired', { end: '2000-01-01' })]
  assert.equal(highCount(await render('@/sections/banner-slider', { _, opt: hero })), 0)
})

test('product SSR differs from the installed template only by the two main-image hints', async () => {
  const file = '@/sections/product-block'
  const local = fs.readFileSync(path.join(pages, file + '.ejs'), 'utf8')
  const upstream = fs.readFileSync(require.resolve('@ecomplus/storefront-template/template/pages/@/sections/product-block.ejs'), 'utf8')
  assert.equal(local.replace('                      fetchpriority="high"\n                      loading="eager"\n', ''), upstream)
  const _ = {
    cms: () => ({}), settings: { domain: 'shop.example', currency: 'BRL', name: 'Shop' },
    state: { _id: 'p1', sku: 'sku1', slug: 'product', name: 'Product', available: false, pictures: [{}] },
    dictionary: key => key,
    ecomUtils: { img: (state, unused, size) => ({ url: `https://ecoms1.com/imgs/${size || 'normal'}/p.webp`, alt: 'Product', size: '700x700' }), name: s => s.name, inStock: () => false, price: () => 12, onPromotion: () => false }
  }
  const html = await ejs.render(local, { _, opt: {} }, { async: true, filename: path.join(pages, file + '.ejs'), includer: () => ({ template: ' ' }) })
  assert.equal(highCount(html), 1)
  assert.match(html, /width="700"\s+height="700"/)
  assert.match(html, /media="\(max-width: 399.98px\)"/)
  assert.match(html, /crossorigin="anonymous"/)
  assert.ok(html.includes('"@type":"Product"'))
})

function worker (overrides = {}, hasWorker = true, devMode = false) {
  const module = { exports: {} }
  const mockedFs = { ...fs, readFileSync (filename, encoding) {
    const relative = path.relative(root, filename)
    if (Object.hasOwn(overrides, relative)) {
      if (overrides[relative] === null) throw new Error('Missing view: ' + relative)
      return encoding ? overrides[relative] : Buffer.from(overrides[relative])
    }
    return fs.readFileSync(filename, encoding)
  } }
  vm.runInNewContext(fs.readFileSync(path.join(root, 'storefront.webpack.js'), 'utf8'), {
    module, __dirname: root, require: name => name === 'fs' ? mockedFs : require(name)
  })
  const plugins = module.exports({ devMode }).plugins
  if (devMode) return plugins
  const assets = hasWorker ? { 'sw.js': { source: () => 'original-worker-body' } } : {}
  plugins[0].apply({ hooks: { emit: { tap: (name, callback) => callback({ assets }) } } })
  return assets['sw.js'].source().toString()
}

test('worker revision is deterministic and changes for each affected view while keeping the worker body', () => {
  const baseline = worker()
  assert.equal(baseline, worker())
  for (const file of ['banner-slider.ejs', 'inc/banner.ejs', 'product-block.ejs']) {
    const filename = 'template/pages/@/sections/' + file
    const changed = worker({ [filename]: fs.readFileSync(path.join(root, filename), 'utf8') + '\n<!-- changed view -->' })
    assert.notEqual(changed.split('\n')[0], baseline.split('\n')[0])
    assert.equal(changed.slice(changed.indexOf('\n') + 1), 'original-worker-body')
  }
})

test('production worker validation fails closed; development needs no worker', () => {
  assert.throws(() => worker({}, false), /Expected production service worker/)
  assert.throws(() => worker({ 'template/pages/@/sections/inc/banner.ejs': null }), /Missing view/)
  assert.equal(worker({}, true, true).length, 0)
})
