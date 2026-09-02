-- Preserve the legacy account and order tables while moving the app to Better Auth.
-- Legacy passwords and sessions are retained for rollback, but users must reset
-- their password before signing in because Better Auth uses a different hash format.
PRAGMA foreign_keys = OFF;

DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_email_verification_user;
DROP INDEX IF EXISTS idx_email_verification_token;
DROP INDEX IF EXISTS idx_password_reset_user;
DROP INDEX IF EXISTS idx_password_reset_token;
DROP INDEX IF EXISTS idx_sessions_user;
DROP INDEX IF EXISTS idx_sessions_expiry;
DROP INDEX IF EXISTS idx_orders_user_idempotency;
DROP INDEX IF EXISTS idx_orders_user;
DROP INDEX IF EXISTS idx_order_items_order;

ALTER TABLE users RENAME TO legacy_users;
ALTER TABLE email_verification_tokens RENAME TO legacy_email_verification_tokens;
ALTER TABLE password_reset_tokens RENAME TO legacy_password_reset_tokens;
ALTER TABLE sessions RENAME TO legacy_sessions;
ALTER TABLE order_items RENAME TO legacy_order_items;
ALTER TABLE orders RENAME TO legacy_orders;

CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt)
SELECT id, display_name, email, email_verified, created_at, updated_at
FROM legacy_users;

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  expiresAt INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX idx_session_userId ON session(userId);

CREATE TABLE account (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX idx_account_userId ON account(userId);

CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX idx_verification_identifier ON verification(identifier);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id),
  status TEXT NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  shipping_name TEXT NOT NULL,
  address1 TEXT NOT NULL,
  address2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_orders_user_idempotency ON orders(user_id, idempotency_key);
CREATE INDEX idx_orders_user ON orders(user_id);

INSERT INTO orders
  (id, user_id, status, subtotal_cents, shipping_cents, tax_cents, total_cents,
   shipping_name, address1, address2, city, postal_code, country, idempotency_key, created_at)
SELECT id, user_id, status, subtotal_cents, shipping_cents, tax_cents, total_cents,
       shipping_name, address1, address2, city, postal_code, country, idempotency_key, created_at
FROM legacy_orders;

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

INSERT INTO order_items
  (id, order_id, product_id, product_name, unit_price_cents, quantity)
SELECT id, order_id, product_id, product_name, unit_price_cents, quantity
FROM legacy_order_items;

PRAGMA foreign_keys = ON;
