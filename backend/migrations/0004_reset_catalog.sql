-- Recreate the application schema from empty state, then seed products only.
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS verification;
DROP TABLE IF EXISTS "user";
DROP TABLE IF EXISTS legacy_order_items;
DROP TABLE IF EXISTS legacy_orders;
DROP TABLE IF EXISTS legacy_email_verification_tokens;
DROP TABLE IF EXISTS legacy_password_reset_tokens;
DROP TABLE IF EXISTS legacy_sessions;
DROP TABLE IF EXISTS legacy_users;
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS rate_limits;

CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

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

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);

INSERT INTO products
(id, slug, name, description, category, price_cents, stock, image_url, active, created_at)
VALUES
('prod_strawberry_cloud', 'strawberry-cloud', 'Strawberry Cloud Cake', 'Vanilla sponge, whipped cream and bright strawberries for a soft little celebration.', 'Cakes', 14800, 12, 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=1200&q=85', 1, unixepoch()),
('prod_chocolate_fudge', 'chocolate-fudge', 'Midnight Fudge Cake', 'A rich chocolate crumb with silky ganache and a gentle sea-salt finish.', 'Cakes', 16800, 9, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=85', 1, unixepoch()),
('prod_lemon_tart', 'lemon-tart', 'Lemon Meringue Tart', 'Buttery shortcrust, sharp lemon curd and a cloud of toasted meringue.', 'Cakes', 12800, 8, 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=1200&q=85', 1, unixepoch()),
('prod_butter_croissant', 'butter-croissant', 'Butter Croissant', 'Flaky, golden layers made with cultured butter and a slow overnight proof.', 'Pastries', 900, 30, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=85', 1, unixepoch()),
('prod_strawberry_danish', 'strawberry-danish', 'Strawberry Danish', 'Laminated pastry, vanilla cream and a jewel-bright strawberry centre.', 'Pastries', 1200, 22, 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=85', 1, unixepoch()),
('prod_cinnamon_roll', 'cinnamon-roll', 'Cinnamon Morning Roll', 'Soft spiral dough with brown sugar, cinnamon and a little cream cheese glaze.', 'Pastries', 1100, 24, 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=1200&q=85', 1, unixepoch()),
('prod_sea_salt_cookie', 'sea-salt-cookie', 'Sea Salt Chocolate Cookie', 'Crisp edges, a soft middle and dark chocolate puddles with flaky sea salt.', 'Cookies', 850, 40, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=85', 1, unixepoch()),
('prod_brown_butter_cookie', 'brown-butter-cookie', 'Brown Butter Cookie', 'Toasty brown butter, roasted pecans and a warm vanilla crumb.', 'Cookies', 850, 35, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1200&q=85', 1, unixepoch()),
('prod_pistachio_cookie', 'pistachio-cookie', 'Pistachio Shortbread', 'Tender shortbread with roasted pistachio and a clean, buttery snap.', 'Cookies', 950, 28, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1200&q=85', 1, unixepoch()),
('prod_truffle_box', 'truffle-box', 'Petit Truffle Box', 'Six glossy chocolate truffles with ganache centres and tiny finishing salts.', 'Chocolates', 2200, 18, 'https://images.unsplash.com/photo-1548907040-4d42e42f4b80?auto=format&fit=crop&w=1200&q=85', 1, unixepoch()),
('prod_dark_bark', 'dark-bark', 'Almond Dark Bark', 'Snappy dark chocolate scattered with toasted almonds and dried fruit.', 'Chocolates', 1800, 16, 'https://images.unsplash.com/photo-1575377427642-087cf684f04d?auto=format&fit=crop&w=1200&q=85', 1, unixepoch()),
('prod_caramel_bonbon', 'caramel-bonbon', 'Salted Caramel Bonbons', 'Glossy milk chocolate shells hiding a soft salted caramel centre.', 'Chocolates', 2400, 14, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=85', 1, unixepoch());

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

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (key, window_start)
);

PRAGMA foreign_keys = ON;
