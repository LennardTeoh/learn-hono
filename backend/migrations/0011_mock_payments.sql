ALTER TABLE orders ADD COLUMN mock_method TEXT CHECK (mock_method IN ('qr', 'card'));
ALTER TABLE orders ADD COLUMN paid_at INTEGER;
ALTER TABLE orders ADD COLUMN active_attempt_id TEXT;

CREATE TABLE payment_attempts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  method TEXT NOT NULL CHECK (method IN ('qr', 'card')),
  status TEXT NOT NULL CHECK (status IN ('active', 'successful', 'declined', 'replaced')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  token_hash TEXT UNIQUE,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
CREATE INDEX idx_payment_attempts_order ON payment_attempts(order_id);

-- A failed guard aborts the whole D1 batch, including stock changes.
CREATE TABLE payment_confirmations (
  attempt_id TEXT PRIMARY KEY REFERENCES payment_attempts(id),
  valid INTEGER NOT NULL CHECK (valid = 1)
);
