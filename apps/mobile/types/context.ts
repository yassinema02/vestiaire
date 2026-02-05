/**
 * Context Types
 * Types for AI outfit recommendation context
 */

import { OccasionType } from '../utils/occasionDetector';
import { TempCategory } from '../utils/weatherClothingMap';

/**
 * Time of day for context-aware recommendations
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Clothing needs derived from weather conditions
 */
export interface ClothingNeeds {
    required: string[];      // Categories that should definitely be included
    optional: string[];      // Categories that might be useful
    conditions: string[];    // Weather conditions to consider (rain, wind, etc.)
}

/**
 * Weather context for AI consumption
 */
export interface WeatherContext {
    temperature: number;
    feelsLike: number;
    condition: string;
    weatherCode: number;
    tempCategory: TempCategory;
    clothingNeeds: ClothingNeeds;
    unavailable?: boolean;
}

/**
 * Event context for AI consumption
 */
export interface EventContext {
    id: string;
    title: string;
    time: string;              // "9:00 AM" or "All day"
    occasion: OccasionType;
    location?: string;
    source: 'google' | 'apple';
}

/**
 * Full outfit context for AI recommendations
 */
export interface OutfitContext {
    // Date and time info
    date: string;              // "2026-02-01"
    dateFormatted: string;     // "Saturday, February 1st, 2026"
    dayOfWeek: string;         // "Saturday"
    timeOfDay: TimeOfDay;

    // Weather data
    weather: WeatherContext | null;

    // Calendar events
    events: EventContext[];
    primaryOccasion: OccasionType;

    // Metadata for edge case handling
    metadata: {
        hasWeather: boolean;
        hasEvents: boolean;
        eventCount: number;
        calendarSources: ('google' | 'apple')[];
    };
}

/**
 * Occasion priority for determining primary occasion
 * Higher number = higher priority
 */
export const OCCASION_PRIORITY: Record<OccasionType, number> = {
    formal: 5,
    work: 4,
    social: 3,
    sport: 2,
    casual: 1,
};

/**
 * Get primary occasion from multiple events using priority ranking
 */
export function getPrimaryOccasion(events: EventContext[]): OccasionType {
    if (events.length === 0) {
        return 'casual';
    }

    // Find the highest priority occasion
    let highestPriority = 0;
    let primaryOccasion: OccasionType = 'casual';

    for (const event of events) {
        const priority = OCCASION_PRIORITY[event.occasion];
        if (priority > highestPriority) {
            highestPriority = priority;
            primaryOccasion = event.occasion;
        }
    }

    return primaryOccasion;
}

/**
 * Get current time of day
 */
export function getTimeOfDay(hour?: number): TimeOfDay {
    const h = hour ?? new Date().getHours();

    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 21) return 'evening';
    return 'night';
}

/**
 * Format date for display
 */
export function formatDateForContext(date: Date): {
    date: string;
    dateFormatted: string;
    dayOfWeek: string;
} {
    const isoDate = date.toISOString().split('T')[0];

    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

    const dateFormatted = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return {
        date: isoDate,
        dateFormatted,
        dayOfWeek,
    };
}
