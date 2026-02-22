-- Migration 025: Create OOTD Reactions table
-- Story 9.4: Reactions & Comments

CREATE TABLE ootd_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES ootd_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji TEXT DEFAULT '🔥',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_ootd_reactions_post_id ON ootd_reactions(post_id);

ALTER TABLE ootd_reactions ENABLE ROW LEVEL SECURITY;

-- Squad members can view reactions
CREATE POLICY "Squad members can view reactions" ON ootd_reactions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM ootd_posts op
        JOIN squad_memberships sm ON sm.squad_id = op.squad_id
        WHERE op.id = post_id AND sm.user_id = auth.uid()
    ));

-- Squad members can add reactions
CREATE POLICY "Squad members can add reactions" ON ootd_reactions FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM ootd_posts op
            JOIN squad_memberships sm ON sm.squad_id = op.squad_id
            WHERE op.id = post_id AND sm.user_id = auth.uid()
        )
    );

-- Users can remove own reactions
CREATE POLICY "Users can remove own reactions" ON ootd_reactions FOR DELETE
    USING (auth.uid() = user_id);
