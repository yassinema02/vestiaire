/**
 * Shopping Service
 * Handles screenshot analysis, URL scraping, compatibility scoring, and scan CRUD
 * Story 8.1: Screenshot Product Analysis
 * Story 8.2: URL Product Scraping
 */

import Constants from 'expo-constants';
import { GoogleGenAI } from '@google/genai';
import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { ShoppingScan, ProductAnalysis, AiInsight, ScrapedProduct } from '../types/shopping';
import { WardrobeItem, itemsService } from './items';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';

const SCAN_BUCKET = 'shopping-scans';

const SUPPORTED_DOMAINS = [
    'zara.com',
    'hm.com',
    'asos.com',
    'mango.com',
    'uniqlo.com',
    'everlane.com',
];

const COLOR_KEYWORDS = [
    'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
    'pink', 'brown', 'grey', 'gray', 'navy', 'beige', 'cream', 'tan',
    'burgundy', 'maroon', 'olive', 'teal', 'coral', 'ivory', 'khaki',
    'lavender', 'turquoise', 'charcoal', 'indigo', 'camel', 'rust',
    'sage', 'blush', 'nude', 'taupe', 'emerald', 'cobalt', 'mustard',
];

const SCRAPE_TIMEOUT_MS = 10_000;

/**
 * Check if a URL is valid
 */
function isValidUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Check if a URL belongs to a supported fashion site
 */
function isUrlSupported(url: string): boolean {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return SUPPORTED_DOMAINS.some(
            (domain) => hostname === domain || hostname.endsWith('.' + domain)
        );
    } catch {
        return false;
    }
}

/**
 * Extract a color name from text (product name/description)
 */
function extractColorFromText(text: string): string | null {
    const lower = text.toLowerCase();
    for (const color of COLOR_KEYWORDS) {
        // Match as whole word to avoid false positives (e.g. "cream" inside "screaming")
        const regex = new RegExp(`\\b${color}\\b`, 'i');
        if (regex.test(lower)) {
            return color.charAt(0).toUpperCase() + color.slice(1);
        }
    }
    return null;
}

