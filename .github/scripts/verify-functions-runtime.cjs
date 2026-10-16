const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')

function checkConfiguration (cwd, nodeVersion) {
  const read = name => JSON.parse(fs.readFileSync(path.join(cwd, name)))
  const config = read('firebase.json')
  const source = config.functions?.source
  if (typeof source !== 'string' || !source.length) throw new Error('A single Functions source is required')
  const pkg = read(path.join(source, 'package.json'))
  const lock = read(path.join(source, 'package-lock.json'))
  if (pkg.engines?.node !== '22' || lock.packages?.['']?.engines?.node !== '22') {
    throw new Error('Functions package and lockfile must both select Node 22')
  }
  if (config.functions.runtime && config.functions.runtime !== 'nodejs22') {
    throw new Error('Firebase runtime override differs from Node 22')
  }
  if (String(nodeVersion).split('.')[0] !== '22') {
    throw new Error('Functions installation, validation and deployment require a Node 22 process')
  }
  return path.resolve(cwd, source)
}

function checkRuntime (cwd) {
  const source = checkConfiguration(cwd, process.versions.node)
  const localRequire = createRequire(path.join(cwd, 'package.json'))
  const { getRuntimeChoice } = localRequire('firebase-tools/lib/deploy/functions/runtimes/node/parseRuntimeAndValidateSDK')
  const { Delegate } = localRequire('firebase-tools/lib/deploy/functions/runtimes/node')
  const runtime = getRuntimeChoice(source)
  if (runtime !== 'nodejs22') throw new Error('Firebase CLI did not select nodejs22')
  const delegate = new Delegate('runtime-validation', cwd, source, runtime)
  const binary = fs.realpathSync(delegate.bin)
  if (binary !== fs.realpathSync(process.execPath)) {
    throw new Error('Firebase trigger discovery must use the verified Node 22 executable')
  }
  return { runtime, node: process.version, binary, firebaseTools: localRequire('firebase-tools/package.json').version }
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(checkRuntime(process.cwd())))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

module.exports = { checkConfiguration, checkRuntime }
