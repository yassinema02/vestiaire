/**
 * Gamification Service
 * Story 6.1: Style Points System
 * Story 6.2: User Levels & Progression
 * Story 6.3: Streak Tracking
 * Story 6.4: Badges & Achievements
 * Handles point awards, user stats, streak tracking, level progression, point history, and badges
 */

import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { POINTS, LEVELS, STREAK_MILESTONES, BADGES, BadgeDefinition } from '@vestiaire/shared';

export interface UserStats {
    user_id: string;
    style_points: number;
    level: number;
    current_streak: number;
    longest_streak: number;
    last_active_date: string | null;
    streak_freezes_available: number;
    last_freeze_replenish_date: string | null;
}

export interface StreakUpdateResult {
    streakLost: boolean;
    milestoneReached: number | null;
}

export interface StreakStatus {
    isAtRisk: boolean;
    wasLost: boolean;
    currentStreak: number;
    freezeAvailable: boolean;
}

export interface PointHistoryEntry {
    id: string;
    user_id: string;
    points: number;
    action_type: string;
    created_at: string;
}

export interface UserBadge {
    id: string;
    user_id: string;
    badge_id: string;
    is_featured: boolean;
    earned_at: string;
}

export type BadgeTrigger = 'upload' | 'streak' | 'wear_log';

export interface BadgeCheckContext {
    itemIds?: string[];
    outfitId?: string;
    weatherCondition?: string;
}

/**
 * Calculate the level for a given points total
 */
function calculateLevel(points: number): number {
    let level = 1;
    for (const l of LEVELS) {
        if (points >= l.threshold) {
            level = l.level;
        } else {
            break;
        }
    }
    return level;
}

/**
 * Get today's date as YYYY-MM-DD
 */
