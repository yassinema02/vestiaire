-- Migration 014: Usage Limits for Freemium Tier
-- Story 7.5: Freemium Tier Limits

-- Add usage tracking columns to user_stats
ALTER TABLE user_stats
    ADD COLUMN IF NOT EXISTS ai_suggestions_today INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ai_suggestions_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day'),
    ADD COLUMN IF NOT EXISTS resale_listings_month INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS resale_listings_reset_at TIMESTAMPTZ DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month');
