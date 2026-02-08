-- Migration 010: Badges & Achievements (Story 6.4)

-- Badges definition table
CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('upload', 'engagement', 'sustainability', 'secret')),
    icon_name TEXT NOT NULL,
    hint TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User badges (earned badges)
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    is_featured BOOLEAN DEFAULT FALSE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

-- Seed badge definitions
INSERT INTO badges (id, name, description, category, icon_name, hint) VALUES
    ('first_step', 'First Step', 'Upload your first item', 'upload', 'footsteps', 'Upload your first item'),
    ('closet_complete', 'Closet Complete', 'Upload 50 items to your wardrobe', 'upload', 'file-tray-full', 'Keep adding items...'),
    ('style_guru', 'Style Guru', 'Upload 100 items to your wardrobe', 'upload', 'diamond', 'A true collection awaits...'),
    ('week_warrior', 'Week Warrior', 'Maintain a 7-day streak', 'engagement', 'flame', 'Stay active for a full week'),
    ('streak_legend', 'Streak Legend', 'Maintain a 30-day streak', 'engagement', 'trophy', 'Commitment is key...'),
    ('early_bird', 'Early Bird', 'Log an outfit before 8 AM', 'engagement', 'sunny', 'The early bird gets the badge'),
    ('rewear_champion', 'Rewear Champion', 'Wear the same item 10+ times', 'sustainability', 'repeat', 'Rewear your favorites'),
    ('circular_seller', 'Circular Seller', 'Create your first resale listing', 'sustainability', 'pricetag', 'Give your clothes a second life'),
    ('monochrome_master', 'Monochrome Master', 'Log an all-black outfit', 'secret', 'moon', '??? - Embrace the dark side'),
    ('rainbow_warrior', 'Rainbow Warrior', 'Own items in 7+ different colors', 'secret', 'color-palette', '??? - Collect the rainbow'),
    ('og_member', 'OG Member', 'Joined during launch month', 'secret', 'shield-checkmark', '??? - Were you here from the start?'),
    ('weather_warrior', 'Weather Warrior', 'Log an outfit during rain or snow', 'secret', 'rainy', '??? - Brave the elements')
ON CONFLICT (id) DO NOTHING;

-- RLS policies
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Badges are readable by all authenticated users
CREATE POLICY "Badges are viewable by all users"
    ON badges FOR SELECT
    TO authenticated
    USING (true);

-- Users can view their own earned badges
CREATE POLICY "Users can view own badges"
    ON user_badges FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own badge earnings
CREATE POLICY "Users can earn badges"
    ON user_badges FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own badges (for featured toggle)
CREATE POLICY "Users can update own badges"
    ON user_badges FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);
