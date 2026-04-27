-- Migration 022: Create squad_memberships table
-- Story 9.1: Style Squads Creation

CREATE TABLE squad_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    squad_id UUID NOT NULL REFERENCES style_squads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(squad_id, user_id)
);

-- Indexes for common queries
CREATE INDEX idx_squad_memberships_user ON squad_memberships (user_id);
CREATE INDEX idx_squad_memberships_squad ON squad_memberships (squad_id);

-- RLS
ALTER TABLE squad_memberships ENABLE ROW LEVEL SECURITY;

-- Members can view other members of their squads
CREATE POLICY "Members can view squad memberships"
    ON squad_memberships FOR SELECT
    USING (
        squad_id IN (
            SELECT squad_id FROM squad_memberships WHERE user_id = auth.uid()
        )
    );

-- Users can join squads (insert their own membership)
CREATE POLICY "Users can join squads"
    ON squad_memberships FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can leave (delete their own membership) or admins can remove members
CREATE POLICY "Users can leave or admins can remove"
    ON squad_memberships FOR DELETE
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM squad_memberships AS admin_check
            WHERE admin_check.squad_id = squad_memberships.squad_id
              AND admin_check.user_id = auth.uid()
              AND admin_check.role = 'admin'
        )
    );

-- Now update the style_squads SELECT policy to be membership-based
-- Drop the permissive "anyone can read" policy and replace with membership check
-- NOTE: We keep the permissive policy because joinSquadByCode needs to read
-- squads before the user is a member. The invite code lookup requires this.
