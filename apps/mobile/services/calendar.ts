/**
 * Calendar Service
 * Handles Google Calendar OAuth and event fetching
 */

import * as SecureStore from 'expo-secure-store';
import { detectOccasion, OccasionType } from '../utils/occasionDetector';

// Secure storage keys
const GOOGLE_TOKENS_KEY = 'google_calendar_tokens';
const GOOGLE_USER_KEY = 'google_calendar_user';

// Google Calendar API base URL
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// Token storage interface
export interface GoogleTokens {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
}

// User info interface
export interface GoogleUserInfo {
    email: string;
    name?: string;
}

// Google Calendar event from API
interface GoogleCalendarEvent {
    id: string;
    summary?: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    location?: string;
    status: string;
}

// Google Calendar API response
interface GoogleCalendarResponse {
    items: GoogleCalendarEvent[];
    nextPageToken?: string;
}

// App calendar event
export interface CalendarEvent {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location: string | null;
    isAllDay: boolean;
    occasion: OccasionType;
}

/**
 * Store Google tokens securely
 */
async function storeTokens(tokens: GoogleTokens): Promise<void> {
    await SecureStore.setItemAsync(GOOGLE_TOKENS_KEY, JSON.stringify(tokens));
}

/**
 * Retrieve stored Google tokens
 */
async function getStoredTokens(): Promise<GoogleTokens | null> {
    try {
        const tokensJson = await SecureStore.getItemAsync(GOOGLE_TOKENS_KEY);
        if (tokensJson) {
            return JSON.parse(tokensJson);
        }
        return null;
    } catch (error) {
        console.error('Error retrieving tokens:', error);
        return null;
    }
}

/**
 * Store Google user info
 */
async function storeUserInfo(user: GoogleUserInfo): Promise<void> {
    await SecureStore.setItemAsync(GOOGLE_USER_KEY, JSON.stringify(user));
}

/**
 * Retrieve stored Google user info
 */
async function getStoredUserInfo(): Promise<GoogleUserInfo | null> {
    try {
        const userJson = await SecureStore.getItemAsync(GOOGLE_USER_KEY);
        if (userJson) {
            return JSON.parse(userJson);
        }
        return null;
    } catch (error) {
        console.error('Error retrieving user info:', error);
        return null;
    }
}

/**
 * Clear all stored Google data
 */
async function clearStoredData(): Promise<void> {
    await Promise.all([
        SecureStore.deleteItemAsync(GOOGLE_TOKENS_KEY),
        SecureStore.deleteItemAsync(GOOGLE_USER_KEY),
    ]);
}

/**
 * Format time for display
 */
function formatEventTime(dateTime: string | undefined, isAllDay: boolean): string {
    if (isAllDay) {
        return 'All day';
    }
    if (!dateTime) {
        return '';
    }
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Get start and end of today in ISO format
 */
function getTodayBounds(): { timeMin: string; timeMax: string } {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    return {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
    };
}

/**
 * Fetch user info from Google
 */
async function fetchUserInfo(accessToken: string): Promise<{ user: GoogleUserInfo | null; error: Error | null }> {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`User info fetch failed: ${response.status}`);
        }

        const data = await response.json();
        const user: GoogleUserInfo = {
            email: data.email,
            name: data.name,
        };

        return { user, error: null };
    } catch (error) {
        console.error('Error fetching user info:', error);
        return { user: null, error: error as Error };
    }
}

