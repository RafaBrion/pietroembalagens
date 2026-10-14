const fs = require('node:fs')
const assert = require('node:assert/strict')
const { config, wait: pause, launch, preparePage: basePage, save } = require('./common.cjs')
const { readContext } = require('./catalog.cjs')
const snapshot = JSON.parse(fs.readFileSync(require('node:path').join(config.root, 'catalog.json')))
const { sameDocument } = require('./navigation.cjs')
const output = config.reports
async function verifyNavigation (page, response, from, url) {
  const to = page.url()
  const audit = { from, requested: url, to, status: response?.status() ?? null }
  page.qaNavigations.push(audit)
  assert.equal(new URL(to).origin, new URL(url).origin, 'Unexpected navigation origin')
  assert.equal(new URL(to).pathname, new URL(url).pathname, 'Unexpected navigation destination')
  assert.equal(new URL(to).search, new URL(url).search, 'Unexpected navigation query')
  if (response) {
    assert.equal(response.status(), 200, 'Navigation: ' + url)
    audit.method = 'browser HTTP navigation'
    return response
  }
  assert.ok(sameDocument(from, to), 'Null navigation response on a changed document: ' + JSON.stringify(audit))
  const proof = await fetch(url, { redirect: 'manual' })
  audit.method = 'same-document browser navigation plus separate HTTP GET'
  audit.separateHttpStatus = proof.status
  assert.equal(proof.status, 200, 'Separate GET for same-document navigation')
  return { text: () => proof.text() }
}
async function navigate (page, url) {
  const from = page.url()
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  return verifyNavigation(page, response, from, url)
}
async function preparePage (browser, width) {
  const prepared = await basePage(browser, width)
  prepared.page.qaNavigations = []
  const requests = []
  prepared.page.on('request', request => requests.push(request.url()))
  await prepared.page.evaluateOnNewDocument(() => {
    let previous = null
    window.engineMounts = []
    new MutationObserver(() => {
      const engine = document.getElementById('search-engine')
      if (engine && engine !== previous) {
        previous = engine
        window.engineMounts.push({ tag: engine.tagName, hasResults: !!engine.querySelector('.search-engine__results') })
      }
    }).observe(document, { childList: true, subtree: true })
  })
  return { ...prepared, requests }
}

