-- Vestiaire Streak Freezes
-- Migration: 009_streak_freezes.sql
-- Description: Adds streak freeze columns to user_stats for grace period feature

ALTER TABLE user_stats
  ADD COLUMN streak_freezes_available INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN last_freeze_replenish_date DATE DEFAULT CURRENT_DATE;
