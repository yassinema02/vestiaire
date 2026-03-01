/**
 * Outfit Notification Service
 * Morning notification with planned outfit for the day
 * Story 12.4: Outfit Scheduling & Planning
 *
 * NOTE: Actual push notification scheduling is stubbed out because
 * expo-notifications requires a development build (not Expo Go).
 * Pattern follows ootdReminderService.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { calendarOutfitService } from './calendarOutfitService';
import { itemsService } from './items';

const NOTIFICATION_ID_KEY = '@vestiaire_outfit_notification_id';
const DEFAULT_NOTIFICATION_HOUR = 7;
const DEFAULT_NOTIFICATION_MINUTE = 0;

/**
 * Build the notification body text for today's planned outfit
 */
async function buildNotificationBody(): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    const { outfit } = await calendarOutfitService.getScheduledOutfitForDate(today);

    if (!outfit || !outfit.item_ids || outfit.item_ids.length === 0) {
        return 'No outfit planned for today. Open Vestiaire to get a suggestion!';
    }

    // Fetch item names
    const { items } = await itemsService.getItems();
    const outfitItems = outfit.item_ids
        .map(id => items?.find(i => i.id === id))
        .filter(Boolean);

    if (outfitItems.length === 0) {
        return 'No outfit planned for today. Open Vestiaire to get a suggestion!';
    }

    const names = outfitItems
        .map(i => i!.name || i!.sub_category || i!.category || 'Item')
        .slice(0, 3);

    const itemText = names.join(' + ');
    return `Today's outfit: ${itemText}`;
}

/**
 * Schedule the daily morning outfit notification.
 *
 * TODO: Replace with real expo-notifications scheduling when using a dev build:
 *
 *   import * as Notifications from 'expo-notifications';
 *
 *   const body = await buildNotificationBody();
 *   const id = await Notifications.scheduleNotificationAsync({
 *       content: {
 *           title: 'Good morning!',
 *           body,
 *           data: { type: 'outfit_reminder', action: 'plan-week' },
 *       },
 *       trigger: {
 *           type: 'daily',
 *           hour: DEFAULT_NOTIFICATION_HOUR,
 *           minute: DEFAULT_NOTIFICATION_MINUTE,
 *       },
 *   });
 *   await AsyncStorage.setItem(NOTIFICATION_ID_KEY, id);
 */
async function scheduleDailyOutfitNotification(): Promise<void> {
    const body = await buildNotificationBody();
    // Stubbed: expo-notifications not available in Expo Go
    console.log(`[Outfit Notification STUB] Would schedule daily at ${DEFAULT_NOTIFICATION_HOUR}:00 — "${body}"`);
}

/**
 * Cancel the scheduled outfit notification.
 *
 * TODO: Replace with real expo-notifications cancellation:
 *   const id = await AsyncStorage.getItem(NOTIFICATION_ID_KEY);
 *   if (id) await Notifications.cancelScheduledNotificationAsync(id);
 *   await AsyncStorage.removeItem(NOTIFICATION_ID_KEY);
 */
async function cancelOutfitNotification(): Promise<void> {
    await AsyncStorage.removeItem(NOTIFICATION_ID_KEY);
    console.log('[Outfit Notification STUB] Would cancel scheduled notification');
}

export const outfitNotificationService = {
    buildNotificationBody,
    scheduleDailyOutfitNotification,
    cancelOutfitNotification,
};
