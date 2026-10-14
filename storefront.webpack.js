const path = require('path')
const fs = require('fs')
const { createHash } = require('crypto')
const { ConcatSource } = require('webpack-sources')

// Workbox precaches /app/index.html but its manifest contains only the main
// bundle. Shared head and priority-image templates must also change worker bytes.
class CheckoutHtmlRevisionPlugin {
  apply (compiler) {
    compiler.hooks.emit.tap('CheckoutHtmlRevisionPlugin', compilation => {
      const worker = compilation.assets['sw.js']
      if (!worker) throw new Error('Expected production service worker sw.js')
      const head = fs.readFileSync(path.join(__dirname, 'template/pages/@/head.ejs'), 'utf8')
      const hash = createHash('sha256')
      hash.update(JSON.parse(fs.readFileSync(path.join(__dirname, 'content/code.json'), 'utf8')).html_head)
      hash.update(head)
      // Reinstall the worker when precached home HTML changes without a new bundle.
      ;[
        'template/pages/@/sections/banner-slider.ejs',
        'template/pages/@/sections/inc/banner.ejs',
        'template/pages/@/sections/product-block.ejs'
      ].forEach(filename => {
        hash.update(filename)
        hash.update(fs.readFileSync(path.join(__dirname, filename)))
      })
      const helpers = head.match(/pe-checkout-enhancements\.[a-f0-9]+\.js/g) || []
      helpers.forEach(filename => hash.update(fs.readFileSync(path.join(__dirname, 'template/public/assets', filename))))
      compilation.assets['sw.js'] = new ConcatSource(
        `self.__PE_CHECKOUT_HTML_REVISION = ${JSON.stringify(hash.digest('hex'))};\n`,
        worker
      )
    })
  }
}

const dirSearchAlias = path.resolve(__dirname, 'template/js/lib/search-engine')
const pathDslAlias = path.resolve(dirSearchAlias, 'dsl')

module.exports = ({ devMode } = {}) => ({
  plugins: devMode ? [] : [new CheckoutHtmlRevisionPlugin()],
  resolve: {
    alias: {
      './lib/dsl': pathDslAlias,
      './../lib/dsl': pathDslAlias,
      './base-config/sections': path.resolve(__dirname, 'template/js/custom-js/cms/sections.js'),
      './html/ProductCard.html': path.resolve(__dirname, 'template/js/custom-js/html/ProductCard.html'),
      './js/ProductCard.js': path.resolve(__dirname, 'template/js/custom-js/js/ProductCard.js'),
      './js/BuyTogether.js': path.resolve(__dirname, 'template/js/custom-js/js/BuyTogether.js'),
      './html/TheProduct.html': path.resolve(__dirname, 'template/js/custom-js/html/TheProduct.html'),
      './js/TheProduct.js': path.resolve(__dirname, 'template/js/custom-js/js/TheProduct.js'),
      './html/PaymentMethods.html': path.resolve(__dirname, 'template/js/custom-js/html/PaymentMethods.html'),
      './js/PaymentMethods.js': path.resolve(__dirname, 'template/js/custom-js/js/PaymentMethods.js'),
      './html/SearchEngine.html': path.resolve(__dirname, 'template/js/custom-js/html/SearchEngine.html'),
      './js/SearchEngine.js': path.resolve(__dirname, 'template/js/custom-js/js/SearchEngine.js'),
      './js/TheCart.js': path.resolve(__dirname, 'template/js/custom-js/js/TheCart.js'),
      './html/TheCart.html': path.resolve(__dirname, 'template/js/custom-js/html/TheCart.html'),
      './js/CartQuickview.js': path.resolve(__dirname, 'template/js/custom-js/js/CartQuickview.js'),
      './html/CartQuickview.html': path.resolve(__dirname, 'template/js/custom-js/html/CartQuickview.html'),
      './html/ShippingCalculator.html': path.resolve(__dirname, 'template/js/custom-js/html/ShippingCalculator.html'),
      './js/ShippingCalculator.js': path.resolve(__dirname, 'template/js/custom-js/js/ShippingCalculator.js')
    }
  }
})
