-- Migration: 017_add_currency_to_items
-- Description: Add currency column to items table for purchase price currency

-- Add currency column to items table
ALTER TABLE items
ADD COLUMN currency TEXT DEFAULT 'GBP';

-- Add comment for documentation
COMMENT ON COLUMN items.currency IS 'Currency code for purchase_price (e.g., GBP, USD, EUR)';

-- Create index for potential currency-based queries
CREATE INDEX IF NOT EXISTS items_currency_idx ON items(currency);
