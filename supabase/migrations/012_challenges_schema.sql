-- Migration 012: Closet Safari Challenge (Story 6.6)

-- Challenges table
CREATE TABLE IF NOT EXISTS user_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_type TEXT NOT NULL DEFAULT 'closet_safari',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'skipped', 'expired')),
    progress INTEGER NOT NULL DEFAULT 0,
    target INTEGER NOT NULL DEFAULT 20,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, challenge_type)
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);

-- Premium support on profiles
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

-- Extend badges category check to include 'challenge'
ALTER TABLE badges DROP CONSTRAINT IF EXISTS badges_category_check;
ALTER TABLE badges ADD CONSTRAINT badges_category_check
    CHECK (category IN ('upload', 'engagement', 'sustainability', 'secret', 'challenge'));

-- Add Safari Explorer badge to badges table
INSERT INTO badges (id, name, description, category, icon_name, hint) VALUES
    ('safari_explorer', 'Safari Explorer', 'Complete the Closet Safari challenge', 'challenge', 'compass', 'Complete the onboarding challenge')
ON CONFLICT (id) DO NOTHING;

-- RLS policies
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenges"
    ON user_challenges FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own challenges"
    ON user_challenges FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges"
    ON user_challenges FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);