function todayStr(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get yesterday's date as YYYY-MM-DD
 */
function yesterdayStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

/**
 * Calculate days between two YYYY-MM-DD date strings
 */
function daysBetween(dateA: string, dateB: string): number {
    const a = new Date(dateA + 'T00:00:00');
    const b = new Date(dateB + 'T00:00:00');
    return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export const gamificationService = {
    /**
     * Get user stats, auto-creating if not found
     */
    getUserStats: async (): Promise<{ stats: UserStats | null; error: Error | null }> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                return { stats: null, error: new Error('User not authenticated') };
            }

            const { data, error } = await supabase
                .from('user_stats')
                .select('*')
                .eq('user_id', userData.user.id)
                .single();

            if (error && error.code === 'PGRST116') {
                // Row not found — create it
                const { data: newStats, error: insertError } = await supabase
                    .from('user_stats')
                    .insert({ user_id: userData.user.id })
                    .select()
                    .single();

                if (insertError) {
                    console.warn('Create user stats error:', insertError);
                    return { stats: null, error: insertError };
                }
                return { stats: newStats as UserStats, error: null };
            }

            if (error) {
                // Table may not exist yet if migration hasn't been applied
                if (error.code === 'PGRST205' || error.code === '42P01') {
                    console.warn('Gamification tables not yet created. Run migration 008.');
                    return { stats: null, error: null };
                }
                console.warn('Get user stats error:', error);
                return { stats: null, error };
            }

            return { stats: data as UserStats, error: null };
        } catch (error) {
            console.warn('Get user stats exception:', error);
            return { stats: null, error: error as Error };
        }
    },

    /**
     * Get recent point history entries
     */
    getPointsHistory: async (
        limit: number = 30
    ): Promise<{ entries: PointHistoryEntry[]; error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const { data, error } = await supabase
                .from('point_history')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                if (error.code === 'PGRST205' || error.code === '42P01') {
                    return { entries: [], error: null };
                }
                console.warn('Get points history error:', error);
                return { entries: [], error };
            }

            return { entries: data as PointHistoryEntry[], error: null };
        } catch (error) {
            console.warn('Get points history exception:', error);
            return { entries: [], error: error as Error };
        }
    },

    /**
     * Core function: add points and update stats via server-side RPC.
     * Points are awarded atomically to prevent client-side manipulation.
     */
    addPoints: async (
        amount: number,
        actionType: string
    ): Promise<{ newTotal: number; error: Error | null }> => {
        try {
            const { data, error } = await supabase.rpc('award_points', {
                p_amount: amount,
                p_action_type: actionType,
            });

            if (error) {
                if (error.code === 'PGRST205' || error.code === '42P01') {
                    return { newTotal: 0, error: null };
                }
                console.warn('Award points RPC error:', error);
                return { newTotal: 0, error };
            }

            const result = data as { new_total?: number; error?: string };
            if (result.error) {
                return { newTotal: 0, error: new Error(result.error) };
            }

            return { newTotal: result.new_total || 0, error: null };
        } catch (error) {
            console.warn('Add points exception:', error);
            return { newTotal: 0, error: error as Error };
        }
    },

    /**
     * Update streak based on last active date.
     * Call this when the user performs a daily action.
     * Handles freeze grace period and milestone detection.
     */
    updateStreak: async (): Promise<StreakUpdateResult> => {
        const defaultResult: StreakUpdateResult = { streakLost: false, milestoneReached: null };
        try {
            const { stats } = await gamificationService.getUserStats();
            if (!stats) return defaultResult;

            const today = todayStr();
            const yesterday = yesterdayStr();
            const lastActive = stats.last_active_date;

            if (lastActive === today) {
                return defaultResult;
            }

            // Use server-side RPC to update streak atomically
            const { data, error } = await supabase.rpc('update_user_streak');

            if (error) {
                console.warn('Update streak RPC error:', error);
                return defaultResult;
            }

            const result = data as { streak?: number; streak_lost?: boolean; longest?: number };
            const streakLost = result.streak_lost ?? false;
            const newStreak = result.streak ?? 1;

            // Award streak continuation points (day 2+)
            if (!streakLost && newStreak >= 2) {
                await gamificationService.addPoints(POINTS.COMPLETE_STREAK, 'streak_bonus');
            }

            // Check milestones
            let milestoneReached: number | null = null;
            for (const milestone of STREAK_MILESTONES) {
                if (newStreak === milestone) {
                    milestoneReached = milestone;
                    await gamificationService.addPoints(20, 'streak_milestone');
                    break;
                }
            }

            return { streakLost, milestoneReached };
        } catch (error) {
            console.warn('Update streak error:', error);
            return defaultResult;
        }
    },

    /**
     * Check streak status without modifying anything.
     * Use on app open to detect if streak was lost.
     */
    checkStreakStatus: async (): Promise<StreakStatus> => {
        const defaultStatus: StreakStatus = { isAtRisk: false, wasLost: false, currentStreak: 0, freezeAvailable: false };
        try {
            const { stats } = await gamificationService.getUserStats();
            if (!stats) return defaultStatus;

            const today = todayStr();
            const yesterday = yesterdayStr();
            const lastActive = stats.last_active_date;
            const activeToday = lastActive === today;
            const activeYesterday = lastActive === yesterday;

            // Streak was lost if there's a gap > 1 day, no freeze, and had a streak
            const gap = lastActive ? daysBetween(lastActive, today) : 0;
            const wasLost = !activeToday && !activeYesterday && gap > 1 && stats.current_streak > 1 && (stats.streak_freezes_available ?? 0) === 0;
            const isAtRisk = !activeToday && stats.current_streak > 0;

            return {
                isAtRisk,
                wasLost,
                currentStreak: stats.current_streak,
                freezeAvailable: (stats.streak_freezes_available ?? 0) > 0,
            };
        } catch (error) {
            console.warn('Check streak status error:', error);
            return defaultStatus;
        }
    },

    /**
     * Award points for uploading/confirming a wardrobe item
     */
    awardUploadItem: async (): Promise<{ pointsEarned: number; error: Error | null }> => {
        try {
            const { error } = await gamificationService.addPoints(POINTS.UPLOAD_ITEM, 'upload_item');
            await gamificationService.updateStreak();
            return { pointsEarned: error ? 0 : POINTS.UPLOAD_ITEM, error };
        } catch (error) {
            console.warn('Award upload item error:', error);
            return { pointsEarned: 0, error: error as Error };
        }
    },

    /**
     * Get the count of complete items for the current user.
     */
    getItemCount: async (): Promise<{ count: number; error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const { count, error } = await supabase
                .from('items')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'complete');

            if (error) {
                console.warn('Get item count error:', error);
                return { count: 0, error };
            }

            return { count: count || 0, error: null };
        } catch (error) {
            console.warn('Get item count exception:', error);
            return { count: 0, error: error as Error };
        }
    },

    /**
     * Check item count and apply level-up if warranted.
     * Uses ratchet logic: level only goes up, never down.
     * Returns whether a level-up occurred and the new level.
     */
    checkAndApplyLevelUp: async (): Promise<{
        leveledUp: boolean;
        newLevel: number;
        itemCount: number;
        error: Error | null;
    }> => {
        try {
            const { count: itemCount } = await gamificationService.getItemCount();
            const calculatedLevel = calculateLevel(itemCount);

            const { stats } = await gamificationService.getUserStats();
            if (!stats) {
                return { leveledUp: false, newLevel: 1, itemCount, error: null };
            }

            // Ratchet: only go up — level is now managed by award_points RPC
            // but we still check here for level-up detection
            if (calculatedLevel > stats.level) {
                return { leveledUp: true, newLevel: calculatedLevel, itemCount, error: null };
            }

            return { leveledUp: false, newLevel: stats.level, itemCount, error: null };
        } catch (error) {
            console.warn('Check level up error:', error);
            return { leveledUp: false, newLevel: 1, itemCount: 0, error: error as Error };
        }
    },

    /**
     * Award points for logging a wear.
     * Also checks for first-of-day bonus and updates streak.
     */
    awardWearLog: async (): Promise<{ pointsEarned: number; error: Error | null }> => {
        try {
            let totalEarned = 0;

            // Base wear log points
            const { error } = await gamificationService.addPoints(POINTS.LOG_OUTFIT, 'wear_log');
            if (!error) totalEarned += POINTS.LOG_OUTFIT;

            // Check if this is the first log of the day for bonus
            const today = todayStr();
            const userId = await requireUserId();
            const { data: todayLogs } = await supabase
                .from('point_history')
                .select('id')
                .eq('user_id', userId)
                .eq('action_type', 'wear_log')
                .gte('created_at', `${today}T00:00:00`)
                .lte('created_at', `${today}T23:59:59`);

            // If exactly 1 entry (the one we just created), this is the first
            if (todayLogs && todayLogs.length === 1) {
                const { error: bonusError } = await gamificationService.addPoints(
                    POINTS.FIRST_ITEM_OF_DAY,
                    'first_of_day'
                );
                if (!bonusError) totalEarned += POINTS.FIRST_ITEM_OF_DAY;
            }

            // Update streak
            await gamificationService.updateStreak();

            return { pointsEarned: totalEarned, error: null };
        } catch (error) {
            console.warn('Award wear log error:', error);
            return { pointsEarned: 0, error: error as Error };
        }
    },

    // ──────────────────────────────────────────────
    // Story 6.4: Badges & Achievements
    // ──────────────────────────────────────────────

    /**
     * Get all user badges (earned)
     */
    getUserBadges: async (): Promise<{ badges: UserBadge[]; error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const { data, error } = await supabase
                .from('user_badges')
                .select('*')
                .eq('user_id', userId)
                .order('earned_at', { ascending: false });

            if (error) {
                if (error.code === 'PGRST205' || error.code === '42P01') {
                    return { badges: [], error: null };
                }
                console.warn('Get user badges error:', error);
                return { badges: [], error };
            }
            return { badges: (data || []) as UserBadge[], error: null };
        } catch (error) {
            console.warn('Get user badges exception:', error);
            return { badges: [], error: error as Error };
        }
    },

    /**
     * Check and award badges based on trigger event.
     * Returns newly earned badge definitions.
     */
    checkBadges: async (
        trigger: BadgeTrigger,
        context?: BadgeCheckContext
    ): Promise<BadgeDefinition[]> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return [];

            const userId = userData.user.id;

            // Get already earned badge IDs
            const { badges: earnedBadges } = await gamificationService.getUserBadges();
            const earnedIds = new Set(earnedBadges.map(b => b.badge_id));

            const newlyEarned: BadgeDefinition[] = [];

            // Check each badge that hasn't been earned yet
            for (const badge of BADGES) {
                if (earnedIds.has(badge.id)) continue;

                const earned = await checkBadgeCondition(badge.id, trigger, userId, context);
                if (earned) {
                    // Award badge via server-side RPC
                    const { data, error } = await supabase.rpc('award_badge', {
                        p_badge_id: badge.id,
                    });

                    if (!error && data && !(data as { error?: string }).error) {
                        newlyEarned.push(badge);
                    }
                }
            }

            return newlyEarned;
        } catch (error) {
            console.warn('Check badges error:', error);
            return [];
        }
    },

    /**
     * Toggle featured status for a badge (max 3 featured)
     */
    toggleFeaturedBadge: async (
        userBadgeId: string,
        featured: boolean
    ): Promise<{ error: Error | null }> => {
        try {
            const userId = await requireUserId();
            if (featured) {
                // Count current featured badges for this user
                const { data: featuredBadges } = await supabase
                    .from('user_badges')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('is_featured', true);

                if (featuredBadges && featuredBadges.length >= 3) {
                    return { error: new Error('Maximum 3 featured badges allowed') };
                }
            }

            const { error } = await supabase
                .from('user_badges')
                .update({ is_featured: featured })
                .eq('id', userBadgeId)
                .eq('user_id', userId);

            if (error) {
                console.warn('Toggle featured badge error:', error);
                return { error };
            }
            return { error: null };
        } catch (error) {
            console.warn('Toggle featured badge exception:', error);
            return { error: error as Error };
        }
    },
};