/**
 * Fetch HTML with a timeout
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            },
        });
        return response;
    } finally {
        clearTimeout(timer);
    }
}

export interface UploadResult {
    url: string | null;
    path: string | null;
    error: Error | null;
}

export const shoppingService = {
    /**
     * Upload a screenshot to the shopping-scans bucket
     */
    uploadScreenshot: async (
        userId: string,
        imageUri: string
    ): Promise<UploadResult> => {
        try {
            const timestamp = Date.now();
            const filename = `${userId}/${timestamp}.jpg`;

            const response = await fetch(imageUri);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();

            const { data, error } = await supabase.storage
                .from(SCAN_BUCKET)
                .upload(filename, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: false,
                });

            if (error) {
                console.error('Shopping screenshot upload error:', error);
                return { url: null, path: null, error };
            }

            // Get signed URL since bucket is private
            const { data: urlData } = await supabase.storage
                .from(SCAN_BUCKET)
                .createSignedUrl(data.path, 3600);

            return {
                url: urlData?.signedUrl ?? null,
                path: data.path,
                error: null,
            };
        } catch (error) {
            console.error('Shopping screenshot upload exception:', error);
            return { url: null, path: null, error: error as Error };
        }
    },

    /**
     * Analyze a product image using Gemini directly
     * (Edge Function approach deferred until deployed; using client-side Gemini like aiCategorization.ts)
     */
    analyzeProduct: async (
        imageUri: string
    ): Promise<{ analysis: ProductAnalysis | null; error: Error | null }> => {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_api_key_here') {
            return { analysis: null, error: new Error('Gemini API key not configured') };
        }

        try {
            // Fetch image (works for both local URIs and remote URLs)
            const isRemote = imageUri.startsWith('http');
            const imageResponse = isRemote
                ? await fetchWithTimeout(imageUri, SCRAPE_TIMEOUT_MS)
                : await fetch(imageUri);
            const imageBlob = await imageResponse.blob();

            // Detect actual mime type from response or blob
            const contentType = imageResponse.headers?.get('content-type');
            const mimeType = contentType?.split(';')[0]?.trim() || imageBlob.type || 'image/jpeg';
            // Normalize to a type Gemini accepts
            const geminiMime = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';

            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    const base64Data = result.split(',')[1];
                    resolve(base64Data);
                };
                reader.onerror = reject;
                reader.readAsDataURL(imageBlob);
            });

            const prompt = `You are a fashion product analyst. Analyze this product image and extract detailed information.

Return ONLY valid JSON in this exact format, no other text:
{
  "product_name": "Short descriptive name of the product",
  "product_brand": "Brand name if visible, or null",
  "category": "One of: tops, bottoms, dresses, outerwear, shoes, accessories",
  "color": "Primary color name (e.g. Black, Navy, Red)",
  "secondary_colors": ["Array of other colors if multi-colored, empty if solid"],
  "style": "One of: casual, formal, smart-casual, sporty, bohemian, streetwear, classic, minimalist",
  "material": "Best guess of material (e.g. cotton, denim, leather, polyester, silk, wool) or null",
  "pattern": "One of: solid, striped, plaid, floral, polka-dot, checkered, geometric, abstract, animal-print, camo, tie-dye",
  "season": ["Array of suitable seasons: spring, summer, autumn, winter"],
  "formality": 5,
  "confidence": 0.9
}

Rules:
- "formality" is 1-10 where 1=very casual, 10=black-tie formal
- "confidence" is 0.0-1.0 for how confident you are in the analysis
- Focus on the PRODUCT, not the model wearing it or background
- If the image is not a clothing/fashion item, set confidence to 0`;

            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

            const result = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [{
                    role: 'user',
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: geminiMime, data: base64 } },
                    ],
                }],
            });

            const text = result.text;
            if (!text) {
                return { analysis: null, error: new Error('No response from Gemini') };
            }

            // Parse JSON from response (handle markdown code blocks)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return { analysis: null, error: new Error('Failed to parse AI response') };
            }

            const raw = JSON.parse(jsonMatch[0]);

            // Validate and normalize the response
            const analysis: ProductAnalysis = {
                product_name: raw.product_name || 'Unknown Product',
                product_brand: raw.product_brand || null,
                category: raw.category || 'tops',
                color: raw.color || 'Black',
                secondary_colors: Array.isArray(raw.secondary_colors) ? raw.secondary_colors : [],
                style: raw.style || 'casual',
                material: raw.material || null,
                pattern: raw.pattern || 'solid',
                season: Array.isArray(raw.season) ? raw.season : [],
                formality: typeof raw.formality === 'number' ? raw.formality : 5,
                confidence: typeof raw.confidence === 'number' ? raw.confidence : 0,
            };

            return { analysis, error: null };
        } catch (error) {
            console.error('Analyze product exception:', error);
            return { analysis: null, error: error as Error };
        }
    },

    /**
     * Calculate compatibility score (0-100) between a product and the user's wardrobe
     */
    calculateCompatibility: (
        analysis: ProductAnalysis,
        wardrobeItems: WardrobeItem[]
    ): { score: number; insights: AiInsight[]; matchingItemIds: string[]; explanation: string } => {
        if (wardrobeItems.length === 0) {
            return {
                score: 50,
                insights: [{ category: 'tip', text: 'Add more items to your wardrobe for better compatibility analysis.' }],
                matchingItemIds: [],
                explanation: 'Add items to your wardrobe for personalized scoring',
            };
        }

        const insights: AiInsight[] = [];
        const matchingItemIds: string[] = [];
        let totalScore = 0;
        let factors = 0;

        // Neutral colors that match with everything
        const neutrals = new Set(['black', 'white', 'gray', 'grey', 'navy', 'beige', 'cream', 'tan']);
        let productIsNeutral = false;

        // 1. Color compatibility (skip if color is missing/empty — manual input fallback)
        const hasColor = analysis.color && analysis.color !== 'Unknown';
        if (hasColor) {
            const productColors = [analysis.color, ...analysis.secondary_colors].map((c) => c.toLowerCase());
            const wardrobeColors = new Set(
                wardrobeItems.flatMap((item) => (item.colors || []).map((c) => c.toLowerCase()))
            );

            productIsNeutral = productColors.some((c) => neutrals.has(c));
            const hasMatchingColors = productColors.some((c) => wardrobeColors.has(c));
            const hasNeutralsInWardrobe = [...wardrobeColors].some((c) => neutrals.has(c));

            if (productIsNeutral) {
                totalScore += 90;
                insights.push({ category: 'match', text: 'Neutral color - pairs with almost anything in your wardrobe.' });
            } else if (hasMatchingColors) {
                totalScore += 80;
                insights.push({ category: 'match', text: `You already have ${analysis.color} items - great for coordinated looks.` });
            } else if (hasNeutralsInWardrobe) {
                totalScore += 65;
                insights.push({ category: 'tip', text: `Your neutral items will pair well with this ${analysis.color} piece.` });
            } else {
                totalScore += 35;
                insights.push({ category: 'warning', text: `${analysis.color} is a new color for your wardrobe - fewer pairing options.` });
            }
            factors++;
        }

        // 2. Category complement (do you have items that pair with this category?)
        const complementMap: Record<string, string[]> = {
            tops: ['bottoms', 'outerwear', 'accessories'],
            bottoms: ['tops', 'outerwear', 'shoes'],
            dresses: ['outerwear', 'shoes', 'accessories'],
            outerwear: ['tops', 'bottoms', 'dresses'],
            shoes: ['bottoms', 'dresses', 'tops'],
            accessories: ['tops', 'dresses', 'outerwear'],
        };

        const complementCategories = complementMap[analysis.category] || [];
        const wardrobeCategories = new Set(wardrobeItems.map((i) => i.category));
        const matchingCategories = complementCategories.filter((c) => wardrobeCategories.has(c));

        if (matchingCategories.length >= 2) {
            totalScore += 90;
            insights.push({ category: 'match', text: `You have plenty of ${matchingCategories.join(' and ')} to pair with this.` });
        } else if (matchingCategories.length === 1) {
            totalScore += 65;
            insights.push({ category: 'tip', text: `Pairs with your ${matchingCategories[0]} collection.` });
        } else {
            totalScore += 30;
            insights.push({ category: 'gap', text: `You might need complementary items to go with this ${analysis.category} piece.` });
        }
        factors++;

        // 3. Season overlap (skip if no season data — manual input may omit this)
        if (analysis.season.length > 0) {
            const wardrobeSeasons = new Set(wardrobeItems.flatMap((i) => i.seasons || []));
            const seasonOverlap = analysis.season.filter((s) => wardrobeSeasons.has(s));

            if (seasonOverlap.length === analysis.season.length) {
                totalScore += 85;
            } else if (seasonOverlap.length > 0) {
                totalScore += 65;
                insights.push({ category: 'tip', text: `Fits your wardrobe for ${seasonOverlap.join(', ')}.` });
            } else {
                totalScore += 40;
                insights.push({ category: 'warning', text: `Most of your wardrobe is for different seasons.` });
            }
            factors++;
        }

        // 4. Style consistency (skip if style is empty/missing)
        if (analysis.style) {
            const wardrobeOccasions = new Set(
                wardrobeItems.flatMap((i) => i.occasions || [])
            );
            const styleToOccasion: Record<string, string[]> = {
                casual: ['casual', 'everyday'],
                formal: ['formal', 'business'],
                'smart-casual': ['casual', 'business', 'date-night'],
                sporty: ['casual', 'everyday'],
                bohemian: ['casual', 'festival'],
                streetwear: ['casual', 'everyday'],
                classic: ['business', 'formal', 'casual'],
                minimalist: ['casual', 'business', 'everyday'],
            };

            const relatedOccasions = styleToOccasion[analysis.style] || [];
            const styleMatch = relatedOccasions.some((o) => wardrobeOccasions.has(o));

            if (styleMatch) {
                totalScore += 80;
            } else if (wardrobeOccasions.size === 0) {
                totalScore += 60;
            } else {
                totalScore += 40;
                insights.push({ category: 'warning', text: `This ${analysis.style} style differs from your usual pieces.` });
            }
            factors++;
        }

        // Find specific matching items (items that would pair well)
        const productColorsLower = hasColor
            ? [analysis.color, ...analysis.secondary_colors].map((c) => c.toLowerCase())
            : [];
        for (const item of wardrobeItems) {
            if (!item.category) continue;
            const isComplement = complementCategories.includes(item.category);
            // If no color info, match on category alone
            const colorMatch = !hasColor || productIsNeutral ||
                neutrals.has((item.colors?.[0] || '').toLowerCase()) ||
                productColorsLower.some((c) => (item.colors || []).map((ic) => ic.toLowerCase()).includes(c));

            if (isComplement && colorMatch) {
                matchingItemIds.push(item.id);
            }
        }

        if (matchingItemIds.length > 0) {
            insights.push({
                category: 'match',
                text: `${matchingItemIds.length} item${matchingItemIds.length > 1 ? 's' : ''} in your wardrobe would pair well with this.`,
            });
        }

        // 5. Versatility insight
        if (matchingItemIds.length >= 5) {
            insights.push({
                category: 'tip',
                text: 'High versatility - this pairs with many items. Great cost-per-wear potential.',
            });
        } else if (matchingItemIds.length <= 1 && wardrobeItems.length >= 5) {
            insights.push({
                category: 'warning',
                text: 'Limited pairing options. You might not wear this often.',
            });
        }

        // 6. Overlap detection — similar item already in wardrobe
        if (hasColor) {
            const similarItems = wardrobeItems.filter(
                (item) =>
                    item.category === analysis.category &&
                    (item.colors || []).some((c) => c.toLowerCase() === analysis.color.toLowerCase())
            );
            if (similarItems.length > 0) {
                const name = similarItems[0].name || `${similarItems[0].colors?.[0] || ''} ${similarItems[0].category}`.trim();
                insights.push({
                    category: 'warning',
                    text: `This overlaps with your ${name}. Do you need both?`,
                });
            }
        }

        // 7. Specific gap detail — which complementary categories are missing
        const missingCategories = complementCategories.filter((c) => !wardrobeCategories.has(c));
        if (missingCategories.length > 0 && matchingCategories.length === 0) {
            insights.push({
                category: 'gap',
                text: `You don't have ${missingCategories[0]} to match this. Consider adding some to complete outfits.`,
            });
        }

        // Sort by priority: match → gap → tip → warning
        const priorityOrder: Record<string, number> = { match: 0, gap: 1, tip: 2, warning: 3 };
        insights.sort((a, b) => (priorityOrder[a.category] ?? 4) - (priorityOrder[b.category] ?? 4));

        // Format: capitalize first letter, ensure trailing period
        for (const insight of insights) {
            insight.text = insight.text.charAt(0).toUpperCase() + insight.text.slice(1);
            if (!/[.!?]$/.test(insight.text)) {
                insight.text += '.';
            }
        }

        const finalScore = factors > 0 ? Math.round(totalScore / factors) : 50;
        const explanation = shoppingService.generateScoreExplanation(analysis, wardrobeItems, finalScore);

        return {
            score: Math.max(0, Math.min(100, finalScore)),
            insights: insights.slice(0, 5), // Cap at 5 insights
            matchingItemIds: matchingItemIds.slice(0, 10),
            explanation,
        };
    },

    /**
     * Generate a short personalized explanation for the compatibility score
     */
    generateScoreExplanation: (
        analysis: ProductAnalysis,
        wardrobeItems: WardrobeItem[],
        score: number
    ): string => {
        if (wardrobeItems.length === 0) {
            return 'Add items to your wardrobe for personalized scoring';
        }

        // Classify wardrobe color palette
        const warmColors = new Set(['red', 'orange', 'yellow', 'coral', 'rust', 'burgundy', 'maroon', 'mustard', 'camel', 'tan', 'brown']);
        const coolColors = new Set(['blue', 'navy', 'teal', 'purple', 'lavender', 'indigo', 'cobalt', 'turquoise', 'emerald']);
        const neutralColors = new Set(['black', 'white', 'gray', 'grey', 'beige', 'cream', 'ivory', 'taupe', 'charcoal', 'nude']);

        let warm = 0, cool = 0, neutral = 0;
        for (const item of wardrobeItems) {
            for (const c of (item.colors || [])) {
                const lower = c.toLowerCase();
                if (warmColors.has(lower)) warm++;
                else if (coolColors.has(lower)) cool++;
                else if (neutralColors.has(lower)) neutral++;
            }
        }

        const total = warm + cool + neutral;
        let colorTone = 'varied';
        if (total > 0) {
            if (neutral / total > 0.5) colorTone = 'neutral';
            else if (warm / total > 0.5) colorTone = 'warm-toned';
            else if (cool / total > 0.5) colorTone = 'cool-toned';
        }

        // Classify dominant style
        const occasions = wardrobeItems.flatMap((i) => i.occasions || []);
        const casualCount = occasions.filter((o) => ['casual', 'everyday'].includes(o)).length;
        const formalCount = occasions.filter((o) => ['formal', 'business'].includes(o)).length;
        let styleTone = 'mixed-style';
        if (casualCount > formalCount * 2) styleTone = 'casual';
        else if (formalCount > casualCount * 2) styleTone = 'formal';

        return `Based on your ${colorTone}, ${styleTone} wardrobe`;
    },

    /**
     * Determine why a wardrobe item matches the scanned product
     */
    getMatchReason: (analysis: ProductAnalysis, item: WardrobeItem): string => {
        const neutrals = new Set(['black', 'white', 'gray', 'grey', 'navy', 'beige', 'cream', 'tan']);
        const productColor = (analysis.color || '').toLowerCase();
        const itemColors = (item.colors || []).map((c) => c.toLowerCase());

        const productIsNeutral = neutrals.has(productColor);
        const itemIsNeutral = itemColors.some((c) => neutrals.has(c));

        // Neutral + neutral or neutral + anything
        if (productIsNeutral || itemIsNeutral) {
            return 'Classic pairing';
        }

        // Color match
        const allProductColors = [productColor, ...(analysis.secondary_colors || []).map((c) => c.toLowerCase())];
        if (allProductColors.some((c) => itemColors.includes(c))) {
            return 'Color harmony';
        }

        // Style / occasion overlap
        const styleToOccasion: Record<string, string[]> = {
            casual: ['casual', 'everyday'],
            formal: ['formal', 'business'],
            'smart-casual': ['casual', 'business', 'date-night'],
            sporty: ['casual', 'everyday'],
            bohemian: ['casual', 'festival'],
            streetwear: ['casual', 'everyday'],
            classic: ['business', 'formal', 'casual'],
            minimalist: ['casual', 'business', 'everyday'],
        };
        const relatedOccasions = styleToOccasion[analysis.style] || [];
        if ((item.occasions || []).some((o) => relatedOccasions.includes(o))) {
            return 'Style match';
        }

        return 'Complete the look';
    },

    /**
     * Save a scan to the database
     */
    saveScan: async (
        scan: Partial<ShoppingScan>
    ): Promise<{ scan: ShoppingScan | null; error: Error | null }> => {
        try {
            const userId = await requireUserId();

            const { data, error } = await supabase
                .from('shopping_scans')
                .insert({
                    user_id: userId,
                    product_name: scan.product_name,
                    product_brand: scan.product_brand,
                    product_url: scan.product_url,
                    product_image_url: scan.product_image_url,
                    category: scan.category,
                    color: scan.color,
                    secondary_colors: scan.secondary_colors || [],
                    style: scan.style,
                    material: scan.material,
                    pattern: scan.pattern,
                    season: scan.season || [],
                    formality: scan.formality,
                    price_amount: scan.price_amount,
                    price_currency: scan.price_currency || 'GBP',
                    compatibility_score: scan.compatibility_score,
                    matching_item_ids: scan.matching_item_ids || [],
                    ai_insights: scan.ai_insights,
                    scan_method: scan.scan_method || 'screenshot',
                    user_rating: scan.user_rating,
                })
                .select()
                .single();

            if (error) {
                console.error('Save scan error:', error);
                return { scan: null, error };
            }

            return { scan: data as ShoppingScan, error: null };
        } catch (error) {
            console.error('Save scan exception:', error);
            return { scan: null, error: error as Error };
        }
    },

    /**
     * Get scan history for the current user
     */
    getScanHistory: async (
        limit: number = 20
    ): Promise<{ scans: ShoppingScan[]; error: Error | null }> => {
        try {
            const userId = await requireUserId();

            const { data, error } = await supabase
                .from('shopping_scans')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Get scan history error:', error);
                return { scans: [], error };
            }

            return { scans: data as ShoppingScan[], error: null };
        } catch (error) {
            console.error('Get scan history exception:', error);
            return { scans: [], error: error as Error };
        }
    },

    /**
     * Validate a product URL and return a user-friendly error if invalid
     */
    validateUrl: (url: string): { valid: boolean; error: string | null } => {
        const trimmed = url.trim();
        if (!trimmed) {
            return { valid: false, error: 'Please enter a product URL' };
        }
        if (!isValidUrl(trimmed)) {
            return { valid: false, error: 'Please enter a valid product URL' };
        }
        if (!isUrlSupported(trimmed)) {
            return { valid: false, error: "We don't support this site yet. Try screenshot instead." };
        }
        return { valid: true, error: null };
    },

    /**
     * Scrape product data from a URL using Open Graph tags and schema.org JSON-LD
     * Story 8.2: URL Product Scraping
     */
    scrapeProductUrl: async (
        url: string
    ): Promise<{ product: ScrapedProduct | null; error: Error | null }> => {
        try {
            const response = await fetchWithTimeout(url, SCRAPE_TIMEOUT_MS);

            if (!response.ok) {
                return {
                    product: null,
                    error: new Error(`Could not load page (${response.status})`),
                };
            }

            const html = await response.text();

            // Parse Open Graph meta tags
            const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
                || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
            const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
                || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];

            // Parse product-specific OG tags
            const ogBrand = html.match(/<meta[^>]+property=["']product:brand["'][^>]+content=["']([^"']+)["']/i)?.[1]
                || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']product:brand["']/i)?.[1];
            const ogPrice = html.match(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i)?.[1]
                || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']product:price:amount["']/i)?.[1];
            const ogCurrency = html.match(/<meta[^>]+property=["']product:price:currency["'][^>]+content=["']([^"']+)["']/i)?.[1]
                || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']product:price:currency["']/i)?.[1];

            // Parse schema.org JSON-LD for product data
            let jsonLd: any = null;
            const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
            if (jsonLdMatches) {
                for (const match of jsonLdMatches) {
                    try {
                        const content = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
                        const parsed = JSON.parse(content);
                        // Handle both direct Product and @graph arrays
                        if (parsed['@type'] === 'Product') {
                            jsonLd = parsed;
                            break;
                        }
                        if (Array.isArray(parsed['@graph'])) {
                            const product = parsed['@graph'].find((item: any) => item['@type'] === 'Product');
                            if (product) {
                                jsonLd = product;
                                break;
                            }
                        }
                    } catch {
                        // Skip invalid JSON-LD blocks
                    }
                }
            }

            // Extract brand from JSON-LD (can be string or object)
            const jsonLdBrand = typeof jsonLd?.brand === 'string'
                ? jsonLd.brand
                : jsonLd?.brand?.name || null;

            // Extract price from JSON-LD offers
            const offers = Array.isArray(jsonLd?.offers) ? jsonLd.offers[0] : jsonLd?.offers;
            const jsonLdPrice = offers?.price ? parseFloat(offers.price) : null;
            const jsonLdCurrency = offers?.priceCurrency || null;

            // Build the image URL — prefer OG, fall back to JSON-LD
            let imageUrl = ogImage || null;
            if (!imageUrl && jsonLd?.image) {
                imageUrl = Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image;
            }

            // Resolve relative image URLs to absolute
            if (imageUrl && !imageUrl.startsWith('http')) {
                try {
                    const base = new URL(url);
                    imageUrl = new URL(imageUrl, base.origin).href;
                } catch {
                    // Leave as-is if URL resolution fails
                }
            }

            // Build the product name
            const name = ogTitle || jsonLd?.name || null;

            // Extract color from product name/description
            const descriptionText = [name, jsonLd?.description, jsonLd?.color].filter(Boolean).join(' ');
            const color = extractColorFromText(descriptionText);

            const product: ScrapedProduct = {
                url,
                image_url: imageUrl,
                name,
                brand: ogBrand || jsonLdBrand || null,
                price_amount: ogPrice ? parseFloat(ogPrice) : jsonLdPrice,
                price_currency: ogCurrency || jsonLdCurrency || null,
                color,
            };

            return { product, error: null };
        } catch (error: any) {
            if (error?.name === 'AbortError') {
                return {
                    product: null,
                    error: new Error('This is taking too long. Try screenshot instead.'),
                };
            }
            return { product: null, error: error as Error };
        }
    },

    /**
     * Delete a scan
     */
    deleteScan: async (scanId: string): Promise<{ error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const { error } = await supabase
                .from('shopping_scans')
                .delete()
                .eq('id', scanId)
                .eq('user_id', userId);
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    },

    /**
     * Toggle wishlist status for a scan
     * Story 8.7: Shopping Wishlist
     */
    toggleWishlist: async (
        scanId: string,
        isWishlisted: boolean
    ): Promise<{ error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const { error } = await supabase
                .from('shopping_scans')
                .update({ is_wishlisted: isWishlisted })
                .eq('id', scanId)
                .eq('user_id', userId);
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    },

    /**
     * Get all wishlisted scans for the current user
     * Story 8.7: Shopping Wishlist
     */
    getWishlistScans: async (): Promise<{ scans: ShoppingScan[]; error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const { data, error } = await supabase
                .from('shopping_scans')
                .select('*')
                .eq('user_id', userId)
                .eq('is_wishlisted', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Get wishlist scans error:', error);
                return { scans: [], error };
            }

            return { scans: data as ShoppingScan[], error: null };
        } catch (error) {
            console.error('Get wishlist scans exception:', error);
            return { scans: [], error: error as Error };
        }
    },

    /**
     * Re-analyze a saved scan with current wardrobe items
     * Story 8.7: Shopping Wishlist
     */
    reAnalyzeScan: async (
        scanId: string
    ): Promise<{ scan: ShoppingScan | null; error: Error | null }> => {
        try {
            const userId = await requireUserId();

            // Fetch the existing scan
            const { data: scanData, error: fetchError } = await supabase
                .from('shopping_scans')
                .select('*')
                .eq('id', scanId)
                .eq('user_id', userId)
                .single();

            if (fetchError || !scanData) {
                return { scan: null, error: fetchError || new Error('Scan not found') };
            }

            const scan = scanData as ShoppingScan;

            // Rebuild the ProductAnalysis from stored scan data
            const analysis: ProductAnalysis = {
                product_name: scan.product_name || 'Unknown Product',
                product_brand: scan.product_brand,
                category: scan.category || 'tops',
                color: scan.color || 'Unknown',
                secondary_colors: scan.secondary_colors || [],
                style: scan.style || 'casual',
                material: scan.material,
                pattern: scan.pattern || 'solid',
                season: scan.season || [],
                formality: scan.formality ?? 5,
                confidence: 1, // Re-analysis uses confirmed data
            };

            // Fetch current wardrobe
            const { items: wardrobeItems } = await itemsService.getItems();

            // Re-calculate compatibility
            const { score, insights, matchingItemIds } = shoppingService.calculateCompatibility(
                analysis,
                wardrobeItems
            );

            // Update the scan record
            const { data: updated, error: updateError } = await supabase
                .from('shopping_scans')
                .update({
                    compatibility_score: score,
                    ai_insights: insights,
                    matching_item_ids: matchingItemIds,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', scanId)
                .eq('user_id', userId)
                .select()
                .single();

            if (updateError) {
                return { scan: null, error: updateError };
            }

            return { scan: updated as ShoppingScan, error: null };
        } catch (error) {
            console.error('Re-analyze scan exception:', error);
            return { scan: null, error: error as Error };
        }
    },

    /**
     * Rate a scan (1-5 stars)
     * Story 8.8: Scan History & Analytics
     */
    rateScan: async (
        scanId: string,
        rating: number
    ): Promise<{ error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const { error } = await supabase
                .from('shopping_scans')
                .update({ user_rating: rating })
                .eq('id', scanId)
                .eq('user_id', userId);
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    },
};
