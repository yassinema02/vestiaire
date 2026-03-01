/**
 * Seasonal Report Service
 * Story 11.4: Seasonal Wardrobe Reports
 * Generates per-season wardrobe reports, readiness scores, historical comparison, transition alerts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { WardrobeItem } from './items';
import { Season, SeasonalReport, SeasonalReportResult } from '../types/seasonalReport';

// ─── Season date ranges (month = 1-based) ────────────────────────

const SEASON_MONTHS: Record<Season, { start: number; end: number }> = {
    spring: { start: 3, end: 5 },   // Mar–May
    summer: { start: 6, end: 8 },   // Jun–Aug
    fall:   { start: 9, end: 11 },  // Sep–Nov
    winter: { start: 12, end: 2 },  // Dec–Feb (crosses year boundary)
};

/**
 * Determine the season for a given month (1-based).
 */
export function getSeasonForMonth(month: number): Season {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
}

/**
 * Returns the current season based on today's date.
 */
export function getCurrentSeason(): Season {
    return getSeasonForMonth(new Date().getMonth() + 1);
}

/**
 * Returns the ISO date range (YYYY-MM-DD) for a season + year.
 * Winter 2025 = Dec 1 2025 – Feb 28/29 2026.
 */
export function getSeasonDateRange(season: Season, year: number): { startStr: string; endStr: string } {
    let startDate: Date;
    let endDate: Date;

    if (season === 'winter') {
        // Dec of `year` to end of Feb of `year+1`
        startDate = new Date(year, 11, 1); // Dec 1
        const nextYear = year + 1;
        const isLeap = (nextYear % 4 === 0 && nextYear % 100 !== 0) || nextYear % 400 === 0;
        endDate = new Date(nextYear, 1, isLeap ? 29 : 28); // Feb 28/29
    } else {
        const { start, end } = SEASON_MONTHS[season];
        startDate = new Date(year, start - 1, 1);
        // Last day of end month
        endDate = new Date(year, end, 0);
    }

    return {
        startStr: startDate.toISOString().split('T')[0],
        endStr: endDate.toISOString().split('T')[0],
    };
}

/**
 * Returns an alert if the next season starts within 14 days.
 * Season start dates: Spring=Mar 1, Summer=Jun 1, Fall=Sep 1, Winter=Dec 1.
 */
