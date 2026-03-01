/**
 * Listing Service
 * Story 7.2: AI Listing Generator
 * Story 7.4: Listing History Tracking
 * Generates Vinted-optimized resale listing descriptions using Gemini AI,
 * and manages listing history for resale tracking.
 */

import Constants from 'expo-constants';
import { WardrobeItem } from './items';
import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { buildListingPrompt as buildListingPromptTemplate, LISTING_TONE_INSTRUCTIONS } from '../constants/prompts';
import { trackedGenerateContent } from './aiUsageLogger';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';

export type ListingTone = 'casual' | 'detailed' | 'minimal';
export type ListingStatus = 'listed' | 'sold' | 'cancelled';

export interface EarningsMonth {
    month: string;
    year: number;
    earnings: number;
    count: number;
}

export interface ListingData {
    title: string;
    description: string;
    suggested_price_range: string;
    hashtags: string[];
}

export interface ResaleListing {
    id: string;
    user_id: string;
    item_id: string;
    title: string;
    description: string;
    category: string | null;
    condition: string | null;
    status: ListingStatus;
    sold_price: number | null;
    created_at: string;
    updated_at: string;
    sold_at: string | null;
    // Joined item data
    item?: WardrobeItem;
}

const isConfigured = (): boolean => {
    return !!GEMINI_API_KEY && GEMINI_API_KEY !== 'your_api_key_here';
};

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
}

function buildListingPrompt(item: WardrobeItem, tone: ListingTone): string {
    const features: string[] = [];
    if (item.colors?.length) features.push(`Colors: ${item.colors.join(', ')}`);
    if (item.seasons?.length) features.push(`Seasons: ${item.seasons.join(', ')}`);
    if (item.occasions?.length) features.push(`Occasions: ${item.occasions.join(', ')}`);

    // Calculate CPW if possible
    const cpw = item.purchase_price && item.wear_count > 0
        ? item.purchase_price / item.wear_count
        : undefined;

    return buildListingPromptTemplate({
        name: item.name || 'Not specified',
        brand: item.brand || 'Not specified',
        category: item.category || 'Not specified',
        subCategory: item.sub_category || undefined,
        features,
        purchasePrice: item.purchase_price || undefined,
        wearCount: item.wear_count || 0,
        toneInstruction: LISTING_TONE_INSTRUCTIONS[tone] || LISTING_TONE_INSTRUCTIONS.casual,
        lastWornAt: item.last_worn_at ? formatRelativeTime(item.last_worn_at) : undefined,
        purchaseDate: item.purchase_date ? formatRelativeTime(item.purchase_date) : undefined,
        cpw,
    });
}

function generateFallbackListing(item: WardrobeItem, tone: ListingTone): ListingData {
    const brand = item.brand || 'Unknown Brand';
    const category = item.sub_category || item.category || 'Item';
    const name = item.name || category;
    const condition = item.wear_count === 0
        ? 'New without tags'
        : item.wear_count < 5
            ? 'Like new'
            : 'Good condition';

    const title = `${brand} ${name}`.slice(0, 50);

    const sustainabilityNote = item.wear_count === 0
        ? 'Brand new — give it a loving home!'
        : 'Give this piece a second life.';

    let description: string;
    if (tone === 'minimal') {
        const lines = [`${brand} ${category}`, condition];
        if (item.colors?.length) lines.push(`Color: ${item.colors.join(', ')}`);
        if (item.purchase_price) lines.push(`Original price: £${item.purchase_price.toFixed(0)}`);
        lines.push(sustainabilityNote);
        description = lines.join('\n');
    } else if (tone === 'detailed') {
        description = `Selling my ${brand} ${name.toLowerCase()}. ${condition}.\n\n`;
        if (item.colors?.length) description += `Color: ${item.colors.join(', ')}.\n`;
        if (item.seasons?.length) description += `Perfect for: ${item.seasons.join(', ')}.\n`;
        if (item.occasions?.length) description += `Great for: ${item.occasions.join(', ')}.\n`;
        if (item.purchase_price) description += `\nOriginally purchased for £${item.purchase_price.toFixed(0)}.`;
        description += `\n\n${sustainabilityNote}\n\nFeel free to ask any questions!`;
    } else {
        description = `${brand} ${name.toLowerCase()} for sale! ${condition}. `;
        if (item.colors?.length) description += `${item.colors[0]} color. `;
        if (item.purchase_price) description += `Was £${item.purchase_price.toFixed(0)} new. `;
        description += `${sustainabilityNote} Message me with any questions!`;
    }

    const hashtags = ['#vinted', `#${brand.toLowerCase().replace(/\s+/g, '')}`, `#${(category).toLowerCase().replace(/\s+/g, '')}`];
    if (item.colors?.[0]) hashtags.push(`#${item.colors[0].toLowerCase()}`);
    hashtags.push('#preloved', '#secondhand');

    const priceRange = item.purchase_price
        ? `$${Math.round(item.purchase_price * 0.3)} - $${Math.round(item.purchase_price * 0.6)}`
        : '$10 - $30';

    return { title, description, suggested_price_range: priceRange, hashtags };
}

