-- Migration 020: Add wishlist flag to shopping_scans
-- Story 8.7: Shopping Wishlist

ALTER TABLE shopping_scans ADD COLUMN is_wishlisted BOOLEAN DEFAULT FALSE;

-- Partial index for efficient wishlist queries (only indexes wishlisted rows)
CREATE INDEX idx_shopping_scans_wishlist
    ON shopping_scans (user_id, created_at DESC)
    WHERE is_wishlisted = TRUE;
