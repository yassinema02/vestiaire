/**
 * Apple Calendar Service
 * Handles iOS EventKit integration via expo-calendar
 */

import * as Calendar from 'expo-calendar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectOccasion, OccasionType } from '../utils/occasionDetector';

// Storage key for selected calendar IDs
const APPLE_CALENDARS_KEY = 'apple_calendar_selected_ids';

// Apple Calendar metadata interface
export interface AppleCalendar {
    id: string;
    title: string;
    color: string;
    source: string;
    isPrimary: boolean;
    allowsModifications: boolean;
}

// Calendar event interface (matches Google Calendar event format)
export interface CalendarEvent {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location: string | null;
    isAllDay: boolean;
    occasion: OccasionType;
    source: 'google' | 'apple';
}

/**
 * Format time for display
 */
function formatEventTime(dateTime: string | Date | undefined, isAllDay: boolean): string {
    if (isAllDay) {
        return 'All day';
    }
    if (!dateTime) {
        return '';
    }
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Get start and end of today as Date objects
 */
function getTodayBounds(): { startOfDay: Date; endOfDay: Date } {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    return { startOfDay, endOfDay };
}

export const appleCalendarService = {
    /**
     * Request calendar permissions from user
     */
    requestPermission: async (): Promise<{ granted: boolean; error: Error | null }> => {
        try {
            const { status } = await Calendar.requestCalendarPermissionsAsync();
            return {
                granted: status === 'granted',
                error: null,
            };
        } catch (error) {
            console.error('Error requesting calendar permission:', error);
            return {
                granted: false,
                error: error as Error,
            };
        }
    },

    /**
     * Check current permission status
     */
    checkPermission: async (): Promise<'granted' | 'denied' | 'undetermined'> => {
        try {
            const { status } = await Calendar.getCalendarPermissionsAsync();
            return status as 'granted' | 'denied' | 'undetermined';
        } catch (error) {
            console.error('Error checking calendar permission:', error);
            return 'undetermined';
        }
    },

    /**
     * Get all available calendars on the device
     */
    getCalendars: async (): Promise<{ calendars: AppleCalendar[]; error: Error | null }> => {
        try {
            const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

            const appleCalendars: AppleCalendar[] = calendars.map(cal => ({
                id: cal.id,
                title: cal.title,
                color: cal.color || '#007AFF',
                source: cal.source?.name || 'Local',
                isPrimary: cal.isPrimary || false,
                allowsModifications: cal.allowsModifications,
            }));

            return { calendars: appleCalendars, error: null };
        } catch (error) {
            console.error('Error getting calendars:', error);
            return { calendars: [], error: error as Error };
        }
    },

    /**
     * Get selected calendar IDs from storage
     */
    getSelectedCalendarIds: async (): Promise<string[]> => {
        try {
            const idsJson = await AsyncStorage.getItem(APPLE_CALENDARS_KEY);
            if (idsJson) {
                return JSON.parse(idsJson);
            }
            return [];
        } catch (error) {
            console.error('Error getting selected calendar IDs:', error);
            return [];
        }
    },

    /**
     * Save selected calendar IDs to storage
     */
    setSelectedCalendarIds: async (ids: string[]): Promise<void> => {
        try {
            await AsyncStorage.setItem(APPLE_CALENDARS_KEY, JSON.stringify(ids));
        } catch (error) {
            console.error('Error saving selected calendar IDs:', error);
        }
    },

    /**
     * Check if Apple Calendar is connected (has selected calendars)
     */
    isConnected: async (): Promise<boolean> => {
        const ids = await appleCalendarService.getSelectedCalendarIds();
        return ids.length > 0;
    },

    /**
     * Fetch today's events from selected calendars
     */
    fetchTodayEvents: async (calendarIds?: string[]): Promise<{ events: CalendarEvent[]; error: Error | null }> => {
        try {
            // Get selected calendars
            const selectedIds = calendarIds || await appleCalendarService.getSelectedCalendarIds();

            if (selectedIds.length === 0) {
                return { events: [], error: null };
            }

            const { startOfDay, endOfDay } = getTodayBounds();

            // Fetch events from all selected calendars
            const events = await Calendar.getEventsAsync(
                selectedIds,
                startOfDay,
                endOfDay
            );

            // Transform to our CalendarEvent format
            const calendarEvents: CalendarEvent[] = events.map(event => {
                const title = event.title || 'Untitled Event';
                const isAllDay = event.allDay || false;

                return {
                    id: event.id,
                    title,
                    startTime: formatEventTime(event.startDate, isAllDay),
                    endTime: formatEventTime(event.endDate, isAllDay),
                    location: event.location || null,
                    isAllDay,
                    occasion: detectOccasion(title, event.location || undefined),
                    source: 'apple' as const,
                };
            });

            // Sort by start time (all-day events first, then by time)
            calendarEvents.sort((a, b) => {
                if (a.isAllDay && !b.isAllDay) return -1;
                if (!a.isAllDay && b.isAllDay) return 1;
                return a.startTime.localeCompare(b.startTime);
            });

            return { events: calendarEvents, error: null };
        } catch (error) {
            console.error('Error fetching Apple Calendar events:', error);
            return { events: [], error: error as Error };
        }
    },

    /**
     * Fetch events in a date range from selected calendars
     */
    fetchEventsInRange: async (
        startDate: Date,
        endDate: Date,
        calendarIds?: string[]
    ): Promise<{ events: CalendarEvent[]; error: Error | null }> => {
        try {
            const selectedIds = calendarIds || await appleCalendarService.getSelectedCalendarIds();
            if (selectedIds.length === 0) {
                return { events: [], error: null };
            }

            const events = await Calendar.getEventsAsync(selectedIds, startDate, endDate);

            const calendarEvents: CalendarEvent[] = events.map(event => {
                const title = event.title || 'Untitled Event';
                const isAllDay = event.allDay || false;

                return {
                    id: event.id,
                    title,
                    startTime: isAllDay
                        ? new Date(event.startDate).toISOString()
                        : new Date(event.startDate).toISOString(),
                    endTime: isAllDay
                        ? new Date(event.endDate).toISOString()
                        : new Date(event.endDate).toISOString(),
                    location: event.location || null,
                    isAllDay,
                    occasion: detectOccasion(title, event.location || undefined),
                    source: 'apple' as const,
                };
            });

            calendarEvents.sort((a, b) => {
                if (a.isAllDay && !b.isAllDay) return -1;
                if (!a.isAllDay && b.isAllDay) return 1;
                return a.startTime.localeCompare(b.startTime);
            });

            return { events: calendarEvents, error: null };
        } catch (error) {
            console.error('Error fetching Apple Calendar events in range:', error);
            return { events: [], error: error as Error };
        }
    },

    /**
     * Disconnect Apple Calendar (clear selected calendars)
     */
    disconnect: async (): Promise<void> => {
        try {
            await AsyncStorage.removeItem(APPLE_CALENDARS_KEY);
        } catch (error) {
            console.error('Error disconnecting Apple Calendar:', error);
        }
    },

    /**
     * Get selected calendars with full metadata
     */
    getSelectedCalendars: async (): Promise<AppleCalendar[]> => {
        try {
            const selectedIds = await appleCalendarService.getSelectedCalendarIds();
            if (selectedIds.length === 0) {
                return [];
            }

            const { calendars } = await appleCalendarService.getCalendars();
            return calendars.filter(cal => selectedIds.includes(cal.id));
        } catch (error) {
            console.error('Error getting selected calendars:', error);
            return [];
        }
    },
};
