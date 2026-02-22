-- Migration 021: Create style_squads table
-- Story 9.1: Style Squads Creation

CREATE TABLE style_squads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    invite_code TEXT UNIQUE NOT NULL,
    max_members INT DEFAULT 20,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for invite code lookups
CREATE INDEX idx_style_squads_invite_code ON style_squads (invite_code);

-- Updated_at trigger
CREATE TRIGGER update_style_squads_updated_at
    BEFORE UPDATE ON style_squads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE style_squads ENABLE ROW LEVEL SECURITY;

-- Creator can insert their own squads
CREATE POLICY "Users can create squads"
    ON style_squads FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

-- Creator can update/delete their own squads
CREATE POLICY "Creator can update squad"
    ON style_squads FOR UPDATE
    USING (auth.uid() = creator_id);

CREATE POLICY "Creator can delete squad"
    ON style_squads FOR DELETE
    USING (auth.uid() = creator_id);

-- SELECT policy depends on squad_memberships table (created in migration 022).
-- We add it after that table exists.
-- For now, allow reading any squad (needed for joinSquadByCode invite code lookup).
CREATE POLICY "Anyone can read squads"
    ON style_squads FOR SELECT
    USING (true);
