/**
 * Resale Prompt Service
 * Story 13.2: Resale Prompt Notifications
 * Manages resale prompts for neglected items: price estimation, prompt
 * selection, dismissal tracking, and monthly frequency enforcement.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { WardrobeItem } from './items';
import { requireUserId } from './auth-helpers';
import { getDaysSinceWorn, formatNeglectedLabel } from '../utils/neglectedItems';

export interface ResalePrompt {
    item: WardrobeItem;
    estimatedPrice: number;
    message: string;
    daysSinceWorn: number;
}

const DISMISSED_KEY_PREFIX = 'dismissed_resale_prompts_';
const MAX_PROMPTS_PER_SESSION = 3;
const DEFAULT_PRICE = 15;
const PREMIUM_RETENTION = 0.7;
const STANDARD_RETENTION = 0.5;

// Mirror of resaleService PREMIUM_BRANDS for price estimation
const PREMIUM_BRANDS = new Set([
    'gucci', 'prada', 'louis vuitton', 'chanel', 'hermes', 'dior',
    'burberry', 'balenciaga', 'saint laurent', 'bottega veneta',
    'versace', 'fendi', 'valentino', 'celine', 'loewe',
    'nike', 'adidas', 'new balance', 'north face', 'patagonia',
    'ralph lauren', 'tommy hilfiger', 'calvin klein', 'hugo boss',
    "levi's", 'levis', 'cos', 'arket', 'sandro', 'maje',
    'acne studios', 'apc', 'a.p.c.', 'isabel marant',
]);

function isPremiumBrand(brand: string | undefined): boolean {
    if (!brand) return false;
    return PREMIUM_BRANDS.has(brand.toLowerCase().trim());
}

function dismissedKey(userId: string): string {
    return `${DISMISSED_KEY_PREFIX}${userId}`;
}

async function getDismissedIds(userId: string): Promise<Set<string>> {
    const raw = await AsyncStorage.getItem(dismissedKey(userId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
}

async function saveDismissedIds(userId: string, ids: Set<string>): Promise<void> {
    await AsyncStorage.setItem(dismissedKey(userId), JSON.stringify(Array.from(ids)));
}

/**
 * Estimate resale price for an item.
 * Uses purchase_price with brand premium/standard depreciation,
 * wear_count as a condition proxy, and a fallback default.
 */
export function estimateResalePrice(item: WardrobeItem): number {
    if (!item.purchase_price || item.purchase_price <= 0) {
        return DEFAULT_PRICE;
    }

    // Base retention: premium brands retain more value
    const retention = isPremiumBrand(item.brand) ? PREMIUM_RETENTION : STANDARD_RETENTION;
    let price = item.purchase_price * retention;

    // Wear count reduces value (proxy for condition)
    // Each wear reduces by ~1%, capped at 30% additional reduction
    if (item.wear_count > 0) {
        const wearReduction = Math.min(item.wear_count * 0.01, 0.3);
        price *= (1 - wearReduction);
    }

    // Round to nearest whole number, minimum £5
    return Math.max(5, Math.round(price));
}

function buildPromptMessage(item: WardrobeItem, price: number): string {
    const name = item.name || item.category || 'item';
    const label = formatNeglectedLabel(item);
    return `You haven't worn your ${name} in a while. ${label}. Sell for £${price}?`;
}

