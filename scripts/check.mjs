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
  await required('frontend/index.html', ['PetitBakery', 'pb-hero', 'pb-category-grid', 'pb-product-grid', 'pb-faq'])
  await required('frontend/styles.css', ['--pb-cream', '.pb-hero', '.pb-product-grid'])
  pass('PetitBakery storefront shell is present')

  if (!stage || stage >= 2) {
    await required('backend/migrations/0002_seed_products.sql', ['Cakes', 'Pastries', 'Cookies', 'Chocolates'])
    await required('frontend/js/home.js', ['/api/products', 'data-category-link'])
    pass('Bakery catalogue and cart entry points are present')
  }
  if (!stage || stage >= 3) {
    await required('backend/src/index.ts', ['/api/auth', '/api/products', '/api/orders'])
    await required('backend/src/routes/orders.ts', ['price_cents', 'Idempotency-Key', 'csrfMatches'])
    const typecheck = spawnSync('npm', ['--prefix', 'backend', 'run', 'typecheck'], { stdio: 'inherit' })
    if (typecheck.status !== 0) throw new Error('Backend typecheck failed')
    pass('Hono routes and trusted checkout checks are present')
  }
  if (!stage || stage >= 4) {
    await required('backend/wrangler.jsonc', ['petitbakery-api', 'petitbakery-db', 'd1_databases'])
    await required('.github/workflows/cloudflare.yml', ['CLOUDFLARE_API_TOKEN', 'wrangler pages deploy'])
    await required('frontend/_headers', ['Content-Security-Policy', 'frame-ancestors'])
    await required('README.md', ['Cloudflare Pages', 'Cloudflare deployment'])
    pass('Cloudflare deployment configuration is present')
  }
  console.log(stage ? `Stage ${stage} ready.` : 'All PetitBakery checks passed.')
} catch (error) {
  console.error(`✗ ${error.message}`)
  process.exit(1)
}
