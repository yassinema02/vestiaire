/**
 * OOTD Posting Reminder Service
 * Story 9.7: Manages daily OOTD posting reminder preferences and scheduling.
 *
 * NOTE: Actual push notification scheduling is stubbed out because
 * expo-notifications requires a development build (not Expo Go).
 * When migrating to a dev build, replace the TODO stubs with real
 * expo-notifications calls.
 *
 * Pattern follows eveningReminderService.ts exactly.
 */

import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { OotdReminderPreferences } from '../types/social';

export const ootdReminderService = {
    /**
     * Get the current OOTD reminder preferences from the user's profile.
     */
    getPreferences: async (): Promise<{
        prefs: OotdReminderPreferences;
        error: Error | null;
    }> => {
        try {
            const userId = await requireUserId();
            const { data, error } = await supabase
                .from('profiles')
                .select('ootd_reminder_enabled, ootd_reminder_time')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Get OOTD reminder prefs error:', error);
                return {
                    prefs: { enabled: true, time: '09:00' },
                    error,
                };
            }

            // Parse the time (comes as HH:mm:ss from Supabase)
            const rawTime = data.ootd_reminder_time || '09:00:00';
            const time = rawTime.slice(0, 5); // HH:mm

            return {
                prefs: {
                    enabled: data.ootd_reminder_enabled ?? true,
                    time,
                },
                error: null,
            };
        } catch (error) {
            console.error('Get OOTD reminder prefs exception:', error);
            return {
                prefs: { enabled: true, time: '09:00' },
                error: error as Error,
            };
        }
    },

    /**
     * Update the OOTD reminder preferences.
     */
    updatePreferences: async (
        prefs: Partial<OotdReminderPreferences>
    ): Promise<{ error: Error | null }> => {
        try {
            const updateData: Record<string, unknown> = {};

            if (prefs.enabled !== undefined) {
                updateData.ootd_reminder_enabled = prefs.enabled;
            }
            if (prefs.time !== undefined) {
                // Store as HH:mm:ss for TIME column
                updateData.ootd_reminder_time = prefs.time + ':00';
            }

            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', (await supabase.auth.getUser()).data.user?.id);

            if (error) {
                console.error('Update OOTD reminder prefs error:', error);
                return { error };
            }

            // Reschedule the notification with new settings
            if (prefs.enabled === false) {
                await ootdReminderService.cancelScheduledReminder();
            } else {
                const { prefs: fullPrefs } = await ootdReminderService.getPreferences();
                await ootdReminderService.scheduleReminder(fullPrefs.time);
            }

            return { error: null };
        } catch (error) {
            console.error('Update OOTD reminder prefs exception:', error);
            return { error: error as Error };
        }
    },

    /**
     * Check if the user has already posted an OOTD today.
     */
    hasPostedToday: async (): Promise<boolean> => {
        try {
            const userId = await requireUserId();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { count } = await supabase
                .from('ootd_posts')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gte('created_at', today.toISOString());

            return (count || 0) > 0;
        } catch (error) {
            console.error('hasPostedToday error:', error);
            return false;
        }
    },

    /**
     * Check if the user belongs to any squads.
     */
    hasSquads: async (): Promise<boolean> => {
        try {
            const userId = await requireUserId();
            const { count } = await supabase
                .from('squad_memberships')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId);

            return (count || 0) > 0;
        } catch (error) {
            console.error('hasSquads error:', error);
            return false;
        }
    },

    /**
     * Check whether the OOTD posting reminder should be sent.
     * Returns false if:
     * - Reminders are disabled
     * - User already posted an OOTD today
     * - User has no squads (no audience)
     */
    shouldSendReminder: async (): Promise<boolean> => {
        try {
            // 1. Check if reminder is enabled
            const { prefs } = await ootdReminderService.getPreferences();
            if (!prefs.enabled) return false;

            // 2. Check if already posted today
            if (await ootdReminderService.hasPostedToday()) return false;

            // 3. Check if user has any squads
            if (!(await ootdReminderService.hasSquads())) return false;

            return true;
        } catch (error) {
            console.error('shouldSendReminder check error:', error);
            return false;
        }
    },

    /**
     * Schedule the daily OOTD posting reminder notification.
     *
     * TODO: Replace with real expo-notifications scheduling when using a dev build:
     *
     *   import * as Notifications from 'expo-notifications';
     *
     *   await Notifications.cancelAllScheduledNotificationsAsync();
     *   await Notifications.scheduleNotificationAsync({
     *       content: {
     *           title: '📸 Time for your OOTD!',
     *           body: 'What are you wearing today? Share with your Squad!',
     *           data: { type: 'ootd_reminder', action: 'create-ootd' },
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
        console.log(`[OOTD Reminder STUB] Would schedule daily notification at ${_time}`);
    },

    /**
     * Cancel any scheduled OOTD reminder notifications.
     *
     * TODO: Replace with real expo-notifications cancellation when using a dev build:
     *   await Notifications.cancelAllScheduledNotificationsAsync();
     */
    cancelScheduledReminder: async (): Promise<void> => {
        // Stubbed: expo-notifications not available in Expo Go
        console.log('[OOTD Reminder STUB] Would cancel scheduled notifications');
    },
};
