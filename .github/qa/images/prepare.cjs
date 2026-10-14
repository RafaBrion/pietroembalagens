const fs = require('node:fs')
const path = require('node:path')
const { execFileSync, spawnSync } = require('node:child_process')
const { createRequire } = require('node:module')
const assert = require('node:assert/strict')
const config = require('./config.cjs')
const { hash, validateCatalog } = require('./catalog.cjs')
const repository = process.cwd()
fs.mkdirSync(config.reports, { recursive: true })
fs.mkdirSync(config.root, { recursive: true })
const write = (file, value) => fs.writeFileSync(path.join(config.reports, file), JSON.stringify(value, null, 2))
const git = (...args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim()
const candidate = git('rev-parse', 'HEAD')
write('source.json', { baseline: config.baseline, candidate, approvedApplication: config.approvedApplication, note: config.note })
assert.equal(process.versions.node.split('.')[0], '20')
execFileSync('git', ['merge-base', '--is-ancestor', config.baseline, candidate])
execFileSync('git', ['merge-base', '--is-ancestor', config.approvedApplication, candidate])
for (const file of git('diff', '--name-only', config.approvedApplication, candidate).split('\n').filter(Boolean)) {
  assert.ok(file.startsWith('.github/qa/images/') || file === '.github/workflows/validate-images.yml' || file === 'NOTAS.md' || /^docs\//.test(file), 'Application drift: ' + file)
}
const work = path.join(config.root, 'build')
function command (program, args, log, env = {}) {
  const descriptor = fs.openSync(path.join(config.reports, log), 'a')
  try {
    const result = spawnSync(program, args, { cwd: work, env: { ...process.env, ...env }, stdio: ['ignore', descriptor, descriptor], timeout: 20 * 60 * 1000 })
    if (result.error) throw result.error
    assert.equal(result.status, 0, `${program} failed; see ${log}`)
  } finally { fs.closeSync(descriptor) }
}
function archive (sha) {
  fs.rmSync(work, { recursive: true, force: true })
  fs.mkdirSync(work, { recursive: true })
  const archive = path.join(config.root, 'source.tar')
  const descriptor = fs.openSync(archive, 'w')
  try { execFileSync('git', ['archive', sha], { cwd: repository, stdio: ['ignore', descriptor, 'inherit'] }) } finally { fs.closeSync(descriptor) }
  execFileSync('tar', ['-xf', archive, '-C', work])
  fs.unlinkSync(archive)
}
;(async () => {
  let snapshot
  for (const [label, sha] of [['baseline', config.baseline], ['candidate', candidate]]) {
    archive(sha)
    command('npm', ['ci', '--omit=dev', '--no-audit', '--no-fund'], label + '-install.log')
    command('npm', ['ci', '--prefix', '.functions', '--omit=dev', '--no-audit', '--no-fund'], label + '-install.log')
    if (!snapshot) {
      // Public SDK reads only. No request headers/cookies are retained.
      process.chdir(work)
      process.env.NODE_ENV = 'production'
      const local = createRequire(path.join(work, 'package.json'))
      const renderer = path.dirname(local.resolve('@ecomplus/storefront-renderer/package.json'))
      const data = await local(path.join(renderer, 'src/lib/get-store-data.js'))()
      const Router = local('@ecomplus/storefront-router')
      const router = new Router(51395)
      const routes = []
      for (const pathname of [config.product, config.category]) {
        const route = await router.map(pathname)
        routes.push({ route, context: await router.resolve(route) })
      }
      snapshot = validateCatalog({ storeId: 51395, capturedAt: new Date().toISOString(), storeData: { data }, routes }, [config.product, config.category])
      fs.writeFileSync(path.join(config.root, 'catalog.json'), JSON.stringify(snapshot))
      write('catalog-provenance.json', {
        capturedAt: snapshot.capturedAt, storeId: 51395, source: 'E-Com Plus public read APIs via SDK; no supplied credentials',
        storeDataSha256: hash(snapshot.storeData), snapshotSha256: hash(snapshot),
        routes: routes.map(({ route, context }) => ({ ...route, bodySha256: hash(context.body) })),
        note: 'Snapshot content stays in RUNNER_TEMP, excluded from artifacts. Browser APIs and CDN remain live.'
      })
    }
    fs.writeFileSync(path.join(work, '.ecom.json'), JSON.stringify(snapshot.storeData))
    const buildEnv = {
      STORE_DATA_FROM_CACHE: 'true', STORE_DATA_CACHE_PATH: path.join(work, '.ecom.json'),
      IMAGE_QA_CATALOG: path.join(config.root, 'catalog.json'),
      NODE_OPTIONS: '--unhandled-rejections=strict --require ' + path.join(__dirname, 'freeze.cjs')
    }
    command('bash', ['-e', '-o', 'pipefail', '-c', 'node --test tests/*.test.cjs'], label + '-tests.log')
    command('npm', ['run', 'build', '--', '--prerender=' + config.pages.join(','), '--prerender-limit=0'], label + '-build.log', buildEnv)
    command('node', ['-e', "const v=require('./.github/scripts/verify-deploy.cjs');v.checkBuild(process.cwd());v.prepareSsr(process.cwd())"], label + '-build.log')
    for (const file of ['template/pages/@/sections/banner-slider.ejs', 'template/pages/@/sections/inc/banner.ejs', 'template/pages/@/sections/product-block.ejs', 'template/scss/custom-css/_personalized-boxes.scss', 'storefront.webpack.js']) {
      assert.equal(hash(fs.readFileSync(path.join(work, file))), hash(execFileSync('git', ['show', sha + ':' + file], { cwd: repository })), 'Build changed reviewed input: ' + file)
    }
    fs.renameSync(work, path.join(config.root, label))
    write(label + '-build.json', { sha, status: 'passed', storeDataSha256: hash(snapshot.storeData), physicalBuildPath: work, pages: config.pages })
  }
})().catch(error => { write('prepare-failure.json', { error: error.message, note: config.note }); console.error(error.message); process.exitCode = 1 })
