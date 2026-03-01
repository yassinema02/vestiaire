/**
 * Analytics Service
 * Story 5.6: Wardrobe Analytics Dashboard
 * Story 6.5: Sustainability Score
 * Calculates wardrobe stats, category breakdown, wear frequency, insights, and sustainability score.
 */

import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
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
    // 5-factor breakdown
    wearDepth: number;          // 30% — avg wear count vs target 30
    utilization: number;        // 25% — % wardrobe worn in 90 days
    valueEfficiency: number;    // 20% — CPW target vs actual
    resaleActivity: number;     // 15% — items with resale status
    purchaseRestraint: number;  // 10% — fewer new items in last 90 days
    // Environmental
    co2Saved: number;           // kg CO2 saved estimate
    // Meta
    tier: string;
    tip: string;
    badgeUnlocked: boolean;
    badgeName?: string;
}

// Story 13.4: Wardrobe Health Score
export interface HealthScore {
    score: number;
    tier: 'excellent' | 'good' | 'poor';
    color: string;
    utilizationFactor: number;
    cpwFactor: number;
    sizeRatioFactor: number;
    recommendation: string;
    comparisonLabel: string;
    declutterCount: number;
}

// Story 11.1: Brand Value Analytics
export interface BrandStats {
    brand: string;
    itemCount: number;
    totalSpent: number;
    totalWears: number;
    avgCPW: number;
    bestItem?: string;
    bestItemCPW?: number;
}

export interface BrandAnalytics {
    brands: BrandStats[];
    topBrand: BrandStats | null;
    insight: string;
    categoryFilter: string | null;
}

