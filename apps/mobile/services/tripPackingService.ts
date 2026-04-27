/**
 * Trip Packing Service
 * Generates packing lists from trip events + wardrobe
 * Story 12.6: Travel Mode Packing Suggestions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TripEvent, PackingList, PackingDay, PackingItem, DailyWeatherForecast } from '../types/packingList';
import { CalendarEventRow, eventSyncService } from './eventSyncService';
import { generateEventOutfit, generateFallbackOutfit } from './aiOutfitService';
import { trackedGenerateContent, isGeminiConfigured } from './aiUsageLogger';
import { WardrobeItem } from './items';
import { OccasionType } from '../utils/occasionDetector';
import { WeatherContext } from './weather';
import { mapWeatherToClothingNeeds, getTempCategory } from '../utils/weatherClothingMap';

const PACKING_LIST_PREFIX = 'packing_list_';

/**
 * Map event_type to OccasionType
 */
function mapOccasion(eventType: string | null): OccasionType {
    switch (eventType) {
        case 'work': return 'work';
        case 'formal': return 'formal';
        case 'social': return 'social';
        case 'active': return 'sport';
        default: return 'casual';
    }
}

/**
 * Convert a daily forecast to a WeatherContext for AI prompt injection
 */
function forecastToWeatherContext(forecast: DailyWeatherForecast): WeatherContext {
    const avgTemp = Math.round((forecast.tempHigh + forecast.tempLow) / 2);
    return {
        temp: avgTemp,
        feels_like: avgTemp,
        condition: forecast.precipitationProbability > 50 ? 'Rain likely' : 'Clear',
        humidity: 0,
        wind_speed: 0,
        weather_code: forecast.weatherCode,
        icon: forecast.weatherCode > 50 ? 'rainy' : 'sunny',
    };
}

/**
 * Generate an outfit for a trip day using AI with weather + occasion context
 */
async function generateTripDayOutfit(
    wardrobeItems: WardrobeItem[],
    occasion: OccasionType,
    weather: WeatherContext | null,
    date: string,
    destination: string | null,
    previousOutfitIds: string[] = []
): Promise<string[]> {
    if (!isGeminiConfigured() || wardrobeItems.length < 3) {
        return [];
    }

    const completeItems = wardrobeItems.filter(i => i.status === 'complete');
    if (completeItems.length < 3) return [];

    // Build a compact item list for the prompt
    const itemList = completeItems.slice(0, 50).map(i => ({
        id: i.id,
        category: i.category || 'other',
        subCategory: i.sub_category || '',
        colors: i.colors || [],
        seasons: i.seasons || [],
        name: i.name || i.sub_category || i.category || 'Item',
    }));

    let weatherText = '';
    if (weather) {
        const tempCat = getTempCategory(weather.temp);
        const needs = mapWeatherToClothingNeeds(weather.temp, weather.weather_code);
        weatherText = `Weather: ${weather.temp}°C, ${weather.condition}. Temperature: ${tempCat}.`;
        if (needs.required.length > 0) {
            weatherText += ` Required: ${needs.required.join(', ')}.`;
        }
        if (needs.conditions.length > 0) {
            weatherText += ` Conditions: ${needs.conditions.join(', ')}.`;
        }
    }

    const prompt = `You are a fashion stylist helping pack for a trip.

Date: ${date}
${destination ? `Destination: ${destination}` : ''}
Occasion: ${occasion}
${weatherText}

WARDROBE ITEMS:
${JSON.stringify(itemList)}

Pick ONE outfit (3-5 items) from the wardrobe that is:
1. Appropriate for the weather and temperature
2. Suitable for a ${occasion} occasion
3. Well-coordinated
${previousOutfitIds.length > 0 ? `4. DIFFERENT from previous days — avoid reusing these item IDs: ${JSON.stringify(previousOutfitIds)}. Pick different pieces to create variety across the trip.` : ''}

Return ONLY a JSON object: {"items": ["id1", "id2", "id3"]}`;

    try {
        const result = await trackedGenerateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }, 'trip_day_outfit');

        const text = result.text;
        if (!text) return [];

        const jsonText = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
        const match = jsonText.match(/\{[\s\S]*\}/);
        if (!match) return [];

        const parsed = JSON.parse(match[0]);
        const validIds = new Set(wardrobeItems.map(i => i.id));
        return (parsed.items || []).filter((id: string) => validIds.has(id));
    } catch (err) {
        console.warn('Trip day outfit generation failed:', err);
        return [];
    }
}

/**
 * Build a summary string: "3 work, 1 casual outfit"
 */
function buildSummary(days: PackingDay[]): string {
    const counts: Record<string, number> = {};
    for (const day of days) {
        const type = day.occasionType || 'casual';
        counts[type] = (counts[type] || 0) + 1;
    }

    const parts = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([type, count]) => `${count} ${type}`);

    if (parts.length === 0) return 'No outfits';
    return parts.join(', ') + (days.length === 1 ? ' outfit' : ' outfits');
}

/**
 * Get dates between start and end (inclusive)
 */
function getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

/**
 * Format a plain-text packing list for export
 */