async function storefront (browser, port, label, width) {
  const { page, errors, requests } = await preparePage(browser, width)
  const origin = `http://127.0.0.1:${port}`
  const checks = []
  try {
    await navigate(page, origin + '/')
    await page.waitForFunction(() => typeof window.jQuery === 'function' && document.querySelector('#s-all')?.getAttribute('data-pe-b') === '1', { timeout: 20000 })
    if (width >= 992) {
      await page.evaluate(() => document.querySelector('[data-pe-see-all]').click())
      await page.waitForSelector('#s-all .pe-tem-sub', { visible: true })
      await page.click('#s-all .pe-tem-sub')
      await page.waitForSelector('#s-all .pe-voltar', { visible: true })
      await page.click('#s-all .pe-voltar')
      await page.focus('#cd-all'); await page.keyboard.press('Enter')
      const scrollNeeded = await page.$eval('#s-all .pe-n1 .pe-scroll', e => e.scrollHeight > e.clientHeight + 4)
      if (scrollNeeded) {
        await page.click('#s-all .pe-rail-foot')
        await page.waitForFunction(() => document.querySelector('#s-all .pe-n1 .pe-scroll').scrollTop > 0)
      }
      checks.push('desktop keyboard opening/focus and scroll control')
      await page.setViewport({ width: 390, height: 950 })
      await page.click('.pe-h2__burger'); await pause(550)
      await page.waitForSelector('#categories-nav a[aria-controls]', { visible: true })
      await page.click('#categories-nav a[aria-controls]')
      await page.click('#accordion-menu .pe-mback')
      await page.click('#accordion-menu .menu__btn--close')
      await pause(550)
      await page.setViewport({ width: 1440, height: 950 })
      checks.push('desktop/mobile resize with menu opening and closing')
      await page.click('#search-input')
      await page.type('#search-input', 'brigadeiro', { delay: 20 })
      await pause(1500)
      assert.ok(await page.$('#instant-search'))
      await page.keyboard.press('Escape')
      checks.push('desktop menu drill-down/back and instant search/Escape')
    } else {
      await page.click('.pe-h2__burger'); await pause(550)
      await page.waitForSelector('#categories-nav a[aria-controls]', { visible: true })
      await page.click('#categories-nav a[aria-controls]')
      await page.waitForSelector('#accordion-menu .pe-mback', { visible: true })
      await page.click('#accordion-menu .pe-mback')
      await page.click('#accordion-menu .menu__btn--close'); await pause(550)
      await page.click('#search-input')
      await page.type('#search-input', 'brigadeiro')
      const from = page.url()
      const [response] = await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.keyboard.press('Enter')])
      await verifyNavigation(page, response, from, origin + '/search?term=brigadeiro')
      assert.ok(page.url().includes('/search?term=brigadeiro'))
      checks.push('mobile menu drill-down/back and visible header search submission')
    }
    assert.ok(!requests.some(url => url.includes('pe-checkout-enhancements.')))
    checks.push('checkout helper absent from catalog requests')
    const categoryResponse = await navigate(page, origin + config.category)
    const category = readContext(await categoryResponse.text())
    assert.equal(category.body._id, snapshot.routes[1].route._id)
    assert.equal((await page.$eval('main h1', el => el.textContent.trim())), category.body.title || category.body.name)
    await page.waitForSelector('#search-engine', { timeout: 20000 })
    await page.waitForFunction(() => document.body.textContent.toLowerCase().includes('brigadeiro'))
    checks.push('category and search engine rendered')
    await navigate(page, origin + '/search?term=brigadeiro')
    await page.waitForSelector('#search .search-engine__results', { timeout: 25000 })
    await page.waitForSelector('#search [data-pietro-emb-busca]', { timeout: 25000 })
    const searchMounts = await page.evaluate(() => ({ mounts: window.engineMounts, reservations: document.querySelectorAll('#search [data-pietro-emb-busca]').length }))
    assert.ok(searchMounts.mounts.length >= 2, JSON.stringify(searchMounts))
    assert.equal(searchMounts.reservations, 1)
    checks.push('real Vue search mountpoint replacement and single reservation: ' + JSON.stringify(searchMounts))
    await navigate(page, origin + config.product)
    await page.waitForSelector('#addCart', { timeout: 20000 })
    await page.waitForSelector('.gallery__stage .glide__slide--active img', { visible: true, timeout: 20000 })
    const firstImage = await page.$eval('.gallery__stage .glide__slide--active img', el => ({src: el.currentSrc, priority: el.fetchPriority, width: el.width, height: el.height}))
    if (label === 'candidate') assert.equal(firstImage.priority, 'high')
    const thumbs = await page.$$('.gallery__item:not(.gallery__item--video)')
    if (thumbs.length > 1) {
      const pictures = snapshot.routes[0].context.body.pictures
      const urls = picture => [picture.normal?.url, picture.big?.url].filter(Boolean)
      const photo = async expected => {
        await page.waitForFunction(expected => { const image = document.querySelector('.gallery__stage .glide__slide--active img'); return image?.complete && image.naturalWidth > 0 && expected.includes(image.currentSrc) }, {}, expected)
      }
      await thumbs[1].click(); await photo(urls(pictures[1]))
      assert.equal(await thumbs[1].evaluate(el => el.classList.contains('gallery__item--selected')), true)
      await thumbs[0].click(); await photo(urls(pictures[0]))
      assert.equal(await thumbs[0].evaluate(el => el.classList.contains('gallery__item--selected')), true)
      checks.push('gallery second/first thumbnail navigation')
    }
    await page.click('.gallery__stage .gallery__big-image')
    await page.waitForSelector('.pswp--open', {visible:true,timeout:15000})
    await page.waitForSelector('.pswp--open .pswp__button--close', {visible:true}); await pause(500)
    await page.click('.pswp--open .pswp__button--close')
    await page.waitForSelector('.pswp--open', {hidden:true,timeout:10000})
    await pause(500)
    checks.push('photo zoom opens and closes')
    await page.click('.variations__option')
    await pause(250)
    await page.waitForFunction(() => new URL(location.href).searchParams.has('variation_id'))
    const variationId = new URL(page.url()).searchParams.get('variation_id')
    const expectedVariation = snapshot.routes[0].context.body.variations.find(variation => variation._id === variationId)
    assert.ok(expectedVariation)
    const quantity = await page.$('#product .quantity-selector__input')
    assert.ok(quantity, 'Quantity control missing')
    if (quantity) {
      await quantity.click({ clickCount: 3 }); await quantity.type('2'); await quantity.press('Tab')
    }
    const productName = await page.$eval('.product__name', el => el.textContent.trim())
    await page.click('#addCart')
    await page.waitForFunction(() => Number(document.querySelector('#cart-count')?.textContent) > 0, { timeout: 15000 })
    const cartItem = await page.evaluate(productId => JSON.parse(localStorage.getItem('ecomShoppingCart')).items.find(item => item.product_id === productId), snapshot.routes[0].route._id)
    assert.equal(cartItem.variation_id, variationId)
    assert.equal(cartItem.sku, expectedVariation.sku)
    assert.equal(cartItem.quantity, 2)
    checks.push('product variation/quantity/add to cart: selected SKU and quantity2 confirmed')
    await navigate(page, origin + '/app/#/cart')
    await page.waitForSelector('.cart__btn-checkout', { timeout: 25000 })
    assert.ok((await page.$eval('main', el => el.textContent)).toLowerCase().includes('kraft'))
    assert.equal(Number(await page.$eval('.cart-item__quantity input, .cart-item__quantity select', el => el.value)), 2)
    assert.equal(await page.$eval('.cart-item__name', el => el.getAttribute('title')), cartItem.name)
    const dateAvailable = await page.evaluate(() => typeof window.peDeliveryDate?.textoData === 'function')
    assert.ok(dateAvailable)
    checks.push('cart contains selected product and shared delivery helper')
    await page.click('.cart__btn-checkout')
    await pause(1500)
    const checkout = await page.evaluate(() => ({ hash: location.hash, main: document.querySelector('#spa').innerText.slice(0, 900), helperLoaded: Array.from(document.scripts).some(el => el.src.includes('pe-checkout-enhancements.')) }))
    assert.ok(checkout.hash.includes('checkout'), checkout.hash)
    if (label === 'candidate') assert.ok(checkout.helperLoaded)
    checks.push('checkout route opens without submitting an order')
    await page.screenshot({ path: `${output}/${label}-${width}-checkout.png` })
    assert.deepEqual(errors, [], `${label}/${width} page errors`)
    return { label, width, checks, navigations: page.qaNavigations, pageErrors: errors, productName, checkout }
  } catch (error) {
    await page.screenshot({ path: `${output}/${label}-${width}-failure.png` }).catch(() => {})
    fs.writeFileSync(`${output}/${label}-${width}-failure.json`, JSON.stringify({ url: page.url(), error: error.message, pageErrors: errors, checks, navigations: page.qaNavigations, stack: error.stack }, null, 2))
    throw error
  } finally { await page.browserContext().close() }
}


;(async () => {
  const browser = await launch()
  const result = { status: 'running', results: [], note: config.note, limits: 'No authenticated login, order, payment or Purchase event. Public read APIs remain live.' }
  try {
    for (const label of ['baseline', 'candidate']) for (const width of [1440, 390]) {
      result.results.push(await storefront(browser, config.ports[label], label, width))
      save('browser-regression.json', result)
    }
    result.status = 'passed'
  } catch (error) { result.status = 'failed'; result.error = error.message; throw error }
  finally { save('browser-regression.json', result); await browser.close() }
})().catch(error => { console.error(error.message); process.exitCode = 1 })
