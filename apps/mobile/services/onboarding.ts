/**
 * Onboarding Service
 * Manages the "First 5 Items" onboarding challenge state
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { itemsService } from './items';

const ONBOARDING_COMPLETE_KEY = '@vestiaire_onboarding_complete';
const ONBOARDING_SKIPPED_KEY = '@vestiaire_onboarding_skipped';

const REQUIRED_ITEMS = 5;

export interface OnboardingState {
    isComplete: boolean;
    isSkipped: boolean;
    itemCount: number;
    requiredItems: number;
    progress: number; // 0-1
}

export const onboardingService = {
    /**
     * Get the current onboarding state
     */
    getState: async (): Promise<OnboardingState> => {
        try {
            const [completeValue, skippedValue] = await Promise.all([
                AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY),
                AsyncStorage.getItem(ONBOARDING_SKIPPED_KEY),
            ]);

            const isComplete = completeValue === 'true';
            const isSkipped = skippedValue === 'true';

            // Get current item count
            const { items } = await itemsService.getItems();
            const itemCount = items.length;

            // Auto-complete if user has 5+ items
            if (itemCount >= REQUIRED_ITEMS && !isComplete) {
                await onboardingService.markComplete();
                return {
                    isComplete: true,
                    isSkipped: false,
                    itemCount,
                    requiredItems: REQUIRED_ITEMS,
                    progress: 1,
                };
            }

            return {
                isComplete,
                isSkipped,
                itemCount,
                requiredItems: REQUIRED_ITEMS,
                progress: Math.min(itemCount / REQUIRED_ITEMS, 1),
            };
        } catch (error) {
            console.error('Error getting onboarding state:', error);
            return {
                isComplete: false,
                isSkipped: false,
                itemCount: 0,
                requiredItems: REQUIRED_ITEMS,
                progress: 0,
            };
        }
    },

    /**
     * Check if onboarding flow should be shown
     */
    shouldShowOnboarding: async (): Promise<boolean> => {
        try {
            const state = await onboardingService.getState();

            // Don't show if complete or skipped
            if (state.isComplete || state.isSkipped) {
                return false;
            }

            // Show if user has less than required items
            return state.itemCount < REQUIRED_ITEMS;
        } catch (error) {
            console.error('Error checking onboarding:', error);
            return false;
        }
    },

    /**
     * Mark onboarding as complete
     */
    markComplete: async (): Promise<void> => {
        try {
            await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
            // Clear skipped flag if it was set
            await AsyncStorage.removeItem(ONBOARDING_SKIPPED_KEY);
        } catch (error) {
            console.error('Error marking onboarding complete:', error);
        }
    },

    /**
     * Mark onboarding as skipped (can be resumed later)
     */
    markSkipped: async (): Promise<void> => {
        try {
            await AsyncStorage.setItem(ONBOARDING_SKIPPED_KEY, 'true');
        } catch (error) {
            console.error('Error marking onboarding skipped:', error);
        }
    },

    /**
     * Reset onboarding state (for testing)
     */
    reset: async (): Promise<void> => {
        try {
            await Promise.all([
                AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY),
                AsyncStorage.removeItem(ONBOARDING_SKIPPED_KEY),
            ]);
        } catch (error) {
            console.error('Error resetting onboarding:', error);
        }
    },

    /**
     * Get required items count
     */
    getRequiredItems: (): number => REQUIRED_ITEMS,
};