export function getTransitionAlert(now: Date = new Date()): string | undefined {
    const SEASON_START_MONTHS: { month: number; day: number; season: Season }[] = [
        { month: 3, day: 1, season: 'spring' },
        { month: 6, day: 1, season: 'summer' },
        { month: 9, day: 1, season: 'fall' },
        { month: 12, day: 1, season: 'winter' },
    ];

    const SEASON_EMOJI: Record<Season, string> = {
        spring: '🌸', summer: '☀️', fall: '🍂', winter: '❄️',
    };

    for (const { month, day, season } of SEASON_START_MONTHS) {
        const year = now.getFullYear();
        let nextStart = new Date(year, month - 1, day);
        if (nextStart <= now) {
            nextStart = new Date(year + 1, month - 1, day);
        }
        const daysUntil = Math.ceil((nextStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 14) {
            const seasonName = season.charAt(0).toUpperCase() + season.slice(1);
            return `${SEASON_EMOJI[season]} ${seasonName} starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}. Review your ${season} wardrobe.`;
        }
    }
    return undefined;
}

// ─── Readiness Score (0-10) ───────────────────────────────────────

/**
 * Calculate a 0-10 readiness score for a season.
 * Category coverage (4pts) + Variety (3pts) + Active usage (3pts)
 */
export function calculateReadinessScore(
    items: WardrobeItem[],
    wearCounts: Record<string, number>
): number {
    if (items.length === 0) return 0;

    // Category coverage (4 pts): tops, bottoms, outerwear, shoes
    const KEY_CATEGORIES = ['tops', 'bottoms', 'outerwear', 'shoes'];
    const hasCategory = (cat: string) => items.some(i => i.category === cat);
    const coveragePts = KEY_CATEGORIES.filter(hasCategory).length; // 0-4

    // Variety (3 pts): item count
    let varietyPts = 0;
    if (items.length >= 10) varietyPts = 3;
    else if (items.length >= 5) varietyPts = 2;
    else if (items.length >= 2) varietyPts = 1;

    // Active usage (3 pts): % of items actually worn in season
    const wornCount = items.filter(i => (wearCounts[i.id] || 0) > 0).length;
    const wornPct = wornCount / items.length;
    let usagePts = 0;
    if (wornPct > 0.75) usagePts = 3;
    else if (wornPct >= 0.5) usagePts = 2;
    else if (wornPct >= 0.25) usagePts = 1;

    return coveragePts + varietyPts + usagePts;
}

// ─── Recommendations ──────────────────────────────────────────────

export function generateRecommendations(
    items: WardrobeItem[],
    wearCounts: Record<string, number>,
    neglectedCount: number,
    season: Season
): string[] {
    const recs: string[] = [];
    if (items.length === 0) {
        recs.push(`Tag your items with "${season}" to unlock seasonal insights`);
        return recs;
    }

    const KEY_CATEGORIES = ['tops', 'bottoms', 'outerwear', 'shoes'];
    for (const cat of KEY_CATEGORIES) {
        if (!items.some(i => i.category === cat)) {
            recs.push(`Add ${cat} for ${season} layering and outfit variety`);
        }
    }

    if (items.length < 5) {
        recs.push(`Only ${items.length} ${season} item${items.length !== 1 ? 's' : ''} — consider expanding your ${season} wardrobe`);
    }

    if (neglectedCount > 0 && neglectedCount <= 5) {
        recs.push(`You have ${neglectedCount} unworn ${season} item${neglectedCount !== 1 ? 's' : ''} — try wearing them this season!`);
    } else if (neglectedCount > 5) {
        recs.push(`${neglectedCount} ${season} items went unworn — consider a wardrobe review`);
    }

    const wornCount = items.filter(i => (wearCounts[i.id] || 0) > 0).length;
    const wornPct = wornCount / items.length;
    if (wornPct >= 0.9) {
        recs.push(`Great job! You used ${Math.round(wornPct * 100)}% of your ${season} wardrobe`);
    }

    return recs.slice(0, 3);
}

// ─── Historical comparison ────────────────────────────────────────

function historicalCacheKey(userId: string, season: Season, year: number): string {
    return `seasonal_report_${userId}_${season}_${year}`;
}

async function saveReportToCache(userId: string, report: SeasonalReport): Promise<void> {
    await AsyncStorage.setItem(
        historicalCacheKey(userId, report.season, report.year),
        JSON.stringify(report)
    );
}

async function getReportFromCache(userId: string, season: Season, year: number): Promise<SeasonalReport | null> {
    const raw = await AsyncStorage.getItem(historicalCacheKey(userId, season, year));
    return raw ? JSON.parse(raw) : null;
}

function buildComparisonText(current: SeasonalReport, previous: SeasonalReport): string {
    if (previous.totalWears === 0) {
        return `First ${current.season} tracked — keep going!`;
    }
    const delta = current.totalWears - previous.totalWears;
    const pct = Math.round(Math.abs(delta / previous.totalWears) * 100);
    if (delta > 0) return `▲ ${pct}% more wears than last ${current.season}`;
    if (delta < 0) return `▼ ${pct}% fewer wears than last ${current.season}`;
    return `Same number of wears as last ${current.season}`;
}

// ─── Core Report Generation ───────────────────────────────────────

async function generateSeasonalReport(
    userId: string,
    season: Season,
    year: number
): Promise<SeasonalReport> {
    const { startStr, endStr } = getSeasonDateRange(season, year);

    // Items tagged for this season
    const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userId)
        .contains('seasons', [season]);

    const allItems = (items || []) as WardrobeItem[];

    // Wear logs in date range
    const { data: logs } = await supabase
        .from('wear_logs')
        .select('item_id, worn_date')
        .eq('user_id', userId)
        .gte('worn_date', startStr)
        .lte('worn_date', endStr);

    const wearCounts: Record<string, number> = {};
    for (const log of logs || []) {
        wearCounts[(log as any).item_id] = (wearCounts[(log as any).item_id] || 0) + 1;
    }

    const totalWears = Object.values(wearCounts).reduce((s, n) => s + n, 0);

    // Category breakdown
    const itemsByCategory: Record<string, number> = {};
    for (const item of allItems) {
        const cat = item.category || 'other';
        itemsByCategory[cat] = (itemsByCategory[cat] || 0) + 1;
    }

    // Most worn (top 5, worn at least once in season)
    const mostWornItems = allItems
        .map(i => ({
            itemId: i.id,
            name: i.name || i.sub_category || i.category || 'Item',
            wearCount: wearCounts[i.id] || 0,
        }))
        .filter(i => i.wearCount > 0)
        .sort((a, b) => b.wearCount - a.wearCount)
        .slice(0, 5);

    // Neglected (season-tagged, 0 wears in date range)
    const neglectedItems = allItems
        .filter(i => !wearCounts[i.id])
        .map(i => ({ itemId: i.id, name: i.name || i.sub_category || i.category || 'Item' }));

    const readinessScore = calculateReadinessScore(allItems, wearCounts);
    const recommendations = generateRecommendations(allItems, wearCounts, neglectedItems.length, season);

    return {
        season,
        year,
        totalItemsForSeason: allItems.length,
        itemsByCategory,
        mostWornItems,
        neglectedItems,
        totalWears,
        readinessScore,
        recommendations,
    };
}

