/**
 * Challenge Service
 * Story 6.6: Closet Safari Challenge (Onboarding)
 * Manages the "Upload 20 items in 7 days" onboarding challenge lifecycle.
 */

import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';

export interface UserChallenge {
    id: string;
    user_id: string;
    challenge_type: string;
    status: 'active' | 'completed' | 'skipped' | 'expired';
    progress: number;
    target: number;
    started_at: string;
    expires_at: string;
    completed_at: string | null;
}

const CHALLENGE_TYPE = 'closet_safari';
const CHALLENGE_TARGET = 20;
const CHALLENGE_DAYS = 7;

export const challengeService = {
    /**
     * Get the user's Closet Safari challenge (if any).
     * Automatically expires active challenges past their deadline.
     */
    getChallenge: async (): Promise<{ challenge: UserChallenge | null; error: Error | null }> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return { challenge: null, error: null };

            const { data, error } = await supabase
                .from('user_challenges')
                .select('*')
                .eq('user_id', userData.user.id)
                .eq('challenge_type', CHALLENGE_TYPE)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return { challenge: null, error: null }; // Not found
                if (error.code === 'PGRST205' || error.code === '42P01') return { challenge: null, error: null }; // Table missing
                return { challenge: null, error };
            }

            const challenge = data as UserChallenge;

            // Auto-expire if past deadline and still active
            if (challenge.status === 'active' && new Date(challenge.expires_at) < new Date()) {
                await supabase
                    .from('user_challenges')
                    .update({ status: 'expired' })
                    .eq('id', challenge.id)
                    .eq('user_id', userData.user.id);
                return { challenge: { ...challenge, status: 'expired' }, error: null };
            }

            return { challenge, error: null };
        } catch (error) {
            console.warn('Get challenge error:', error);
            return { challenge: null, error: error as Error };
        }
    },

    /**
     * Start the Closet Safari challenge.
     * Creates the challenge entry with a 7-day window.
     */
    startChallenge: async (): Promise<{ challenge: UserChallenge | null; error: Error | null }> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return { challenge: null, error: new Error('Not authenticated') };

            const now = new Date();
            const expiresAt = new Date(now);
            expiresAt.setDate(expiresAt.getDate() + CHALLENGE_DAYS);

            // Count current items as starting progress
            const { count } = await supabase
                .from('items')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userData.user.id)
                .eq('status', 'complete');

            const startingProgress = count || 0;

            const { data, error } = await supabase
                .from('user_challenges')
                .insert({
                    user_id: userData.user.id,
                    challenge_type: CHALLENGE_TYPE,
                    status: 'active',
                    progress: startingProgress,
                    target: CHALLENGE_TARGET,
                    expires_at: expiresAt.toISOString(),
                })
                .select()
                .single();

            if (error) {
                console.warn('Start challenge error:', error);
                return { challenge: null, error };
            }

            return { challenge: data as UserChallenge, error: null };
        } catch (error) {
            console.warn('Start challenge exception:', error);
            return { challenge: null, error: error as Error };
        }
    },

    /**
     * Skip the challenge. Sets status to 'skipped'.
     */
    skipChallenge: async (): Promise<{ error: Error | null }> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return { error: new Error('Not authenticated') };

            // Check if a challenge exists; if not, create one as skipped
            const { challenge } = await challengeService.getChallenge();
            if (!challenge) {
                const now = new Date();
                const expiresAt = new Date(now);
                expiresAt.setDate(expiresAt.getDate() + CHALLENGE_DAYS);

                await supabase
                    .from('user_challenges')
                    .insert({
                        user_id: userData.user.id,
                        challenge_type: CHALLENGE_TYPE,
                        status: 'skipped',
                        progress: 0,
                        target: CHALLENGE_TARGET,
                        expires_at: expiresAt.toISOString(),
                    });
                return { error: null };
            }

            const { error } = await supabase
                .from('user_challenges')
                .update({ status: 'skipped' })
                .eq('id', challenge.id)
                .eq('user_id', userData.user.id);

            return { error: error || null };
        } catch (error) {
            console.warn('Skip challenge exception:', error);
            return { error: error as Error };
        }
    },

    /**
     * Update challenge progress after an item upload.
     * Returns whether the challenge was just completed.
     * Rewards are granted server-side via award_challenge_rewards_safe (migration 016).
     */
    updateProgress: async (): Promise<{ completed: boolean; error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const { challenge } = await challengeService.getChallenge();
            if (!challenge || challenge.status !== 'active') {
                return { completed: false, error: null };
            }

            // Count actual current item count
            const { count } = await supabase
                .from('items')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'complete');

            const newProgress = count || 0;

            if (newProgress >= challenge.target) {
                // Update progress first
                await supabase
                    .from('user_challenges')
                    .update({ progress: newProgress })
                    .eq('id', challenge.id)
                    .eq('user_id', userId);

                // Award rewards server-side (validates completion atomically)
                const { data, error: rpcError } = await supabase.rpc('award_challenge_rewards_safe', {
                    p_challenge_id: challenge.id,
                });

                if (rpcError) {
                    console.warn('Award challenge rewards RPC error:', rpcError);
                    return { completed: false, error: rpcError };
                }

                const result = data as { success: boolean; reason?: string };
                return { completed: result.success, error: null };
            }

            // Update progress
            await supabase
                .from('user_challenges')
                .update({ progress: newProgress })
                .eq('id', challenge.id)
                .eq('user_id', userId);

            return { completed: false, error: null };
        } catch (error) {
            console.warn('Update challenge progress exception:', error);
            return { completed: false, error: error as Error };
        }
    },

    /**
     * Check if the user has never seen the challenge invite.
     * True if no challenge record exists for this user.
     */
    shouldShowInvite: async (): Promise<boolean> => {
        try {
            const { challenge } = await challengeService.getChallenge();
            return challenge === null;
        } catch {
            return false;
        }
    },
};

// awardChallengeRewards is now handled server-side via
// award_challenge_rewards_safe() stored procedure (migration 016).
