/**
 * Neglect Service
 * Story 13.1: Enhanced Neglect Detection
 * Handles configurable threshold, bulk computation, and analytics stats.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { WardrobeItem } from './items';
import { getDaysSinceWorn } from '../utils/neglectedItems';

const THRESHOLD_KEY = 'neglect_threshold_days';
const LAST_COMPUTE_KEY = 'last_neglect_compute';
const DEFAULT_THRESHOLD = 180;
const MIN_THRESHOLD = 30;
const MAX_THRESHOLD = 365;
const COMPUTE_DEBOUNCE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface NeglectStats {
    neglectedCount: number;
    totalCount: number;
    percentage: number;
    label: string;
    topNeglected: WardrobeItem[];
}

export const neglectService = {
    /**
     * Get the user's configured neglect threshold (default: 180 days)
     */
    getNeglectThreshold: async (): Promise<number> => {
        try {
            const val = await AsyncStorage.getItem(THRESHOLD_KEY);
            if (val) {
                const days = parseInt(val, 10);
                if (!isNaN(days) && days >= MIN_THRESHOLD && days <= MAX_THRESHOLD) return days;
            }
        } catch {}
        return DEFAULT_THRESHOLD;
    },

    /**
     * Set the neglect threshold (30-365 days)
     */
    setNeglectThreshold: async (days: number): Promise<void> => {
        if (days < MIN_THRESHOLD || days > MAX_THRESHOLD) {
            throw new Error(`Threshold must be between ${MIN_THRESHOLD} and ${MAX_THRESHOLD} days`);
        }
        await AsyncStorage.setItem(THRESHOLD_KEY, String(days));
    },

    /**
     * Call Supabase RPC to bulk-update neglect_status for current user.
     * Debounced: only runs once per 24h unless force=true.
     */
    computeNeglectStatuses: async (force = false): Promise<void> => {
        if (!force) {
            try {
                const last = await AsyncStorage.getItem(LAST_COMPUTE_KEY);
                if (last && Date.now() - parseInt(last, 10) < COMPUTE_DEBOUNCE_MS) return;
            } catch {}
        }

        const threshold = await neglectService.getNeglectThreshold();

        const { error } = await supabase.rpc('update_neglect_statuses', {
            threshold_days: threshold,
        });

        if (error) {
            console.error('Failed to compute neglect statuses:', error);
            return;
        }

        await AsyncStorage.setItem(LAST_COMPUTE_KEY, String(Date.now()));
    },

    /**
     * Compute neglect stats from an items array (uses DB neglect_status).
     */
    getNeglectStats: (items: WardrobeItem[]): NeglectStats => {
        const completeItems = items.filter(i => i.status === 'complete');
        const neglected = completeItems.filter(i => i.neglect_status);
        const totalCount = completeItems.length;
        const neglectedCount = neglected.length;
        const percentage = totalCount > 0 ? Math.round((neglectedCount / totalCount) * 100) : 0;

        // Sort by days since worn descending (most neglected first)
        const sorted = [...neglected].sort((a, b) => {
            const daysA = getDaysSinceWorn(a) ?? Infinity;
            const daysB = getDaysSinceWorn(b) ?? Infinity;
            // Items never worn (Infinity) come first, then by most days
            return daysB - daysA;
        });

        const label = neglectedCount === 0
            ? 'No neglected items'
            : `${percentage}% of your wardrobe is neglected (${neglectedCount} item${neglectedCount !== 1 ? 's' : ''})`;

        return {
            neglectedCount,
            totalCount,
            percentage,
            label,
            topNeglected: sorted.slice(0, 3),
        };
    },
};