/**
 * Check if a specific badge condition is met.
 */
async function checkBadgeCondition(
    badgeId: string,
    trigger: BadgeTrigger,
    userId: string,
    context?: BadgeCheckContext
): Promise<boolean> {
    try {
        switch (badgeId) {
            // Upload badges
            case 'first_step': {
                if (trigger !== 'upload') return false;
                const { count } = await gamificationService.getItemCount();
                return count >= 1;
            }
            case 'closet_complete': {
                if (trigger !== 'upload') return false;
                const { count } = await gamificationService.getItemCount();
                return count >= 50;
            }
            case 'style_guru': {
                if (trigger !== 'upload') return false;
                const { count } = await gamificationService.getItemCount();
                return count >= 100;
            }

            // Engagement badges
            case 'week_warrior': {
                if (trigger !== 'streak') return false;
                const { stats } = await gamificationService.getUserStats();
                return (stats?.current_streak ?? 0) >= 7;
            }
            case 'streak_legend': {
                if (trigger !== 'streak') return false;
                const { stats } = await gamificationService.getUserStats();
                return (stats?.current_streak ?? 0) >= 30;
            }
            case 'early_bird': {
                if (trigger !== 'wear_log') return false;
                const hour = new Date().getHours();
                return hour < 8;
            }

            // Sustainability badges
            case 'rewear_champion': {
                if (trigger !== 'wear_log') return false;
                // Check if any item in this wear log now has 10+ wears
                if (!context?.itemIds?.length) return false;
                const { data: items } = await supabase
                    .from('items')
                    .select('wear_count')
                    .eq('user_id', userId)
                    .in('id', context.itemIds);
                return (items || []).some((i: any) => (i.wear_count ?? 0) >= 10);
            }
            case 'circular_seller': {
                // Resale feature not yet implemented — skip
                return false;
            }

            // Secret badges
            case 'monochrome_master': {
                if (trigger !== 'wear_log') return false;
                if (!context?.itemIds?.length) return false;
                const { data: items } = await supabase
                    .from('items')
                    .select('colors')
                    .eq('user_id', userId)
                    .in('id', context.itemIds);
                if (!items || items.length === 0) return false;
                // Every item must only have "Black" in its colors
                return items.every((i: any) =>
                    Array.isArray(i.colors) && i.colors.length > 0 && i.colors.every((c: string) => c === 'Black')
                );
            }
            case 'rainbow_warrior': {
                if (trigger !== 'upload') return false;
                const { data: allItems } = await supabase
                    .from('items')
                    .select('colors')
                    .eq('user_id', userId)
                    .eq('status', 'complete');
                if (!allItems) return false;
                const uniqueColors = new Set<string>();
                allItems.forEach((i: any) => {
                    if (Array.isArray(i.colors)) {
                        i.colors.forEach((c: string) => uniqueColors.add(c));
                    }
                });
                return uniqueColors.size >= 7;
            }
            case 'og_member': {
                // Check on any trigger — user created in launch month (2024-01)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('created_at')
                    .eq('id', userId)
                    .single();
                if (!profile?.created_at) return false;
                const created = new Date(profile.created_at);
                return created.getFullYear() === 2024 && created.getMonth() === 0;
            }
            case 'weather_warrior': {
                if (trigger !== 'wear_log') return false;
                const condition = context?.weatherCondition?.toLowerCase() ?? '';
                return condition.includes('rain') || condition.includes('snow') || condition.includes('drizzle') || condition.includes('sleet');
            }

            // safari_explorer is awarded programmatically by challengeService
            case 'safari_explorer':
                return false;

            default:
                return false;
        }
    } catch (error) {
        console.warn(`Check badge condition error (${badgeId}):`, error);
        return false;
    }
}
