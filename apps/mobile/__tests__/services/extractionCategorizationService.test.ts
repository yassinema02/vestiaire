/**
 * Extraction Categorization Service Tests
 * Story 10.5: Auto-Categorization for Extracted Items
 */

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { geminiApiKey: 'test-key' } },
  },
}));

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: jest.fn() },
  })),
}));

import { extractionCategorizationService } from '../../services/extractionCategorizationService';
import { DetectedItem } from '../../types/extraction';
import { WardrobeItem } from '../../services/items';

function makeDetectedItem(overrides: Partial<DetectedItem> = {}): DetectedItem {
  return {
    category: 'Tops',
    sub_category: 'T-Shirt',
    colors: ['navy'],
    style: 'casual',
    material: 'cotton',
    position_description: 'upper body',
    confidence: 90,
    photo_index: 0,
    photo_url: 'https://test.com/photo.jpg',
    ...overrides,
  };
}

function makeWardrobeItem(overrides: Partial<WardrobeItem> = {}): WardrobeItem {
  return {
    id: 'item-1',
    user_id: 'user-1',
    image_url: 'https://test.com/img.jpg',
    name: 'Navy T-Shirt',
    category: 'tops',
    sub_category: 't-shirt',
    colors: ['Navy'],
    wear_count: 0,
    is_favorite: false,
    status: 'complete',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('normalizeCategory', () => {
  it('maps Title Case categories to lowercase keys', () => {
    expect(extractionCategorizationService.normalizeCategory('Tops')).toBe('tops');
    expect(extractionCategorizationService.normalizeCategory('Bottoms')).toBe('bottoms');
    expect(extractionCategorizationService.normalizeCategory('Outerwear')).toBe('outerwear');
    expect(extractionCategorizationService.normalizeCategory('Shoes')).toBe('shoes');
    expect(extractionCategorizationService.normalizeCategory('Accessories')).toBe('accessories');
    expect(extractionCategorizationService.normalizeCategory('Dresses')).toBe('dresses');
  });

  it('maps Activewear to tops (fallback)', () => {
    expect(extractionCategorizationService.normalizeCategory('Activewear')).toBe('tops');
  });

  it('falls back to tops for unknown categories', () => {
    expect(extractionCategorizationService.normalizeCategory('Unknown')).toBe('tops');
    expect(extractionCategorizationService.normalizeCategory('')).toBe('tops');
  });
});

describe('normalizeColors', () => {
  it('normalizes lowercase colors to palette names', () => {
    const result = extractionCategorizationService.normalizeColors(['navy', 'white', 'black']);
    expect(result).toEqual(['Navy', 'White', 'Black']);
  });

  it('filters out unknown colors', () => {
    const result = extractionCategorizationService.normalizeColors(['navy', 'neon green', 'sparkle']);
    expect(result).toEqual(['Navy']);
  });

  it('handles case-insensitive matching', () => {
    const result = extractionCategorizationService.normalizeColors(['NAVY', 'WhItE']);
    expect(result).toEqual(['Navy', 'White']);
  });

  it('handles light blue as multi-word color', () => {
    const result = extractionCategorizationService.normalizeColors(['light blue']);
    expect(result).toEqual(['Light Blue']);
  });

  it('returns empty array for all unknown colors', () => {
    const result = extractionCategorizationService.normalizeColors(['sparkle', 'rainbow']);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(extractionCategorizationService.normalizeColors([])).toEqual([]);
  });
});

describe('normalizeSubCategory', () => {
  it('matches exact sub-category from CATEGORIES', () => {
    const result = extractionCategorizationService.normalizeSubCategory('t-shirt', 'tops');
    expect(result).toBe('t-shirt');
  });

  it('returns original if no match found', () => {
    const result = extractionCategorizationService.normalizeSubCategory('tank dress', 'tops');
    expect(result).toBe('tank dress');
  });
});

describe('findDuplicates', () => {
  it('returns 100 for exact match (category + color + sub_category)', () => {
    const detected = makeDetectedItem({
      category: 'Tops',
      sub_category: 't-shirt',
      colors: ['navy'],
    });
    const existing = [
      makeWardrobeItem({
        id: 'match-1',
        category: 'tops',
        sub_category: 't-shirt',
        colors: ['Navy'],
      }),
    ];

    const result = extractionCategorizationService.findDuplicates(detected, existing);
    expect(result).toHaveLength(1);
    expect(result[0].itemId).toBe('match-1');
    expect(result[0].similarity).toBe(100);
  });

  it('returns 70 for category + color match without sub_category', () => {
    const detected = makeDetectedItem({
      category: 'Tops',
      sub_category: 'sweater',
      colors: ['navy'],
    });
    const existing = [
      makeWardrobeItem({
        id: 'partial-1',
        category: 'tops',
        sub_category: 'hoodie',
        colors: ['Navy'],
      }),
    ];

    const result = extractionCategorizationService.findDuplicates(detected, existing);
    expect(result).toHaveLength(1);
    expect(result[0].similarity).toBe(70);
  });

  it('returns 70 for category + sub_category match without color', () => {
    const detected = makeDetectedItem({
      category: 'Tops',
      sub_category: 't-shirt',
      colors: ['red'],
    });
    const existing = [
      makeWardrobeItem({
        id: 'partial-2',
        category: 'tops',
        sub_category: 't-shirt',
        colors: ['Blue'],
      }),
    ];

    const result = extractionCategorizationService.findDuplicates(detected, existing);
    expect(result).toHaveLength(1);
    expect(result[0].similarity).toBe(70);
  });

  it('returns empty for no match (score < 70)', () => {
    const detected = makeDetectedItem({
      category: 'Tops',
      sub_category: 't-shirt',
      colors: ['red'],
    });
    const existing = [
      makeWardrobeItem({
        id: 'no-match',
        category: 'shoes',
        sub_category: 'sneakers',
        colors: ['White'],
      }),
    ];

    const result = extractionCategorizationService.findDuplicates(detected, existing);
    expect(result).toHaveLength(0);
  });

  it('returns empty for category-only match (40 < 70)', () => {
    const detected = makeDetectedItem({
      category: 'Tops',
      sub_category: 't-shirt',
      colors: ['red'],
    });
    const existing = [
      makeWardrobeItem({
        id: 'cat-only',
        category: 'tops',
        sub_category: 'hoodie',
        colors: ['Blue'],
      }),
    ];

    const result = extractionCategorizationService.findDuplicates(detected, existing);
    expect(result).toHaveLength(0);
  });

  it('handles items with missing colors', () => {
    const detected = makeDetectedItem({ colors: ['navy'] });
    const existing = [
      makeWardrobeItem({ id: 'no-colors', colors: undefined, category: 'tops', sub_category: 't-shirt' }),
    ];

    const result = extractionCategorizationService.findDuplicates(detected, existing);
    // category match (40) + sub_category match (30) = 70
    expect(result).toHaveLength(1);
    expect(result[0].similarity).toBe(70);
  });

  it('handles empty existing items', () => {
    const detected = makeDetectedItem();
    const result = extractionCategorizationService.findDuplicates(detected, []);
    expect(result).toEqual([]);
  });
});
