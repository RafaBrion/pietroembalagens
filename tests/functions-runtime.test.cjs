const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { checkConfiguration } = require('../.github/scripts/verify-functions-runtime.cjs')

function fixture (t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'functions-runtime-'))
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }))
  const write = (name, value) => {
    const file = path.join(cwd, name)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(value))
  }
  write('firebase.json', { functions: { source: '.functions' } })
  write('.functions/package.json', { engines: { node: '22' } })
  write('.functions/package-lock.json', { packages: { '': { engines: { node: '22' } } } })
  return { cwd, write }
}

test('Functions validation rejects the Node 20 fallback used by the Firebase CLI', t => {
  const { cwd } = fixture(t)
  assert.equal(checkConfiguration(cwd, '22.1.0'), path.join(cwd, '.functions'))
  for (const version of ['20.20.2', '24.0.0', 'invalid']) {
    assert.throws(() => checkConfiguration(cwd, version), /require a Node 22 process/)
  }
})

test('Functions runtime rejects package/lockfile drift and overriding Firebase configuration', t => {
  const { cwd, write } = fixture(t)
  write('.functions/package-lock.json', { packages: { '': { engines: { node: '20' } } } })
  assert.throws(() => checkConfiguration(cwd, '22.1.0'), /package and lockfile/)
  write('.functions/package-lock.json', { packages: { '': { engines: { node: '22' } } } })
  write('firebase.json', { functions: { source: '.functions', runtime: 'nodejs20' } })
  assert.throws(() => checkConfiguration(cwd, '22.1.0'), /override/)
})
