-- Migration: Atomic wear count increment
-- Fixes race condition in items.incrementWearCount (read-modify-write → atomic UPDATE)

CREATE OR REPLACE FUNCTION increment_wear_count(p_item_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE items
    SET wear_count = wear_count + 1,
        last_worn_at = NOW(),
        updated_at = NOW()
    WHERE id = p_item_id
      AND user_id = p_user_id;
END;
$$;
