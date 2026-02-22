-- Migration 029: Lock Down Gamification RLS Policies
-- Security fix: Prevent users from self-awarding points, badges, and manipulating stats.
-- Replaces permissive INSERT/UPDATE policies with server-side SECURITY DEFINER functions.

-- ============================================================
-- 1. Drop overly permissive policies on point_history
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own point history" ON point_history;

-- ============================================================
-- 2. Drop overly permissive policies on user_badges
-- ============================================================
DROP POLICY IF EXISTS "Users can earn badges" ON user_badges;

-- Keep UPDATE for is_featured toggle only, but restrict columns via trigger
DROP POLICY IF EXISTS "Users can update own badges" ON user_badges;

CREATE POLICY "Users can update own badges featured status"
    ON user_badges FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trigger to restrict user_badges UPDATE to only the is_featured column
CREATE OR REPLACE FUNCTION restrict_badge_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow is_featured to change
    IF NEW.badge_id != OLD.badge_id
       OR NEW.user_id != OLD.user_id
       OR NEW.earned_at != OLD.earned_at THEN
        RAISE EXCEPTION 'Only is_featured can be updated';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_badge_update_restriction ON user_badges;
CREATE TRIGGER enforce_badge_update_restriction
    BEFORE UPDATE ON user_badges
    FOR EACH ROW EXECUTE FUNCTION restrict_badge_update();

-- ============================================================
-- 3. Restrict user_stats UPDATE to safe columns only
-- ============================================================
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;

-- Trigger to prevent direct manipulation of sensitive columns.
-- SECURITY DEFINER functions set a session variable to bypass this check.
CREATE OR REPLACE FUNCTION restrict_stats_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow trusted server-side functions to bypass
    IF current_setting('app.bypass_stats_trigger', true) = 'true' THEN
        RETURN NEW;
    END IF;

    -- Block direct changes to sensitive fields
    IF NEW.style_points != OLD.style_points THEN
        RAISE EXCEPTION 'style_points cannot be updated directly';
    END IF;
    IF NEW.level != OLD.level THEN
        RAISE EXCEPTION 'level cannot be updated directly';
    END IF;
    IF NEW.current_streak != OLD.current_streak THEN
        RAISE EXCEPTION 'current_streak cannot be updated directly';
    END IF;
    IF NEW.longest_streak != OLD.longest_streak THEN
        RAISE EXCEPTION 'longest_streak cannot be updated directly';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_stats_update_restriction ON user_stats;
CREATE TRIGGER enforce_stats_update_restriction
    BEFORE UPDATE ON user_stats
    FOR EACH ROW EXECUTE FUNCTION restrict_stats_update();

-- Re-create a restricted UPDATE policy (needed for last_active_date etc.)
CREATE POLICY "Users can update own stats safely"
    ON user_stats FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. Restrict user_challenges UPDATE to prevent progress tampering
-- ============================================================
DROP POLICY IF EXISTS "Users can update own challenges" ON user_challenges;

CREATE POLICY "Users can update own challenges safely"
    ON user_challenges FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION restrict_challenge_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow trusted server-side functions to bypass
    IF current_setting('app.bypass_stats_trigger', true) = 'true' THEN
        RETURN NEW;
    END IF;

    -- Prevent direct progress/status manipulation
    IF NEW.progress != OLD.progress THEN
        RAISE EXCEPTION 'progress cannot be updated directly';
    END IF;
    IF NEW.status != OLD.status THEN
        RAISE EXCEPTION 'status cannot be updated directly';
    END IF;
    IF NEW.target != OLD.target THEN
        RAISE EXCEPTION 'target cannot be updated directly';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_challenge_update_restriction ON user_challenges;
CREATE TRIGGER enforce_challenge_update_restriction
    BEFORE UPDATE ON user_challenges
    FOR EACH ROW EXECUTE FUNCTION restrict_challenge_update();

