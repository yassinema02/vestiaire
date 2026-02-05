/**
 * Weather-to-Clothing Mapping Utility
 * Maps weather conditions to clothing suggestions
 */

export type TempCategory = 'cold' | 'cool' | 'mild' | 'warm' | 'hot';

export interface ClothingSuggestion {
    categories: string[];
    tips: string[];
    tempCategory: TempCategory;
}

// Temperature thresholds in Celsius
const TEMP_THRESHOLDS = {
    COLD: 5,      // < 5°C
    COOL: 10,     // 5-10°C
    MILD: 18,     // 10-18°C
    WARM: 25,     // 18-25°C
    // > 25°C is HOT
};

// Weather codes that indicate rain
const RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];

// Weather codes that indicate snow
const SNOW_CODES = [71, 73, 75, 77, 85, 86];

// Weather codes that indicate thunderstorm
const STORM_CODES = [95, 96, 99];

// Weather codes that indicate clear/sunny
const SUNNY_CODES = [0, 1];

/**
 * Get temperature category based on temperature value
 */
function getTempCategory(temp: number): TempCategory {
    if (temp < TEMP_THRESHOLDS.COLD) return 'cold';
    if (temp < TEMP_THRESHOLDS.COOL) return 'cool';
    if (temp < TEMP_THRESHOLDS.MILD) return 'mild';
    if (temp < TEMP_THRESHOLDS.WARM) return 'warm';
    return 'hot';
}

/**
 * Get clothing categories based on temperature
 */
function getCategoriesForTemp(tempCategory: TempCategory): string[] {
    switch (tempCategory) {
        case 'cold':
            return ['outerwear', 'tops', 'bottoms', 'accessories'];
        case 'cool':
            return ['outerwear', 'tops', 'bottoms'];
        case 'mild':
            return ['tops', 'bottoms', 'outerwear'];
        case 'warm':
            return ['tops', 'bottoms'];
        case 'hot':
            return ['tops', 'bottoms'];
        default:
            return ['tops', 'bottoms'];
    }
}

/**
 * Get tips based on temperature
 */
function getTipsForTemp(tempCategory: TempCategory): string[] {
    switch (tempCategory) {
        case 'cold':
            return ['Bundle up with warm layers', 'Consider a scarf and gloves'];
        case 'cool':
            return ['A light jacket or sweater is recommended'];
        case 'mild':
            return ['Light layers work well today'];
        case 'warm':
            return ['Light, breathable fabrics recommended'];
        case 'hot':
            return ['Keep it light and airy', 'Stay cool with minimal layers'];
        default:
            return [];
    }
}

/**
 * Get additional suggestions based on weather condition
 */
function getConditionSuggestions(weatherCode: number): { categories: string[]; tips: string[] } {
    const categories: string[] = [];
    const tips: string[] = [];

    if (RAIN_CODES.includes(weatherCode)) {
        categories.push('outerwear');
        tips.push('Bring a waterproof jacket or umbrella');
    }

    if (SNOW_CODES.includes(weatherCode)) {
        categories.push('outerwear', 'accessories');
        tips.push('Waterproof boots recommended', 'Warm layers are essential');
    }

    if (STORM_CODES.includes(weatherCode)) {
        categories.push('outerwear');
        tips.push('Stay dry with waterproof outerwear');
    }

    if (SUNNY_CODES.includes(weatherCode)) {
        tips.push('Sunglasses might be useful');
    }

    return { categories, tips };
}

/**
 * Get clothing suggestions based on weather context
 * @param temp - Temperature in Celsius
 * @param weatherCode - WMO weather code
 * @param precipitationChance - Optional precipitation chance (0-100)
 */
export function getClothingSuggestions(
    temp: number,
    weatherCode: number,
    precipitationChance?: number
): ClothingSuggestion {
    const tempCategory = getTempCategory(temp);
    const tempCategories = getCategoriesForTemp(tempCategory);
    const tempTips = getTipsForTemp(tempCategory);

    const conditionSuggestions = getConditionSuggestions(weatherCode);

    // Merge categories (unique)
    const allCategories = [...new Set([...tempCategories, ...conditionSuggestions.categories])];

    // Merge tips
    const allTips = [...tempTips, ...conditionSuggestions.tips];

    // Add precipitation tip if high chance
    if (precipitationChance !== undefined && precipitationChance > 50) {
        if (!allTips.some(tip => tip.includes('umbrella') || tip.includes('waterproof'))) {
            allTips.push('High chance of precipitation - pack an umbrella');
        }
    }

    return {
        categories: allCategories,
        tips: allTips,
        tempCategory,
    };
}

/**
 * Get a short summary for the weather
 */
export function getWeatherSummary(tempCategory: TempCategory): string {
    switch (tempCategory) {
        case 'cold':
            return 'Cold weather - dress warmly';
        case 'cool':
            return 'Cool weather - bring a jacket';
        case 'mild':
            return 'Mild weather - light layers';
        case 'warm':
            return 'Warm weather - dress light';
        case 'hot':
            return 'Hot weather - stay cool';
        default:
            return 'Check your wardrobe';
    }
}

/**
 * Weather conditions for AI context
 */
export interface ClothingNeeds {
    required: string[];      // Categories that must be included
    optional: string[];      // Categories that might be useful
    conditions: string[];    // Weather conditions (rain, snow, wind, sun)
}

/**
 * Map weather to structured clothing needs for AI context
 * @param temp - Temperature in Celsius
 * @param weatherCode - WMO weather code
 * @returns Structured clothing needs for AI consumption
 */
export function mapWeatherToClothingNeeds(
    temp: number,
    weatherCode: number
): ClothingNeeds {
    const tempCategory = getTempCategory(temp);
    const required: string[] = [];
    const optional: string[] = [];
    const conditions: string[] = [];

    // Temperature-based requirements
    switch (tempCategory) {
        case 'cold':
            required.push('outerwear', 'warm layers');
            optional.push('scarf', 'gloves', 'hat');
            conditions.push('cold');
            break;
        case 'cool':
            required.push('outerwear');
            optional.push('light layers');
            conditions.push('cool');
            break;
        case 'mild':
            optional.push('light jacket', 'cardigan');
            break;
        case 'warm':
            required.push('breathable fabrics');
            break;
        case 'hot':
            required.push('light clothing');
            conditions.push('hot');
            break;
    }

    // Condition-based additions
    if (RAIN_CODES.includes(weatherCode)) {
        required.push('waterproof outerwear');
        conditions.push('rain');
    }

    if (SNOW_CODES.includes(weatherCode)) {
        required.push('waterproof boots', 'warm outerwear');
        conditions.push('snow');
    }

    if (STORM_CODES.includes(weatherCode)) {
        required.push('waterproof outerwear');
        conditions.push('storm');
    }

    if (SUNNY_CODES.includes(weatherCode)) {
        optional.push('sunglasses');
        conditions.push('sunny');
    }

    return {
        required: [...new Set(required)],
        optional: [...new Set(optional)],
        conditions: [...new Set(conditions)],
    };
}

/**
 * Export getTempCategory for external use
 */
export { getTempCategory };