export const analyticsService = {
    getWardrobeStats: async (): Promise<{ stats: WardrobeStats; error: Error | null }> => {
        try {
            const userId = await requireUserId();
            // Fetch all items
            const { data: items, error: itemsError } = await supabase
                .from('items')
                .select('*')
                .eq('user_id', userId);

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
                .eq('user_id', userId)
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
     * Story 11.1: Get brand value analytics.
     * Groups items by brand, calculates CPW, filters brands with 3+ items.
     */
    getBrandAnalytics: async (categoryFilter?: string): Promise<{ analytics: BrandAnalytics; error: Error | null }> => {
        try {
            const userId = await requireUserId();

            // 1. Fetch items with brand set
            let query = supabase
                .from('items')
                .select('*')
                .eq('user_id', userId)
                .not('brand', 'is', null);
            if (categoryFilter) {
                query = query.eq('category', categoryFilter);
            }
            const { data: items, error: itemsError } = await query;

            if (itemsError) {
                return { analytics: emptyBrandAnalytics(categoryFilter), error: itemsError };
            }

            const allItems = (items || []) as WardrobeItem[];
            if (allItems.length === 0) {
                return {
                    analytics: {
                        ...emptyBrandAnalytics(categoryFilter),
                        insight: 'Add brands and prices to your items to see value insights',
                    },
                    error: null,
                };
            }

            // 2. Count wears per item via wear_logs
            const itemIds = allItems.map(i => i.id);
            const { data: wearLogs } = await supabase
                .from('wear_logs')
                .select('item_id')
                .in('item_id', itemIds);

            const wearCounts: Record<string, number> = {};
            (wearLogs || []).forEach((log: any) => {
                wearCounts[log.item_id] = (wearCounts[log.item_id] || 0) + 1;
            });

            // 3. Group by brand
            const brandMap: Record<string, {
                brand: string;
                itemCount: number;
                totalSpent: number;
                totalWears: number;
                bestItem?: string;
                bestItemCPW?: number;
            }> = {};

            for (const item of allItems) {
                const brand = item.brand!;
                if (!brandMap[brand]) {
                    brandMap[brand] = { brand, itemCount: 0, totalSpent: 0, totalWears: 0 };
                }
                const entry = brandMap[brand];
                entry.itemCount++;
                if (item.purchase_price) {
                    entry.totalSpent += item.purchase_price;
                }
                const itemWears = wearCounts[item.id] || 0;
                entry.totalWears += itemWears;

                // Track best CPW item (only for items with price)
                if (item.purchase_price && item.purchase_price > 0) {
                    const itemCPW = item.purchase_price / Math.max(itemWears, 1);
                    if (entry.bestItemCPW === undefined || itemCPW < entry.bestItemCPW) {
                        entry.bestItem = item.name || item.sub_category || item.category || brand;
                        entry.bestItemCPW = itemCPW;
                    }
                }
            }

            // 4. Calculate avgCPW, filter 3+ items, sort by best value
            const brands: BrandStats[] = Object.values(brandMap)
                .filter(b => b.itemCount >= 3)
                .map(b => ({
                    ...b,
                    avgCPW: b.totalWears > 0 ? b.totalSpent / b.totalWears : Infinity,
                }))
                .sort((a, b) => {
                    if (a.avgCPW === Infinity && b.avgCPW === Infinity) return 0;
                    if (a.avgCPW === Infinity) return 1;
                    if (b.avgCPW === Infinity) return -1;
                    return a.avgCPW - b.avgCPW;
                });

            const topBrand = brands[0] || null;
            const insight = generateBrandInsight(brands);

            return {
                analytics: {
                    brands,
                    topBrand,
                    insight,
                    categoryFilter: categoryFilter || null,
                },
                error: null,
            };
        } catch (error) {
            console.error('Get brand analytics exception:', error);
            return { analytics: emptyBrandAnalytics(categoryFilter), error: error as Error };
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

export function generateBrandInsight(brands: BrandStats[]): string {
    if (brands.length === 0) {
        return 'Add brands and prices to your items to see value insights';
    }
    const top = brands[0];
    if (top.avgCPW === Infinity || top.totalWears === 0) {
        return `Add purchase prices and brand names to unlock brand insights`;
    }
    if (top.bestItem && top.bestItemCPW !== undefined && top.bestItemCPW !== top.avgCPW) {
        return `Your ${top.brand} ${top.bestItem} is your best value at £${top.bestItemCPW.toFixed(2)}/wear`;
    }
    return `Your ${top.brand} items cost £${top.avgCPW.toFixed(2)}/wear — great value!`;
}

function emptyBrandAnalytics(categoryFilter?: string): BrandAnalytics {
    return {
        brands: [],
        topBrand: null,
        insight: 'Add brands and prices to your items to see value insights',
        categoryFilter: categoryFilter || null,
    };
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
    return {
        score: 0,
        utilization: 0,
        wearDepth: 0,
        valueEfficiency: 0,
        resaleActivity: 0,
        purchaseRestraint: 0,
        co2Saved: 0,
        tier: 'Getting started — every wear counts!',
        tip: '',
        badgeUnlocked: false,
    };
}

/**
 * Calculate sustainability score (0-100).
 * Story 11.2: 5-Factor Model
 * Weighted: Wear Depth 30%, Utilization 25%, Value Efficiency 20%, Resale Activity 15%, Purchase Restraint 10%
 */
async function calculateSustainabilityScore(userId: string): Promise<SustainabilityScore> {
    // Fetch all complete items (include resale_status and created_at for new factors)
    const { data: items } = await supabase
        .from('items')
        .select('id, wear_count, purchase_price, created_at')
        .eq('user_id', userId)
        .eq('status', 'complete');

    const allItems = (items || []) as {
        id: string;
        wear_count: number;
        purchase_price: number | null;
        created_at: string;
        resale_status?: string | null;
    }[];
    const totalItems = allItems.length;

    if (totalItems === 0) {
        return emptySustainability();
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const sinceDate = ninetyDaysAgo.toISOString().split('T')[0];

    // Factor 1: Wear Depth (30%) — avg wear count vs target 30
    const TARGET_WEAR = 30;
    const avgWearCount = allItems.reduce((sum, i) => sum + (i.wear_count || 0), 0) / totalItems;
    const wearDepth = Math.min((avgWearCount / TARGET_WEAR) * 100, 100);

    // Factor 2: Utilization (25%) — % of items worn in last 90 days
    const { data: recentLogs } = await supabase
        .from('wear_logs')
        .select('item_id')
        .eq('user_id', userId)
        .gte('worn_date', sinceDate);

    const activeItemIds = new Set((recentLogs || []).map((l: any) => l.item_id));
    const activeCount = allItems.filter(i => activeItemIds.has(i.id)).length;
    const utilization = Math.min((activeCount / totalItems) * 100, 100);

    // Factor 3: Value Efficiency (20%) — target CPW £1 vs actual avg CPW
    const TARGET_CPW = 1;
    const itemsWithCPW = allItems.filter(i => i.purchase_price && i.wear_count > 0);
    let valueEfficiency = 100;
    if (itemsWithCPW.length > 0) {
        const avgCPW = itemsWithCPW.reduce(
            (sum, i) => sum + (i.purchase_price! / i.wear_count),
            0
        ) / itemsWithCPW.length;
        valueEfficiency = Math.min((TARGET_CPW / Math.max(avgCPW, 0.01)) * 100, 100);
    }

    // Factor 4: Resale Activity (15%) — items with resale_status = 'listed' or 'sold'
    // Fetch resale_status separately (field may not exist on older items)
    const { data: resaleItems } = await supabase
        .from('items')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'complete')
        .in('resale_status', ['listed', 'sold']);
    const resaleCount = (resaleItems || []).length;
    const resaleActivity = Math.min((resaleCount / totalItems) * 100, 100);

    // Factor 5: Purchase Restraint (10%) — fewer new items in 90 days
    // 0 new = 100%, 1 = 80%, 2 = 60%, 3 = 40%, 4 = 20%, 5+ = 0%
    const newItemCount = allItems.filter(i => i.created_at && i.created_at >= sinceDate).length;
    const purchaseRestraint = Math.max(0, Math.min(100, (1 - newItemCount / 5) * 100));

    // Weighted score
    const rawScore = Math.round(
        wearDepth * 0.30 +
        utilization * 0.25 +
        valueEfficiency * 0.20 +
        resaleActivity * 0.15 +
        purchaseRestraint * 0.10
    );
    const clampedScore = Math.max(0, Math.min(rawScore, 100));

    // CO2 savings: each extra wear avoids buying new (~0.5 kg CO2 saved per rewear)
    const totalWears = allItems.reduce((sum, i) => sum + (i.wear_count || 0), 0);
    const co2Saved = Math.round(Math.max(0, totalWears - totalItems) * 0.5);

    return buildSustainabilityResult(clampedScore, {
        wearDepth: Math.round(wearDepth),
        utilization: Math.round(utilization),
        valueEfficiency: Math.round(valueEfficiency),
        resaleActivity: Math.round(resaleActivity),
        purchaseRestraint: Math.round(purchaseRestraint),
        co2Saved,
    });
}

interface FullBreakdown {
    wearDepth: number;
    utilization: number;
    valueEfficiency: number;
    resaleActivity: number;
    purchaseRestraint: number;
    co2Saved: number;
}

function buildSustainabilityResult(
    score: number,
    breakdown: FullBreakdown | null
): SustainabilityScore {
    // Tier (Story 11.2: refined thresholds)
    let tier: string;
    if (score > 85) tier = 'Top 5% of Vestiaire users! 🏆';
    else if (score > 75) tier = 'Top 15% of Vestiaire users! 🌟';
    else if (score > 60) tier = 'Top 25% of Vestiaire users!';
    else if (score > 40) tier = 'Top 50% — keep going!';
    else tier = 'Getting started — every wear counts!';

    // Tip: based on weakest factor
    let tip = '';
    if (breakdown) {
        const factors = [
            { name: 'utilization', value: breakdown.utilization, msg: 'Try wearing items you haven\'t touched in 90 days' },
            { name: 'wearDepth', value: breakdown.wearDepth, msg: 'Keep rewearing your favorites to deepen wardrobe usage' },
            { name: 'valueEfficiency', value: breakdown.valueEfficiency, msg: 'Wear your expensive items more to improve cost per wear' },
            { name: 'resaleActivity', value: breakdown.resaleActivity, msg: 'List neglected items for resale to boost your score' },
            { name: 'purchaseRestraint', value: breakdown.purchaseRestraint, msg: 'Challenge yourself to a 30-day no-buy period' },
        ];
        const weakest = factors.reduce((a, b) => a.value < b.value ? a : b);
        if (score >= 80) {
            tip = 'Amazing! You\'re a sustainable fashion champion! 🌱';
        } else {
            tip = weakest.msg;
        }
    }

    // Badge
    const badgeUnlocked = score >= 80;

    return {
        score,
        wearDepth: breakdown?.wearDepth ?? 0,
        utilization: breakdown?.utilization ?? 0,
        valueEfficiency: breakdown?.valueEfficiency ?? 0,
        resaleActivity: breakdown?.resaleActivity ?? 0,
        purchaseRestraint: breakdown?.purchaseRestraint ?? 0,
        co2Saved: breakdown?.co2Saved ?? 0,
        tier,
        tip,
        badgeUnlocked,
        badgeName: badgeUnlocked ? 'Eco Warrior 🌱' : undefined,
    };
}

// ─── Story 13.4: Wardrobe Health Score ────────────────────────────

function getHealthTier(score: number): { tier: 'excellent' | 'good' | 'poor'; color: string } {
    if (score >= 80) return { tier: 'excellent', color: '#22c55e' };
    if (score >= 50) return { tier: 'good', color: '#f59e0b' };
    return { tier: 'poor', color: '#ef4444' };
}

function getComparisonLabel(score: number): string {
    if (score >= 90) return 'Healthier than ~95% of users';
    if (score >= 80) return 'Healthier than ~80% of users';
    if (score >= 70) return 'Healthier than ~60% of users';
    if (score >= 50) return 'Healthier than ~35% of users';
    return 'Room for improvement';
}

export function calculateHealthScore(items: WardrobeItem[]): HealthScore {
    const completeItems = items.filter(i => i.status === 'complete');
    const totalComplete = completeItems.length;

    if (totalComplete === 0) {
        return {
            score: 0, tier: 'poor', color: '#ef4444',
            utilizationFactor: 0, cpwFactor: 50, sizeRatioFactor: 0,
            recommendation: 'Add items to your wardrobe to get started',
            comparisonLabel: 'Room for improvement',
            declutterCount: 0,
        };
    }

    // Factor 1: Utilization (50%) — % items worn in last 90 days
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const activeCount = completeItems.filter(i => {
        if (!i.last_worn_at) return false;
        return new Date(i.last_worn_at).getTime() >= ninetyDaysAgo;
    }).length;
    const utilizationFactor = Math.min((activeCount / totalComplete) * 100, 100);

    // Factor 2: Cost Efficiency (30%) — % items with CPW < £5
    const itemsWithPrice = completeItems.filter(i => i.purchase_price && i.purchase_price > 0 && i.wear_count > 0);
    let cpwFactor: number;
    if (itemsWithPrice.length === 0) {
        cpwFactor = 50; // neutral if no items have price data
    } else {
        const goodCPWCount = itemsWithPrice.filter(i => (i.purchase_price! / i.wear_count) < 5).length;
        cpwFactor = Math.min((goodCPWCount / itemsWithPrice.length) * 100, 100);
    }

    // Factor 3: Size Ratio (20%) — inverse of neglect percentage
    const neglectedCount = completeItems.filter(i => i.neglect_status).length;
    const neglectPercentage = (neglectedCount / totalComplete) * 100;
    const sizeRatioFactor = Math.max(100 - neglectPercentage, 0);

    // Weighted score
    const rawScore = (utilizationFactor * 0.5) + (cpwFactor * 0.3) + (sizeRatioFactor * 0.2);
    const score = Math.round(Math.min(Math.max(rawScore, 0), 100));

    const { tier, color } = getHealthTier(score);

    // Recommendation
    const utilizationPct = (activeCount / totalComplete) * 100;
    let recommendation: string;
    let declutterCount: number;
    if (utilizationPct < 70) {
        declutterCount = neglectedCount;
        recommendation = declutterCount > 0
            ? `Declutter ${declutterCount} item${declutterCount !== 1 ? 's' : ''} to improve health`
            : 'Wear more of your existing items to boost your score';
    } else if (utilizationPct < 85) {
        declutterCount = Math.max(1, Math.round(neglectedCount * 0.3));
        recommendation = `Consider letting go of ${declutterCount} item${declutterCount !== 1 ? 's' : ''}`;
    } else {
        declutterCount = 0;
        recommendation = 'Your wardrobe is well-utilized — keep it up!';
    }

    return {
        score,
        tier,
        color,
        utilizationFactor: Math.round(utilizationFactor),
        cpwFactor: Math.round(cpwFactor),
        sizeRatioFactor: Math.round(sizeRatioFactor),
        recommendation,
        comparisonLabel: getComparisonLabel(score),
        declutterCount,
    };
}
