-- Vestiaire: Add is_favorite to outfits
-- Migration: 004_add_is_favorite_to_outfits.sql
-- Description: Adds is_favorite column for outfit favorites feature

ALTER TABLE outfits ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;

-- Index for fast favorite lookups
CREATE INDEX idx_outfits_is_favorite ON outfits(is_favorite) WHERE is_favorite = TRUE;
