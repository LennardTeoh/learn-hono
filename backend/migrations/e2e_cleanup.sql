PRAGMA foreign_keys = ON;

DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM verification;
DELETE FROM session;
DELETE FROM account;
DELETE FROM "user";
DELETE FROM rate_limits;
UPDATE products SET stock = 12 WHERE id = 'prod_strawberry_cloud';
