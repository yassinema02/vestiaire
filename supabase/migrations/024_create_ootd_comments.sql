-- Migration 024: Create OOTD Comments table
-- Story 9.4: Reactions & Comments

CREATE TABLE ootd_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES ootd_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL CHECK (LENGTH(text) <= 200),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ootd_comments_post_id ON ootd_comments(post_id);
CREATE INDEX idx_ootd_comments_created_at ON ootd_comments(post_id, created_at DESC);

ALTER TABLE ootd_comments ENABLE ROW LEVEL SECURITY;

-- Squad members can view comments on posts in their squads
CREATE POLICY "Squad members can view comments" ON ootd_comments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM ootd_posts op
        JOIN squad_memberships sm ON sm.squad_id = op.squad_id
        WHERE op.id = post_id AND sm.user_id = auth.uid()
    ));

-- Squad members can create comments
CREATE POLICY "Squad members can create comments" ON ootd_comments FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM ootd_posts op
            JOIN squad_memberships sm ON sm.squad_id = op.squad_id
            WHERE op.id = post_id AND sm.user_id = auth.uid()
        )
    );

-- Users can delete own comments OR post author can delete any comment on their post
CREATE POLICY "Users can delete own or post author can delete" ON ootd_comments FOR DELETE
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM ootd_posts WHERE id = post_id AND user_id = auth.uid()
        )
    );
