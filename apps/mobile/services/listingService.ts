/**
 * Listing Service
 * Story 7.2: AI Listing Generator
 * Generates Vinted-optimized resale listing descriptions using Gemini AI.
 */

import Constants from 'expo-constants';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WardrobeItem } from './items';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';

export type ListingTone = 'casual' | 'detailed' | 'minimal';

export interface ListingData {
    title: string;
    description: string;
    suggested_price_range: string;
    hashtags: string[];
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
};
