/**
 * Extraction Notification Service
 * Story 10.6: Extraction Progress & Feedback
 *
 * Sends push notifications when extraction completes or fails.
 * STUBBED: expo-notifications requires a development build (not available in Expo Go).
 * Follows the same pattern as ootdNotificationService.ts and eveningReminderService.ts.
 */

export const extractionNotificationService = {
  /**
   * Notify user that extraction completed successfully.
   * Called when processing finishes while app is backgrounded.
   */
  notifyComplete: async (itemCount: number, photoCount: number): Promise<void> => {
    // Stubbed: expo-notifications not available in Expo Go
    console.log(
      `[Extraction] Would send notification: "Your wardrobe is ready! ${itemCount} items added from ${photoCount} photos ✨"`
    );
    // TODO: Replace with real expo-notifications when using dev build:
    // import * as Notifications from 'expo-notifications';
    // await Notifications.scheduleNotificationAsync({
    //   content: {
    //     title: 'Wardrobe Updated! ✨',
    //     body: `${itemCount} items added from ${photoCount} photos`,
    //     data: { type: 'extraction_complete' },
    //   },
    //   trigger: null, // immediate
    // });
  },

  /**
   * Notify user that extraction encountered errors.
   */
  notifyFailed: async (): Promise<void> => {
    console.log(
      '[Extraction] Would send notification: "Import encountered issues. Tap to retry."'
    );
    // TODO: Replace with real expo-notifications when using dev build:
    // await Notifications.scheduleNotificationAsync({
    //   content: {
    //     title: 'Import Issue',
    //     body: 'Import encountered issues. Tap to retry.',
    //     data: { type: 'extraction_failed' },
    //   },
    //   trigger: null,
    // });
  },
};
