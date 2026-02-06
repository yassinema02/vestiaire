/**
 * Analytics Service
 * Story 5.6: Wardrobe Analytics Dashboard
 * Calculates wardrobe stats, category breakdown, wear frequency, and insights.
 */

import { supabase } from './supabase';
import { WardrobeItem } from './items';
import { calculateCPW } from '../utils/cpwCalculator';
import { countNeglected } from '../utils/neglectedItems';

const CATEGORY_COLORS: Record<string, string> = {
    tops: '#3b82f6',
    bottoms: '#22c55e',
    dresses: '#ec4899',
    outerwear: '#f97316',
    shoes: '#8b5cf6',
    accessories: '#14b8a6',
};

const DEFAULT_CATEGORY_COLOR = '#9ca3af';

export interface CategoryBreakdown {
    category: string;
    count: number;
    percentage: number;
    color: string;
}

export interface DailyWearCount {
    date: string;
    count: number;
}

export interface WardrobeStats {
    totalItems: number;
    totalValue: number;
    averageCPW: number;
    categoryBreakdown: CategoryBreakdown[];
    wearFrequency: DailyWearCount[];
    neglectedCount: number;
    insights: string[];
}

export const analyticsService = {
    getWardrobeStats: async (): Promise<{ stats: WardrobeStats; error: Error | null }> => {
        try {
            // Fetch all items
            const { data: items, error: itemsError } = await supabase
                .from('items')
                .select('*');

            if (itemsError) {
                return { stats: emptyStats(), error: itemsError };
            }

            const allItems = (items || []) as WardrobeItem[];
            const totalItems = allItems.length;

            // Total value
            const totalValue = allItems.reduce(
                (sum, item) => sum + (item.purchase_price || 0),
                0
            );

            // Average CPW
            const itemsWithCPW = allItems.filter(
                (i) => i.purchase_price && i.wear_count > 0
            );
            const averageCPW =
                itemsWithCPW.length > 0
                    ? itemsWithCPW.reduce(
                          (sum, i) => sum + (calculateCPW(i.purchase_price!, i.wear_count) || 0),
                          0
                      ) / itemsWithCPW.length
                    : 0;

            // Category breakdown
            const categoryMap = new Map<string, number>();
            for (const item of allItems) {
                const cat = item.category || 'other';
                categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
            }
            const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
                .map(([category, count]) => ({
                    category,
                    count,
                    percentage: totalItems > 0 ? Math.round((count / totalItems) * 100) : 0,
                    color: CATEGORY_COLORS[category.toLowerCase()] || DEFAULT_CATEGORY_COLOR,
                }))
                .sort((a, b) => b.count - a.count);

            // Wear frequency (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
            const sinceDateStr = thirtyDaysAgo.toISOString().split('T')[0];

            const { data: logs, error: logsError } = await supabase
                .from('wear_logs')
                .select('worn_date')
                .gte('worn_date', sinceDateStr)
                .order('worn_date', { ascending: true });

            const dateCountMap = new Map<string, number>();
            // Pre-fill all 30 days with 0
            for (let i = 0; i < 30; i++) {
                const d = new Date(thirtyDaysAgo);
                d.setDate(d.getDate() + i);
                dateCountMap.set(d.toISOString().split('T')[0], 0);
            }
            if (!logsError && logs) {
                for (const log of logs) {
                    const date = (log as any).worn_date;
                    dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1);
                }
            }
            const wearFrequency: DailyWearCount[] = Array.from(dateCountMap.entries())
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date));

            // Neglected count
            const neglectedCount = countNeglected(allItems);

            // Generate insights
            const insights = generateInsights(allItems, categoryBreakdown, neglectedCount);

            return {
                stats: {
                    totalItems,
                    totalValue,
                    averageCPW,
                    categoryBreakdown,
                    wearFrequency,
                    neglectedCount,
                    insights,
                },
                error: null,
            };
        } catch (error) {
            console.error('Get wardrobe stats exception:', error);
            return { stats: emptyStats(), error: error as Error };
        }
    },
};

function generateInsights(
    items: WardrobeItem[],
    categoryBreakdown: CategoryBreakdown[],
    neglectedCount: number
): string[] {
    const insights: string[] = [];

    // Most used category
    if (categoryBreakdown.length > 0) {
        const top = categoryBreakdown[0];
        insights.push(
            `You wear **${capitalize(top.category)}** most — ${top.percentage}% of your wardrobe!`
        );
    }

    // Best CPW item
    const itemsWithPrice = items.filter((i) => i.purchase_price && i.wear_count > 0);
    if (itemsWithPrice.length > 0) {
        const best = itemsWithPrice.reduce((prev, curr) => {
            const prevCPW = calculateCPW(prev.purchase_price!, prev.wear_count) || Infinity;
            const currCPW = calculateCPW(curr.purchase_price!, curr.wear_count) || Infinity;
            return currCPW < prevCPW ? curr : prev;
        });
        const bestCPW = calculateCPW(best.purchase_price!, best.wear_count) || 0;
        const name = best.name || best.sub_category || best.category || 'item';
        insights.push(
            `Your **${name}** has the best value at $${bestCPW.toFixed(2)}/wear`
        );
    }

    // Least represented category
    if (categoryBreakdown.length >= 3) {
        const least = categoryBreakdown[categoryBreakdown.length - 1];
        if (least.count <= 3) {
            insights.push(
                `Consider adding more **${capitalize(least.category)}** — you only have ${least.count}`
            );
        }
    }

    // Neglected items
    if (neglectedCount > 0) {
        insights.push(
            `${neglectedCount} item${neglectedCount !== 1 ? 's' : ''} haven't been worn in 2+ months`
        );
    }

    return insights;
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function emptyStats(): WardrobeStats {
    return {
        totalItems: 0,
        totalValue: 0,
        averageCPW: 0,
        categoryBreakdown: [],
        wearFrequency: [],
        neglectedCount: 0,
        insights: [],
    };
}
