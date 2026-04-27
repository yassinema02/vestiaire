/**
 * OOTD Notification Service
 * Manages notification preferences, quiet hours, and daily limits.
 * Story 9.6: OOTD Notifications
 *
 * NOTE: All expo-notifications calls are stubbed for Expo Go compatibility.
 * Replace TODO stubs with real calls when migrating to a dev build.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OotdNotificationPreference } from '../types/social';

const PREF_KEY = 'notif_ootd_preference';
const COUNT_KEY_PREFIX = 'notif_ootd_count_';
const MAX_DAILY = 3;
const QUIET_START = 22; // 10 PM
const QUIET_END = 7;   // 7 AM
const MORNING_END = 12; // noon

/**
 * Get the current OOTD notification preference.
 */
export async function getPreference(): Promise<OotdNotificationPreference> {
    try {
        const value = await AsyncStorage.getItem(PREF_KEY);
        if (value === 'all' || value === 'morning_only' || value === 'off') {
            return value;
        }
        return 'all'; // default
    } catch {
        return 'all';
    }
}

/**
 * Save the OOTD notification preference.
 */
export async function updatePreference(pref: OotdNotificationPreference): Promise<void> {
    await AsyncStorage.setItem(PREF_KEY, pref);
}

/**
 * Check if current time is within quiet hours (10 PM - 7 AM).
 */
export function isQuietHours(now: Date = new Date()): boolean {
    const hour = now.getHours();
    return hour >= QUIET_START || hour < QUIET_END;
}

/**
 * Check if current time is morning (before noon).
 */
export function isMorning(now: Date = new Date()): boolean {
    return now.getHours() < MORNING_END;
}

/**
 * Get today's date key for daily count tracking.
 */
function getTodayKey(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${COUNT_KEY_PREFIX}${yyyy}-${mm}-${dd}`;
}

/**
 * Get today's notification count.
 */
export async function getDailyCount(): Promise<number> {
    try {
        const value = await AsyncStorage.getItem(getTodayKey());
        return value ? parseInt(value, 10) : 0;
    } catch {
        return 0;
    }
}

/**
 * Increment today's notification count.
 */
export async function recordNotification(): Promise<void> {
    const key = getTodayKey();
    const current = await getDailyCount();
    await AsyncStorage.setItem(key, String(current + 1));
}

/**
 * Clean up old daily count keys (older than 7 days).
 */
export async function cleanupOldCounts(): Promise<void> {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const countKeys = allKeys.filter((k) => k.startsWith(COUNT_KEY_PREFIX));

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
        const cutoffStr = cutoff.toISOString().slice(0, 10);

        const oldKeys = countKeys.filter((k) => {
            const dateStr = k.replace(COUNT_KEY_PREFIX, '');
            return dateStr < cutoffStr;
        });

        if (oldKeys.length > 0) {
            await AsyncStorage.multiRemove(oldKeys);
        }
    } catch {
        // Best-effort cleanup
    }
}

/**
 * Determine if an OOTD notification should be shown.
 * Checks: preference, quiet hours, morning-only, daily limit.
 */
export async function shouldNotify(now: Date = new Date()): Promise<boolean> {
    const pref = await getPreference();

    if (pref === 'off') return false;
    if (isQuietHours(now)) return false;
    if (pref === 'morning_only' && !isMorning(now)) return false;

    const count = await getDailyCount();
    if (count >= MAX_DAILY) return false;

    return true;
}

/**
 * Format notification body text.
 */
export function getNotificationBody(authorName: string): string {
    return `${authorName} just posted their OOTD! 📸`;
}

/**
 * Schedule a local notification for an OOTD post.
 * STUBBED: expo-notifications requires a development build.
 */
export async function scheduleLocalNotification(authorName: string, postId: string, squadId: string): Promise<void> {
    // TODO: Replace with real expo-notifications when migrating to dev build
    // import * as Notifications from 'expo-notifications';
    // await Notifications.scheduleNotificationAsync({
    //   content: {
    //     title: 'Style Squad',
    //     body: getNotificationBody(authorName),
    //     data: { postId, squadId, type: 'ootd_post' },
    //   },
    //   trigger: null, // immediate
    // });
    console.log(`[OOTD Notification STUB] ${getNotificationBody(authorName)} | postId=${postId}`);
}

export const ootdNotificationService = {
    getPreference,
    updatePreference,
    isQuietHours,
    isMorning,
    getDailyCount,
    recordNotification,
    cleanupOldCounts,
    shouldNotify,
    getNotificationBody,
    scheduleLocalNotification,
};