export const resalePromptService = {
    /**
     * Check if resale prompts are globally enabled (profiles table).
     */
    isGloballyEnabled: async (): Promise<boolean> => {
        try {
            const userId = await requireUserId();
            const { data } = await supabase
                .from('profiles')
                .select('resale_prompts_enabled')
                .eq('id', userId)
                .single();
            return data?.resale_prompts_enabled !== false;
        } catch {
            return true; // default enabled
        }
    },

    /**
     * Toggle resale prompts globally on/off.
     */
    setGloballyEnabled: async (enabled: boolean): Promise<void> => {
        const userId = await requireUserId();
        await supabase
            .from('profiles')
            .update({ resale_prompts_enabled: enabled })
            .eq('id', userId);
    },

    /**
     * Get resale prompts for neglected items.
     * Filters: neglect_status, monthly frequency, dismissals, global toggle.
     * Returns up to 3 prompts sorted by resale score.
     */
    getResalePrompts: async (items: WardrobeItem[]): Promise<ResalePrompt[]> => {
        // Check global toggle
        const enabled = await resalePromptService.isGloballyEnabled();
        if (!enabled) return [];

        const userId = await requireUserId();
        const dismissedIds = await getDismissedIds(userId);

        // Get items prompted in the last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentLogs } = await supabase
            .from('resale_prompt_log')
            .select('item_id')
            .eq('user_id', userId)
            .gte('prompted_at', thirtyDaysAgo);

        const recentlyPrompted = new Set((recentLogs || []).map(l => l.item_id));

        // Filter eligible items
        const eligible = items.filter(item => {
            if (item.status !== 'complete') return false;
            if (!item.neglect_status) return false;
            if (dismissedIds.has(item.id)) return false;
            if (recentlyPrompted.has(item.id)) return false;
            return true;
        });

        // Score and sort (reuse resale scoring logic)
        const scored = eligible.map(item => {
            const daysSince = getDaysSinceWorn(item) ?? Math.floor(
                (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            let score = 50;
            if (daysSince > 180) score += 20;
            else score += 10;
            if (item.purchase_price && item.purchase_price > 100) score += 20;
            if (isPremiumBrand(item.brand)) score += 10;
            if (item.purchase_price && item.wear_count === 0) score += 15;
            else if (item.purchase_price && item.wear_count > 0) {
                const cpw = item.purchase_price / item.wear_count;
                if (cpw > 5) score += 10;
            }
            return { item, score, daysSince };
        });

        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, MAX_PROMPTS_PER_SESSION).map(({ item, daysSince }) => {
            const estimatedPrice = estimateResalePrice(item);
            return {
                item,
                estimatedPrice,
                message: buildPromptMessage(item, estimatedPrice),
                daysSinceWorn: daysSince,
            };
        });
    },

    /**
     * Dismiss a resale prompt for an item ("I'll keep it").
     * Persists to AsyncStorage + logs to resale_prompt_log.
     */
    dismissPrompt: async (itemId: string): Promise<void> => {
        const userId = await requireUserId();

        // Add to AsyncStorage dismissed set
        const ids = await getDismissedIds(userId);
        ids.add(itemId);
        await saveDismissedIds(userId, ids);

        // Log dismissal
        await supabase.from('resale_prompt_log').insert({
            user_id: userId,
            item_id: itemId,
            action: 'dismissed',
        });
    },

    /**
     * Record that a prompt was shown to the user.
     */
    recordPromptShown: async (itemId: string): Promise<void> => {
        const userId = await requireUserId();
        await supabase.from('resale_prompt_log').insert({
            user_id: userId,
            item_id: itemId,
            action: 'shown',
        });
    },

    /**
     * Record that a user tapped on a prompt (navigated to item detail).
     */
    recordPromptTapped: async (itemId: string): Promise<void> => {
        const userId = await requireUserId();
        await supabase.from('resale_prompt_log').insert({
            user_id: userId,
            item_id: itemId,
            action: 'tapped',
        });
    },

    /**
     * Clear all dismissals (re-enable prompts for all items).
     */
    clearDismissals: async (): Promise<void> => {
        const userId = await requireUserId();
        await AsyncStorage.removeItem(dismissedKey(userId));
    },

    /**
     * Stub: Schedule a push notification for a resale prompt.
     * TODO: Enable when dev build available — requires expo-notifications
     */
    scheduleResaleNotification: async (_prompt: ResalePrompt): Promise<void> => {
        // In-app prompts (ResalePromptBanner) serve as the notification mechanism
        // in Expo Go. Push notification scheduling will be enabled with a dev build.
        console.log('[ResalePrompt] Push notification stub — using in-app prompts instead');
    },
};
