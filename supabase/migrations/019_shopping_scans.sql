-- Migration 019: Shopping Scans
-- Story 8.1: Screenshot Product Analysis

-- Create shopping_scans table
CREATE TABLE IF NOT EXISTS shopping_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_name TEXT,
    product_brand TEXT,
    product_url TEXT,
    product_image_url TEXT,
    category TEXT,
    color TEXT,
    secondary_colors TEXT[] DEFAULT '{}',
    style TEXT,
    material TEXT,
    pattern TEXT,
    season TEXT[] DEFAULT '{}',
    formality INTEGER CHECK (formality IS NULL OR (formality >= 1 AND formality <= 10)),
    price_amount NUMERIC(10, 2),
    price_currency TEXT DEFAULT 'GBP',
    compatibility_score INTEGER CHECK (compatibility_score IS NULL OR (compatibility_score >= 0 AND compatibility_score <= 100)),
    matching_item_ids UUID[] DEFAULT '{}',
    ai_insights JSONB,
    scan_method TEXT NOT NULL CHECK (scan_method IN ('screenshot', 'url')),
    user_rating INTEGER CHECK (user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 5)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX shopping_scans_user_id_idx ON shopping_scans(user_id);
CREATE INDEX shopping_scans_created_at_idx ON shopping_scans(user_id, created_at DESC);
CREATE INDEX shopping_scans_score_idx ON shopping_scans(user_id, compatibility_score DESC);

-- Updated at trigger
CREATE TRIGGER set_shopping_scans_updated_at
    BEFORE UPDATE ON shopping_scans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE shopping_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scans"
    ON shopping_scans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans"
    ON shopping_scans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans"
    ON shopping_scans FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scans"
    ON shopping_scans FOR DELETE
    USING (auth.uid() = user_id);

-- Storage bucket for shopping screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('shopping-scans', 'shopping-scans', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can upload to own folder
CREATE POLICY "Users can upload shopping screenshots"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'shopping-scans'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies: users can read own uploads
CREATE POLICY "Users can read own shopping screenshots"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'shopping-scans'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies: users can delete own uploads
CREATE POLICY "Users can delete own shopping screenshots"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'shopping-scans'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