export const calendarService = {
    /**
     * Store authentication tokens after OAuth success
     */
    storeAuthentication: async (
        accessToken: string,
        refreshToken?: string
    ): Promise<{ success: boolean; userEmail: string | null; error: Error | null }> => {
        try {
            // Store tokens
            const tokens: GoogleTokens = {
                accessToken,
                refreshToken,
                expiresAt: Date.now() + 3600 * 1000, // Assume 1 hour expiry
            };
            await storeTokens(tokens);

            // Fetch and store user info
            const { user, error: userError } = await fetchUserInfo(accessToken);
            if (user) {
                await storeUserInfo(user);
            }

            return {
                success: true,
                userEmail: user?.email || null,
                error: userError,
            };
        } catch (error) {
            console.error('Error storing authentication:', error);
            return {
                success: false,
                userEmail: null,
                error: error as Error,
            };
        }
    },

    /**
     * Check if user is connected to Google Calendar
     */
    isConnected: async (): Promise<boolean> => {
        const tokens = await getStoredTokens();
        return tokens !== null && tokens.accessToken !== null;
    },

    /**
     * Get connected user email
     */
    getConnectedEmail: async (): Promise<string | null> => {
        const user = await getStoredUserInfo();
        return user?.email || null;
    },

    /**
     * Disconnect from Google Calendar
     */
    disconnect: async (): Promise<void> => {
        await clearStoredData();
    },

    /**
     * Fetch today's events from Google Calendar
     */
    fetchTodayEvents: async (): Promise<{ events: CalendarEvent[] | null; error: Error | null }> => {
        try {
            const tokens = await getStoredTokens();
            if (!tokens?.accessToken) {
                return { events: null, error: new Error('Not authenticated') };
            }

            const { timeMin, timeMax } = getTodayBounds();

            const params = new URLSearchParams({
                timeMin,
                timeMax,
                singleEvents: 'true',
                orderBy: 'startTime',
                maxResults: '10',
            });

            const response = await fetch(
                `${CALENDAR_API_BASE}/calendars/primary/events?${params}`,
                {
                    headers: {
                        Authorization: `Bearer ${tokens.accessToken}`,
                    },
                }
            );

            if (response.status === 401) {
                // Token expired - clear data and return error
                await clearStoredData();
                return { events: null, error: new Error('Session expired. Please reconnect.') };
            }

            if (!response.ok) {
                throw new Error(`Calendar API error: ${response.status}`);
            }

            const data: GoogleCalendarResponse = await response.json();

            // Transform events
            const events: CalendarEvent[] = (data.items || [])
                .filter(event => event.status !== 'cancelled')
                .map(event => {
                    const isAllDay = !event.start.dateTime;
                    const title = event.summary || 'Untitled Event';

                    return {
                        id: event.id,
                        title,
                        startTime: formatEventTime(event.start.dateTime || event.start.date, isAllDay),
                        endTime: formatEventTime(event.end.dateTime || event.end.date, isAllDay),
                        location: event.location || null,
                        isAllDay,
                        occasion: detectOccasion(title, event.location),
                    };
                });

            return { events, error: null };
        } catch (error) {
            console.error('Error fetching events:', error);
            return { events: null, error: error as Error };
        }
    },

    /**
     * Fetch events in a date range from Google Calendar
     */
    fetchEventsInRange: async (
        startDate: Date,
        endDate: Date
    ): Promise<{ events: CalendarEvent[] | null; error: Error | null }> => {
        try {
            const tokens = await getStoredTokens();
            if (!tokens?.accessToken) {
                return { events: null, error: new Error('Not authenticated') };
            }

            const params = new URLSearchParams({
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                singleEvents: 'true',
                orderBy: 'startTime',
                maxResults: '50',
            });

            const response = await fetch(
                `${CALENDAR_API_BASE}/calendars/primary/events?${params}`,
                {
                    headers: {
                        Authorization: `Bearer ${tokens.accessToken}`,
                    },
                }
            );

            if (response.status === 401) {
                await clearStoredData();
                return { events: null, error: new Error('Session expired. Please reconnect.') };
            }

            if (!response.ok) {
                throw new Error(`Calendar API error: ${response.status}`);
            }

            const data: GoogleCalendarResponse = await response.json();

            const events: CalendarEvent[] = (data.items || [])
                .filter(event => event.status !== 'cancelled')
                .map(event => {
                    const isAllDay = !event.start.dateTime;
                    const title = event.summary || 'Untitled Event';

                    return {
                        id: event.id,
                        title,
                        startTime: event.start.dateTime || new Date(event.start.date!).toISOString(),
                        endTime: event.end.dateTime || new Date(event.end.date!).toISOString(),
                        location: event.location || null,
                        isAllDay,
                        occasion: detectOccasion(title, event.location),
                    };
                });

            return { events, error: null };
        } catch (error) {
            console.error('Error fetching events in range:', error);
            return { events: null, error: error as Error };
        }
    },

    /**
     * Get stored tokens (for store initialization)
     */
    getStoredTokens,

    /**
     * Get stored user info (for store initialization)
     */
    getStoredUserInfo,
};