-- ============================================================
-- 5. Server-side function: Award points atomically
-- ============================================================
CREATE OR REPLACE FUNCTION award_points(
    p_amount INTEGER,
    p_action_type TEXT
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_current_points INTEGER;
    v_new_total INTEGER;
    v_new_level INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;

    IF p_amount <= 0 OR p_amount > 500 THEN
        RETURN json_build_object('error', 'Invalid point amount');
    END IF;

    -- Set bypass flag so trigger allows the update
    PERFORM set_config('app.bypass_stats_trigger', 'true', true);

    -- Insert into point_history (bypasses RLS since SECURITY DEFINER)
    INSERT INTO point_history (user_id, points, action_type)
    VALUES (v_user_id, p_amount, p_action_type);

    -- Atomically update stats
    UPDATE user_stats
    SET style_points = style_points + p_amount,
        level = GREATEST(level, CASE
            WHEN style_points + p_amount >= 5000 THEN 10
            WHEN style_points + p_amount >= 3000 THEN 9
            WHEN style_points + p_amount >= 2000 THEN 8
            WHEN style_points + p_amount >= 1500 THEN 7
            WHEN style_points + p_amount >= 1000 THEN 6
            WHEN style_points + p_amount >= 700 THEN 5
            WHEN style_points + p_amount >= 500 THEN 4
            WHEN style_points + p_amount >= 300 THEN 3
            WHEN style_points + p_amount >= 100 THEN 2
            ELSE 1
        END)
    WHERE user_id = v_user_id
    RETURNING style_points, level INTO v_new_total, v_new_level;

    RETURN json_build_object(
        'new_total', v_new_total,
        'new_level', v_new_level,
        'points_awarded', p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 6. Server-side function: Award a badge (with validation)
-- ============================================================
CREATE OR REPLACE FUNCTION award_badge(
    p_badge_id TEXT
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_badge_exists BOOLEAN;
    v_already_earned BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;

    -- Verify badge exists
    SELECT EXISTS(SELECT 1 FROM badges WHERE id = p_badge_id) INTO v_badge_exists;
    IF NOT v_badge_exists THEN
        RETURN json_build_object('error', 'Invalid badge');
    END IF;

    -- Check not already earned
    SELECT EXISTS(
        SELECT 1 FROM user_badges WHERE user_id = v_user_id AND badge_id = p_badge_id
    ) INTO v_already_earned;
    IF v_already_earned THEN
        RETURN json_build_object('error', 'Badge already earned', 'already_earned', true);
    END IF;

    -- Award the badge
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (v_user_id, p_badge_id);

    RETURN json_build_object('awarded', true, 'badge_id', p_badge_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 7. Server-side function: Update streak atomically
-- ============================================================
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_last_active DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
    v_today DATE := CURRENT_DATE;
    v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
    v_new_streak INTEGER;
    v_streak_lost BOOLEAN := false;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;

    -- Set bypass flag so trigger allows the update
    PERFORM set_config('app.bypass_stats_trigger', 'true', true);

    SELECT last_active_date, current_streak, longest_streak
    INTO v_last_active, v_current_streak, v_longest_streak
    FROM user_stats WHERE user_id = v_user_id;

    -- Already active today
    IF v_last_active = v_today THEN
        RETURN json_build_object('streak', v_current_streak, 'streak_lost', false);
    END IF;

    IF v_last_active = v_yesterday THEN
        v_new_streak := v_current_streak + 1;
    ELSIF v_last_active IS NULL THEN
        v_new_streak := 1;
    ELSE
        v_new_streak := 1;
        v_streak_lost := v_current_streak > 1;
    END IF;

    UPDATE user_stats
    SET current_streak = v_new_streak,
        longest_streak = GREATEST(v_longest_streak, v_new_streak),
        last_active_date = v_today
    WHERE user_id = v_user_id;

    RETURN json_build_object(
        'streak', v_new_streak,
        'streak_lost', v_streak_lost,
        'longest', GREATEST(v_longest_streak, v_new_streak)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 8. Server-side function: Increment challenge progress
-- ============================================================
CREATE OR REPLACE FUNCTION increment_challenge_progress(
    p_challenge_type TEXT DEFAULT 'closet_safari'
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_progress INTEGER;
    v_target INTEGER;
    v_status TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;

    -- Set bypass flag so trigger allows the update
    PERFORM set_config('app.bypass_stats_trigger', 'true', true);

    SELECT progress, target, status
    INTO v_progress, v_target, v_status
    FROM user_challenges
    WHERE user_id = v_user_id AND challenge_type = p_challenge_type;

    IF v_status IS NULL THEN
        RETURN json_build_object('error', 'No active challenge');
    END IF;

    IF v_status != 'active' THEN
        RETURN json_build_object('error', 'Challenge not active', 'status', v_status);
    END IF;

    v_progress := v_progress + 1;

    IF v_progress >= v_target THEN
        UPDATE user_challenges
        SET progress = v_progress, status = 'completed', completed_at = NOW()
        WHERE user_id = v_user_id AND challenge_type = p_challenge_type;

        RETURN json_build_object('progress', v_progress, 'target', v_target, 'completed', true);
    ELSE
        UPDATE user_challenges
        SET progress = v_progress
        WHERE user_id = v_user_id AND challenge_type = p_challenge_type;

        RETURN json_build_object('progress', v_progress, 'target', v_target, 'completed', false);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 9. Fix existing SECURITY DEFINER functions: add search_path
-- ============================================================
-- handle_new_user_stats (from migration 008)
CREATE OR REPLACE FUNCTION public.handle_new_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- increment_wear_count (from migration 018) - also add auth check
CREATE OR REPLACE FUNCTION increment_wear_count(p_item_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE items
    SET wear_count = wear_count + 1,
        last_worn = NOW()
    WHERE id = p_item_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
