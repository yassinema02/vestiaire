-- Migration: 006_wear_logs_table
-- Description: Create wear_logs table for tracking clothing usage

-- Create wear_logs table
CREATE TABLE IF NOT EXISTS wear_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  outfit_id UUID REFERENCES outfits(id) ON DELETE SET NULL,
  worn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite unique constraint prevents duplicate logs for same item+date+outfit
CREATE UNIQUE INDEX IF NOT EXISTS wear_logs_unique_item_date
  ON wear_logs(user_id, item_id, worn_date, COALESCE(outfit_id, '00000000-0000-0000-0000-000000000000'));

-- Index for efficient queries by user and date
CREATE INDEX IF NOT EXISTS wear_logs_user_date_idx ON wear_logs(user_id, worn_date);

-- Index for efficient queries by item
CREATE INDEX IF NOT EXISTS wear_logs_item_idx ON wear_logs(item_id);

-- Enable RLS
ALTER TABLE wear_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running)
DROP POLICY IF EXISTS "Users can view own wear logs" ON wear_logs;
DROP POLICY IF EXISTS "Users can insert own wear logs" ON wear_logs;
DROP POLICY IF EXISTS "Users can delete own wear logs" ON wear_logs;

-- Users can only see their own wear logs
CREATE POLICY "Users can view own wear logs" ON wear_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own wear logs
CREATE POLICY "Users can insert own wear logs" ON wear_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own wear logs
CREATE POLICY "Users can delete own wear logs" ON wear_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update item wear_count and last_worn_at after inserting a wear log
CREATE OR REPLACE FUNCTION update_item_wear_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE items
  SET
    wear_count = (SELECT COUNT(*) FROM wear_logs WHERE item_id = NEW.item_id),
    last_worn_at = (SELECT MAX(worn_date) FROM wear_logs WHERE item_id = NEW.item_id)
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update item wear_count and last_worn_at after deleting a wear log
CREATE OR REPLACE FUNCTION update_item_wear_stats_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE items
  SET
    wear_count = (SELECT COUNT(*) FROM wear_logs WHERE item_id = OLD.item_id),
    last_worn_at = (SELECT MAX(worn_date) FROM wear_logs WHERE item_id = OLD.item_id)
  WHERE id = OLD.item_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Triggers to keep item stats in sync
DROP TRIGGER IF EXISTS update_wear_stats_on_insert ON wear_logs;
CREATE TRIGGER update_wear_stats_on_insert
  AFTER INSERT ON wear_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_item_wear_stats();

DROP TRIGGER IF EXISTS update_wear_stats_on_delete ON wear_logs;
CREATE TRIGGER update_wear_stats_on_delete
  AFTER DELETE ON wear_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_item_wear_stats_on_delete();
