/**
 * Evening Reminder Service
 * Story 5.2: Manages evening outfit-logging reminder preferences and scheduling
 *
 * NOTE: Actual push notification scheduling is stubbed out because
 * expo-notifications requires a development build (not Expo Go).
 * When migrating to a dev build, replace the TODO stubs with real
 * expo-notifications calls.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { wearLogService } from './wearLogService';

const LAST_APP_OPEN_KEY = '@vestiaire/last_app_open';

export interface EveningReminderPreferences {
    enabled: boolean;
    time: string; // HH:mm format
}

export const eveningReminderService = {
    /**
     * Get the current evening reminder preferences from the user's profile
     */
    getPreferences: async (): Promise<{
        prefs: EveningReminderPreferences;
        error: Error | null;
    }> => {
        try {
            const userId = await requireUserId();
            const { data, error } = await supabase
                .from('profiles')
                .select('evening_reminder_enabled, evening_reminder_time')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Get reminder prefs error:', error);
                return {
                    prefs: { enabled: true, time: '20:00' },
                    error,
                };
            }

            // Parse the time (comes as HH:mm:ss from Supabase)
            const rawTime = data.evening_reminder_time || '20:00:00';
            const time = rawTime.slice(0, 5); // HH:mm

            return {
                prefs: {
                    enabled: data.evening_reminder_enabled ?? true,
                    time,
                },
                error: null,
            };
        } catch (error) {
            console.error('Get reminder prefs exception:', error);
            return {
                prefs: { enabled: true, time: '20:00' },
                error: error as Error,
            };
        }
    },

    /**
     * Update the evening reminder preferences
     */
    updatePreferences: async (
        prefs: Partial<EveningReminderPreferences>
    ): Promise<{ error: Error | null }> => {
        try {
            const updateData: Record<string, unknown> = {};

            if (prefs.enabled !== undefined) {
                updateData.evening_reminder_enabled = prefs.enabled;
            }
            if (prefs.time !== undefined) {
                // Store as HH:mm:ss for TIME column
                updateData.evening_reminder_time = prefs.time + ':00';
            }

            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', (await supabase.auth.getUser()).data.user?.id);

            if (error) {
                console.error('Update reminder prefs error:', error);
                return { error };
            }

            // Reschedule the notification with new settings
            if (prefs.enabled === false) {
                await eveningReminderService.cancelScheduledReminder();
            } else {
                const { prefs: fullPrefs } = await eveningReminderService.getPreferences();
                await eveningReminderService.scheduleReminder(fullPrefs.time);
            }

            return { error: null };
        } catch (error) {
            console.error('Update reminder prefs exception:', error);
            return { error: error as Error };
        }
    },

    /**
     * Record the current time as the last app open time
     * Called from the root layout on app focus
     */
    recordAppOpen: async (): Promise<void> => {
        try {
            await AsyncStorage.setItem(LAST_APP_OPEN_KEY, new Date().toISOString());
        } catch (error) {
            console.error('Record app open error:', error);
        }
    },

    /**
     * Check whether the evening reminder should be sent
     * Returns false if:
     * - Reminders are disabled
     * - An outfit was already logged today
     * - The app was opened in the last 2 hours
     */
    shouldSendReminder: async (): Promise<boolean> => {
        try {
            // 1. Check if reminder is enabled
            const { prefs } = await eveningReminderService.getPreferences();
            if (!prefs.enabled) return false;

            // 2. Check if outfit already logged today
            const { itemIds } = await wearLogService.getItemsWornToday();
            if (itemIds.length > 0) return false;

            // 3. Check if app was opened recently (within 2 hours)
            const lastOpen = await AsyncStorage.getItem(LAST_APP_OPEN_KEY);
            if (lastOpen) {
                const lastOpenTime = new Date(lastOpen).getTime();
                const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
                if (lastOpenTime > twoHoursAgo) return false;
            }

            return true;
        } catch (error) {
            console.error('Should send reminder check error:', error);
            return false;
        }
    },

    /**
     * Schedule the daily evening reminder notification
     *
     * TODO: Replace with real expo-notifications scheduling when using a dev build:
     *
     *   import * as Notifications from 'expo-notifications';
     *
     *   await Notifications.cancelAllScheduledNotificationsAsync();
     *   await Notifications.scheduleNotificationAsync({
     *       content: {
     *           title: "What did you wear today? \ud83d\udcdd",
     *           body: "Log your outfit to track your wardrobe",
     *           data: { screen: 'log-wear', action: 'log-outfit' },
     *       },
     *       trigger: {
     *           type: 'daily',
     *           hour: parseInt(time.split(':')[0]),
     *           minute: parseInt(time.split(':')[1]),
     *       },
     *   });
     */
    scheduleReminder: async (_time: string): Promise<void> => {
        // Stubbed: expo-notifications not available in Expo Go
        console.log(`[Evening Reminder] Would schedule daily notification at ${_time}`);
    },

    /**
     * Cancel any scheduled evening reminder notifications
     *
     * TODO: Replace with real expo-notifications cancellation when using a dev build:
     *   await Notifications.cancelAllScheduledNotificationsAsync();
     */
    cancelScheduledReminder: async (): Promise<void> => {
        // Stubbed: expo-notifications not available in Expo Go
        console.log('[Evening Reminder] Would cancel scheduled notifications');
    },
};
