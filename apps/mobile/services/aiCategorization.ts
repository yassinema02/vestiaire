/**
 * AI Categorization Service
 * Uses Google Gemini Vision to analyze clothing and extract metadata
 */

import Constants from 'expo-constants';
import { CLOTHING_ANALYSIS_PROMPT } from '../constants/prompts';
import { trackedGenerateContent } from './aiUsageLogger';
import { optimizeForAI } from './imageOptimizer';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';

// Category taxonomy
export const CATEGORIES = {
    tops: ['t-shirt', 'shirt', 'blouse', 'sweater', 'hoodie', 'tank-top', 'polo', 'crop-top'],
    bottoms: ['jeans', 'pants', 'shorts', 'skirt', 'leggings', 'sweatpants', 'chinos'],
    dresses: ['casual-dress', 'formal-dress', 'maxi-dress', 'mini-dress', 'midi-dress'],
    outerwear: ['jacket', 'coat', 'blazer', 'cardigan', 'vest', 'parka', 'bomber'],
    shoes: ['sneakers', 'boots', 'heels', 'sandals', 'loafers', 'flats', 'oxford'],
    accessories: ['bag', 'hat', 'scarf', 'belt', 'jewelry', 'watch', 'sunglasses'],
} as const;

export type Category = keyof typeof CATEGORIES;
export type SubCategory = typeof CATEGORIES[Category][number];

// Color palette
export const COLORS = [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Gray', hex: '#808080' },
    { name: 'Navy', hex: '#000080' },
    { name: 'Blue', hex: '#0000FF' },
    { name: 'Light Blue', hex: '#ADD8E6' },
    { name: 'Red', hex: '#FF0000' },
    { name: 'Burgundy', hex: '#800020' },
    { name: 'Pink', hex: '#FFC0CB' },
    { name: 'Orange', hex: '#FFA500' },
    { name: 'Yellow', hex: '#FFFF00' },
    { name: 'Green', hex: '#008000' },
    { name: 'Olive', hex: '#808000' },
    { name: 'Brown', hex: '#A52A2A' },
    { name: 'Tan', hex: '#D2B48C' },
    { name: 'Cream', hex: '#FFFDD0' },
    { name: 'Purple', hex: '#800080' },
    { name: 'Lavender', hex: '#E6E6FA' },
    { name: 'Teal', hex: '#008080' },
    { name: 'Coral', hex: '#FF7F50' },
    { name: 'Beige', hex: '#F5F5DC' },
] as const;

export type ColorName = typeof COLORS[number]['name'];

// Pattern types
export const PATTERNS = [
    'solid',
    'striped',
    'plaid',
    'floral',
    'polka-dot',
    'checkered',
    'geometric',
    'abstract',
    'animal-print',
    'camo',
    'tie-dye',
] as const;

export type Pattern = typeof PATTERNS[number];

// AI Analysis result
export interface ClothingAnalysis {
    category: Category;
    subCategory: string;
    colors: string[];
    pattern: Pattern;
    confidence: number;
}

/**
 * Check if AI categorization is configured
 */
export const isCategorizationConfigured = (): boolean => {
    return !!GEMINI_API_KEY && GEMINI_API_KEY !== 'your_api_key_here';
};

/**
 * Analyze a clothing image using Gemini Vision
 */
export const analyzeClothing = async (
    imageUrl: string
): Promise<{ analysis: ClothingAnalysis | null; error: Error | null }> => {
    if (!isCategorizationConfigured()) {
        console.warn('AI categorization not configured - missing Gemini API key');
        return {
            analysis: null,
            error: new Error('AI categorization not configured'),
        };
    }

    try {
        console.log('Analyzing clothing image:', imageUrl);

        const prompt = CLOTHING_ANALYSIS_PROMPT;

        // Optimize image for AI (512px, 85% JPEG)
        const optimizedUri = await optimizeForAI(imageUrl);

        // Fetch image and convert to base64
        const imageResponse = await fetch(optimizedUri);
        const imageBlob = await imageResponse.blob();

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

        const result = await trackedGenerateContent({
            model: 'gemini-2.0-flash',
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/jpeg', data: base64 } },
                ],
            }],
        }, 'categorization');

        const text = result.text;
        if (!text) {
            throw new Error('No text response from Gemini');
        }

        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }

        const analysis = JSON.parse(jsonMatch[0]) as ClothingAnalysis;

        // Validate category
        if (!Object.keys(CATEGORIES).includes(analysis.category)) {
            analysis.category = 'tops'; // Default fallback
        }

        // Validate colors
        const validColorNames = COLORS.map((c) => c.name);
        analysis.colors = analysis.colors.filter((c) => (validColorNames as readonly string[]).includes(c));
        if (analysis.colors.length === 0) {
            analysis.colors = ['Black']; // Default fallback
        }

        // Validate pattern
        if (!PATTERNS.includes(analysis.pattern as Pattern)) {
            analysis.pattern = 'solid';
        }

        console.log('Parsed analysis:', analysis);
        return { analysis, error: null };
    } catch (error) {
        console.error('AI analysis failed:', error);
        return { analysis: null, error: error as Error };
    }
};

/**
 * Get default analysis when AI is not available
 */
export const getDefaultAnalysis = (): ClothingAnalysis => ({
    category: 'tops',
    subCategory: 't-shirt',
    colors: ['Black'],
    pattern: 'solid',
    confidence: 0,
});
