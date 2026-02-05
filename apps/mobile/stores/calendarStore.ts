/**
 * Calendar Store
 * Zustand store for managing calendar state (Google + Apple Calendar support)
 */

import { create } from 'zustand';
import { calendarService, CalendarEvent as GoogleCalendarEvent } from '../services/calendar';
import { appleCalendarService, AppleCalendar, CalendarEvent as AppleCalendarEvent } from '../services/appleCalendar';
import { OccasionType } from '../utils/occasionDetector';

const EVENTS_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Unified calendar event with source
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

interface CalendarState {
    // Combined events from all sources
    events: CalendarEvent[];
    lastFetched: number | null;
    isLoading: boolean;
    error: string | null;

    // Google Calendar state
    googleConnected: boolean;
    googleEmail: string | null;
    isConnectingGoogle: boolean;

    // Apple Calendar state
    appleConnected: boolean;
    appleSelectedCalendars: AppleCalendar[];
    isConnectingApple: boolean;

    // Combined connection status
    isConnected: boolean;
}

interface CalendarActions {
    // Initialization
    initialize: () => Promise<void>;
    refreshEvents: (force?: boolean) => Promise<void>;
    clearError: () => void;

    // Google Calendar actions
    handleGoogleOAuthSuccess: (accessToken: string, refreshToken?: string) => Promise<boolean>;
    disconnectGoogle: () => Promise<void>;

    // Apple Calendar actions
    connectApple: () => Promise<boolean>;
    disconnectApple: () => Promise<void>;
    setAppleCalendars: (calendarIds: string[]) => Promise<void>;
    getAvailableAppleCalendars: () => Promise<AppleCalendar[]>;
}

type CalendarStore = CalendarState & CalendarActions;

const shouldRefreshEvents = (lastFetched: number | null): boolean => {
    if (!lastFetched) return true;
    return Date.now() - lastFetched > EVENTS_CACHE_DURATION;
};

/**
 * Merge and sort events from multiple sources
 */
const mergeEvents = (googleEvents: CalendarEvent[], appleEvents: CalendarEvent[]): CalendarEvent[] => {
    const allEvents = [...googleEvents, ...appleEvents];

    // Sort by: all-day events first, then by start time
    return allEvents.sort((a, b) => {
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        return a.startTime.localeCompare(b.startTime);
    });
};

