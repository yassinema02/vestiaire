/**
 * Profile Setup Service
 * Profile Setup Onboarding
 * Tracks whether the user has completed (or skipped) the profile setup flow.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_SETUP_COMPLETE_KEY = '@vestiaire_profile_setup_complete';

export const profileSetupService = {
    /**
     * Returns true if the profile setup flow should be shown.
     * (i.e. the user has never completed or skipped it)
     */
    shouldShowProfileSetup: async (): Promise<boolean> => {
        try {
            const value = await AsyncStorage.getItem(PROFILE_SETUP_COMPLETE_KEY);
            return value !== 'true';
        } catch {
            return false;
        }
    },

    /**
     * Mark the profile setup flow as complete (or skipped).
     * Either way, we don't show it again.
     */
    markProfileSetupComplete: async (): Promise<void> => {
        try {
            await AsyncStorage.setItem(PROFILE_SETUP_COMPLETE_KEY, 'true');
        } catch (error) {
            console.error('[ProfileSetup] Failed to mark complete:', error);
        }
    },

    /**
     * Reset the flag (for testing / debugging).
     */
    reset: async (): Promise<void> => {
        try {
            await AsyncStorage.removeItem(PROFILE_SETUP_COMPLETE_KEY);
        } catch (error) {
            console.error('[ProfileSetup] Failed to reset:', error);
        }
    },
};
