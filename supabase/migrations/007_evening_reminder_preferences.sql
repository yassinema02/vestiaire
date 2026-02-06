-- Migration: 007_evening_reminder_preferences
-- Description: Add evening reminder preferences to profiles table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS evening_reminder_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS evening_reminder_time TIME DEFAULT '20:00:00';