export const useCalendarStore = create<CalendarStore>((set, get) => ({
    // State
    events: [],
    lastFetched: null,
    isLoading: false,
    error: null,

    // Google state
    googleConnected: false,
    googleEmail: null,
    isConnectingGoogle: false,

    // Apple state
    appleConnected: false,
    appleSelectedCalendars: [],
    isConnectingApple: false,

    // Combined status
    isConnected: false,

    // Actions
    initialize: async () => {
        try {
            // Check Google connection
            const googleConnected = await calendarService.isConnected();
            let googleEmail: string | null = null;

            if (googleConnected) {
                googleEmail = await calendarService.getConnectedEmail();
            }

            // Check Apple connection
            const appleConnected = await appleCalendarService.isConnected();
            let appleSelectedCalendars: AppleCalendar[] = [];

            if (appleConnected) {
                appleSelectedCalendars = await appleCalendarService.getSelectedCalendars();
            }

            const isConnected = googleConnected || appleConnected;

            set({
                googleConnected,
                googleEmail,
                appleConnected,
                appleSelectedCalendars,
                isConnected,
            });

            // Fetch events if connected
            if (isConnected) {
                await get().refreshEvents();
            } else {
                set({ events: [] });
            }
        } catch (error) {
            console.error('Calendar store initialization error:', error);
        }
    },

    handleGoogleOAuthSuccess: async (accessToken: string, refreshToken?: string) => {
        set({ isConnectingGoogle: true, error: null });

        try {
            const { success, userEmail, error } = await calendarService.storeAuthentication(
                accessToken,
                refreshToken
            );

            if (!success) {
                set({
                    isConnectingGoogle: false,
                    error: error?.message || 'Failed to connect Google Calendar',
                });
                return false;
            }

            set({
                googleConnected: true,
                googleEmail: userEmail,
                isConnectingGoogle: false,
                isConnected: true,
            });

            // Refresh events
            await get().refreshEvents(true);

            return true;
        } catch (error) {
            console.error('Google OAuth success handling error:', error);
            set({
                isConnectingGoogle: false,
                error: 'Failed to connect Google Calendar',
            });
            return false;
        }
    },

    disconnectGoogle: async () => {
        set({ isLoading: true });

        try {
            await calendarService.disconnect();

            const state = get();
            const isConnected = state.appleConnected;

            set({
                googleConnected: false,
                googleEmail: null,
                isConnected,
                isLoading: false,
                error: null,
            });

            // Refresh events to remove Google events
            await get().refreshEvents(true);
        } catch (error) {
            console.error('Google disconnect error:', error);
            set({
                isLoading: false,
                error: 'Failed to disconnect Google Calendar',
            });
        }
    },

    connectApple: async () => {
        set({ isConnectingApple: true, error: null });

        try {
            // Request permission
            const { granted, error } = await appleCalendarService.requestPermission();

            if (!granted) {
                set({
                    isConnectingApple: false,
                    error: error?.message || 'Calendar permission denied',
                });
                return false;
            }

            // Get all available calendars
            const { calendars, error: calError } = await appleCalendarService.getCalendars();

            if (calError || calendars.length === 0) {
                set({
                    isConnectingApple: false,
                    error: 'No calendars found on device',
                });
                return false;
            }

            // Select all calendars by default
            const allIds = calendars.map(c => c.id);
            await appleCalendarService.setSelectedCalendarIds(allIds);

            set({
                appleConnected: true,
                appleSelectedCalendars: calendars,
                isConnectingApple: false,
                isConnected: true,
            });

            // Refresh events
            await get().refreshEvents(true);

            return true;
        } catch (error) {
            console.error('Apple Calendar connect error:', error);
            set({
                isConnectingApple: false,
                error: 'Failed to connect iPhone Calendar',
            });
            return false;
        }
    },

    disconnectApple: async () => {
        set({ isLoading: true });

        try {
            await appleCalendarService.disconnect();

            const state = get();
            const isConnected = state.googleConnected;

            set({
                appleConnected: false,
                appleSelectedCalendars: [],
                isConnected,
                isLoading: false,
                error: null,
            });

            // Refresh events to remove Apple events
            await get().refreshEvents(true);
        } catch (error) {
            console.error('Apple disconnect error:', error);
            set({
                isLoading: false,
                error: 'Failed to disconnect iPhone Calendar',
            });
        }
    },

    setAppleCalendars: async (calendarIds: string[]) => {
        try {
            await appleCalendarService.setSelectedCalendarIds(calendarIds);

            // Get full calendar metadata
            const selectedCalendars = await appleCalendarService.getSelectedCalendars();

            set({
                appleSelectedCalendars: selectedCalendars,
                appleConnected: calendarIds.length > 0,
                isConnected: get().googleConnected || calendarIds.length > 0,
            });

            // Refresh events with new selection
            await get().refreshEvents(true);
        } catch (error) {
            console.error('Set Apple calendars error:', error);
        }
    },

    getAvailableAppleCalendars: async (): Promise<AppleCalendar[]> => {
        const { calendars } = await appleCalendarService.getCalendars();
        return calendars;
    },

    refreshEvents: async (force = false) => {
        const state = get();

        // Skip if already loading
        if (state.isLoading) return;

        // Skip if not connected to anything
        if (!state.isConnected) {
            set({ events: [] });
            return;
        }

        // Check cache validity (unless forced)
        if (!force && !shouldRefreshEvents(state.lastFetched) && state.events.length >= 0) {
            return;
        }

        set({ isLoading: true, error: null });

        try {
            const googleEvents: CalendarEvent[] = [];
            const appleEvents: CalendarEvent[] = [];

            // Fetch Google events if connected
            if (state.googleConnected) {
                const { events, error } = await calendarService.fetchTodayEvents();

                if (error) {
                    // Check if it's an auth error
                    if (error.message.includes('expired') || error.message.includes('Not authenticated')) {
                        set({
                            googleConnected: false,
                            googleEmail: null,
                            isConnected: state.appleConnected,
                        });
                    } else {
                        console.error('Google Calendar fetch error:', error);
                    }
                } else if (events) {
                    // Add source to each event
                    googleEvents.push(
                        ...events.map(e => ({ ...e, source: 'google' as const }))
                    );
                }
            }

            // Fetch Apple events if connected
            if (state.appleConnected) {
                const { events, error } = await appleCalendarService.fetchTodayEvents();

                if (error) {
                    console.error('Apple Calendar fetch error:', error);
                } else if (events) {
                    appleEvents.push(...events);
                }
            }

            // Merge and sort all events
            const allEvents = mergeEvents(googleEvents, appleEvents);

            set({
                events: allEvents,
                lastFetched: Date.now(),
                isLoading: false,
                error: null,
            });
        } catch (error) {
            console.error('Refresh events error:', error);
            set({
                isLoading: false,
                error: 'Failed to fetch events',
            });
        }
    },

    clearError: () => set({ error: null }),
}));

// Re-export AppleCalendar type for convenience
export type { AppleCalendar };
