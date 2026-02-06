/**
 * Wear Log Service
 * Handles CRUD operations for wear logs
 */

import { supabase } from './supabase';
import { WearLog } from '../types/wearLog';
import { WardrobeItem } from './items';

export type DateRangeFilter = 'all_time' | 'this_month' | 'this_season';

export interface MostWornItem {
    item: WardrobeItem;
    wearCount: number;
}

/**
 * Get the current meteorological season date range
 */
function getCurrentSeasonRange(): { start: string; end: string; name: string } {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (month >= 2 && month <= 4) {
        return { name: 'Spring', start: `${year}-03-01`, end: `${year}-05-31` };
    } else if (month >= 5 && month <= 7) {
        return { name: 'Summer', start: `${year}-06-01`, end: `${year}-08-31` };
    } else if (month >= 8 && month <= 10) {
        return { name: 'Fall', start: `${year}-09-01`, end: `${year}-11-30` };
    } else {
        // Winter spans year boundary
        const winterStart = month === 11 ? `${year}-12-01` : `${year - 1}-12-01`;
        const winterEnd = month === 11 ? `${year + 1}-02-28` : `${year}-02-28`;
        return { name: 'Winter', start: winterStart, end: winterEnd };
    }
}

/**
 * Get date range string for a filter
 */
export function getDateRangeForFilter(filter: DateRangeFilter): { start: string; end: string } | null {
    if (filter === 'all_time') return null;

    const now = new Date();
    if (filter === 'this_month') {
        const year = now.getFullYear();
        const month = now.getMonth();
        const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const end = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
        return { start, end };
    }

    if (filter === 'this_season') {
        const season = getCurrentSeasonRange();
        return { start: season.start, end: season.end };
    }

    return null;
}

export function getCurrentSeasonName(): string {
    return getCurrentSeasonRange().name;
}

