/**
 * Listing Service
 * Story 7.2: AI Listing Generator
 * Story 7.4: Listing History Tracking
 * Generates Vinted-optimized resale listing descriptions using Gemini AI,
 * and manages listing history for resale tracking.
 */

import Constants from 'expo-constants';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WardrobeItem } from './items';
import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';

export type ListingTone = 'casual' | 'detailed' | 'minimal';
export type ListingStatus = 'listed' | 'sold' | 'cancelled';

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

const TONE_INSTRUCTIONS: Record<ListingTone, string> = {
    casual: 'Write in a friendly, conversational tone. Use short sentences. Keep it approachable and relatable.',
    detailed: 'Write a thorough description with precise details about material, fit, and condition. Be professional but warm.',
    minimal: 'Write a very concise, no-fluff listing. Bullet-point style is fine. Just the essentials.',
};

function buildListingPrompt(item: WardrobeItem, tone: ListingTone): string {
    const features: string[] = [];
    if (item.colors?.length) features.push(`Colors: ${item.colors.join(', ')}`);
    if (item.seasons?.length) features.push(`Seasons: ${item.seasons.join(', ')}`);
    if (item.occasions?.length) features.push(`Occasions: ${item.occasions.join(', ')}`);

    return `You are an expert reseller on Vinted with thousands of successful sales. Generate a listing for this clothing item.

ITEM DETAILS:
- Name: ${item.name || 'Not specified'}
- Brand: ${item.brand || 'Not specified'}
- Category: ${item.category || 'Not specified'}${item.sub_category ? ` / ${item.sub_category}` : ''}
${features.length > 0 ? `- Features: ${features.join('; ')}` : ''}
${item.purchase_price ? `- Original price: $${item.purchase_price.toFixed(0)}` : ''}
- Times worn: ${item.wear_count || 0}

TONE: ${TONE_INSTRUCTIONS[tone]}

REQUIREMENTS:
- Title: catchy, includes brand name if known, max 50 characters
- Description: optimized for Vinted search/SEO, include relevant keywords
- Suggest a realistic price range based on the brand, category, and wear count
- Include 5-8 relevant hashtags for Vinted discovery
- If wear count is 0, mention "never worn" or "new without tags"
- If wear count is low (<5), mention "barely worn" or "like new"

Respond ONLY with valid JSON in this exact format:
{
  "title": "Listing title here",
  "description": "Full listing description here",
  "suggested_price_range": "$X - $Y",
  "hashtags": ["#tag1", "#tag2"]
}`;
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

    let description: string;
    if (tone === 'minimal') {
        const lines = [`${brand} ${category}`, condition];
        if (item.colors?.length) lines.push(`Color: ${item.colors.join(', ')}`);
        if (item.purchase_price) lines.push(`Original price: $${item.purchase_price.toFixed(0)}`);
        description = lines.join('\n');
    } else if (tone === 'detailed') {
        description = `Selling my ${brand} ${name.toLowerCase()}. ${condition}.\n\n`;
        if (item.colors?.length) description += `Color: ${item.colors.join(', ')}.\n`;
        if (item.seasons?.length) description += `Perfect for: ${item.seasons.join(', ')}.\n`;
        if (item.occasions?.length) description += `Great for: ${item.occasions.join(', ')}.\n`;
        if (item.purchase_price) description += `\nOriginally purchased for $${item.purchase_price.toFixed(0)}.`;
        description += '\n\nFeel free to ask any questions!';
    } else {
        description = `${brand} ${name.toLowerCase()} for sale! ${condition}. `;
        if (item.colors?.length) description += `${item.colors[0]} color. `;
        if (item.purchase_price) description += `Was $${item.purchase_price.toFixed(0)} new. `;
        description += 'Message me with any questions!';
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

            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

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

            const { error } = await supabase
                .from('resale_listings')
                .update(updates)
                .eq('id', listingId)
                .eq('user_id', userId);

            if (error) return { error: error.message };

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
};