function getConditionLabel(item: WardrobeItem): string {
    if (item.wear_count === 0) return 'New without tags';
    if (item.wear_count < 5) return 'Like new';
    return 'Good condition';
}

export const listingService = {
    isConfigured,

    generateListing: async (
        item: WardrobeItem,
        tone: ListingTone
    ): Promise<{ listing: ListingData | null; error: string | null; fromAI: boolean }> => {
        if (!isConfigured()) {
            const fallback = generateFallbackListing(item, tone);
            return { listing: fallback, error: null, fromAI: false };
        }

        try {
            const prompt = buildListingPrompt(item, tone);

            const result = await trackedGenerateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            }, 'listing_gen');

            const text = result.text;
            if (!text) {
                throw new Error('No text response from Gemini');
            }

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to parse AI response');
            }

            const parsed = JSON.parse(jsonMatch[0]) as ListingData;

            // Validate required fields
            if (!parsed.title || !parsed.description) {
                throw new Error('AI response missing required fields');
            }

            return {
                listing: {
                    title: parsed.title.slice(0, 50),
                    description: parsed.description,
                    suggested_price_range: parsed.suggested_price_range || '',
                    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
                },
                error: null,
                fromAI: true,
            };
        } catch (err) {
            console.error('AI listing generation failed, using fallback:', err);
            const fallback = generateFallbackListing(item, tone);
            return { listing: fallback, error: null, fromAI: false };
        }
    },

    // ─── History Methods (Story 7.4) ──────────────────────────────

    /**
     * Save a listing to history when generated.
     */
    saveToHistory: async (
        item: WardrobeItem,
        listing: ListingData
    ): Promise<{ listing: ResaleListing | null; error: string | null }> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return { listing: null, error: 'Not authenticated' };

            const { data, error } = await supabase
                .from('resale_listings')
                .insert({
                    user_id: userData.user.id,
                    item_id: item.id,
                    title: listing.title,
                    description: listing.description,
                    category: item.category || null,
                    condition: getConditionLabel(item),
                })
                .select()
                .single();

            if (error) return { listing: null, error: error.message };

            // Mark item as listed for resale (Story 13.3)
            await supabase
                .from('items')
                .update({ resale_status: 'listed' })
                .eq('id', item.id);

            // Award points for listing creation (Story 13.3)
            try {
                const { gamificationService } = await import('./gamificationService');
                await gamificationService.addPoints(10, 'list_for_resale');
            } catch { /* non-fatal */ }

            return { listing: data as ResaleListing, error: null };
        } catch (err) {
            console.error('Save listing to history error:', err);
            return { listing: null, error: 'Failed to save listing' };
        }
    },

    /**
     * Get listing history for current user.
     */
    getHistory: async (
        statusFilter?: ListingStatus
    ): Promise<{ listings: ResaleListing[]; error: string | null }> => {
        try {
            const userId = await requireUserId();
            let query = supabase
                .from('resale_listings')
                .select('*, item:items(*)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (statusFilter) {
                query = query.eq('status', statusFilter);
            }

            const { data, error } = await query;

            if (error) return { listings: [], error: error.message };
            return { listings: (data || []) as ResaleListing[], error: null };
        } catch (err) {
            console.error('Get listing history error:', err);
            return { listings: [], error: 'Failed to load listings' };
        }
    },

    /**
     * Update listing status (listed -> sold / cancelled).
     */
    updateStatus: async (
        listingId: string,
        status: ListingStatus,
        soldPrice?: number
    ): Promise<{ error: string | null }> => {
        try {
            const userId = await requireUserId();
            const updates: Record<string, unknown> = { status };
            if (status === 'sold') {
                updates.sold_at = new Date().toISOString();
                if (soldPrice !== undefined) updates.sold_price = soldPrice;
            }

            // Fetch item_id before updating (needed for resale_status sync)
            const { data: listingRow } = await supabase
                .from('resale_listings')
                .select('item_id')
                .eq('id', listingId)
                .eq('user_id', userId)
                .single();

            const { error } = await supabase
                .from('resale_listings')
                .update(updates)
                .eq('id', listingId)
                .eq('user_id', userId);

            if (error) return { error: error.message };

            // Sync items.resale_status (Story 13.5)
            if (listingRow?.item_id) {
                const newResaleStatus = status === 'sold' ? 'sold' : status === 'cancelled' ? null : 'listed';
                await supabase
                    .from('items')
                    .update({ resale_status: newResaleStatus })
                    .eq('id', listingRow.item_id);
            }

            // If sold, update user stats
            if (status === 'sold') {
                const { data: userData } = await supabase.auth.getUser();
                if (userData.user) {
                    // Increment sold count and add revenue
                    const { data: stats } = await supabase
                        .from('user_stats')
                        .select('total_items_sold, total_revenue')
                        .eq('user_id', userData.user.id)
                        .single();

                    if (stats) {
                        await supabase
                            .from('user_stats')
                            .update({
                                total_items_sold: (stats.total_items_sold || 0) + 1,
                                total_revenue: (stats.total_revenue || 0) + (soldPrice || 0),
                            })
                            .eq('user_id', userData.user.id);
                    }
                }
            }

            return { error: null };
        } catch (err) {
            console.error('Update listing status error:', err);
            return { error: 'Failed to update listing' };
        }
    },

    /**
     * Get resale stats for current user.
     */
    getResaleStats: async (): Promise<{
        totalListed: number;
        totalSold: number;
        totalRevenue: number;
        error: string | null;
    }> => {
        try {
            const userId = await requireUserId();
            const { data, error } = await supabase
                .from('resale_listings')
                .select('status, sold_price')
                .eq('user_id', userId);

            if (error) return { totalListed: 0, totalSold: 0, totalRevenue: 0, error: error.message };

            const listings = data || [];
            const totalListed = listings.filter(l => l.status === 'listed').length;
            const sold = listings.filter(l => l.status === 'sold');
            const totalSold = sold.length;
            const totalRevenue = sold.reduce((sum, l) => sum + (l.sold_price || 0), 0);

            return { totalListed, totalSold, totalRevenue, error: null };
        } catch (err) {
            console.error('Get resale stats error:', err);
            return { totalListed: 0, totalSold: 0, totalRevenue: 0, error: 'Failed to load stats' };
        }
    },

    /**
     * Get monthly earnings timeline for the last 6 months (Story 13.5).
     */
    getEarningsTimeline: async (): Promise<{ timeline: EarningsMonth[]; error: string | null }> => {
        try {
            const { listings, error } = await listingService.getHistory('sold');
            if (error) return { timeline: [], error };

            const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const now = new Date();

            // Build last 6 months (including current)
            const months: EarningsMonth[] = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push({
                    month: MONTH_NAMES[d.getMonth()],
                    year: d.getFullYear(),
                    earnings: 0,
                    count: 0,
                });
            }

            // Group sold listings by month
            for (const listing of listings) {
                if (!listing.sold_at) continue;
                const soldDate = new Date(listing.sold_at);
                const entry = months.find(
                    m => m.month === MONTH_NAMES[soldDate.getMonth()] && m.year === soldDate.getFullYear()
                );
                if (entry) {
                    entry.earnings += listing.sold_price || 0;
                    entry.count += 1;
                }
            }

            return { timeline: months, error: null };
        } catch (err) {
            console.error('Get earnings timeline error:', err);
            return { timeline: [], error: 'Failed to load timeline' };
        }
    },
};
