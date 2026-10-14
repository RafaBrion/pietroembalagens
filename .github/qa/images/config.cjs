const path = require('node:path')

module.exports = {
  baseline: 'e78a30ccbf03e3b15f25ffdd5e29cd075678306f',
  approvedApplication: 'fde272c17e8a4703afc17edaa61fd23b88306783',
  product: '/caixa-c-berco-p-4-brigadeiros-kraft-e-tampa-de-papel',
  category: '/caixas-embalagens-para-doces-e-brigadeiro',
  root: path.resolve(process.env.IMAGE_QA_ROOT || path.join(process.env.RUNNER_TEMP || '/tmp', 'pietro-image-qa')),
  reports: path.resolve(process.env.IMAGE_QA_REPORTS || path.join(process.env.RUNNER_TEMP || '/tmp', 'pietro-image-reports')),
  ports: { baseline: 9402, candidate: 9403, switch: 9404, canary: 9405 },
  pages: ['index', 'app/index', 'search', '404', 'blog', 'admin/index'],
  note: 'HOLD: laboratório SSR local com catálogo público fixo; CI verde não autoriza merge/deploy nem comprova ganho público.'
}
