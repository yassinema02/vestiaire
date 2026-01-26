/**
 * AI Categorization Service
 * Uses Google Gemini Vision to analyze clothing and extract metadata
 */

import Constants from 'expo-constants';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are a fashion expert. Analyze this clothing item image and provide:

IMPORTANT: Focus ONLY on the clothing item itself. IGNORE any background colors (white, gray, or transparent backgrounds are common in product photos - do NOT include these as clothing colors).

1. Main category: Choose ONE from [tops, bottoms, dresses, outerwear, shoes, accessories]
2. Sub-category: Be specific (e.g., t-shirt, jeans, sneakers, blazer, etc.)
3. Colors: List up to 3 ACTUAL colors OF THE CLOTHING ITEM ONLY from this palette: [Black, White, Gray, Navy, Blue, Light Blue, Red, Burgundy, Pink, Orange, Yellow, Green, Olive, Brown, Tan, Cream, Purple, Lavender, Teal, Coral, Beige]
   - Do NOT include background colors
   - Only include colors that are part of the fabric/material of the clothing
4. Pattern: Choose ONE from [solid, striped, plaid, floral, polka-dot, checkered, geometric, abstract, animal-print, camo, tie-dye]

Respond ONLY with valid JSON in this exact format, no other text:
{
  "category": "tops",
  "subCategory": "t-shirt",
  "colors": ["Black"],
  "pattern": "solid",
  "confidence": 0.95
}`;

        // Fetch image and convert to base64 for Gemini
        const imageResponse = await fetch(imageUrl);
        const imageBlob = await imageResponse.blob();

        // Convert blob to base64
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

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64,
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();
        console.log('Gemini response:', text);

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
        analysis.colors = analysis.colors.filter((c) => validColorNames.includes(c));
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
