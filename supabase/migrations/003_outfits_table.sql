-- Vestiaire Outfit Tables
-- Migration: 003_outfits_table.sql
-- Description: Creates outfits and outfit_items tables with RLS

-- ============================================
-- OUTFITS TABLE
-- ============================================
-- Stores saved outfit combinations

CREATE TABLE outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT,
  occasion TEXT,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  weather_context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_outfits_user_id ON outfits(user_id);
CREATE INDEX idx_outfits_occasion ON outfits(occasion);
CREATE INDEX idx_outfits_is_ai_generated ON outfits(is_ai_generated);
CREATE INDEX idx_outfits_created_at ON outfits(created_at DESC);

-- ============================================
-- OUTFIT ITEMS JUNCTION TABLE
-- ============================================
-- Links outfits to wardrobe items with position

CREATE TABLE outfit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  CONSTRAINT valid_position CHECK (position IN ('top', 'bottom', 'shoes', 'accessory', 'outerwear', 'dress'))
);

-- Create indexes for joins
CREATE INDEX idx_outfit_items_outfit_id ON outfit_items(outfit_id);
CREATE INDEX idx_outfit_items_item_id ON outfit_items(item_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;

-- Outfits Policies
-- Users can view their own outfits
CREATE POLICY "Users can view own outfits"
  ON outfits FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own outfits
CREATE POLICY "Users can create own outfits"
  ON outfits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own outfits
CREATE POLICY "Users can update own outfits"
  ON outfits FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own outfits
CREATE POLICY "Users can delete own outfits"
  ON outfits FOR DELETE
  USING (auth.uid() = user_id);

-- Outfit Items Policies
-- Users can view outfit items for their outfits
CREATE POLICY "Users can view own outfit items"
  ON outfit_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_items.outfit_id
      AND outfits.user_id = auth.uid()
    )
  );

-- Users can create outfit items for their outfits
CREATE POLICY "Users can create own outfit items"
  ON outfit_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_items.outfit_id
      AND outfits.user_id = auth.uid()
    )
  );

-- Users can update outfit items for their outfits
CREATE POLICY "Users can update own outfit items"
  ON outfit_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_items.outfit_id
      AND outfits.user_id = auth.uid()
    )
  );

-- Users can delete outfit items for their outfits
CREATE POLICY "Users can delete own outfit items"
  ON outfit_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_items.outfit_id
      AND outfits.user_id = auth.uid()
    )
  );
