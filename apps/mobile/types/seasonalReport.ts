/**
 * Seasonal Report Types
 * Story 11.4: Seasonal Wardrobe Reports
 */

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface SeasonalReport {
    season: Season;
    year: number;
    // Item counts
    totalItemsForSeason: number;
    itemsByCategory: Record<string, number>;
    // Wear data
    mostWornItems: { itemId: string; name: string; wearCount: number }[];
    neglectedItems: { itemId: string; name: string }[];
    totalWears: number;
    // Scores
    readinessScore: number;  // 0-10
    // Recommendations
    recommendations: string[];
    // Comparison
    comparisonText?: string; // "12% more items worn than last year"
}

export interface SeasonalReportResult {
    currentSeason: Season;
    currentYear: number;
    currentReport: SeasonalReport;
    previousYearReport?: SeasonalReport;
    comparisonText?: string;
    transitionAlert?: string;
}
