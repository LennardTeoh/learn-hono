const PRODUCT_IMAGES = {
  prod_strawberry_cloud: '/assets/images/products/strawberry-cloud.png',
  prod_chocolate_fudge: '/assets/images/products/chocolate-fudge.png',
  prod_lemon_tart: '/assets/images/products/lemon-tart.png',
  prod_butter_croissant: '/assets/images/products/butter-croissant.png',
  prod_strawberry_danish: '/assets/images/products/strawberry-danish.png',
  prod_cinnamon_roll: '/assets/images/products/cinnamon-roll.png',
  prod_sea_salt_cookie: '/assets/images/products/sea-salt-cookie.png',
  prod_brown_butter_cookie: '/assets/images/products/brown-butter-cookie.png',
  prod_pistachio_cookie: '/assets/images/products/pistachio-cookie.png',
  prod_truffle_box: '/assets/images/products/truffle-box.png',
  prod_dark_bark: '/assets/images/products/dark-bark.png',
  prod_caramel_bonbon: '/assets/images/products/caramel-bonbon.png'
}

export function imageForProduct(product) {
  return PRODUCT_IMAGES[product.id] || product.image_url
}

export function imageForCartItem(item) {
  return PRODUCT_IMAGES[item.productId] || item.imageUrl
}
