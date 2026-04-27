/**
 * Usage Limits Service
 * Story 7.5: Freemium Tier Limits
 * Tracks and enforces free-tier usage limits for AI suggestions and resale listings.
 *
 * Security: All limit checks and increments are enforced server-side via
 * Supabase stored procedures (migration 016). The client calls .rpc() and
 * receives the authoritative result — no client-side bypass is possible.
 *
 * SECURITY NOTE (audit 2026-04-05): Fail-secure pattern applied.
 * On network/RPC errors the service now returns allowed: false to prevent
 * free-tier bypass. Read-only checks still fail-open for UI display purposes,
 * but consume/increment calls fail-secure.
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

/** Default returned when a read-only check fails (fail-open for display only). */
const FAIL_OPEN_AI: UsageLimitStatus = { allowed: true, used: 0, limit: 3, remaining: 3, resetAt: null, isPremium: false };
const FAIL_OPEN_RESALE: UsageLimitStatus = { allowed: true, used: 0, limit: 2, remaining: 2, resetAt: null, isPremium: false };

/** Default returned when a consume/increment call fails (fail-secure). */
const FAIL_SECURE_AI: UsageLimitStatus = { allowed: false, used: 0, limit: 3, remaining: 0, resetAt: null, isPremium: false };
const FAIL_SECURE_RESALE: UsageLimitStatus = { allowed: false, used: 0, limit: 2, remaining: 0, resetAt: null, isPremium: false };

function parseRpcResult(data: Record<string, unknown> | null, fallback: UsageLimitStatus): UsageLimitStatus {
    if (!data) {
        return fallback;
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
                // Fail-open for read-only UI display (does not consume a use)
                return FAIL_OPEN_AI;
            }
            return parseRpcResult(data as Record<string, unknown>, FAIL_OPEN_AI);
        } catch {
            return FAIL_OPEN_AI;
        }
    },

    /**
     * Atomically check limit AND increment the AI suggestion counter.
     * Returns the updated status. If not allowed, counter is NOT incremented.
     * Call this right before generating a suggestion.
     *
     * SECURITY: Fails secure — on error, returns allowed: false to prevent
     * free-tier bypass via forced network failures.
     */
    consumeAISuggestion: async (): Promise<UsageLimitStatus> => {
        try {
            const { data, error } = await supabase.rpc('check_and_increment_ai_suggestions');
            if (error) {
                console.warn('check_and_increment_ai_suggestions RPC error:', error);
                return FAIL_SECURE_AI;
            }
            return parseRpcResult(data as Record<string, unknown>, FAIL_SECURE_AI);
        } catch {
            return FAIL_SECURE_AI;
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
                // Fail-open for read-only UI display
                return FAIL_OPEN_RESALE;
            }
            return parseRpcResult(data as Record<string, unknown>, FAIL_OPEN_RESALE);
        } catch {
            return FAIL_OPEN_RESALE;
        }
    },

    /**
     * Atomically check limit AND increment the resale listing counter.
     * Call this right before generating a listing.
     *
     * SECURITY: Fails secure — on error, returns allowed: false.
     */
    consumeResaleListing: async (): Promise<UsageLimitStatus> => {
        try {
            const { data, error } = await supabase.rpc('check_and_increment_resale_listings');
            if (error) {
                console.warn('check_and_increment_resale_listings RPC error:', error);
                return FAIL_SECURE_RESALE;
            }
            return parseRpcResult(data as Record<string, unknown>, FAIL_SECURE_RESALE);
        } catch {
            return FAIL_SECURE_RESALE;
        }
    },
};
