-- Migration 027: Add push token for push notifications
-- Story 9.6: OOTD Notifications

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token) WHERE push_token IS NOT NULL;
