-- Migration 038: Resale Prompt Preferences & Tracking
-- Story 13.2: Resale Prompt Notifications

-- Add resale prompts toggle to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resale_prompts_enabled BOOLEAN DEFAULT TRUE;

-- Create resale prompt log table
CREATE TABLE IF NOT EXISTS resale_prompt_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    prompted_at TIMESTAMPTZ DEFAULT NOW(),
    action TEXT DEFAULT 'shown' CHECK (action IN ('shown', 'dismissed', 'tapped'))
);

CREATE INDEX IF NOT EXISTS idx_resale_prompt_log_user ON resale_prompt_log(user_id, item_id);
CREATE INDEX IF NOT EXISTS idx_resale_prompt_log_date ON resale_prompt_log(user_id, prompted_at);

-- RLS
ALTER TABLE resale_prompt_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prompt logs" ON resale_prompt_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompt logs" ON resale_prompt_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompt logs" ON resale_prompt_log
    FOR DELETE USING (auth.uid() = user_id);