function exportPackingList(list: PackingList): string {
    const lines: string[] = [];

    lines.push(`Vestiaire Packing List — ${list.tripTitle} (${list.startDate} to ${list.endDate})`);
    lines.push('');

    list.days.forEach((day, i) => {
        const date = new Date(day.date);
        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
        const itemNames = day.outfitItems.map(it => it.name).join(', ');
        const event = day.eventTitle || 'Free day';
        lines.push(`Day ${i + 1} (${dayLabel}): ${event} → ${itemNames || 'No outfit'}`);
    });

    lines.push('');
    lines.push(`Items to pack (${list.items.length} total):`);
    for (const item of list.items) {
        const check = item.packed ? '☑' : '☐';
        const daysNote = item.days.length > 1
            ? ` (${item.days.map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short' })).join(' + ')})`
            : '';
        lines.push(`${check} ${item.name}${daysNote}`);
    }

    return lines.join('\n');
}

/**
 * Generate a packing list for a trip
 */
async function generatePackingList(
    trip: TripEvent,
    wardrobeItems: WardrobeItem[],
    options?: {
        defaultOccasion?: OccasionType;
        weatherForecasts?: DailyWeatherForecast[];
    }
): Promise<{ list: PackingList | null; error: string | null }> {
    try {
        const dates = getDateRange(trip.startDate, trip.endDate);

        // Get all events within trip range
        const { events } = await eventSyncService.getUpcomingEvents(
            Math.max(dates.length + 7, 30)
        );

        const packingDays: PackingDay[] = [];
        const itemMap = new Map<string, PackingItem>();
        const usedItemIds: string[] = []; // Track items across days for variety

        for (const date of dates) {
            // Find events on this date
            const dayEvents = events.filter(e => e.start_time.split('T')[0] === date);

            // Pick highest formality event
            const topEvent = [...dayEvents]
                .sort((a, b) => (b.formality_score || 0) - (a.formality_score || 0))[0] || null;

            const occasionType = topEvent
                ? mapOccasion(topEvent.event_type)
                : (options?.defaultOccasion || 'casual');

            // Build weather context for this day if forecast available
            const dayForecast = options?.weatherForecasts?.find(f => f.date === date);
            const weatherContext = dayForecast ? forecastToWeatherContext(dayForecast) : null;

            // Generate outfit for this day
            let outfitItemIds: string[] = [];
            if (topEvent && wardrobeItems.length >= 3) {
                // Calendar event day — use event-based outfit generator
                const result = await generateEventOutfit(topEvent, wardrobeItems);
                if (result.suggestion) {
                    outfitItemIds = result.suggestion.items;
                }
            } else if (wardrobeItems.length >= 3) {
                // No calendar event — use AI with weather + occasion context
                outfitItemIds = await generateTripDayOutfit(
                    wardrobeItems,
                    occasionType,
                    weatherContext,
                    date,
                    trip.location,
                    usedItemIds
                );
            }

            // Fallback if AI failed
            if (outfitItemIds.length === 0 && wardrobeItems.length >= 3) {
                const fallback = generateFallbackOutfit(wardrobeItems);
                if (fallback) {
                    outfitItemIds = fallback.items;
                }
            }

            // Map IDs to item details
            const outfitItems = outfitItemIds
                .map(id => {
                    const w = wardrobeItems.find(item => item.id === id);
                    if (!w) return null;
                    return {
                        id: w.id,
                        name: w.name || w.sub_category || w.category || 'Item',
                        category: w.category || 'other',
                    };
                })
                .filter(Boolean) as { id: string; name: string; category: string }[];

            // Track used items for variety across days
            usedItemIds.push(...outfitItemIds);

            packingDays.push({
                date,
                eventTitle: topEvent?.title || null,
                occasionType,
                outfitItems,
            });

            // Add to deduplication map
            for (const item of outfitItems) {
                const existing = itemMap.get(item.id);
                if (existing) {
                    existing.days.push(date);
                } else {
                    const w = wardrobeItems.find(wi => wi.id === item.id);
                    itemMap.set(item.id, {
                        id: item.id,
                        name: item.name,
                        category: item.category,
                        imageUrl: w?.image_url,
                        days: [date],
                        packed: false,
                    });
                }
            }
        }

        const list: PackingList = {
            tripId: trip.id,
            tripTitle: trip.title,
            startDate: trip.startDate,
            endDate: trip.endDate,
            days: packingDays,
            items: Array.from(itemMap.values()),
            summary: buildSummary(packingDays),
            generatedAt: new Date().toISOString(),
        };

        // Save to AsyncStorage
        await savePackingList(trip.id, list);

        return { list, error: null };
    } catch (err: any) {
        console.error('Error generating packing list:', err);
        return { list: null, error: err.message };
    }
}

/**
 * Get a cached packing list
 */
async function getPackingList(tripId: string): Promise<PackingList | null> {
    try {
        const raw = await AsyncStorage.getItem(PACKING_LIST_PREFIX + tripId);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/**
 * Save a packing list to AsyncStorage
 */
async function savePackingList(tripId: string, list: PackingList): Promise<void> {
    await AsyncStorage.setItem(PACKING_LIST_PREFIX + tripId, JSON.stringify(list));
}

/**
 * Mark an item as packed/unpacked
 */
async function markItemPacked(
    tripId: string,
    itemId: string,
    packed: boolean
): Promise<void> {
    const list = await getPackingList(tripId);
    if (!list) return;

    const item = list.items.find(i => i.id === itemId);
    if (item) {
        item.packed = packed;
        await savePackingList(tripId, list);
    }
}

export const tripPackingService = {
    generatePackingList,
    getPackingList,
    savePackingList,
    markItemPacked,
    exportPackingList,
    buildSummary,
    getDateRange,
};
