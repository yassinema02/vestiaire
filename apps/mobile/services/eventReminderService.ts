/**
 * Event Reminder Service
 * Evening-before reminders for work/formal events with smart outfit tips
 * Story 12.5: Outfit Reminders
 *
 * NOTE: Actual push notification scheduling is stubbed out because
 * expo-notifications requires a development build (not Expo Go).
 * Pattern follows ootdReminderService.ts exactly.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { calendarOutfitService } from './calendarOutfitService';
import { itemsService } from './items';
import { eventSyncService, CalendarEventRow } from './eventSyncService';

const LAST_SCHEDULED_KEY = '@vestiaire_reminders_last_scheduled';
const SCHEDULE_COOLDOWN = 12 * 60 * 60 * 1000; // 12 hours

export interface EventReminderPreferences {
    enabled: boolean;
    time: string; // HH:mm
    eventTypes: string[]; // e.g. ['work', 'formal']
}

/**
 * Get reminder preferences from profile
 */
async function getPreferences(): Promise<{
    prefs: EventReminderPreferences;
    error: Error | null;
}> {
    try {
        const userId = await requireUserId();
        const { data, error } = await supabase
            .from('profiles')
            .select('event_reminder_enabled, event_reminder_time, event_reminder_event_types')
            .eq('id', userId)
            .single();

        if (error) {
            return {
                prefs: { enabled: true, time: '20:00', eventTypes: ['work', 'formal'] },
                error,
            };
        }

        const rawTime = data.event_reminder_time || '20:00:00';
        const time = rawTime.slice(0, 5);

        return {
            prefs: {
                enabled: data.event_reminder_enabled ?? true,
                time,
                eventTypes: data.event_reminder_event_types || ['work', 'formal'],
            },
            error: null,
        };
    } catch (error) {
        return {
            prefs: { enabled: true, time: '20:00', eventTypes: ['work', 'formal'] },
            error: error as Error,
        };
    }
}

/**
 * Update reminder preferences
 */
async function updatePreferences(
    prefs: Partial<EventReminderPreferences>
): Promise<{ error: Error | null }> {
    try {
        const userId = await requireUserId();
        const updateData: Record<string, unknown> = {};

        if (prefs.enabled !== undefined) {
            updateData.event_reminder_enabled = prefs.enabled;
        }
        if (prefs.time !== undefined) {
            updateData.event_reminder_time = prefs.time + ':00';
        }
        if (prefs.eventTypes !== undefined) {
            updateData.event_reminder_event_types = prefs.eventTypes;
        }

        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId);

        if (error) return { error };

        // Reschedule reminders with new prefs
        if (prefs.enabled === false) {
            await cancelAllEventReminders();
        } else {
            await scheduleTomorrowsReminders();
        }

        return { error: null };
    } catch (error) {
        return { error: error as Error };
    }
}

/**
 * Check if a reminder should be sent for this event
 */
async function shouldSendReminder(event: CalendarEventRow): Promise<boolean> {
    const { prefs } = await getPreferences();

    // Reminders disabled
    if (!prefs.enabled) return false;

    // Event type not in user's selected types
    if (!event.event_type || !prefs.eventTypes.includes(event.event_type)) return false;

    // Check if already dismissed
    const dismissed = await AsyncStorage.getItem(`reminder_dismissed_${event.id}`);
    if (dismissed) return false;

    return true;
}

/**
 * Build the reminder notification body with smart tips
 */
function buildReminderBody(
    event: CalendarEventRow,
    itemNames?: string[]
): string {
    const eventName = event.title.length > 25
        ? event.title.slice(0, 22) + '...'
        : event.title;

    if (!itemNames || itemNames.length === 0) {
        return `${eventName} tomorrow. Plan your outfit in Vestiaire!`;
    }

    const hasFormalItem = itemNames.some(n =>
        ['blazer', 'suit', 'jacket', 'dress shirt'].some(k =>
            n.toLowerCase().includes(k)
        )
    );

    const tip = hasFormalItem
        ? " Don't forget to iron!"
        : ' Your outfit is ready!';

    return `${eventName} tomorrow: ${itemNames.slice(0, 2).join(' + ')}.${tip}`;
}

