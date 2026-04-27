-- Migration 037: Add neglect_status column to items table (Story 13.1)

-- Add neglect_status boolean column
ALTER TABLE items ADD COLUMN IF NOT EXISTS neglect_status BOOLEAN DEFAULT FALSE;

-- Index for efficient neglect queries per user
CREATE INDEX IF NOT EXISTS idx_items_neglect_status ON items(user_id, neglect_status);

-- Backfill: mark items as neglected if not worn in 180+ days
UPDATE items
SET neglect_status = TRUE
WHERE (
    (last_worn_at IS NULL AND created_at < NOW() - INTERVAL '180 days')
    OR
    (last_worn_at IS NOT NULL AND last_worn_at < NOW() - INTERVAL '180 days')
);

-- RPC function to bulk-update neglect statuses for the calling user
CREATE OR REPLACE FUNCTION update_neglect_statuses(threshold_days INTEGER DEFAULT 180)
RETURNS void AS $$
BEGIN
    UPDATE items
    SET neglect_status = (
        (last_worn_at IS NULL AND created_at < NOW() - (threshold_days || ' days')::INTERVAL)
        OR
        (last_worn_at IS NOT NULL AND last_worn_at < NOW() - (threshold_days || ' days')::INTERVAL)
    )
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
