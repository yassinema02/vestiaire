-- Migration 040: Create donation_log table
-- Story 13.6: Donation Tracking

CREATE TABLE IF NOT EXISTS donation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    charity TEXT,
    donated_at TIMESTAMPTZ DEFAULT NOW(),
    estimated_value NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donation_log_user ON donation_log(user_id, donated_at DESC);

-- RLS
ALTER TABLE donation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own donations" ON donation_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own donations" ON donation_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own donations" ON donation_log
    FOR DELETE USING (auth.uid() = user_id);