export const wearLogService = {
    /**
     * Log items as worn today (or on a specific date)
     * Creates one wear_log entry per item
     */
    logWear: async (
        itemIds: string[],
        outfitId?: string,
        date?: Date
    ): Promise<{ logs: WearLog[]; error: Error | null }> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                return { logs: [], error: new Error('User not authenticated') };
            }

            const wornDate = date
                ? date.toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];

            const entries = itemIds.map(itemId => ({
                user_id: userData.user!.id,
                item_id: itemId,
                outfit_id: outfitId || null,
                worn_date: wornDate,
            }));

            const { data, error } = await supabase
                .from('wear_logs')
                .insert(entries)
                .select();

            if (error) {
                console.error('Log wear error:', error);
                return { logs: [], error };
            }

            return { logs: data as WearLog[], error: null };
        } catch (error) {
            console.error('Log wear exception:', error);
            return { logs: [], error: error as Error };
        }
    },

    /**
     * Get wear logs for a specific date
     */
    getWearLogsForDate: async (
        date: Date
    ): Promise<{ logs: WearLog[]; error: Error | null }> => {
        try {
            const dateStr = date.toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('wear_logs')
                .select(`
                    *,
                    item:items(*)
                `)
                .eq('worn_date', dateStr)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Get wear logs for date error:', error);
                return { logs: [], error };
            }

            return { logs: data as WearLog[], error: null };
        } catch (error) {
            console.error('Get wear logs for date exception:', error);
            return { logs: [], error: error as Error };
        }
    },

    /**
     * Get total wear count for a specific item
     */
    getWearCountForItem: async (
        itemId: string
    ): Promise<{ count: number; error: Error | null }> => {
        try {
            const { count, error } = await supabase
                .from('wear_logs')
                .select('*', { count: 'exact', head: true })
                .eq('item_id', itemId);

            if (error) {
                console.error('Get wear count error:', error);
                return { count: 0, error };
            }

            return { count: count || 0, error: null };
        } catch (error) {
            console.error('Get wear count exception:', error);
            return { count: 0, error: error as Error };
        }
    },

    /**
     * Delete a wear log entry
     */
    deleteWearLog: async (
        logId: string
    ): Promise<{ error: Error | null }> => {
        try {
            const { error } = await supabase
                .from('wear_logs')
                .delete()
                .eq('id', logId);

            if (error) {
                console.error('Delete wear log error:', error);
            }

            return { error };
        } catch (error) {
            console.error('Delete wear log exception:', error);
            return { error: error as Error };
        }
    },

    /**
     * Get recent wear logs from last N days
     */
    getRecentWearLogs: async (
        days: number = 30
    ): Promise<{ logs: WearLog[]; error: Error | null }> => {
        try {
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - days);
            const sinceDateStr = sinceDate.toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('wear_logs')
                .select(`
                    *,
                    item:items(*)
                `)
                .gte('worn_date', sinceDateStr)
                .order('worn_date', { ascending: false });

            if (error) {
                console.error('Get recent wear logs error:', error);
                return { logs: [], error };
            }

            return { logs: data as WearLog[], error: null };
        } catch (error) {
            console.error('Get recent wear logs exception:', error);
            return { logs: [], error: error as Error };
        }
    },

    /**
     * Get IDs of items worn today
     */
    getItemsWornToday: async (): Promise<{ itemIds: string[]; error: Error | null }> => {
        try {
            const todayStr = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('wear_logs')
                .select('item_id')
                .eq('worn_date', todayStr);

            if (error) {
                console.error('Get items worn today error:', error);
                return { itemIds: [], error };
            }

            const itemIds = data.map(log => log.item_id);
            return { itemIds, error: null };
        } catch (error) {
            console.error('Get items worn today exception:', error);
            return { itemIds: [], error: error as Error };
        }
    },

    /**
     * Get wear history for a specific item (all dates it was worn)
     */
    getWearHistoryForItem: async (
        itemId: string
    ): Promise<{ logs: WearLog[]; error: Error | null }> => {
        try {
            const { data, error } = await supabase
                .from('wear_logs')
                .select('*')
                .eq('item_id', itemId)
                .order('worn_date', { ascending: false });

            if (error) {
                console.error('Get wear history error:', error);
                return { logs: [], error };
            }

            return { logs: data as WearLog[], error: null };
        } catch (error) {
            console.error('Get wear history exception:', error);
            return { logs: [], error: error as Error };
        }
    },

    /**
     * Get most worn items, optionally filtered by category and date range.
     *
     * For "all_time" we use the items table wear_count directly.
     * For date-filtered queries we aggregate wear_logs within the range.
     */
    getMostWornItems: async (options?: {
        limit?: number;
        category?: string;
        dateRange?: DateRangeFilter;
    }): Promise<{ items: MostWornItem[]; error: Error | null }> => {
        try {
            const limit = options?.limit || 10;
            const dateRange = options?.dateRange || 'all_time';
            const range = getDateRangeForFilter(dateRange);

            if (!range) {
                // All-time: query items table directly
                let query = supabase
                    .from('items')
                    .select('*')
                    .gt('wear_count', 0)
                    .order('wear_count', { ascending: false })
                    .limit(limit);

                if (options?.category) {
                    query = query.eq('category', options.category);
                }

                const { data, error } = await query;
                if (error) {
                    console.error('Get most worn items error:', error);
                    return { items: [], error };
                }

                return {
                    items: (data as WardrobeItem[]).map(item => ({
                        item,
                        wearCount: item.wear_count,
                    })),
                    error: null,
                };
            }

            // Date-filtered: query wear_logs and join items
            let query = supabase
                .from('wear_logs')
                .select('item_id, item:items(*)')
                .gte('worn_date', range.start)
                .lte('worn_date', range.end);

            const { data: logs, error } = await query;
            if (error) {
                console.error('Get most worn items (date) error:', error);
                return { items: [], error };
            }

            // Aggregate wear counts per item
            const countMap = new Map<string, { item: WardrobeItem; count: number }>();
            for (const log of logs as any[]) {
                const item = log.item as WardrobeItem;
                if (!item) continue;

                // Apply category filter
                if (options?.category && item.category !== options.category) continue;

                const existing = countMap.get(log.item_id);
                if (existing) {
                    existing.count++;
                } else {
                    countMap.set(log.item_id, { item, count: 1 });
                }
            }

            // Sort by count descending and take top N
            const sorted = Array.from(countMap.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, limit)
                .map(({ item, count }) => ({ item, wearCount: count }));

            return { items: sorted, error: null };
        } catch (error) {
            console.error('Get most worn items exception:', error);
            return { items: [], error: error as Error };
        }
    },
};
