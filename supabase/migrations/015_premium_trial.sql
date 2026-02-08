-- Migration 015: Premium Trial Tracking
-- Story 7.7: Premium Onboarding Reward

-- Add trial tracking columns to user_stats
ALTER TABLE user_stats
    ADD COLUMN IF NOT EXISTS trial_granted BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;
