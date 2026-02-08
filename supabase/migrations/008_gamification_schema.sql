-- Vestiaire Gamification Schema
-- Migration: 008_gamification_schema.sql
-- Description: Creates user_stats and point_history tables for the style points system

-- ============================================
-- USER STATS TABLE
-- ============================================
-- Tracks cumulative gamification data per user

CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  style_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- POINT HISTORY TABLE
-- ============================================
-- Audit log of every point-earning action

CREATE TABLE point_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_point_history_user_date ON point_history(user_id, created_at DESC);

-- ============================================
-- AUTO-CREATE USER STATS TRIGGER
-- ============================================
-- Automatically creates a user_stats row when a new profile is created

CREATE OR REPLACE FUNCTION public.handle_new_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_stats
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_stats();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;

-- user_stats: users can view and update their own stats
CREATE POLICY "Users can view own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow insert for the trigger (service role) and for application upsert
CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- point_history: users can view and insert their own history
CREATE POLICY "Users can view own point history"
  ON point_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own point history"
  ON point_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
