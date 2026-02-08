/**
 * Resale Service
 * Story 7.1: Resale Candidate Identification
 * Identifies items suitable for resale based on wear patterns and value.
 */

import { WardrobeItem } from './items';

export interface ResaleCandidate {
    item: WardrobeItem;
    score: number;
    reasons: string[];
    daysSinceWorn: number;
    cpw: number | null;
}

const RESALE_THRESHOLD_DAYS = 90;
const HIGH_PRICE_THRESHOLD = 100;
const HIGH_CPW_THRESHOLD = 5;

// Known premium brands that tend to hold resale value
const PREMIUM_BRANDS = new Set([
    'gucci', 'prada', 'louis vuitton', 'chanel', 'hermes', 'dior',
    'burberry', 'balenciaga', 'saint laurent', 'bottega veneta',
    'versace', 'fendi', 'valentino', 'celine', 'loewe',
    'nike', 'adidas', 'new balance', 'north face', 'patagonia',
    'ralph lauren', 'tommy hilfiger', 'calvin klein', 'hugo boss',
    'levi\'s', 'levis', 'cos', 'arket', 'sandro', 'maje',
    'acne studios', 'apc', 'a.p.c.', 'isabel marant',
]);

function getDaysSinceActivity(item: WardrobeItem): number {
    const referenceDate = item.last_worn_at
        ? new Date(item.last_worn_at)
        : new Date(item.created_at);
    return Math.floor((Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
}

function isPremiumBrand(brand: string | undefined): boolean {
    if (!brand) return false;
    return PREMIUM_BRANDS.has(brand.toLowerCase().trim());
}

function calculateResaleScore(item: WardrobeItem, daysSince: number): { score: number; reasons: string[] } {
    let score = 50; // Base score
    const reasons: string[] = [];

    // Not worn > 180 days
    if (daysSince > 180) {
        score += 20;
        reasons.push('Not worn in 6+ months');
    } else {
        reasons.push('Not worn in 3+ months');
    }

    // High original price
    if (item.purchase_price && item.purchase_price > HIGH_PRICE_THRESHOLD) {
        score += 20;
        reasons.push('High original value');
    }

    // Premium brand
    if (isPremiumBrand(item.brand)) {
        score += 10;
        reasons.push('Premium brand');
    }

    // High CPW (bad cost-per-wear = underutilized)
    if (item.purchase_price && item.wear_count > 0) {
        const cpw = item.purchase_price / item.wear_count;
        if (cpw > HIGH_CPW_THRESHOLD) {
            score += 10;
            reasons.push('High cost-per-wear');
        }
    } else if (item.purchase_price && item.wear_count === 0) {
        // Never worn but has a price — very good resale candidate
        score += 15;
        reasons.push('Never worn');
    }

    return { score: Math.min(score, 100), reasons };
}

export const resaleService = {
    /**
     * Get items that are good candidates for resale.
     * Criteria: not worn in 90+ days OR never worn (added 90+ days ago), status complete.
     * Returns sorted by resale score descending.
     */
    getResaleCandidates: (items: WardrobeItem[]): ResaleCandidate[] => {
        const candidates: ResaleCandidate[] = [];

        for (const item of items) {
            if (item.status !== 'complete') continue;

            const daysSince = getDaysSinceActivity(item);
            if (daysSince < RESALE_THRESHOLD_DAYS) continue;

            const cpw = item.purchase_price && item.wear_count > 0
                ? item.purchase_price / item.wear_count
                : null;

            const { score, reasons } = calculateResaleScore(item, daysSince);

            candidates.push({
                item,
                score,
                reasons,
                daysSinceWorn: daysSince,
                cpw,
            });
        }

        // Sort by score descending
        candidates.sort((a, b) => b.score - a.score);

        return candidates;
    },

    /**
     * Check if an item is a resale candidate (for filter use).
     */
    isResaleCandidate: (item: WardrobeItem): boolean => {
        if (item.status !== 'complete') return false;
        return getDaysSinceActivity(item) >= RESALE_THRESHOLD_DAYS;
    },
};
