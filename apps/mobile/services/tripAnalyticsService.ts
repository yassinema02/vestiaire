/**
 * Trip Analytics Service
 * Lightweight local event logging for trip feature usage
 * Stored in AsyncStorage — no external service
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TripAnalyticsEvent } from '../types/packingList';

const ANALYTICS_KEY = 'trip_analytics';

async function logTripEvent(
    name: TripAnalyticsEvent['name'],
    data: Record<string, string | number | boolean>
): Promise<void> {
    try {
        const raw = await AsyncStorage.getItem(ANALYTICS_KEY);
        const events: TripAnalyticsEvent[] = raw ? JSON.parse(raw) : [];
        events.push({ name, data, timestamp: new Date().toISOString() });
        await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(events));
    } catch (err) {
        console.warn('Failed to log trip analytics event:', err);
    }
}

async function getTripEvents(): Promise<TripAnalyticsEvent[]> {
    try {
        const raw = await AsyncStorage.getItem(ANALYTICS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export const tripAnalyticsService = {
    logTripEvent,
    getTripEvents,
};
