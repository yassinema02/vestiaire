/**
 * Trip Packing Service
 * Generates packing lists from trip events + wardrobe
 * Story 12.6: Travel Mode Packing Suggestions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TripEvent, PackingList, PackingDay, PackingItem } from '../types/packingList';
import { CalendarEventRow, eventSyncService } from './eventSyncService';
import { generateEventOutfit, generateFallbackOutfit } from './aiOutfitService';
import { WardrobeItem } from './items';
import { OccasionType } from '../types/context';

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
    wardrobeItems: WardrobeItem[]
): Promise<{ list: PackingList | null; error: string | null }> {
    try {
        const dates = getDateRange(trip.startDate, trip.endDate);

        // Get all events within trip range
        const { events } = await eventSyncService.getUpcomingEvents(
            Math.max(dates.length + 7, 30)
        );

        const packingDays: PackingDay[] = [];
        const itemMap = new Map<string, PackingItem>();

        for (const date of dates) {
            // Find events on this date
            const dayEvents = events.filter(e => e.start_time.split('T')[0] === date);

            // Pick highest formality event
            const topEvent = [...dayEvents]
                .sort((a, b) => (b.formality_score || 0) - (a.formality_score || 0))[0] || null;

            const occasionType = topEvent ? mapOccasion(topEvent.event_type) : 'casual';

            // Generate outfit for this day
            let outfitItemIds: string[] = [];
            if (topEvent && wardrobeItems.length >= 3) {
                const result = await generateEventOutfit(topEvent, wardrobeItems);
                if (result.suggestion) {
                    outfitItemIds = result.suggestion.items;
                }
            }

            // Fallback if no outfit generated
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
