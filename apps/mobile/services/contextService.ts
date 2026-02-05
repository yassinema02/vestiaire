/**
 * Context Service
 * Builds unified context from weather and calendar data for AI recommendations
 */

import { useWeatherStore } from '../stores/weatherStore';
import { useCalendarStore } from '../stores/calendarStore';
import {
    OutfitContext,
    WeatherContext,
    EventContext,
    ClothingNeeds,
    getPrimaryOccasion,
    getTimeOfDay,
    formatDateForContext,
} from '../types/context';
import { mapWeatherToClothingNeeds, getTempCategory } from '../utils/weatherClothingMap';
import { OccasionType } from '../utils/occasionDetector';

/**
 * Build weather context from weather store data
 */
function buildWeatherContext(weatherStore: ReturnType<typeof useWeatherStore.getState>): WeatherContext | null {
    const { weather } = weatherStore;

    if (!weather) {
        return null;
    }

    // Map from weather service (snake_case) to our context format (camelCase)
    const clothingNeeds = mapWeatherToClothingNeeds(
        weather.temp,
        weather.weather_code
    );

    return {
        temperature: weather.temp,
        feelsLike: weather.feels_like,
        condition: weather.condition,
        weatherCode: weather.weather_code,
        tempCategory: getTempCategory(weather.temp),
        clothingNeeds,
    };
}

/**
 * Build event contexts from calendar store data
 */
function buildEventContexts(calendarStore: ReturnType<typeof useCalendarStore.getState>): EventContext[] {
    const { events } = calendarStore;

    return events.map(event => ({
        id: event.id,
        title: event.title,
        time: event.isAllDay ? 'All day' : event.startTime,
        occasion: event.occasion,
        location: event.location || undefined,
        source: event.source,
    }));
}

/**
 * Build the complete outfit context from all available data sources
 */
export function buildCurrentContext(): OutfitContext {
    const weatherState = useWeatherStore.getState();
    const calendarState = useCalendarStore.getState();

    const now = new Date();
    const { date, dateFormatted, dayOfWeek } = formatDateForContext(now);
    const timeOfDay = getTimeOfDay();

    const weatherContext = buildWeatherContext(weatherState);
    const events = buildEventContexts(calendarState);
    const primaryOccasion = getPrimaryOccasion(events);

    // Determine which calendar sources are connected
    const calendarSources: ('google' | 'apple')[] = [];
    if (calendarState.googleConnected) calendarSources.push('google');
    if (calendarState.appleConnected) calendarSources.push('apple');

    return {
        date,
        dateFormatted,
        dayOfWeek,
        timeOfDay,
        weather: weatherContext,
        events,
        primaryOccasion,
        metadata: {
            hasWeather: weatherContext !== null,
            hasEvents: events.length > 0,
            eventCount: events.length,
            calendarSources,
        },
    };
}

/**
 * Format context as text for AI prompt
 */
export function formatContextForPrompt(context: OutfitContext): string {
    const lines: string[] = [];

    lines.push(`Current Context:`);
    lines.push(`- Date: ${context.dateFormatted}`);
    lines.push(`- Time of day: ${context.timeOfDay}`);

    // Weather section
    if (context.weather) {
        lines.push(`- Weather: ${context.weather.temperature}°C (feels like ${context.weather.feelsLike}°C), ${context.weather.condition}`);
        lines.push(`- Temperature category: ${context.weather.tempCategory}`);

        if (context.weather.clothingNeeds.required.length > 0) {
            lines.push(`- Required clothing: ${context.weather.clothingNeeds.required.join(', ')}`);
        }
        if (context.weather.clothingNeeds.conditions.length > 0) {
            lines.push(`- Weather conditions: ${context.weather.clothingNeeds.conditions.join(', ')}`);
        }
    } else {
        lines.push(`- Weather: Not available`);
    }

    // Events section
    if (context.events.length > 0) {
        lines.push(`- Events:`);
        for (const event of context.events.slice(0, 5)) { // Limit to 5 events
            lines.push(`  * ${event.time} - ${event.title} (${event.occasion})`);
        }
        if (context.events.length > 5) {
            lines.push(`  * ... and ${context.events.length - 5} more events`);
        }
    } else {
        lines.push(`- Events: None scheduled`);
    }

    lines.push(`- Primary occasion: ${context.primaryOccasion}`);

    return lines.join('\n');
}

/**
 * Get a summary of the context for quick reference
 */
export function getContextSummary(context: OutfitContext): string {
    const parts: string[] = [];

    if (context.weather) {
        parts.push(`${context.weather.temperature}°C, ${context.weather.condition}`);
    }

    if (context.events.length > 0) {
        parts.push(`${context.events.length} event${context.events.length > 1 ? 's' : ''}`);
    } else {
        parts.push('No events');
    }

    parts.push(`${context.primaryOccasion} day`);

    return parts.join(' • ');
}

/**
 * Check if context has sufficient data for recommendations
 */
export function hasMinimalContext(context: OutfitContext): boolean {
    // At minimum, we need weather OR events to make useful recommendations
    return context.metadata.hasWeather || context.metadata.hasEvents;
}

export const contextService = {
    buildCurrentContext,
    formatContextForPrompt,
    getContextSummary,
    hasMinimalContext,
};
