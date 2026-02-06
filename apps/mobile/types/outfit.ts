/**
 * Outfit Types
 * Types for outfit data model and storage
 */

import { OccasionType } from '../utils/occasionDetector';
import { WardrobeItem } from '../services/items';

/**
 * Position of an item within an outfit
 */
export type OutfitPosition = 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear' | 'dress';

/**
 * Weather context snapshot saved with outfit
 */
export interface WeatherContextSnapshot {
    temperature: number;
    condition: string;
    date: string;
}

/**
 * Outfit item junction data
 */
export interface OutfitItem {
    id: string;
    outfit_id: string;
    item_id: string;
    position: OutfitPosition;
    item?: WardrobeItem;  // Populated via join
}

/**
 * Outfit data from database
 */
export interface Outfit {
    id: string;
    user_id: string;
    name: string | null;
    occasion: OccasionType | null;
    is_ai_generated: boolean;
    is_favorite: boolean;
    weather_context: WeatherContextSnapshot | null;
    created_at: string;
    items?: OutfitItem[];  // Populated via join
}

/**
 * Input for creating a new outfit
 */
export interface CreateOutfitInput {
    name?: string;
    occasion?: OccasionType;
    is_ai_generated?: boolean;
    weather_context?: WeatherContextSnapshot;
    items: Array<{
        item_id: string;
        position: OutfitPosition;
    }>;
}

/**
 * Input for updating an outfit
 */
export interface UpdateOutfitInput {
    name?: string;
    occasion?: OccasionType;
    items?: Array<{
        item_id: string;
        position: OutfitPosition;
    }>;
}

/**
 * Validation result for outfit
 */
export interface OutfitValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Validate outfit items meet requirements
 * - Must have 2-6 items
 * - Must have (top + bottom) OR dress
 */
export function validateOutfitItems(
    items: Array<{ item_id: string; position: OutfitPosition }>
): OutfitValidationResult {
    const errors: string[] = [];

    // Check item count
    if (items.length < 2) {
        errors.push('An outfit must have at least 2 items');
    }
    if (items.length > 6) {
        errors.push('An outfit can have at most 6 items');
    }

    // Check for required positions
    const positions = items.map(i => i.position);
    const hasTop = positions.includes('top');
    const hasBottom = positions.includes('bottom');
    const hasDress = positions.includes('dress');

    if (!hasDress && !(hasTop && hasBottom)) {
        errors.push('An outfit must have either a dress OR both a top and bottom');
    }

    // Check for duplicate positions (except accessories)
    const nonAccessoryPositions = positions.filter(p => p !== 'accessory');
    const uniqueNonAccessory = new Set(nonAccessoryPositions);
    if (uniqueNonAccessory.size !== nonAccessoryPositions.length) {
        errors.push('Each position (except accessory) can only be used once');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