// ─── Public Service ───────────────────────────────────────────────

export const seasonalReportService = {
    /**
     * Generate the full seasonal report result for the current (or selected) season.
     * Includes previous year comparison and transition alert.
     */
    getSeasonalReport: async (
        season?: Season,
        year?: number
    ): Promise<{ result: SeasonalReportResult; error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const now = new Date();
            const targetSeason = season ?? getCurrentSeason();
            const targetYear = year ?? now.getFullYear();

            // Generate current report
            const currentReport = await generateSeasonalReport(userId, targetSeason, targetYear);

            // Save to cache for future historical comparison
            await saveReportToCache(userId, currentReport);

            // Try to get previous year's report for same season
            const prevYear = targetSeason === 'winter' ? targetYear - 1 : targetYear - 1;
            let previousYearReport: SeasonalReport | undefined;
            let comparisonText: string | undefined;

            const cached = await getReportFromCache(userId, targetSeason, prevYear);
            if (cached) {
                previousYearReport = cached;
                comparisonText = buildComparisonText(currentReport, cached);
            } else {
                // Try to fetch from DB for comparison
                try {
                    const prev = await generateSeasonalReport(userId, targetSeason, prevYear);
                    if (prev.totalItemsForSeason > 0 || prev.totalWears > 0) {
                        previousYearReport = prev;
                        comparisonText = buildComparisonText(currentReport, prev);
                        await saveReportToCache(userId, prev);
                    }
                } catch {
                    // No previous data
                }
            }

            if (!previousYearReport) {
                comparisonText = `First ${targetSeason} tracked — keep going!`;
            }

            const transitionAlert = getTransitionAlert(now);

            return {
                result: {
                    currentSeason: targetSeason,
                    currentYear: targetYear,
                    currentReport,
                    previousYearReport,
                    comparisonText,
                    transitionAlert,
                },
                error: null,
            };
        } catch (error) {
            const fallbackSeason = season ?? getCurrentSeason();
            return {
                result: {
                    currentSeason: fallbackSeason,
                    currentYear: year ?? new Date().getFullYear(),
                    currentReport: emptyReport(fallbackSeason, year ?? new Date().getFullYear()),
                    comparisonText: undefined,
                    transitionAlert: undefined,
                },
                error: error as Error,
            };
        }
    },
};

function emptyReport(season: Season, year: number): SeasonalReport {
    return {
        season,
        year,
        totalItemsForSeason: 0,
        itemsByCategory: {},
        mostWornItems: [],
        neglectedItems: [],
        totalWears: 0,
        readinessScore: 0,
        recommendations: [`Tag your items with "${season}" to unlock seasonal insights`],
    };
}
