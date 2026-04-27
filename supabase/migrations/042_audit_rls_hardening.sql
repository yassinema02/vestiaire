-- Migration 042: RLS Hardening (Audit 2026-04-14)
-- Fixes identified in security audit: missing UPDATE policies, overly permissive
-- SELECT policies, missing DELETE deny policies on immutable tables, and
-- nullable user_id on ai_usage_log.

-- ============================================================
-- 1. squad_memberships: Add UPDATE policy (prevents role escalation)
-- ============================================================
CREATE POLICY "Only admins can update memberships"
    ON squad_memberships FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM squad_memberships AS admin_check
            WHERE admin_check.squad_id = squad_memberships.squad_id
              AND admin_check.user_id = auth.uid()
              AND admin_check.role = 'admin'
        )
    );

-- ============================================================
-- 2. ootd_comments: Explicitly deny UPDATE (comments are immutable)
-- ============================================================
CREATE POLICY "Comments are immutable"
    ON ootd_comments FOR UPDATE
    USING (false);

-- ============================================================
-- 3. ootd_reactions: Explicitly deny UPDATE (reactions are immutable)
-- ============================================================
CREATE POLICY "Reactions are immutable"
    ON ootd_reactions FOR UPDATE
    USING (false);

-- ============================================================
-- 4. ai_usage_log: Deny UPDATE and DELETE (audit logs are immutable)
-- ============================================================
CREATE POLICY "AI usage logs are immutable"
    ON ai_usage_log FOR UPDATE
    USING (false);

CREATE POLICY "AI usage logs cannot be deleted"
    ON ai_usage_log FOR DELETE
    USING (false);

-- ============================================================
-- 5. ai_usage_log: Make user_id NOT NULL for cost attribution
-- First backfill any NULLs, then add constraint
-- ============================================================
-- Delete orphaned rows with no user attribution (cannot be attributed)
DELETE FROM ai_usage_log WHERE user_id IS NULL;

ALTER TABLE ai_usage_log ALTER COLUMN user_id SET NOT NULL;

-- ============================================================
-- 6. donation_log: Deny UPDATE (donation records are immutable)
-- ============================================================
CREATE POLICY "Donation logs are immutable"
    ON donation_log FOR UPDATE
    USING (false);

-- ============================================================
-- 7. resale_prompt_log: Deny UPDATE (prompt logs are immutable)
-- ============================================================
CREATE POLICY "Resale prompt logs are immutable"
    ON resale_prompt_log FOR UPDATE
    USING (false);

-- ============================================================
-- 8. Fix SECURITY DEFINER functions missing SET search_path
--    Prevents function-hijacking via schema poisoning.
--    Functions from migrations 001, 016, 037 were never patched.
-- ============================================================

-- 8a. handle_new_user (from 001)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8b. update_neglect_statuses (from 037)
CREATE OR REPLACE FUNCTION update_neglect_statuses(threshold_days INTEGER DEFAULT 180)
RETURNS void AS $$
BEGIN
    UPDATE items
    SET neglect_status = (
        (last_worn_at IS NULL AND created_at < NOW() - make_interval(days => threshold_days))
        OR
        (last_worn_at IS NOT NULL AND last_worn_at < NOW() - make_interval(days => threshold_days))
    )
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8c. is_premium (from 016)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
