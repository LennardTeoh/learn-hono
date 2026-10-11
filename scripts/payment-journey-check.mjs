import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Database from '../backend/node_modules/better-sqlite3/lib/index.js'
import { cardFormatError } from '../frontend/js/card-format.js'

const read = (path) => readFile(path, 'utf8')
const [orders, migration, checkout, payment, mock, receipt, account, admin, headers] = await Promise.all([
  'backend/src/routes/orders.ts', 'backend/migrations/0011_mock_payments.sql', 'frontend/js/checkout.js',
  'frontend/js/payment.js', 'frontend/js/mock-pay.js', 'frontend/js/receipt.js', 'frontend/js/account.js',
  'frontend/js/admin.js', 'frontend/_headers'
].map(read))

assert.match(orders, /VALUES \(\?, \?, 'pending_payment'/)
assert.match(orders, /allowedMethods\(subtotal\)/)
assert.match(orders, /subtotal <= QR_LIMIT/)
const methodsExpr = orders.match(/const allowedMethods = \(subtotal: number\) => ([^\n]+)/)?.[1]
const methods = new Function('subtotal', 'QR_LIMIT', `return ${methodsExpr}`)
assert.deepEqual(methods(999_999, 1_000_000), ['qr', 'card'])
assert.deepEqual(methods(1_000_000, 1_000_000), ['qr', 'card'])
assert.deepEqual(methods(1_000_001, 1_000_000), ['card'])
const shippingExpr = orders.match(/const shipping = ([^\n]+)/)?.[1]
const shipping = new Function('deliveryMethod', 'subtotal', 'eastMalaysia', `return ${shippingExpr}`)
assert.equal(shipping('pickup', 10_000, true), 0)
assert.equal(shipping('delivery', 10_000, true), 3_000)
assert.equal(shipping('delivery', 7_999, false), 799)
assert.match(orders, /createdAt \+ 120/)
assert.match(orders, /a\.expires_at > unixepoch\('now'\)/)
assert.match(orders, /c\.env\.DB\.batch\(\[/)
assert.match(orders, /UPDATE products SET stock = stock -/)
assert.match(orders, /UPDATE orders SET status = 'confirmed'/)
assert.match(orders, /await hashToken\(token\)/)
assert.match(orders, /tokenAttempt\(c/)
assert.match(orders, /outcome === 'decline'/)
assert.match(migration, /CREATE TABLE payment_attempts/)
assert.match(migration, /token_hash TEXT UNIQUE/)
assert.match(migration, /CHECK \(valid = 1\)/)
assert.match(checkout, /sessionStorage\.setItem\('lumiere_order_key'/)
assert.match(checkout, /clearCart\(\)/)
assert.match(checkout, /order\.allowedMethods\.includes/)
assert.match(payment, /setInterval\(async \(\) => \{/)
assert.match(payment, /10_000\)/)
assert.equal(cardFormatError('Customer', '4242 4242 4242 4242', '12/29', '123', new Date('2026-10-12')), null)
assert.equal(cardFormatError('Customer', '4000 0000 0000 0002', '12/29', '123', new Date('2026-10-12')), null)
assert.equal(cardFormatError('Customer', '1234 5678 9012 3456', '12/29', '1234', new Date('2026-10-12')), null)
assert.match(cardFormatError('Customer', '123', '12/29', '123', new Date('2026-10-12')), /13 to 19/)
assert.match(cardFormatError('Customer', '1234567890123456', '09/26', '123', new Date('2026-10-12')), /future expiry/)
assert.match(cardFormatError('Customer', '1234567890123456', '12/29', '12', new Date('2026-10-12')), /CVV/)
assert.match(payment, /outcome: 'success'/)
assert.doesNotMatch(payment, /4242424242424242|4000000000000002/)
assert.doesNotMatch(payment, /JSON\.stringify\(\{[^}]*\b(?:number|cvv|expiry|name)\s*:/)
assert.match(mock, /authorize/)
assert.match(receipt, /Pending Payment/)
assert.match(account, /Change payment method/)
assert.match(admin, /order\.status === 'pending_payment' \? 0/)
assert.match(headers, /\/mock-pay\/\*/)
assert.doesNotMatch(await read('frontend/mock-pay/index.html'), /cdn\.|https:\/\/.*\.js/)
for (const path of ['frontend/js/payment.js', 'frontend/js/payment-success.js', 'frontend/js/mock-pay.js', 'frontend/js/checkout.js', 'frontend/checkout/index.html', 'frontend/mock-pay/index.html']) {
  assert.doesNotMatch(await read(path), /Mock payment|Mock QR payment|Test card|mock QR or card payment/i)
}
assert.ok((await read('frontend/checkout/index.html')).indexOf('</form>') < (await read('frontend/checkout/index.html')).indexOf('<aside id="order-summary"'))

// Execute the Worker's confirmation guard against the actual migration schema.
const guard = orders.match(/c\.env\.DB\.prepare\(`(INSERT INTO payment_confirmations[\s\S]*?)`\)\.bind\(attemptId, attemptId, attempt\.order_id\)/)?.[1]
assert.ok(guard, 'Confirmation SQL guard is present')
const db = new Database(':memory:')
db.exec(`CREATE TABLE orders (id TEXT PRIMARY KEY, status TEXT, subtotal_cents INTEGER);
  CREATE TABLE products (id TEXT PRIMARY KEY, stock INTEGER CHECK(stock >= 0), active INTEGER);
  CREATE TABLE order_items (order_id TEXT, product_id TEXT, product_name TEXT, quantity INTEGER);
  ${migration}`)
db.prepare("INSERT INTO products VALUES ('p', 1, 1)").run()
db.prepare("INSERT INTO orders (id,status,subtotal_cents,active_attempt_id) VALUES ('o','pending_payment',100,'a')").run()
db.prepare("INSERT INTO order_items VALUES ('o','p','Piece',1)").run()
const future = Math.floor(Date.now() / 1000) + 120
db.prepare("INSERT INTO payment_attempts (id,order_id,method,status,created_at,expires_at) VALUES ('a','o','card','active',?,?)").run(future - 120, future)
const confirm = db.transaction((attemptId) => {
  db.prepare(guard).run(attemptId, attemptId, 'o')
  db.prepare("UPDATE products SET stock = stock - 1 WHERE id = 'p'").run()
  db.prepare("UPDATE orders SET status = 'confirmed' WHERE id = 'o'").run()
  db.prepare("UPDATE payment_attempts SET status = 'successful' WHERE id = ?").run(attemptId)
})
confirm('a')
assert.equal(db.prepare("SELECT stock FROM products WHERE id = 'p'").get().stock, 0)
assert.throws(() => confirm('a'))
assert.equal(db.prepare("SELECT stock FROM products WHERE id = 'p'").get().stock, 0)
db.prepare("UPDATE orders SET status = 'pending_payment', active_attempt_id = 'b' WHERE id = 'o'").run()
db.prepare("INSERT INTO payment_attempts (id,order_id,method,status,created_at,expires_at) VALUES ('b','o','card','active',?,?)").run(future - 120, future)
assert.throws(() => confirm('b'), /CHECK constraint failed/)
assert.equal(db.prepare("SELECT status FROM orders WHERE id = 'o'").get().status, 'pending_payment')
db.prepare("UPDATE products SET stock = 1 WHERE id = 'p'").run()
db.prepare("UPDATE payment_attempts SET expires_at = 1 WHERE id = 'b'").run()
assert.throws(() => confirm('b'), /CHECK constraint failed/)
db.close()

console.log('Payment journey check passed.')
