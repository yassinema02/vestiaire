-- Migration 011: Sustainability Score (Story 6.5)

ALTER TABLE user_stats
    ADD COLUMN IF NOT EXISTS sustainability_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_score_calc_date DATE;