/**
 * Schedule a reminder for a specific event (evening before)
 *
 * TODO: Replace with real expo-notifications scheduling when using a dev build:
 *
 *   import * as Notifications from 'expo-notifications';
 *
 *   const { prefs } = await getPreferences();
 *   const eventDate = new Date(event.start_time);
 *   const reminderDate = new Date(eventDate);
 *   reminderDate.setDate(reminderDate.getDate() - 1);
 *   const [hour, minute] = prefs.time.split(':').map(Number);
 *   reminderDate.setHours(hour, minute, 0, 0);
 *
 *   const id = await Notifications.scheduleNotificationAsync({
 *       content: {
 *           title: 'Outfit Prep Reminder',
 *           body,
 *           data: { type: 'event_reminder', eventId: event.id },
 *           categoryIdentifier: 'event_reminder',
 *       },
 *       trigger: { type: 'date', date: reminderDate },
 *   });
 *   await AsyncStorage.setItem(`reminder_notif_id_${event.id}`, id);
 */
async function scheduleEventReminder(
    event: CalendarEventRow,
    itemNames?: string[]
): Promise<void> {
    const body = buildReminderBody(event, itemNames);
    const { prefs } = await getPreferences();
    // Stubbed: expo-notifications not available in Expo Go
    console.log(`[Event Reminder STUB] Would schedule for ${event.title} at ${prefs.time} evening before — "${body}"`);
}

/**
 * Cancel a scheduled reminder for an event
 *
 * TODO: Replace with real expo-notifications cancellation:
 *   const id = await AsyncStorage.getItem(`reminder_notif_id_${eventId}`);
 *   if (id) await Notifications.cancelScheduledNotificationAsync(id);
 *   await AsyncStorage.removeItem(`reminder_notif_id_${eventId}`);
 */
async function cancelEventReminder(eventId: string): Promise<void> {
    await AsyncStorage.removeItem(`reminder_notif_id_${eventId}`);
    console.log(`[Event Reminder STUB] Would cancel reminder for event ${eventId}`);
}

/**
 * Cancel all scheduled event reminders
 */
async function cancelAllEventReminders(): Promise<void> {
    // Stubbed: would cancel all via Notifications.cancelAllScheduledNotificationsAsync()
    console.log('[Event Reminder STUB] Would cancel all event reminders');
}

/**
 * Dismiss a reminder (user tapped "Done")
 */
async function dismissReminder(eventId: string): Promise<void> {
    await AsyncStorage.setItem(`reminder_dismissed_${eventId}`, 'true');
    await cancelEventReminder(eventId);
}

/**
 * Snooze a reminder by 1 hour (stubbed)
 *
 * TODO: In dev build, reschedule notification for +1 hour:
 *   await cancelEventReminder(eventId);
 *   // re-schedule with new trigger date = now + 1hr
 */
async function snoozeReminder(eventId: string): Promise<void> {
    console.log(`[Event Reminder STUB] Would snooze reminder for event ${eventId} by 1 hour`);
}

/**
 * Schedule reminders for tomorrow's qualifying events.
 * Run daily at app open (with 12-hour cooldown).
 */
async function scheduleTomorrowsReminders(): Promise<{ scheduled: number; error: string | null }> {
    try {
        // Check cooldown
        const lastRun = await AsyncStorage.getItem(LAST_SCHEDULED_KEY);
        if (lastRun && Date.now() - parseInt(lastRun, 10) < SCHEDULE_COOLDOWN) {
            return { scheduled: 0, error: null };
        }

        const { prefs } = await getPreferences();
        if (!prefs.enabled) return { scheduled: 0, error: null };

        // Get tomorrow's events
        const { events } = await eventSyncService.getUpcomingEvents(2);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const tomorrowEvents = events.filter(e =>
            e.start_time.split('T')[0] === tomorrowStr &&
            e.event_type &&
            prefs.eventTypes.includes(e.event_type)
        );

        let scheduled = 0;
        for (const event of tomorrowEvents) {
            const should = await shouldSendReminder(event);
            if (!should) continue;

            // Get scheduled outfit item names
            let itemNames: string[] = [];
            const { outfit } = await calendarOutfitService.getScheduledOutfitForEvent(event.id);
            if (outfit?.item_ids && outfit.item_ids.length > 0) {
                const { items } = await itemsService.getItems();
                itemNames = outfit.item_ids
                    .map(id => items?.find(i => i.id === id))
                    .filter(Boolean)
                    .map(i => i!.name || i!.sub_category || i!.category || 'Item');
            }

            await scheduleEventReminder(event, itemNames);
            scheduled++;
        }

        await AsyncStorage.setItem(LAST_SCHEDULED_KEY, String(Date.now()));
        return { scheduled, error: null };
    } catch (err: any) {
        return { scheduled: 0, error: err.message };
    }
}

export const eventReminderService = {
    getPreferences,
    updatePreferences,
    shouldSendReminder,
    buildReminderBody,
    scheduleEventReminder,
    cancelEventReminder,
    cancelAllEventReminders,
    dismissReminder,
    snoozeReminder,
    scheduleTomorrowsReminders,
};
