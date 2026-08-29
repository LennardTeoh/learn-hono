import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const stage = Number(process.argv[process.argv.indexOf('--stage') + 1] || 0)
const read = (file) => readFile(file, 'utf8')
const required = async (file, needles) => {
  if (!existsSync(file)) throw new Error(`${file} is missing`)
  const text = await read(file)
  for (const needle of needles) if (!text.includes(needle)) throw new Error(`${file} is missing “${needle}”`)
}
const pass = (message) => console.log(`✓ ${message}`)

try {
  await required('frontend/index.html', ['PetitBakery', 'pb-hero', 'pb-category-grid', 'pb-product-grid', 'pb-faq', '/products/'])
  await required('frontend/styles.css', ['--pb-cream', '.pb-hero', '.pb-product-grid'])
  for (const route of ['products', 'product', 'cart', 'checkout', 'login', 'register', 'account', 'verify', 'verification', 'resend-verification', 'forgot-password', 'reset-password']) await required(`frontend/${route}/index.html`, ['PetitBakery'])
  await required('frontend/assets/images/petitbakery-hero-cake.png', [])
  await required('frontend/js/product-images.js', ['prod_strawberry_cloud', 'prod_caramel_bonbon', '/assets/images/products/'])
  for (const image of ['strawberry-cloud', 'chocolate-fudge', 'lemon-tart', 'butter-croissant', 'strawberry-danish', 'cinnamon-roll', 'sea-salt-cookie', 'brown-butter-cookie', 'pistachio-cookie', 'truffle-box', 'dark-bark', 'caramel-bonbon']) await required(`frontend/assets/images/products/${image}.png`, [])
  await required('.env.example', ['BETTER_AUTH_SECRET', 'RESEND_API_KEY', 'CLOUDFLARE_API_TOKEN'])
  pass('PetitBakery storefront shell is present')

  if (!stage || stage >= 2) {
    await required('backend/migrations/0002_seed_products.sql', ['Cakes', 'Pastries', 'Cookies', 'Chocolates'])
    await required('frontend/js/home.js', ['/api/products'])
    await required('frontend/js/products.js', ['/api/products', 'category'])
    pass('Bakery catalogue and cart entry points are present')
  }
  if (!stage || stage >= 3) {
    await required('backend/src/index.ts', ['/api/auth', '/api/products', '/api/orders'])
    await required('backend/src/lib/auth.ts', ['betterAuth', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', "sameSite: 'none'", 'sendVerificationEmail', 'sendResetPassword'])
    await required('backend/src/routes/orders.ts', ['price_cents', 'Idempotency-Key', 'requireUser', "Origin') !== c.env.CORS_ORIGIN"])
    await required('backend/migrations/0003_better_auth_cutover.sql', ['CREATE TABLE "user"', 'CREATE TABLE session', 'CREATE TABLE account', 'CREATE TABLE verification', 'REFERENCES "user"'])
    await required('scripts/migration-preflight.mjs', ['FROM users', 'FROM orders', 'refusing Better Auth cutover'])
    if (existsSync('backend/src/routes/auth.ts') || existsSync('backend/src/lib/session.ts') || existsSync('backend/src/lib/crypto.ts')) throw new Error('Legacy custom-auth code remains')
    const typecheck = spawnSync('npm', ['--prefix', 'backend', 'run', 'typecheck'], { stdio: 'inherit' })
    if (typecheck.status !== 0) throw new Error('Backend typecheck failed')
    pass('Hono routes and trusted checkout checks are present')
  }
  if (!stage || stage >= 4) {
    await required('backend/wrangler.jsonc', ['petitbakery-api', 'petitbakery-db', 'd1_databases', 'onboarding@resend.dev'])
    await required('.github/workflows/cloudflare.yml', ['CLOUDFLARE_API_TOKEN', 'BETTER_AUTH_SECRET', 'RESEND_API_KEY', 'wrangler pages deploy'])
    await required('frontend/_headers', ['Content-Security-Policy', 'frame-ancestors'])
    await required('README.md', ['Cloudflare Pages', 'Cloudflare deployment'])
    pass('Cloudflare deployment configuration is present')
  }
  console.log(stage ? `Stage ${stage} ready.` : 'All PetitBakery checks passed.')
} catch (error) {
  console.error(`✗ ${error.message}`)
  process.exit(1)
}
