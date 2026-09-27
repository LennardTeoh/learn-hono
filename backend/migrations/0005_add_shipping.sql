-- Add status and tracking columns to your existing orders table
ALTER TABLE orders ADD COLUMN tracking_number TEXT DEFAULT NULL;
