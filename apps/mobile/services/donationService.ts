/**
 * Donation Service
 * Story 13.6: Donation Tracking
 * Logs donations, retrieves history and stats.
 */

import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { WardrobeItem } from './items';
import { gamificationService } from './gamificationService';

export interface DonationEntry {
    id: string;
    user_id: string;
    item_id: string;
    charity: string | null;
    donated_at: string;
    estimated_value: number | null;
    created_at: string;
    item?: WardrobeItem;
}

export interface DonationStats {
    totalDonated: number;
    totalEstimatedValue: number;
    thisYearValue: number;
    estimatedWeight: number;
}

const AVG_ITEM_WEIGHT_KG = 0.7;

export const donationService = {
    /**
     * Log a donation and mark the item as donated.
     */
    logDonation: async (
        itemId: string,
        charity?: string,
        estimatedValue?: number
    ): Promise<{ error: string | null }> => {
        try {
            const userId = await requireUserId();

            // Insert donation log entry
            const { error } = await supabase
                .from('donation_log')
                .insert({
                    user_id: userId,
                    item_id: itemId,
                    charity: charity || null,
                    estimated_value: estimatedValue || null,
                });

            if (error) return { error: error.message };

            // Mark item as donated
            await supabase
                .from('items')
                .update({ resale_status: 'donated' })
                .eq('id', itemId);

            // Award points
            try {
                await gamificationService.addPoints(3, 'donate_item');
            } catch { /* non-fatal */ }

            return { error: null };
        } catch (err) {
            console.error('Log donation error:', err);
            return { error: 'Failed to log donation' };
        }
    },

    /**
     * Get donation history for current user, joined with items.
     */
    getDonationHistory: async (): Promise<{ donations: DonationEntry[]; error: string | null }> => {
        try {
            const userId = await requireUserId();
            const { data, error } = await supabase
                .from('donation_log')
                .select('*, item:items(*)')
                .eq('user_id', userId)
                .order('donated_at', { ascending: false });

            if (error) return { donations: [], error: error.message };
            return { donations: (data || []) as DonationEntry[], error: null };
        } catch (err) {
            console.error('Get donation history error:', err);
            return { donations: [], error: 'Failed to load donations' };
        }
    },

    /**
     * Get aggregated donation stats.
     */
    getDonationStats: async (): Promise<DonationStats> => {
        try {
            const userId = await requireUserId();
            const { data } = await supabase
                .from('donation_log')
                .select('estimated_value, donated_at')
                .eq('user_id', userId);

            const donations = data || [];
            const totalDonated = donations.length;
            const totalEstimatedValue = donations.reduce(
                (sum, d) => sum + (d.estimated_value || 0), 0
            );

            // Current year filter for tax deduction
            const currentYear = new Date().getFullYear();
            const thisYearValue = donations
                .filter(d => new Date(d.donated_at).getFullYear() === currentYear)
                .reduce((sum, d) => sum + (d.estimated_value || 0), 0);

            return {
                totalDonated,
                totalEstimatedValue,
                thisYearValue,
                estimatedWeight: totalDonated * AVG_ITEM_WEIGHT_KG,
            };
        } catch {
            return { totalDonated: 0, totalEstimatedValue: 0, thisYearValue: 0, estimatedWeight: 0 };
        }
    },
};
