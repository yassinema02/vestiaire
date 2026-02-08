/**
 * Usage Limits Service
 * Story 7.5: Freemium Tier Limits
 * Tracks and enforces free-tier usage limits for AI suggestions and resale listings.
 */

import { supabase } from './supabase';
import { FREE_TIER_LIMITS } from '@vestiaire/shared';

export interface UsageLimitStatus {
    allowed: boolean;
    used: number;
    limit: number;
    remaining: number;
    resetAt: string | null;
    isPremium: boolean;
}

async function isPremiumUser(): Promise<boolean> {
    try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return false;

        const { data: profile } = await supabase
            .from('profiles')
            .select('premium_until')
            .eq('id', userData.user.id)
            .single();

        if (!profile?.premium_until) return false;
        return new Date(profile.premium_until) > new Date();
    } catch {
        return false;
    }
}

async function getUserStats(): Promise<Record<string, unknown> | null> {
    try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return null;

        const { data } = await supabase
            .from('user_stats')
            .select('ai_suggestions_today, ai_suggestions_reset_at, resale_listings_month, resale_listings_reset_at')
            .eq('user_id', userData.user.id)
            .single();

        return data;
    } catch {
        return null;
    }
}

async function resetIfNeeded(
    field: 'ai_suggestions' | 'resale_listings',
    resetAt: string | null
): Promise<boolean> {
    if (!resetAt) return false;

    const resetDate = new Date(resetAt);
    if (resetDate > new Date()) return false;

    // Reset is needed
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    if (field === 'ai_suggestions') {
        await supabase
            .from('user_stats')
            .update({
                ai_suggestions_today: 0,
                ai_suggestions_reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('user_id', userData.user.id);
    } else {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setHours(0, 0, 0, 0);

        await supabase
            .from('user_stats')
            .update({
                resale_listings_month: 0,
                resale_listings_reset_at: nextMonth.toISOString(),
            })
            .eq('user_id', userData.user.id);
    }

    return true;
}

export const usageLimitsService = {
    /**
     * Check AI suggestion limit.
     */
    checkAISuggestionLimit: async (): Promise<UsageLimitStatus> => {
        const premium = await isPremiumUser();
        if (premium) {
            return { allowed: true, used: 0, limit: Infinity, remaining: Infinity, resetAt: null, isPremium: true };
        }

        const stats = await getUserStats();
        if (!stats) {
            return { allowed: true, used: 0, limit: FREE_TIER_LIMITS.AI_SUGGESTIONS_PER_DAY, remaining: FREE_TIER_LIMITS.AI_SUGGESTIONS_PER_DAY, resetAt: null, isPremium: false };
        }

        const resetAt = stats.ai_suggestions_reset_at as string | null;
        const wasReset = await resetIfNeeded('ai_suggestions', resetAt);

        const used = wasReset ? 0 : (stats.ai_suggestions_today as number) || 0;
        const limit = FREE_TIER_LIMITS.AI_SUGGESTIONS_PER_DAY;
        const remaining = Math.max(limit - used, 0);

        // Re-fetch resetAt if it was just reset
        let currentResetAt = resetAt;
        if (wasReset) {
            const freshStats = await getUserStats();
            currentResetAt = freshStats?.ai_suggestions_reset_at as string | null;
        }

        return {
            allowed: remaining > 0,
            used,
            limit,
            remaining,
            resetAt: currentResetAt,
            isPremium: false,
        };
    },

    /**
     * Increment AI suggestion counter.
     */
    incrementAISuggestions: async (): Promise<void> => {
        try {
            const premium = await isPremiumUser();
            if (premium) return;

            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return;

            const { data: stats } = await supabase
                .from('user_stats')
                .select('ai_suggestions_today')
                .eq('user_id', userData.user.id)
                .single();

            const current = (stats?.ai_suggestions_today as number) || 0;

            await supabase
                .from('user_stats')
                .update({ ai_suggestions_today: current + 1 })
                .eq('user_id', userData.user.id);
        } catch (err) {
            console.error('Failed to increment AI suggestions counter:', err);
        }
    },

    /**
     * Check resale listing limit.
     */
    checkResaleListingLimit: async (): Promise<UsageLimitStatus> => {
        const premium = await isPremiumUser();
        if (premium) {
            return { allowed: true, used: 0, limit: Infinity, remaining: Infinity, resetAt: null, isPremium: true };
        }

        const stats = await getUserStats();
        if (!stats) {
            return { allowed: true, used: 0, limit: FREE_TIER_LIMITS.RESALE_LISTINGS_PER_MONTH, remaining: FREE_TIER_LIMITS.RESALE_LISTINGS_PER_MONTH, resetAt: null, isPremium: false };
        }

        const resetAt = stats.resale_listings_reset_at as string | null;
        const wasReset = await resetIfNeeded('resale_listings', resetAt);

        const used = wasReset ? 0 : (stats.resale_listings_month as number) || 0;
        const limit = FREE_TIER_LIMITS.RESALE_LISTINGS_PER_MONTH;
        const remaining = Math.max(limit - used, 0);

        let currentResetAt = resetAt;
        if (wasReset) {
            const freshStats = await getUserStats();
            currentResetAt = freshStats?.resale_listings_reset_at as string | null;
        }

        return {
            allowed: remaining > 0,
            used,
            limit,
            remaining,
            resetAt: currentResetAt,
            isPremium: false,
        };
    },

    /**
     * Increment resale listing counter.
     */
    incrementResaleListings: async (): Promise<void> => {
        try {
            const premium = await isPremiumUser();
            if (premium) return;

            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return;

            const { data: stats } = await supabase
                .from('user_stats')
                .select('resale_listings_month')
                .eq('user_id', userData.user.id)
                .single();

            const current = (stats?.resale_listings_month as number) || 0;

            await supabase
                .from('user_stats')
                .update({ resale_listings_month: current + 1 })
                .eq('user_id', userData.user.id);
        } catch (err) {
            console.error('Failed to increment resale listings counter:', err);
        }
    },
};
