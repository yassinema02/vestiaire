-- Migration 039: Add resale_status to items table
-- Story 13.3: One-Tap Resale Listing

-- Add resale_status column to items
ALTER TABLE items ADD COLUMN IF NOT EXISTS resale_status TEXT CHECK (resale_status IN ('listed', 'sold', 'donated'));

-- Index for filtering by resale status
CREATE INDEX IF NOT EXISTS idx_items_resale_status ON items(user_id, resale_status);

-- Backfill: mark items that have active resale listings as 'listed'
UPDATE items
SET resale_status = 'listed'
WHERE id IN (
    SELECT DISTINCT item_id FROM resale_listings WHERE status = 'listed'
)
AND resale_status IS NULL;

-- Backfill: mark items that have sold resale listings as 'sold'
UPDATE items
SET resale_status = 'sold'
WHERE id IN (
    SELECT DISTINCT item_id FROM resale_listings WHERE status = 'sold'
)
AND resale_status IS NULL;
