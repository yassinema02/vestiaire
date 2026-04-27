-- Migration 028: Add OOTD posting reminder preferences
-- Story 9.7: OOTD Posting Reminder

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ootd_reminder_enabled BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ootd_reminder_time TIME DEFAULT '09:00:00';
