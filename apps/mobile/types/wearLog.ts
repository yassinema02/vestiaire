/**
 * Wear Log Types
 * Types for wear logging data model
 */

import { WardrobeItem } from '../services/items';

/**
 * Wear log entry from database
 */
export interface WearLog {
    id: string;
    user_id: string;
    item_id: string;
    outfit_id: string | null;
    worn_date: string; // YYYY-MM-DD
    created_at: string;
    item?: WardrobeItem; // Populated via join
}

/**
 * Summary of wear stats for an item
 */
export interface WearStats {
    wear_count: number;
    last_worn_date: string | null;
}
