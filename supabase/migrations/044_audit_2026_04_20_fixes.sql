-- Migration 044: Security and integrity fixes from audit 2026-04-20
-- Fixes: search_path on award_wear_log_with_bonus, hardcoded point values,
--        missing purchase_price constraint, calendar_outfits cross-ownership,
--        feature CHECK constraint on ai_usage_log, explicit deny policies

-- 1. Fix award_wear_log_with_bonus: add SET search_path and hardcode point values
--    Eliminates client-controlled point inflation vulnerability
CREATE OR REPLACE FUNCTION award_wear_log_with_bonus()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_today DATE := CURRENT_DATE;
    v_today_count INTEGER;
    v_bonus_awarded BOOLEAN := false;
    c_base_points CONSTANT INTEGER := 10;
    c_first_day_points CONSTANT INTEGER := 50;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;

    -- Award base wear log points
    INSERT INTO point_history (user_id, points, action_type)
    VALUES (v_user_id, c_base_points, 'wear_log');

    UPDATE user_stats
    SET style_points = style_points + c_base_points
    WHERE user_id = v_user_id;

    -- Atomically check if this is the first wear_log today
    SELECT COUNT(*) INTO v_today_count
    FROM point_history
    WHERE user_id = v_user_id
      AND action_type = 'wear_log'
      AND created_at::date = v_today;

    IF v_today_count = 1 THEN
        INSERT INTO point_history (user_id, points, action_type)
        VALUES (v_user_id, c_first_day_points, 'first_of_day');

        UPDATE user_stats
        SET style_points = style_points + c_first_day_points
        WHERE user_id = v_user_id;

        v_bonus_awarded := true;
    END IF;

    RETURN json_build_object(
        'base_points', c_base_points,
        'bonus_awarded', v_bonus_awarded,
        'bonus_points', CASE WHEN v_bonus_awarded THEN c_first_day_points ELSE 0 END
    );
END;
$$;

-- 2. Add SET search_path to trigger functions from migration 041
CREATE OR REPLACE FUNCTION check_squad_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_max_members INTEGER;
    v_current_count INTEGER;
BEGIN
    SELECT max_members INTO v_max_members FROM style_squads WHERE id = NEW.squad_id;
    SELECT COUNT(*) INTO v_current_count FROM squad_memberships WHERE squad_id = NEW.squad_id;
    IF v_current_count >= COALESCE(v_max_members, 20) THEN
        RAISE EXCEPTION 'Squad is at maximum capacity';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_last_admin_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_admin_count INTEGER;
BEGIN
    SELECT role INTO v_role FROM squad_memberships WHERE id = OLD.id;
    IF v_role = 'admin' THEN
        SELECT COUNT(*) INTO v_admin_count
        FROM squad_memberships
        WHERE squad_id = OLD.squad_id AND role = 'admin' AND id != OLD.id;
        IF v_admin_count = 0 THEN
            RAISE EXCEPTION 'Cannot remove the last admin from a squad';
        END IF;
    END IF;
    RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION check_featured_badge_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_featured_count INTEGER;
BEGIN
    IF NEW.is_featured = true AND (OLD IS NULL OR OLD.is_featured = false) THEN
        SELECT COUNT(*) INTO v_featured_count
        FROM user_badges
        WHERE user_id = NEW.user_id AND is_featured = true AND id != NEW.id;
        IF v_featured_count >= 3 THEN
            RAISE EXCEPTION 'Maximum 3 featured badges allowed';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 3. Add non-negative constraint on purchase_price
ALTER TABLE items
ADD CONSTRAINT items_purchase_price_non_negative CHECK (purchase_price IS NULL OR purchase_price >= 0);

-- 4. Add cross-ownership check on calendar_outfits
--    Ensures users can only link outfits to their own calendar events
CREATE OR REPLACE FUNCTION check_calendar_outfit_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_event_owner UUID;
BEGIN
    SELECT user_id INTO v_event_owner FROM calendar_events WHERE id = NEW.event_id;
    IF v_event_owner IS NULL THEN
        RAISE EXCEPTION 'Calendar event not found';
    END IF;
    IF v_event_owner != NEW.user_id THEN
        RAISE EXCEPTION 'Cannot link outfit to another user''s calendar event';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_calendar_outfit_ownership
BEFORE INSERT OR UPDATE ON calendar_outfits
FOR EACH ROW
EXECUTE FUNCTION check_calendar_outfit_ownership();

-- 5. Update ai_usage_log feature CHECK to include missing values
ALTER TABLE ai_usage_log DROP CONSTRAINT IF EXISTS ai_usage_log_feature_check;
ALTER TABLE ai_usage_log ADD CONSTRAINT ai_usage_log_feature_check
    CHECK (feature IN (
        'categorization', 'outfit_gen', 'event_outfit_gen', 'gap_analysis',
        'seasonal_report', 'packing_list', 'steal_look', 'product_photo',
        'background_removal', 'shopping_analysis', 'extraction', 'unknown'
    ));

-- 6. Add explicit UPDATE deny on wear_logs for immutability
CREATE POLICY "wear_logs_no_update" ON wear_logs
FOR UPDATE USING (false);

-- 7. Add explicit deny policies on badges definition table
CREATE POLICY "badges_no_insert" ON badges
FOR INSERT WITH CHECK (false);

CREATE POLICY "badges_no_update" ON badges
FOR UPDATE USING (false);

CREATE POLICY "badges_no_delete" ON badges
FOR DELETE USING (false);

-- 8. Prevent deletion of sold resale listings
CREATE POLICY "resale_listings_no_delete_sold" ON resale_listings
FOR DELETE USING (auth.uid() = user_id AND status != 'sold');

-- Drop the old permissive delete policy if it exists, replace with the restrictive one
DROP POLICY IF EXISTS "resale_listings_delete" ON resale_listings;
