-- Migration 034: Calendar Outfits (Outfit Scheduling & Planning)
-- Story 12.4: Schedule outfits for future days or specific events

CREATE TABLE calendar_outfits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
    scheduled_date DATE,
    outfit_id UUID REFERENCES outfits(id) ON DELETE SET NULL,
    item_ids UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (event_id IS NOT NULL AND scheduled_date IS NULL) OR
        (event_id IS NULL AND scheduled_date IS NOT NULL)
    )
);

CREATE INDEX idx_calendar_outfits_user_id ON calendar_outfits(user_id);
CREATE INDEX idx_calendar_outfits_event_id ON calendar_outfits(event_id);
CREATE INDEX idx_calendar_outfits_scheduled_date ON calendar_outfits(scheduled_date);

ALTER TABLE calendar_outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calendar outfits"
    ON calendar_outfits FOR ALL USING (auth.uid() = user_id);
