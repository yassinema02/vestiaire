/**
 * Extraction Categorization Service
 * Bridges Gemini detection output → existing categorization system
 * Story 10.5: Auto-Categorization for Extracted Items
 *
 * Maps Title Case categories from extraction (Story 10.2) to
 * lowercase keys used by aiCategorization.ts CATEGORIES.
 * Normalizes freeform colors to the 21-color COLORS palette.
 * Detects potential duplicates against existing wardrobe items.
 */

import { CATEGORIES, COLORS, Category } from './aiCategorization';
import { WardrobeItem } from './items';
import { DetectedItem } from '../types/extraction';

// Map detection categories (Title Case) → CATEGORIES keys (lowercase)
const CATEGORY_MAP: Record<string, Category> = {
  'Tops': 'tops',
  'Bottoms': 'bottoms',
  'Outerwear': 'outerwear',
  'Shoes': 'shoes',
  'Accessories': 'accessories',
  'Dresses': 'dresses',
  'Activewear': 'tops', // No dedicated activewear category yet
};

const VALID_COLOR_NAMES = COLORS.map((c) => c.name.toLowerCase());

export interface DuplicateMatch {
  itemId: string;
  similarity: number;
  itemName?: string;
}

export const extractionCategorizationService = {
  /**
   * Normalize a detected category (Title Case) to CATEGORIES key (lowercase)
   */
  normalizeCategory(detected: string): Category {
    return CATEGORY_MAP[detected] || CATEGORY_MAP[detected.charAt(0).toUpperCase() + detected.slice(1).toLowerCase()] || 'tops';
  },

  /**
   * Normalize freeform Gemini colors to the predefined COLORS palette
   * e.g., ["navy", "light blue", "unknown"] → ["Navy", "Light Blue"]
   */
  normalizeColors(detected: string[]): string[] {
    return detected
      .map((c) => {
        const idx = VALID_COLOR_NAMES.indexOf(c.toLowerCase());
        return idx >= 0 ? COLORS[idx].name : null;
      })
      .filter((c): c is string => c !== null);
  },

  /**
   * Map a DetectedItem's sub_category to the closest CATEGORIES sub-array entry
   */
  normalizeSubCategory(detected: string, category: Category): string {
    const subCategories = CATEGORIES[category];
    if (!subCategories) return detected;

    const lower = detected.toLowerCase().replace(/[\s-_]/g, '');
    const match = subCategories.find(
      (sc) => sc.replace(/[\s-_]/g, '').toLowerCase() === lower
    );
    return match || detected;
  },

  /**
   * Find potential duplicates in existing wardrobe items
   * Scoring: exact category (40pts) + color overlap (30pts) + sub_category match (30pts)
   * Threshold: ≥70 points
   */
  findDuplicates(
    item: DetectedItem,
    existingItems: WardrobeItem[]
  ): DuplicateMatch[] {
    const normalizedCategory = extractionCategorizationService.normalizeCategory(item.category);
    const normalizedColors = extractionCategorizationService.normalizeColors(item.colors);

    return existingItems
      .map((existing) => {
        let score = 0;

        // Category match (40 points)
        if (existing.category && existing.category.toLowerCase() === normalizedCategory) {
          score += 40;
        }

        // Color overlap (30 points) — at least 1 common color
        if (existing.colors && normalizedColors.length > 0) {
          const hasOverlap = normalizedColors.some((c) =>
            existing.colors!.some((ec) => ec.toLowerCase() === c.toLowerCase())
          );
          if (hasOverlap) score += 30;
        }

        // Sub-category match (30 points)
        if (
          existing.sub_category &&
          item.sub_category &&
          existing.sub_category.toLowerCase().replace(/[\s-_]/g, '') ===
            item.sub_category.toLowerCase().replace(/[\s-_]/g, '')
        ) {
          score += 30;
        }

        return { itemId: existing.id, similarity: score, itemName: existing.name };
      })
      .filter((d) => d.similarity >= 70);
  },
};
