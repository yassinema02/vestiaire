/**
 * Neglected Items Utility
 * Story 5.4: Detects items not worn recently
 */

import { WardrobeItem } from '../services/items';

export const NEGLECTED_THRESHOLD_DAYS = 60;

/**
 * Check if an item is neglected (not worn in threshold days)
 * Items never worn are neglected if added more than threshold days ago
 */
export function isNeglected(item: WardrobeItem, thresholdDays: number = NEGLECTED_THRESHOLD_DAYS): boolean {
    if (item.status !== 'complete') return false;

    if (!item.last_worn_at) {
        // Never worn — check if added more than threshold days ago
        const addedDate = new Date(item.created_at);
        const daysSinceAdded = Math.floor((Date.now() - addedDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceAdded >= thresholdDays;
    }

    const lastWorn = new Date(item.last_worn_at);
    const daysSinceWorn = Math.floor((Date.now() - lastWorn.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceWorn >= thresholdDays;
}

/**
 * Get the number of days since an item was last worn
 * Returns null if never worn
 */
export function getDaysSinceWorn(item: WardrobeItem): number | null {
    if (!item.last_worn_at) return null;
    const lastWorn = new Date(item.last_worn_at);
    return Math.floor((Date.now() - lastWorn.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get a human-readable label for how long an item has been neglected
 */
export function formatNeglectedLabel(item: WardrobeItem): string {
    if (!item.last_worn_at) {
        const addedDate = new Date(item.created_at);
        const daysSinceAdded = Math.floor((Date.now() - addedDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceAdded < 30) return 'Never worn';
        const months = Math.floor(daysSinceAdded / 30);
        return `Never worn (added ${months}+ mo ago)`;
    }

    const days = getDaysSinceWorn(item)!;
    if (days < 30) return `${days}d since last worn`;
    const months = Math.floor(days / 30);
    return `${months}+ month${months !== 1 ? 's' : ''} since worn`;
}

/**
 * Count neglected items in a list
 */
export function countNeglected(items: WardrobeItem[], thresholdDays: number = NEGLECTED_THRESHOLD_DAYS): number {
    return items.filter(item => isNeglected(item, thresholdDays)).length;
}

/**
 * Get neglected items from a list
 */
export function getNeglectedItems(items: WardrobeItem[], thresholdDays: number = NEGLECTED_THRESHOLD_DAYS): WardrobeItem[] {
    return items.filter(item => isNeglected(item, thresholdDays));
}
