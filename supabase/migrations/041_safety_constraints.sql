-- Migration 041: Safety constraints for race conditions
-- Fixes: squad capacity, sole admin, first-of-day bonus, duplicate donations

-- 1. Enforce squad capacity at DB level
CREATE OR REPLACE FUNCTION check_squad_capacity()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_squad_capacity
BEFORE INSERT ON squad_memberships
FOR EACH ROW
EXECUTE FUNCTION check_squad_capacity();

-- 2. Prevent last admin from leaving (DB-level safety net)
CREATE OR REPLACE FUNCTION prevent_last_admin_leave()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_admin_presence
BEFORE DELETE ON squad_memberships
FOR EACH ROW
EXECUTE FUNCTION prevent_last_admin_leave();

-- 3. Unique constraint on donations to prevent double-donate
ALTER TABLE donation_log
ADD CONSTRAINT unique_donation_per_item UNIQUE (user_id, item_id);

-- 4. Enforce max 3 featured badges at DB level
CREATE OR REPLACE FUNCTION check_featured_badge_limit()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_featured_badge_limit
BEFORE UPDATE ON user_badges
FOR EACH ROW
EXECUTE FUNCTION check_featured_badge_limit();

-- 5. Server-side RPC for atomic first-of-day bonus check
CREATE OR REPLACE FUNCTION award_wear_log_with_bonus(p_base_points INTEGER, p_first_day_points INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_today DATE := CURRENT_DATE;
    v_today_count INTEGER;
    v_base_result JSON;
    v_bonus_awarded BOOLEAN := false;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;

    -- Award base wear log points
    INSERT INTO point_history (user_id, points, action_type)
    VALUES (v_user_id, p_base_points, 'wear_log');

    UPDATE user_stats
    SET style_points = style_points + p_base_points
    WHERE user_id = v_user_id;

    -- Atomically check if this is the first wear_log today
    SELECT COUNT(*) INTO v_today_count
    FROM point_history
    WHERE user_id = v_user_id
      AND action_type = 'wear_log'
      AND created_at::date = v_today;

    IF v_today_count = 1 THEN
        INSERT INTO point_history (user_id, points, action_type)
        VALUES (v_user_id, p_first_day_points, 'first_of_day');

        UPDATE user_stats
        SET style_points = style_points + p_first_day_points
        WHERE user_id = v_user_id;

        v_bonus_awarded := true;
    END IF;

    RETURN json_build_object(
        'base_points', p_base_points,
        'bonus_awarded', v_bonus_awarded,
        'bonus_points', CASE WHEN v_bonus_awarded THEN p_first_day_points ELSE 0 END
    );
END;
$$;
