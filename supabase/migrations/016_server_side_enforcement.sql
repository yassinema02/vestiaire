-- Migration 016: Server-Side Enforcement
-- Security Phase 2: Move premium checks, usage limits, trial grants,
-- and challenge rewards to atomic server-side functions.

-- ============================================================
-- 1. Helper: Check if a user is premium
-- ============================================================
CREATE OR REPLACE FUNCTION is_premium(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_premium_until TIMESTAMPTZ;
    v_trial_expires TIMESTAMPTZ;
BEGIN
    SELECT premium_until INTO v_premium_until
    FROM profiles WHERE id = p_user_id;

    SELECT trial_expires_at INTO v_trial_expires
    FROM user_stats WHERE user_id = p_user_id;

    RETURN (
        (v_premium_until IS NOT NULL AND v_premium_until > NOW()) OR
        (v_trial_expires IS NOT NULL AND v_trial_expires > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 2. Atomic AI suggestion check + increment
-- ============================================================
CREATE OR REPLACE FUNCTION check_and_increment_ai_suggestions()
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_count INTEGER;
    v_reset_at TIMESTAMPTZ;
    v_is_premium BOOLEAN;
    v_limit INTEGER := 3; -- FREE_TIER_LIMITS.AI_SUGGESTIONS_PER_DAY
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('allowed', false, 'error', 'Not authenticated');
    END IF;

    v_is_premium := is_premium(v_user_id);

    -- Premium users: always allowed, no counter change
    IF v_is_premium THEN
        RETURN json_build_object(
            'allowed', true,
            'used', 0,
            'limit', -1,
            'remaining', -1,
            'resetAt', NULL,
            'isPremium', true
        );
    END IF;

    -- Get current usage
    SELECT ai_suggestions_today, ai_suggestions_reset_at
    INTO v_count, v_reset_at
    FROM user_stats WHERE user_id = v_user_id;

    -- Row not found: initialise
    IF NOT FOUND THEN
        v_count := 0;
        v_reset_at := NULL;
    END IF;

    -- Reset counter if past reset time or never set
    IF v_reset_at IS NULL OR v_reset_at <= NOW() THEN
        v_count := 0;
        v_reset_at := (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;

        UPDATE user_stats
        SET ai_suggestions_today = 0,
            ai_suggestions_reset_at = v_reset_at
        WHERE user_id = v_user_id;
    END IF;

    -- Check limit BEFORE incrementing
    IF v_count >= v_limit THEN
        RETURN json_build_object(
            'allowed', false,
            'used', v_count,
            'limit', v_limit,
            'remaining', 0,
            'resetAt', v_reset_at,
            'isPremium', false
        );
    END IF;

    -- Increment
    UPDATE user_stats
    SET ai_suggestions_today = v_count + 1
    WHERE user_id = v_user_id;

    RETURN json_build_object(
        'allowed', true,
        'used', v_count + 1,
        'limit', v_limit,
        'remaining', v_limit - v_count - 1,
        'resetAt', v_reset_at,
        'isPremium', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 3. Atomic resale listing check + increment
-- ============================================================
CREATE OR REPLACE FUNCTION check_and_increment_resale_listings()
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_count INTEGER;
    v_reset_at TIMESTAMPTZ;
    v_is_premium BOOLEAN;
    v_limit INTEGER := 2; -- FREE_TIER_LIMITS.RESALE_LISTINGS_PER_MONTH
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('allowed', false, 'error', 'Not authenticated');
    END IF;

    v_is_premium := is_premium(v_user_id);

    IF v_is_premium THEN
        RETURN json_build_object(
            'allowed', true,
            'used', 0,
            'limit', -1,
            'remaining', -1,
            'resetAt', NULL,
            'isPremium', true
        );
    END IF;

    SELECT resale_listings_month, resale_listings_reset_at
    INTO v_count, v_reset_at
    FROM user_stats WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        v_count := 0;
        v_reset_at := NULL;
    END IF;

    -- Reset counter if past reset time or never set
    IF v_reset_at IS NULL OR v_reset_at <= NOW() THEN
        v_count := 0;
        v_reset_at := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::TIMESTAMPTZ;

        UPDATE user_stats
        SET resale_listings_month = 0,
            resale_listings_reset_at = v_reset_at
        WHERE user_id = v_user_id;
    END IF;

    IF v_count >= v_limit THEN
        RETURN json_build_object(
            'allowed', false,
            'used', v_count,
            'limit', v_limit,
            'remaining', 0,
            'resetAt', v_reset_at,
            'isPremium', false
        );
    END IF;

    UPDATE user_stats
    SET resale_listings_month = v_count + 1
    WHERE user_id = v_user_id;

    RETURN json_build_object(
        'allowed', true,
        'used', v_count + 1,
        'limit', v_limit,
        'remaining', v_limit - v_count - 1,
        'resetAt', v_reset_at,
        'isPremium', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 4. Read-only usage limit check (no increment)
--    Used by UI to display remaining counts without consuming.
-- ============================================================
CREATE OR REPLACE FUNCTION check_ai_suggestion_status()
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_count INTEGER;
    v_reset_at TIMESTAMPTZ;
    v_is_premium BOOLEAN;
    v_limit INTEGER := 3;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('allowed', false, 'error', 'Not authenticated');
    END IF;

    v_is_premium := is_premium(v_user_id);

    IF v_is_premium THEN
        RETURN json_build_object(
            'allowed', true, 'used', 0, 'limit', -1,
            'remaining', -1, 'resetAt', NULL, 'isPremium', true
        );
    END IF;

    SELECT ai_suggestions_today, ai_suggestions_reset_at
    INTO v_count, v_reset_at
    FROM user_stats WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        v_count := 0;
        v_reset_at := NULL;
    END IF;

    -- Check if reset needed (read-only, don't actually reset)
    IF v_reset_at IS NULL OR v_reset_at <= NOW() THEN
        v_count := 0;
    END IF;

    RETURN json_build_object(
        'allowed', v_count < v_limit,
        'used', v_count,
        'limit', v_limit,
        'remaining', GREATEST(v_limit - v_count, 0),
        'resetAt', v_reset_at,
        'isPremium', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION check_resale_listing_status()
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_count INTEGER;
    v_reset_at TIMESTAMPTZ;
    v_is_premium BOOLEAN;
    v_limit INTEGER := 2;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('allowed', false, 'error', 'Not authenticated');
    END IF;

    v_is_premium := is_premium(v_user_id);

    IF v_is_premium THEN
        RETURN json_build_object(
            'allowed', true, 'used', 0, 'limit', -1,
            'remaining', -1, 'resetAt', NULL, 'isPremium', true
        );
    END IF;

    SELECT resale_listings_month, resale_listings_reset_at
    INTO v_count, v_reset_at
    FROM user_stats WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        v_count := 0;
        v_reset_at := NULL;
    END IF;

    IF v_reset_at IS NULL OR v_reset_at <= NOW() THEN
        v_count := 0;
    END IF;

    RETURN json_build_object(
        'allowed', v_count < v_limit,
        'used', v_count,
        'limit', v_limit,
        'remaining', GREATEST(v_limit - v_count, 0),
        'resetAt', v_reset_at,
        'isPremium', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 5. Server-side premium trial grant (one-time, atomic)
-- ============================================================
CREATE OR REPLACE FUNCTION grant_premium_trial_safe()
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_already_granted BOOLEAN;
    v_expires_at TIMESTAMPTZ;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('granted', false, 'error', 'Not authenticated');
    END IF;

    -- Check if trial was already granted (read)
    SELECT trial_granted INTO v_already_granted
    FROM user_stats WHERE user_id = v_user_id;

    IF v_already_granted IS TRUE THEN
        RETURN json_build_object('granted', false, 'error', 'Trial already used');
    END IF;

    v_expires_at := NOW() + INTERVAL '30 days';

    -- Atomic update: SET trial_granted = true only WHERE NOT trial_granted
    -- Prevents race conditions from concurrent calls
    UPDATE user_stats
    SET trial_granted = true,
        trial_started_at = NOW(),
        trial_expires_at = v_expires_at
    WHERE user_id = v_user_id AND (trial_granted IS NULL OR trial_granted = false);

    IF NOT FOUND THEN
        RETURN json_build_object('granted', false, 'error', 'Trial already used');
    END IF;

    -- Set premium_until on profiles
    UPDATE profiles
    SET premium_until = v_expires_at
    WHERE id = v_user_id;

    RETURN json_build_object('granted', true, 'expires_at', v_expires_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 6. Server-side challenge reward (validates completion)
-- ============================================================
CREATE OR REPLACE FUNCTION award_challenge_rewards_safe(p_challenge_id UUID)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_challenge RECORD;
    v_premium_until TIMESTAMPTZ;
    v_current_points INTEGER;
    v_reward_points INTEGER := 50; -- POINTS.COMPLETE_CHALLENGE
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'reason', 'Not authenticated');
    END IF;

    -- Fetch the challenge — must belong to user and be active
    SELECT * INTO v_challenge
    FROM user_challenges
    WHERE id = p_challenge_id
      AND user_id = v_user_id
      AND status = 'active';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'reason', 'Challenge not found or not active');
    END IF;

    -- Verify progress meets target
    IF v_challenge.progress < v_challenge.target THEN
        RETURN json_build_object('success', false, 'reason', 'Challenge not completed');
    END IF;

    -- Mark challenge as completed
    UPDATE user_challenges
    SET status = 'completed', completed_at = NOW()
    WHERE id = p_challenge_id AND user_id = v_user_id;

    -- Grant 30 days premium (extend if already premium)
    v_premium_until := GREATEST(
        COALESCE((SELECT premium_until FROM profiles WHERE id = v_user_id), NOW()),
        NOW()
    ) + INTERVAL '30 days';

    UPDATE profiles
    SET premium_until = v_premium_until
    WHERE id = v_user_id;

    -- Award safari_explorer badge (ignore if already exists)
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (v_user_id, 'safari_explorer')
    ON CONFLICT DO NOTHING;

    -- Award bonus points
    INSERT INTO point_history (user_id, points, action_type)
    VALUES (v_user_id, v_reward_points, 'challenge_complete');

    SELECT style_points INTO v_current_points
    FROM user_stats WHERE user_id = v_user_id;

    UPDATE user_stats
    SET style_points = COALESCE(v_current_points, 0) + v_reward_points
    WHERE user_id = v_user_id;

    RETURN json_build_object('success', true, 'premium_until', v_premium_until);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
