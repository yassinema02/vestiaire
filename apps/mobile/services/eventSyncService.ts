/**
 * Event Sync Service
 * Syncs calendar events to database and manages sync lifecycle
 * Story 12.2: Event Detection & Classification
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { appleCalendarService, CalendarEvent } from './appleCalendar';
import { calendarService, CalendarEvent as GoogleCalendarEvent } from './calendar';
import { useCalendarStore } from '../stores/calendarStore';
import { TripEvent } from '../types/packingList';

const TRIP_KEYWORDS = ['trip', 'travel', 'vacation', 'holiday', 'flight', 'conference'];

const LAST_SYNC_KEY = 'event_sync_last_sync';
const SYNC_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * Database event row shape
 */
export interface CalendarEventRow {
    id: string;
    user_id: string;
    external_event_id: string;
    title: string;
    description: string | null;
    location: string | null;
    start_time: string;
    end_time: string;
    is_all_day: boolean;
    event_type: string | null;
    formality_score: number | null;
    user_corrected: boolean;
    synced_at: string;
}

export const eventSyncService = {
    /**
     * Sync events from connected calendar providers to database
     * Fetches today + next 7 days, upserts, and cleans stale events
     */
    syncEvents: async (): Promise<{ synced: number; error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const now = new Date();
            const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            const calendarState = useCalendarStore.getState();
            const allEvents: { id: string; title: string; startTime: string; endTime: string; location: string | null; isAllDay: boolean }[] = [];

            // Fetch Apple Calendar events if connected (iOS)
            if (Platform.OS === 'ios' && calendarState.appleConnected) {
                const { events, error } = await appleCalendarService.fetchEventsInRange(now, sevenDaysLater);
                if (!error && events.length > 0) {
                    allEvents.push(...events.map(e => ({
                        id: e.id,
                        title: e.title,
                        startTime: e.startTime,
                        endTime: e.endTime,
                        location: e.location,
                        isAllDay: e.isAllDay,
                    })));
                }
            }

            // Fetch Google Calendar events if connected
            if (calendarState.googleConnected) {
                const { events, error } = await calendarService.fetchEventsInRange(now, sevenDaysLater);
                if (!error && events && events.length > 0) {
                    allEvents.push(...events.map(e => ({
                        id: e.id,
                        title: e.title,
                        startTime: e.startTime,
                        endTime: e.endTime,
                        location: e.location,
                        isAllDay: e.isAllDay,
                    })));
                }
            }

            if (allEvents.length === 0) {
                await eventSyncService.setLastSyncTime();
                return { synced: 0, error: null };
            }

            // Upsert events into database
            for (const event of allEvents) {
                await supabase.from('calendar_events').upsert(
                    {
                        user_id: userId,
                        external_event_id: event.id,
                        title: event.title,
                        start_time: event.startTime,
                        end_time: event.endTime,
                        is_all_day: event.isAllDay,
                        location: event.location,
                        synced_at: new Date().toISOString(),
                    },
                    { onConflict: 'user_id,external_event_id' }
                );
            }

            // Clean stale events
            await eventSyncService.deleteStaleEvents();

            // Update last sync time
            await eventSyncService.setLastSyncTime();

            return { synced: allEvents.length, error: null };
        } catch (error) {
            console.error('Event sync error:', error);
            return { synced: 0, error: error as Error };
        }
    },

    /**
     * Get upcoming events from database
     */
    getUpcomingEvents: async (
        days: number = 7
    ): Promise<{ events: CalendarEventRow[]; error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const now = new Date().toISOString();
            const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

            const { data, error } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('user_id', userId)
                .gte('start_time', now)
                .lte('start_time', endDate)
                .order('start_time', { ascending: true });

            if (error) throw error;

            return { events: (data || []) as CalendarEventRow[], error: null };
        } catch (error) {
            console.error('Error getting upcoming events:', error);
            return { events: [], error: error as Error };
        }
    },

    /**
     * Delete events older than 14 days
     */
    deleteStaleEvents: async (): Promise<void> => {
        try {
            const userId = await requireUserId();
            const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

            await supabase
                .from('calendar_events')
                .delete()
                .eq('user_id', userId)
                .lt('start_time', cutoff);
        } catch (error) {
            console.error('Error deleting stale events:', error);
        }
    },

    /**
     * Check if sync is needed (last sync > 1 hour ago)
     */
    shouldSync: async (): Promise<boolean> => {
        try {
            const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
            if (!lastSync) return true;
            return Date.now() - parseInt(lastSync, 10) > SYNC_COOLDOWN_MS;
        } catch {
            return true;
        }
    },

    /**
     * Set last sync timestamp
     */
    setLastSyncTime: async (): Promise<void> => {
        await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    },

    /**
     * Get last sync timestamp
     */
    getLastSyncTime: async (): Promise<number | null> => {
        try {
            const val = await AsyncStorage.getItem(LAST_SYNC_KEY);
            return val ? parseInt(val, 10) : null;
        } catch {
            return null;
        }
    },

    /**
     * Update an event's classification (for user corrections)
     */
    updateEventClassification: async (
        eventId: string,
        eventType: string,
        formalityScore: number,
        userCorrected: boolean = false
    ): Promise<{ error: Error | null }> => {
        try {
            const { error } = await supabase
                .from('calendar_events')
                .update({
                    event_type: eventType,
                    formality_score: formalityScore,
                    user_corrected: userCorrected,
                })
                .eq('id', eventId);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Error updating event classification:', error);
            return { error: error as Error };
        }
    },

    /**
     * Detect trip events from upcoming calendar events
     * Trip = multi-day event (≥2 days) OR title contains trip keywords
     * Story 12.6
     */
    detectTripEvents: async (
        days: number = 30
    ): Promise<{ trips: TripEvent[]; error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const now = new Date().toISOString();
            const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

            const { data, error } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('user_id', userId)
                .gte('start_time', now)
                .lte('start_time', endDate)
                .order('start_time', { ascending: true });

            if (error) throw error;

            const events = (data || []) as CalendarEventRow[];
            const trips: TripEvent[] = [];
            const seenIds = new Set<string>();

            for (const event of events) {
                if (seenIds.has(event.id)) continue;

                const start = new Date(event.start_time);
                const end = new Date(event.end_time);
                const durationMs = end.getTime() - start.getTime();
                const durationDays = Math.ceil(durationMs / (24 * 60 * 60 * 1000));

                const isMultiDay = event.is_all_day && durationDays >= 2;
                const hasKeyword = TRIP_KEYWORDS.some(k =>
                    event.title.toLowerCase().includes(k)
                );

                if (isMultiDay || hasKeyword) {
                    seenIds.add(event.id);
                    trips.push({
                        id: event.id,
                        title: event.title,
                        startDate: event.start_time.split('T')[0],
                        endDate: event.end_time.split('T')[0],
                        durationDays: Math.max(durationDays, 1),
                        location: event.location,
                    });
                }
            }

            return { trips, error: null };
        } catch (error) {
            console.error('Error detecting trip events:', error);
            return { trips: [], error: error as Error };
        }
    },
};
