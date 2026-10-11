import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = (await readFile('frontend/js/payment.js', 'utf8'))
  .replace(/^import .*\n/gm, '')
  .replace(/init\(\)\.catch\(.*\)\s*$/, 'return init()')
const payment = new Function('api', 'getCurrentUser', 'clearCart', 'getCart', 'cartSubtotal', 'money', 'renderShell', 'setBusy', 'toast', 'document', 'location', 'sessionStorage', 'crypto', source)

async function visit({ signedIn = true, items = [{ productId: 'bag', priceCents: 10000, quantity: 1 }], checkout = { items: [{ productId: 'bag', quantity: 1 }], deliveryMethod: 'delivery', state: 'Sabah', idempotencyKey: 'checkout-key' }, alias = false, submit }) {
  const saved = new Map(checkout ? [['lumiere_checkout', JSON.stringify(checkout)]] : [])
  const calls = []
  const errors = []
  const location = { href: '' }
  const root = { innerHTML: '' }
  const button = { disabled: false, textContent: 'Place demo order', addEventListener(_, listener) { this.click = () => listener({ currentTarget: this }) } }
  let cleared = 0
  const document = { getElementById(id) { return id === 'complete-btn' ? button : id === (alias ? 'card-payment-root' : 'payment-root') ? root : null } }
  const sessionStorage = { getItem: (key) => saved.get(key) || null, setItem: (key, value) => saved.set(key, value), removeItem: (key) => saved.delete(key) }
  await payment(
    async (path, options) => { calls.push({ path, options }); return submit ? submit() : { orderId: 'order-1' } },
    async () => signedIn ? { id: 'user-1' } : null,
    () => { cleared++ }, () => items,
    () => items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
    (cents) => `RM${(cents / 100).toFixed(2)}`,
    async () => {},
    (target, busy) => { target.disabled = busy },
    (message) => errors.push(message),
    document, location, sessionStorage, globalThis.crypto
  )
  return { root, button, calls, errors, location, saved, get cleared() { return cleared } }
}

const delivery = await visit({})
assert.match(delivery.root.innerHTML, /Review your order/)
assert.match(delivery.root.innerHTML, /Shipping.*RM30\.00/s)
assert.match(delivery.root.innerHTML, /Tax.*RM6\.00/s)
assert.match(delivery.root.innerHTML, /Estimated total.*RM136\.00/s)
assert.doesNotMatch(delivery.root.innerHTML, /DuitNow|Card Number|Simulate payment/)
await delivery.button.click()
assert.equal(delivery.calls[0].path, '/api/orders')
assert.equal(delivery.calls[0].options.headers['Idempotency-Key'], 'checkout-key')
assert.equal(delivery.location.href, '/receipt/?id=order-1')
assert.equal(delivery.cleared, 1)
assert.equal(delivery.saved.has('lumiere_checkout'), false)

const pickup = await visit({ alias: true, checkout: { items: [{ productId: 'bag', quantity: 1 }], deliveryMethod: 'pickup', state: 'Sabah', idempotencyKey: 'pickup-key' } })
assert.match(pickup.root.innerHTML, /Pickup.*Free/s)
assert.match(pickup.root.innerHTML, /Estimated total.*RM106\.00/s)
await pickup.button.click()
assert.equal(pickup.calls[0].options.headers['Idempotency-Key'], 'pickup-key')

assert.equal((await visit({ signedIn: false })).location.href, '/login/?next=/checkout/')
assert.equal((await visit({ items: [] })).location.href, '/checkout/')

let attempts = 0
const retry = await visit({ submit: () => ++attempts === 1 ? Promise.reject(new Error('Try again')) : { orderId: 'order-2' } })
await retry.button.click()
assert.deepEqual(retry.errors, ['Try again'])
assert.equal(retry.button.disabled, false)
assert.equal(retry.saved.has('lumiere_checkout'), true)
await retry.button.click()
assert.equal(retry.calls[0].options.headers['Idempotency-Key'], retry.calls[1].options.headers['Idempotency-Key'])
assert.equal(retry.location.href, '/receipt/?id=order-2')

const checkoutHtml = await readFile('frontend/checkout/index.html', 'utf8')
assert.ok(checkoutHtml.indexOf('</form>') < checkoutHtml.indexOf('<aside id="order-summary"'))
console.log('Payment journey check passed.')
