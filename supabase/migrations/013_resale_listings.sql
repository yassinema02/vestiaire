-- Migration 013: Resale Listings History
-- Story 7.4: Listing History Tracking

-- Create resale_listings table
CREATE TABLE IF NOT EXISTS resale_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    condition TEXT,
    status TEXT DEFAULT 'listed' CHECK (status IN ('listed', 'sold', 'cancelled')),
    sold_price NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    sold_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX resale_listings_user_status_idx ON resale_listings(user_id, status);
CREATE INDEX resale_listings_item_idx ON resale_listings(item_id);

-- Updated at trigger
CREATE TRIGGER set_resale_listings_updated_at
    BEFORE UPDATE ON resale_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE resale_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own listings"
    ON resale_listings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own listings"
    ON resale_listings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
    ON resale_listings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
    ON resale_listings FOR DELETE
    USING (auth.uid() = user_id);

-- Add resale tracking columns to user_stats
ALTER TABLE user_stats
    ADD COLUMN IF NOT EXISTS total_items_sold INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_revenue NUMERIC(10, 2) DEFAULT 0;
