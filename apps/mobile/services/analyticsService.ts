/**
 * Analytics Service
 * Story 5.6: Wardrobe Analytics Dashboard
 * Story 6.5: Sustainability Score
 * Calculates wardrobe stats, category breakdown, wear frequency, insights, and sustainability score.
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

export interface SustainabilityScore {
    score: number;
    utilization: number;
    wearDepth: number;
    valueEfficiency: number;
    tier: string;
    tip: string;
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

    /**
     * Story 6.5: Get sustainability score, using weekly cache.
     */
    getSustainabilityScore: async (): Promise<{ score: SustainabilityScore; error: Error | null }> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                return { score: emptySustainability(), error: new Error('Not authenticated') };
            }
            const userId = userData.user.id;

            // Check cache: read last_score_calc_date from user_stats
            const { data: statsRow, error: statsError } = await supabase
                .from('user_stats')
                .select('sustainability_score, last_score_calc_date')
                .eq('user_id', userId)
                .single();

            if (statsError && statsError.code !== 'PGRST116') {
                // Table or column may not exist yet
                if (statsError.code === 'PGRST205' || statsError.code === '42P01') {
                    return { score: emptySustainability(), error: null };
                }
            }

            const today = new Date().toISOString().split('T')[0];
            const lastCalc = (statsRow as any)?.last_score_calc_date;
            const cachedScore = (statsRow as any)?.sustainability_score ?? 0;

            // If calculated within last 7 days, use cached
            if (lastCalc) {
                const daysSinceCalc = Math.round(
                    (new Date(today).getTime() - new Date(lastCalc).getTime()) / (1000 * 60 * 60 * 24)
                );
                if (daysSinceCalc < 7) {
                    return {
                        score: buildSustainabilityResult(cachedScore, null),
                        error: null,
                    };
                }
            }

            // Recalculate
            const result = await calculateSustainabilityScore(userId);

            // Persist to DB
            await supabase
                .from('user_stats')
                .update({
                    sustainability_score: result.score,
                    last_score_calc_date: today,
                })
                .eq('user_id', userId);

            return { score: result, error: null };
        } catch (error) {
            console.error('Get sustainability score exception:', error);
            return { score: emptySustainability(), error: error as Error };
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

function emptySustainability(): SustainabilityScore {
    return { score: 0, utilization: 0, wearDepth: 0, valueEfficiency: 0, tier: 'Improving', tip: '' };
}

/**
 * Calculate sustainability score (0-100).
 * Weighted: Utilization 40%, Wear Depth 30%, Value Efficiency 30%.
 */
async function calculateSustainabilityScore(userId: string): Promise<SustainabilityScore> {
    // Fetch all complete items
    const { data: items } = await supabase
        .from('items')
        .select('id, wear_count, purchase_price')
        .eq('status', 'complete');

    const allItems = (items || []) as { id: string; wear_count: number; purchase_price: number | null }[];
    const totalItems = allItems.length;

    if (totalItems === 0) {
        return emptySustainability();
    }

    // 1. Utilization (40%): % of items worn in last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const sinceDate = ninetyDaysAgo.toISOString().split('T')[0];

    const { data: recentLogs } = await supabase
        .from('wear_logs')
        .select('item_id')
        .gte('worn_date', sinceDate);

    const activeItemIds = new Set((recentLogs || []).map((l: any) => l.item_id));
    const activeCount = allItems.filter(i => activeItemIds.has(i.id)).length;
    const utilizationRaw = (activeCount / totalItems) * 100;
    const utilization = Math.min(utilizationRaw, 100);

    // 2. Wear Depth (30%): avg wear count vs target of 30
    const TARGET_WEAR = 30;
    const avgWearCount = allItems.reduce((sum, i) => sum + (i.wear_count || 0), 0) / totalItems;
    const wearDepthRaw = (avgWearCount / TARGET_WEAR) * 100;
    const wearDepth = Math.min(wearDepthRaw, 100);

    // 3. Value Efficiency (30%): target CPW £1 vs actual avg CPW
    const TARGET_CPW = 1;
    const itemsWithCPW = allItems.filter(i => i.purchase_price && i.wear_count > 0);
    let valueEfficiency = 100; // default if no priced items
    if (itemsWithCPW.length > 0) {
        const avgCPW = itemsWithCPW.reduce(
            (sum, i) => sum + (i.purchase_price! / i.wear_count),
            0
        ) / itemsWithCPW.length;
        const valueRaw = (TARGET_CPW / Math.max(avgCPW, 0.01)) * 100;
        valueEfficiency = Math.min(valueRaw, 100);
    }

    // Weighted score
    const score = Math.round(
        utilization * 0.4 + wearDepth * 0.3 + valueEfficiency * 0.3
    );
    const clampedScore = Math.max(0, Math.min(score, 100));

    return buildSustainabilityResult(clampedScore, {
        utilization: Math.round(utilization),
        wearDepth: Math.round(wearDepth),
        valueEfficiency: Math.round(valueEfficiency),
    });
}

function buildSustainabilityResult(
    score: number,
    breakdown: { utilization: number; wearDepth: number; valueEfficiency: number } | null
): SustainabilityScore {
    // Tier
    let tier: string;
    if (score > 80) tier = 'Top 10% of Vestiaire users!';
    else if (score > 60) tier = 'Top 25% of Vestiaire users!';
    else if (score > 40) tier = 'Top 50% of Vestiaire users!';
    else tier = 'Improving — keep going!';

    // Tip
    let tip = '';
    if (breakdown) {
        if (breakdown.utilization < 50) {
            tip = 'Wear your neglected items to boost utilization!';
        } else if (breakdown.valueEfficiency < 50) {
            tip = 'Wear your expensive items more to improve cost per wear!';
        } else if (breakdown.wearDepth < 50) {
            tip = 'Keep rewearing favorites to deepen your wardrobe usage!';
        } else {
            tip = 'Great job! Keep up your sustainable fashion habits!';
        }
    }

    return {
        score,
        utilization: breakdown?.utilization ?? 0,
        wearDepth: breakdown?.wearDepth ?? 0,
        valueEfficiency: breakdown?.valueEfficiency ?? 0,
        tier,
        tip,
    };
}
