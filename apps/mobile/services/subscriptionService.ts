/**
 * Subscription Service
 * Story 7.6: Premium Subscription Flow
 * Manages premium subscription status. Uses Supabase for state management.
 * TODO: Replace simulated purchase with RevenueCat/StoreKit for production.
 */

import { supabase } from './supabase';

export interface SubscriptionStatus {
    isPremium: boolean;
    premiumUntil: string | null;
    daysRemaining: number | null;
}

export const subscriptionService = {
    /**
     * Get current subscription status for the logged-in user.
     */
    getStatus: async (): Promise<{ status: SubscriptionStatus; error: string | null }> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                return {
                    status: { isPremium: false, premiumUntil: null, daysRemaining: null },
                    error: 'Not authenticated',
                };
            }

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('premium_until')
                .eq('id', userData.user.id)
                .single();

            if (error) {
                return {
                    status: { isPremium: false, premiumUntil: null, daysRemaining: null },
                    error: error.message,
                };
            }

            const premiumUntil = profile?.premium_until;
            if (!premiumUntil) {
                return {
                    status: { isPremium: false, premiumUntil: null, daysRemaining: null },
                    error: null,
                };
            }

            const expiryDate = new Date(premiumUntil);
            const now = new Date();
            const isPremium = expiryDate > now;
            const daysRemaining = isPremium
                ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null;

            return {
                status: { isPremium, premiumUntil, daysRemaining },
                error: null,
            };
        } catch (err) {
            return {
                status: { isPremium: false, premiumUntil: null, daysRemaining: null },
                error: 'Failed to check subscription status',
            };
        }
    },

    /**
     * Purchase premium subscription.
     * TODO: Replace with RevenueCat `Purchases.purchasePackage()` for production.
     * Currently simulates a purchase by setting premium_until to 30 days from now.
     */
    purchasePremium: async (): Promise<{ success: boolean; error: string | null }> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                return { success: false, error: 'Not authenticated' };
            }

            // Simulate purchase — set premium for 30 days
            const premiumUntil = new Date();
            premiumUntil.setDate(premiumUntil.getDate() + 30);

            const { error } = await supabase
                .from('profiles')
                .update({ premium_until: premiumUntil.toISOString() })
                .eq('id', userData.user.id);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, error: null };
        } catch (err) {
            return { success: false, error: 'Purchase failed. Please try again.' };
        }
    },

    /**
     * Restore purchases.
     * TODO: Replace with RevenueCat `Purchases.restorePurchases()` for production.
     * Currently checks if an active premium_until exists in the database.
     */
    restorePurchases: async (): Promise<{ restored: boolean; error: string | null }> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                return { restored: false, error: 'Not authenticated' };
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('premium_until')
                .eq('id', userData.user.id)
                .single();

            if (profile?.premium_until && new Date(profile.premium_until) > new Date()) {
                return { restored: true, error: null };
            }

            return { restored: false, error: 'No active subscription found' };
        } catch (err) {
            return { restored: false, error: 'Failed to restore purchases' };
        }
    },

    /**
     * Cancel subscription (mark for expiry at end of current period).
     * In production, cancellation is handled by the App Store.
     */
    cancelSubscription: async (): Promise<{ success: boolean; error: string | null }> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                return { success: false, error: 'Not authenticated' };
            }

            // In production, App Store handles cancellation.
            // For simulation, we just let it expire naturally.
            return { success: true, error: null };
        } catch (err) {
            return { success: false, error: 'Failed to cancel subscription' };
        }
    },
};
