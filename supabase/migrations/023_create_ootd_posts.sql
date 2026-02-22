-- Migration 023: Create ootd_posts table and ootd-photos storage bucket
-- Story 9.2: OOTD Posting Flow

CREATE TABLE ootd_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    squad_id UUID NOT NULL REFERENCES style_squads(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT CHECK (LENGTH(caption) <= 150),
    tagged_item_ids UUID[],
    reaction_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for feed queries
CREATE INDEX idx_ootd_posts_squad_feed ON ootd_posts (squad_id, created_at DESC);
CREATE INDEX idx_ootd_posts_user ON ootd_posts (user_id);

-- RLS
ALTER TABLE ootd_posts ENABLE ROW LEVEL SECURITY;

-- Squad members can view posts in their squads
CREATE POLICY "Squad members can view posts"
    ON ootd_posts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM squad_memberships
            WHERE squad_memberships.squad_id = ootd_posts.squad_id
              AND squad_memberships.user_id = auth.uid()
        )
    );

-- Users can create posts in squads they belong to
CREATE POLICY "Users can create posts in their squads"
    ON ootd_posts FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM squad_memberships
            WHERE squad_memberships.squad_id = ootd_posts.squad_id
              AND squad_memberships.user_id = auth.uid()
        )
    );

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
    ON ootd_posts FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
    ON ootd_posts FOR DELETE
    USING (auth.uid() = user_id);

-- Storage bucket for OOTD photos
-- NOTE: Run via Supabase dashboard or CLI:
--   INSERT INTO storage.buckets (id, name, public) VALUES ('ootd-photos', 'ootd-photos', true);
-- Storage policies (run in SQL editor):
--   CREATE POLICY "Users can upload OOTD photos" ON storage.objects
--     FOR INSERT WITH CHECK (bucket_id = 'ootd-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
--   CREATE POLICY "Anyone can view OOTD photos" ON storage.objects
--     FOR SELECT USING (bucket_id = 'ootd-photos');
--   CREATE POLICY "Users can delete own OOTD photos" ON storage.objects
--     FOR DELETE USING (bucket_id = 'ootd-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
