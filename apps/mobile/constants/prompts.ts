/**
 * Centralized AI Prompts
 * All Gemini prompts in one place for easy tuning and version control.
 */

// ─── aiCategorization.ts ─────────────────────────────────────────

export const CLOTHING_ANALYSIS_PROMPT = `You are a fashion expert. Analyze this clothing item image and provide:

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

// ─── backgroundRemoval.ts ────────────────────────────────────────

export const BACKGROUND_REMOVAL_PROMPT = 'Remove the background from this clothing item photo. Keep only the clothing item itself on a clean pure white background. Preserve all details of the clothing. Do not add any text or watermarks.';

// ─── extractionService.ts ────────────────────────────────────────

export const ITEM_DETECTION_PROMPT = `You are a fashion wardrobe assistant. Analyze this photo and identify ALL clothing and fashion items visible.

For EACH item detected, return:
- category: One of [Tops, Bottoms, Outerwear, Shoes, Accessories, Dresses, Activewear]
- sub_category: Specific type (e.g., "T-Shirt", "Jeans", "Sneakers", "Watch")
- colors: Array of colors (e.g., ["navy", "white"])
- style: Overall style (e.g., "casual", "formal", "sporty", "bohemian")
- material: Best guess material (e.g., "cotton", "denim", "leather", "synthetic")
- position_description: Where in the photo (e.g., "worn by person, upper body")
- confidence: 0-100 how confident you are in the detection

Rules:
- Maximum 5 items per photo
- Only include clothing, shoes, bags, jewelry, and fashion accessories
- Do NOT include background objects, furniture, or non-fashion items
- If the photo has no fashion items, return an empty array
- If unclear, include with lower confidence (50-70)

Return ONLY valid JSON array, no other text:
[
  {
    "category": "Tops",
    "sub_category": "Blazer",
    "colors": ["black"],
    "style": "formal",
    "material": "wool blend",
    "position_description": "worn by person, upper body",
    "confidence": 95
  }
]`;

// ─── shoppingService.ts ──────────────────────────────────────────

export const PRODUCT_ANALYSIS_PROMPT = `You are a fashion product analyst. Analyze this product image and extract detailed information.

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

// ─── aiOutfitService.ts ──────────────────────────────────────────

export function buildOutfitSuggestionPrompt(itemsJson: string, contextText: string): string {
    return `You are a professional fashion stylist helping someone choose outfits from their wardrobe.

CONTEXT:
${contextText}

AVAILABLE WARDROBE ITEMS:
${itemsJson}

TASK:
Generate 3 outfit suggestions that are:
1. Appropriate for the weather conditions
2. Suitable for the occasion/events
3. Stylish and well-coordinated

RULES:
- Each outfit MUST use items from the provided wardrobe (use exact item IDs)
- Each outfit needs: (top + bottom) OR dress, optionally add shoes/outerwear/accessories
- Consider color coordination and style consistency
- Match seasons and occasions from item metadata

Respond ONLY with valid JSON in this exact format:
{
  "suggestions": [
    {
      "name": "Outfit Name",
      "items": ["item-id-1", "item-id-2", "item-id-3"],
      "occasion": "work",
      "rationale": "Why this outfit works..."
    }
  ]
}

Valid occasions: casual, work, formal, sport, social`;
}

export function buildEventOutfitPrompt(
    itemsJson: string,
    contextLines: string,
    eventType: string
): string {
    return `You are a professional fashion stylist. Suggest ONE outfit from this wardrobe for a specific event.

CONTEXT:
${contextLines}

AVAILABLE WARDROBE ITEMS:
${itemsJson}

RULES:
- Use ONLY items from the provided wardrobe (use exact item IDs)
- Each outfit needs: (top + bottom) OR dress, optionally add shoes/outerwear/accessories
- Match the formality level and time of day
- Consider weather conditions if provided
- Consider color coordination and style consistency

Respond ONLY with valid JSON:
{
  "name": "Outfit Name",
  "items": ["item-id-1", "item-id-2"],
  "occasion": "${eventType}",
  "rationale": "Why this outfit works for this event..."
}`;
}

// ─── listingService.ts ───────────────────────────────────────────

export const LISTING_TONE_INSTRUCTIONS: Record<string, string> = {
    casual: 'Write in a friendly, conversational tone. Use short sentences. Keep it approachable and relatable.',
    detailed: 'Write a thorough description with precise details about material, fit, and condition. Be professional but warm.',
    minimal: 'Write a very concise, no-fluff listing. Bullet-point style is fine. Just the essentials.',
};

