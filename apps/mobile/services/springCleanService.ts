/**
 * Spring Clean Service
 * Story 13.4: Applies Spring Clean declutter results to wardrobe items.
 */

import { supabase } from './supabase';
import { gamificationService } from './gamificationService';
import { donationService } from './donationService';

export interface SpringCleanResult {
    kept: string[];
    selling: string[];
    donating: string[];
}

export const springCleanService = {
    /**
     * Apply Spring Clean decisions: update resale_status for sell/donate items,
     * award gamification points.
     */
    applySpringCleanResults: async (results: SpringCleanResult): Promise<void> => {
        // Mark items for selling
        if (results.selling.length > 0) {
            await supabase
                .from('items')
                .update({ resale_status: 'listed' })
                .in('id', results.selling);
        }

        // Mark items as donated + log to donation_log (Story 13.6)
        if (results.donating.length > 0) {
            for (const itemId of results.donating) {
                await donationService.logDonation(itemId);
            }
        }

        // Award points: 5 per item sold or donated
        const actionedCount = results.selling.length + results.donating.length;
        if (actionedCount > 0) {
            try {
                await gamificationService.addPoints(5 * actionedCount, 'spring_clean');
            } catch { /* non-fatal */ }
        }
    },
};
