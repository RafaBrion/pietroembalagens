const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const code = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/code.json')))
const scripts = Array.from(code.html_body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g), match => match[1])
const desktop = scripts.find(source => source.includes('function lerCategorias(sall)'))
const mobile = scripts.find(source => source.includes('function filhosDe(panelId)'))
const search = scripts.find(source => source.includes('data-pietro-emb-reserva'))

function environment (elements = {}) {
  const observers = []
  const timers = new Map()
  let nextTimer = 1
  const context = {
    document: { readyState: 'complete', body: {}, getElementById: id => elements[id] || null, addEventListener () {} },
    location: { pathname: '/search', search: '?term=brigadeiro' },
    URLSearchParams,
    MutationObserver: class {
      constructor (callback) { this.callback = callback; this.active = false; observers.push(this) }
      observe (target) { this.target = target; this.active = true }
      disconnect () { this.active = false }
    },
    setTimeout: (callback, delay) => { const id = nextTimer++; timers.set(id, { callback, delay }); return id },
    clearTimeout: id => timers.delete(id),
    setInterval: () => { throw new Error('Menu initialization must not poll') }
  }
  context.window = { MutationObserver: context.MutationObserver }
  return { context, observers, timers, run: source => vm.runInNewContext(source, context) }
}

test('all inline body scripts compile: these scripts are outside the webpack syntax checks', () => {
  assert.ok(desktop && mobile && search)
  for (const source of scripts) assert.doesNotThrow(() => new vm.Script(source))
})

test('pages without SSR menu containers create no construction observer or polling timer', () => {
  const f = environment()
  f.run(desktop); f.run(mobile)
  assert.equal(f.observers.length, 0)
  assert.equal(f.timers.size, 0)
})

test('an incomplete mobile list stays unmarked and releases its observer at the deadline', () => {
  const attributes = {}
  const root = { setAttribute: (key, value) => { attributes[key] = value } }
  const nav = { querySelector: () => null }
  const f = environment({ 'accordion-menu': root, 'categories-nav': nav })
  f.run(mobile)
  assert.equal(attributes['data-pe-m'], undefined)
  assert.equal(f.observers.length, 1)
  assert.equal(f.observers[0].target, root)
  assert.equal(f.observers[0].active, true)
  const timer = Array.from(f.timers.values())[0]
  assert.equal(timer.delay, 20000)
  timer.callback()
  assert.equal(f.observers[0].active, false)
  assert.equal(f.timers.size, 0)
})

function searchFixture (mounted) {
  const inserted = []
  const results = { parentNode: { insertBefore: node => inserted.push(node) } }
  const state = { results: mounted ? results : null }
  const wrapper = { querySelector: selector => selector === '.search-engine__results' ? state.results : inserted[0] || null }
  const f = environment({ search: wrapper })
  f.context.document.createElement = () => ({ attributes: {}, setAttribute (key, value) { this.attributes[key] = value } })
  return { ...f, wrapper, results, inserted, state }
}

test('already mounted search results receive their reservation immediately without an observer', () => {
  const f = searchFixture(true)
  f.run(search)
  assert.equal(f.inserted.length, 1)
  assert.equal(f.inserted[0].attributes['data-pietro-emb-reserva'], 'chips')
  assert.equal(f.observers.length, 0)
  assert.equal(f.timers.size, 0)
})

test('late search results are discovered through the stable wrapper and release the observer and timer', () => {
  const f = searchFixture(false)
  f.run(search)
  assert.equal(f.observers[0].target, f.wrapper)
  assert.equal(f.timers.size, 1)
  // Vue replaces the engine; the parent wrapper remains and now contains results.
  f.state.results = f.results
  f.observers[0].callback()
  assert.equal(f.inserted.length, 1)
  assert.equal(f.observers[0].active, false)
  assert.equal(f.timers.size, 0)
})