export function buildListingPrompt(params: {
    name: string;
    brand: string;
    category: string;
    subCategory?: string;
    features: string[];
    purchasePrice?: number;
    wearCount: number;
    toneInstruction: string;
    lastWornAt?: string;
    purchaseDate?: string;
    cpw?: number;
}): string {
    const featureStr = params.features.length > 0 ? `- Features: ${params.features.join('; ')}` : '';
    const priceStr = params.purchasePrice ? `- Original price: £${params.purchasePrice.toFixed(0)}` : '';
    const lastWornStr = params.lastWornAt ? `- Last worn: ${params.lastWornAt}` : '';
    const cpwStr = params.cpw ? `- Cost per wear: £${params.cpw.toFixed(2)}` : '';
    const purchaseDateStr = params.purchaseDate ? `- Purchased: ${params.purchaseDate}` : '';

    // Sustainability instruction based on wear count
    let sustainabilityInstruction: string;
    if (params.wearCount === 0) {
        sustainabilityInstruction = '- This item is new without tags — emphasise it is unworn and in perfect condition';
    } else if (params.wearCount < 5) {
        sustainabilityInstruction = '- Describe as "barely worn" or "like new". Mention it was loved and well-cared for';
    } else {
        sustainabilityInstruction = '- Use warm sustainability messaging like "Loved and well-cared for, ready for its next chapter"';
    }

    return `You are an expert reseller on Vinted with thousands of successful sales. Generate a listing for this clothing item.

ITEM DETAILS:
- Name: ${params.name}
- Brand: ${params.brand}
- Category: ${params.category}${params.subCategory ? ` / ${params.subCategory}` : ''}
${featureStr}
${priceStr}
- Times worn: ${params.wearCount}
${lastWornStr}
${cpwStr}
${purchaseDateStr}

TONE: ${params.toneInstruction}

REQUIREMENTS:
- Title: catchy, includes brand name if known, max 50 characters
- Description: optimized for Vinted search/SEO, include relevant keywords
- Suggest a realistic price range based on the brand, category, and wear count
- Include 5-8 relevant hashtags for Vinted discovery
- If wear count is 0, mention "never worn" or "new without tags"
- If wear count is low (<5), mention "barely worn" or "like new"
${sustainabilityInstruction}
- End the description with a brief sustainability note, e.g. "Give this piece a second life" or "Extend the life of this beautiful garment"

Respond ONLY with valid JSON in this exact format:
{
  "title": "Listing title here",
  "description": "Full listing description here",
  "suggested_price_range": "$X - $Y",
  "hashtags": ["#tag1", "#tag2"]
}`;
}

// ─── stealLookService.ts ─────────────────────────────────────────

export function buildStealLookPrompt(targetsSummaryJson: string, wardrobeSummaryJson: string): string {
    return `You are a fashion matching assistant. Given TARGET items from a friend's outfit, find the BEST match for each from the user's wardrobe.

TARGET ITEMS (friend's outfit):
${targetsSummaryJson}

USER'S WARDROBE:
${wardrobeSummaryJson}

For EACH target item, find the best match. Rules:
- "exact": same category AND very similar color/style (confidence 85-100)
- "similar": same category but different color/style (confidence 40-80)
- "missing": no items in that category at all (confidence 0)
- If multiple items match, pick the BEST one

Return ONLY valid JSON:
{
  "matches": [
    {
      "targetId": "target-item-id",
      "matchedItemId": "user-item-id or null if missing",
      "matchType": "exact | similar | missing",
      "confidence": 0-100,
      "reason": "human-readable explanation"
    }
  ]
}`;
}

// ─── eventClassificationService.ts ───────────────────────────────

export function buildEventClassificationPrompt(
    title: string,
    description?: string | null,
    location?: string | null
): string {
    return `Classify this calendar event. Return ONLY valid JSON, no other text.
Title: "${title}"${description ? `\nDescription: "${description}"` : ''}${location ? `\nLocation: "${location}"` : ''}

Return: { "type": "work|social|active|formal|casual", "formalityScore": 1-10, "confidence": 0.0-1.0 }

Rules:
- work: meetings, presentations, interviews, standups, conferences
- social: dinners, parties, dates, drinks, brunches, birthdays
- active: gym, hiking, sports, yoga, running
- formal: weddings, galas, funerals, ceremonies, black-tie
- casual: errands, coffee, general tasks, all-day events with no clear type
- formalityScore: 1=very casual, 10=ultra formal`;
}

// ─── gapAnalysisService.ts ───────────────────────────────────────

export function buildGapAnalysisPrompt(maxGaps: number): string {
    return `You are a fashion wardrobe consultant. Analyze this wardrobe and identify GAPS.

IMPORTANT: Tailor your suggestions to the user's profile:
- Gender: Only suggest items appropriate for the user's gender. For men, do NOT suggest dresses, skirts, heels, blouses, crop-tops, leggings, or other traditionally women's items. For women, include the full range.
- Style preferences: Prioritize gaps that align with the user's stated style (e.g., don't suggest streetwear pieces to someone who prefers formal/minimalist).
- Age: Consider age-appropriate suggestions (e.g., don't suggest Y2K trends to someone in their 50s unless that's their stated style).

Check for:
1. Category gaps: missing essential categories appropriate for this user (no outerwear, no formal shoes, etc.)
2. Formality gaps: unbalanced casual vs formal
3. Color gaps: limited color palette (all dark, no spring colors, etc.)
4. Weather gaps: missing weather-appropriate items (no rain jacket, no layering pieces)

Return ONLY a JSON array (no markdown), max ${maxGaps} gaps, like:
[{"type":"category","severity":"critical","title":"...","description":"...","suggestion":"Consider adding a ..."}]

Severity: critical = missing entirely, important = very limited, optional = nice to have.

Wardrobe data:
`;
}
