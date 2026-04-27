-- Migration 035: Event Reminder Preferences
-- Story 12.5: Outfit Reminders

ALTER TABLE profiles
    ADD COLUMN event_reminder_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN event_reminder_time TIME DEFAULT '20:00:00',
    ADD COLUMN event_reminder_event_types TEXT[] DEFAULT ARRAY['work','formal'];
