// Serializable browser function: works before and after gallery hydration.
function inspectHero () {
  const stage = document.querySelector('.gallery__stage')
  const banner = document.querySelector('.banner-slider img')
  const image = banner || stage?.querySelector('.product__picture img') || document.querySelector('#product-gallery .product__picture img')
  if (!image) return null
  const rect = image.getBoundingClientRect()
  return {
    url: image.currentSrc, priority: image.fetchPriority,
    natural: [image.naturalWidth, image.naturalHeight],
    rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
    mode: banner ? 'banner' : stage?.contains(image) ? 'hydrated' : 'SSR',
    galleryReady: Boolean(stage),
    visible: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
  }
}
module.exports = { inspectHero }
