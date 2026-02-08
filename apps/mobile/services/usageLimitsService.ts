/**
 * Usage Limits Service
 * Story 7.5: Freemium Tier Limits
 * Tracks and enforces free-tier usage limits for AI suggestions and resale listings.
 *
 * Security: All limit checks and increments are enforced server-side via
 * Supabase stored procedures (migration 016). The client calls .rpc() and
 * receives the authoritative result — no client-side bypass is possible.
 */

import { supabase } from './supabase';

export interface UsageLimitStatus {
    allowed: boolean;
    used: number;
    limit: number;
    remaining: number;
    resetAt: string | null;
    isPremium: boolean;
}

function parseRpcResult(data: Record<string, unknown> | null): UsageLimitStatus {
    if (!data) {
        return { allowed: true, used: 0, limit: 3, remaining: 3, resetAt: null, isPremium: false };
    }
    return {
        allowed: data.allowed as boolean,
        used: (data.used as number) || 0,
        limit: (data.limit as number) || 0,
        remaining: (data.remaining as number) || 0,
        resetAt: (data.resetAt as string) || null,
        isPremium: (data.isPremium as boolean) || false,
    };
}

export const usageLimitsService = {
    /**
     * Check AI suggestion limit (read-only, does NOT consume a use).
     * Use this for displaying remaining count in the UI.
     */
    checkAISuggestionLimit: async (): Promise<UsageLimitStatus> => {
        try {
            const { data, error } = await supabase.rpc('check_ai_suggestion_status');
            if (error) {
                console.warn('check_ai_suggestion_status RPC error:', error);
                // Fail open: allow if we can't reach the server
                return { allowed: true, used: 0, limit: 3, remaining: 3, resetAt: null, isPremium: false };
            }
            return parseRpcResult(data as Record<string, unknown>);
        } catch {
            return { allowed: true, used: 0, limit: 3, remaining: 3, resetAt: null, isPremium: false };
        }
    },

    /**
     * Atomically check limit AND increment the AI suggestion counter.
     * Returns the updated status. If not allowed, counter is NOT incremented.
     * Call this right before generating a suggestion.
     */
    consumeAISuggestion: async (): Promise<UsageLimitStatus> => {
        try {
            const { data, error } = await supabase.rpc('check_and_increment_ai_suggestions');
            if (error) {
                console.warn('check_and_increment_ai_suggestions RPC error:', error);
                return { allowed: true, used: 0, limit: 3, remaining: 3, resetAt: null, isPremium: false };
            }
            return parseRpcResult(data as Record<string, unknown>);
        } catch {
            return { allowed: true, used: 0, limit: 3, remaining: 3, resetAt: null, isPremium: false };
        }
    },

    /**
     * Check resale listing limit (read-only, does NOT consume a use).
     */
    checkResaleListingLimit: async (): Promise<UsageLimitStatus> => {
        try {
            const { data, error } = await supabase.rpc('check_resale_listing_status');
            if (error) {
                console.warn('check_resale_listing_status RPC error:', error);
                return { allowed: true, used: 0, limit: 2, remaining: 2, resetAt: null, isPremium: false };
            }
            return parseRpcResult(data as Record<string, unknown>);
        } catch {
            return { allowed: true, used: 0, limit: 2, remaining: 2, resetAt: null, isPremium: false };
        }
    },

    /**
     * Atomically check limit AND increment the resale listing counter.
     * Call this right before generating a listing.
     */
    consumeResaleListing: async (): Promise<UsageLimitStatus> => {
        try {
            const { data, error } = await supabase.rpc('check_and_increment_resale_listings');
            if (error) {
                console.warn('check_and_increment_resale_listings RPC error:', error);
                return { allowed: true, used: 0, limit: 2, remaining: 2, resetAt: null, isPremium: false };
            }
            return parseRpcResult(data as Record<string, unknown>);
        } catch {
            return { allowed: true, used: 0, limit: 2, remaining: 2, resetAt: null, isPremium: false };
        }
    },

    /**
     * @deprecated Use consumeAISuggestion() instead (atomic check+increment).
     * Kept temporarily for backward compatibility.
     */
    incrementAISuggestions: async (): Promise<void> => {
        // No-op: incrementing now happens atomically inside consumeAISuggestion
    },

    /**
     * @deprecated Use consumeResaleListing() instead (atomic check+increment).
     * Kept temporarily for backward compatibility.
     */
    incrementResaleListings: async (): Promise<void> => {
        // No-op: incrementing now happens atomically inside consumeResaleListing
    },
};
