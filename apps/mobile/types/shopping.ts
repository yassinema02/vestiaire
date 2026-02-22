/**
 * Shopping Feature Types
 * Story 8.1: Screenshot Product Analysis
 * Story 8.2: URL Product Scraping
 * Story 8.3: AI Product Extraction with Manual Fallback
 */

export type ScanMethod = 'screenshot' | 'url';

export interface ShoppingScan {
    id: string;
    user_id: string;
    product_name: string | null;
    product_brand: string | null;
    product_url: string | null;
    product_image_url: string | null;
    category: string | null;
    color: string | null;
    secondary_colors: string[];
    style: string | null;
    material: string | null;
    pattern: string | null;
    season: string[];
    formality: number | null;
    price_amount: number | null;
    price_currency: string;
    compatibility_score: number | null;
    matching_item_ids: string[];
    ai_insights: AiInsight[] | null;
    scan_method: ScanMethod;
    user_rating: number | null;
    is_wishlisted: boolean;
    created_at: string;
    updated_at: string;
}

export interface AiInsight {
    category: 'match' | 'gap' | 'tip' | 'warning';
    text: string;
}

/**
 * Raw product analysis from the Edge Function (before compatibility scoring)
 */
export interface ProductAnalysis {
    product_name: string;
    product_brand: string | null;
    category: string;
    color: string;
    secondary_colors: string[];
    style: string;
    material: string | null;
    pattern: string;
    season: string[];
    formality: number;
    confidence: number;
    user_edited?: boolean;
}

/** Valid options for product fields (used in confirmation screen) */
export const CATEGORY_OPTIONS = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'] as const;
export const STYLE_OPTIONS = ['casual', 'formal', 'smart-casual', 'sporty', 'bohemian', 'streetwear', 'classic', 'minimalist'] as const;
export const PATTERN_OPTIONS = ['solid', 'striped', 'plaid', 'floral', 'polka-dot', 'checkered', 'geometric', 'abstract', 'animal-print', 'camo', 'tie-dye'] as const;
export const SEASON_OPTIONS = ['spring', 'summer', 'autumn', 'winter'] as const;

/**
 * Scraped product data from URL (Story 8.2)
 */
export interface ScrapedProduct {
    url: string;
    image_url: string | null;
    name: string | null;
    brand: string | null;
    price_amount: number | null;
    price_currency: string | null;
    color: string | null;
}

export interface CompatibilityRating {
    label: string;
    emoji: string;
    color: string;
    bgColor: string;
    minScore: number;
    maxScore: number;
}

const RATINGS: CompatibilityRating[] = [
    { label: 'Perfect Match', emoji: '\uD83C\uDFAF', color: '#10b981', bgColor: '#ecfdf5', minScore: 90, maxScore: 100 },
    { label: 'Great Choice', emoji: '\u2728', color: '#22c55e', bgColor: '#f0fdf4', minScore: 75, maxScore: 89 },
    { label: 'Good Fit', emoji: '\uD83D\uDC4D', color: '#eab308', bgColor: '#fefce8', minScore: 60, maxScore: 74 },
    { label: 'Might Work', emoji: '\u26A0\uFE0F', color: '#f97316', bgColor: '#fff7ed', minScore: 40, maxScore: 59 },
    { label: 'Careful', emoji: '\u2757', color: '#ef4444', bgColor: '#fef2f2', minScore: 0, maxScore: 39 },
];

export function getCompatibilityRating(score: number): CompatibilityRating {
    const clamped = Math.max(0, Math.min(100, Math.round(score)));
    return RATINGS.find((r) => clamped >= r.minScore && clamped <= r.maxScore) ?? RATINGS[RATINGS.length - 1];
}

/**
 * Get a color for the score value (for progress bars, etc.)
 */
export function getScoreColor(score: number): string {
    if (score >= 75) return '#10b981';
    if (score >= 40) return '#eab308';
    return '#ef4444';
}

/**
 * Scan history filters (Story 8.8)
 */
export interface ScanHistoryFilters {
    dateRange: 'today' | 'week' | 'month' | 'all';
    minScore: number | null;
    type: 'all' | 'scanned' | 'wishlisted';
}

/**
 * Scan statistics computed from history (Story 8.8)
 */
export interface ScanStatistics {
    totalScans: number;
    avgScore: number;
    wishlistedCount: number;
    topCategory: string | null;
}
