/**
 * Steal Look Service Tests
 * Story 9.5: "Steal This Look"
 */

import { matchWithFallback, fallbackMatchSingle } from '../../services/stealLookService';

// Mock tagged item type
interface TaggedItemInfo {
    id: string;
    name: string | null;
    category: string;
    colors: string[];
    image_url: string;
}

// Mock wardrobe items
const mockWardrobeItems: any[] = [
    {
        id: 'w1',
        name: 'Navy Blazer',
        category: 'tops',
        sub_category: 'blazer',
        colors: ['navy'],
        brand: 'Zara',
        image_url: 'https://example.com/w1.jpg',
        processed_image_url: null,
        status: 'complete',
    },
    {
        id: 'w2',
        name: 'Black Jeans',
        category: 'bottoms',
        sub_category: 'jeans',
        colors: ['black'],
        brand: null,
        image_url: 'https://example.com/w2.jpg',
        processed_image_url: null,
        status: 'complete',
    },
    {
        id: 'w3',
        name: 'Grey Blazer',
        category: 'tops',
        sub_category: 'blazer',
        colors: ['grey'],
        brand: null,
        image_url: 'https://example.com/w3.jpg',
        processed_image_url: null,
        status: 'complete',
    },
];

describe('stealLookService', () => {
    describe('fallbackMatchSingle', () => {
        it('should return exact match when category and color match', () => {
            const target: TaggedItemInfo = {
                id: 't1',
                name: 'Navy Blazer',
                category: 'tops',
                colors: ['navy'],
                image_url: 'https://example.com/t1.jpg',
            };

            const result = fallbackMatchSingle(target, mockWardrobeItems);

            expect(result.matchType).toBe('exact');
            expect(result.confidence).toBeGreaterThanOrEqual(90);
            expect(result.matchedItem).toBeDefined();
            expect(result.matchedItem!.id).toBe('w1');
        });

        it('should return similar match when category matches but color differs', () => {
            const target: TaggedItemInfo = {
                id: 't2',
                name: 'Red Blazer',
                category: 'tops',
                colors: ['red'],
                image_url: 'https://example.com/t2.jpg',
            };

            const result = fallbackMatchSingle(target, mockWardrobeItems);

            expect(result.matchType).toBe('similar');
            expect(result.confidence).toBeGreaterThanOrEqual(40);
            expect(result.confidence).toBeLessThan(90);
            expect(result.matchedItem).toBeDefined();
        });

        it('should return missing when no items in that category', () => {
            const target: TaggedItemInfo = {
                id: 't3',
                name: 'White Sneakers',
                category: 'shoes',
                colors: ['white'],
                image_url: 'https://example.com/t3.jpg',
            };

            const result = fallbackMatchSingle(target, mockWardrobeItems);

            expect(result.matchType).toBe('missing');
            expect(result.confidence).toBe(0);
            expect(result.matchedItem).toBeUndefined();
        });

        it('should return missing when wardrobe is empty', () => {
            const target: TaggedItemInfo = {
                id: 't1',
                name: 'Blazer',
                category: 'tops',
                colors: ['navy'],
                image_url: 'https://example.com/t1.jpg',
            };

            const result = fallbackMatchSingle(target, []);

            expect(result.matchType).toBe('missing');
            expect(result.confidence).toBe(0);
        });
    });

    describe('matchWithFallback', () => {
        it('should return a match result for each target item', () => {
            const targets: TaggedItemInfo[] = [
                { id: 't1', name: 'Navy Blazer', category: 'tops', colors: ['navy'], image_url: 'img1' },
                { id: 't2', name: 'Black Jeans', category: 'bottoms', colors: ['black'], image_url: 'img2' },
                { id: 't3', name: 'White Sneakers', category: 'shoes', colors: ['white'], image_url: 'img3' },
            ];

            const results = matchWithFallback(targets, mockWardrobeItems);

            expect(results).toHaveLength(3);
            expect(results[0].matchType).toBe('exact'); // navy tops match
            expect(results[1].matchType).toBe('exact'); // black bottoms match
            expect(results[2].matchType).toBe('missing'); // no shoes
        });

        it('should calculate correct canRecreate when all matched', () => {
            const targets: TaggedItemInfo[] = [
                { id: 't1', name: 'Navy Blazer', category: 'tops', colors: ['navy'], image_url: 'img1' },
                { id: 't2', name: 'Black Jeans', category: 'bottoms', colors: ['black'], image_url: 'img2' },
            ];

            const results = matchWithFallback(targets, mockWardrobeItems);
            const canRecreate = results.every((m) => m.matchType !== 'missing');

            expect(canRecreate).toBe(true);
        });

        it('should calculate correct canRecreate when some missing', () => {
            const targets: TaggedItemInfo[] = [
                { id: 't1', name: 'Navy Blazer', category: 'tops', colors: ['navy'], image_url: 'img1' },
                { id: 't3', name: 'White Sneakers', category: 'shoes', colors: ['white'], image_url: 'img3' },
            ];

            const results = matchWithFallback(targets, mockWardrobeItems);
            const canRecreate = results.every((m) => m.matchType !== 'missing');

            expect(canRecreate).toBe(false);
        });

        it('should calculate correct overallScore', () => {
            const targets: TaggedItemInfo[] = [
                { id: 't1', name: 'Navy Blazer', category: 'tops', colors: ['navy'], image_url: 'img1' },
                { id: 't2', name: 'Black Jeans', category: 'bottoms', colors: ['black'], image_url: 'img2' },
                { id: 't3', name: 'Sneakers', category: 'shoes', colors: ['white'], image_url: 'img3' },
            ];

            const results = matchWithFallback(targets, mockWardrobeItems);
            const overallScore = Math.round(
                results.reduce((sum, m) => sum + m.confidence, 0) / results.length
            );

            // exact(95) + exact(95) + missing(0) = 190/3 ≈ 63
            expect(overallScore).toBeGreaterThan(60);
            expect(overallScore).toBeLessThan(70);
        });
    });

    describe('match reason generation', () => {
        it('should generate appropriate reason for exact match', () => {
            const target: TaggedItemInfo = {
                id: 't1',
                name: 'Navy Blazer',
                category: 'tops',
                colors: ['navy'],
                image_url: 'img1',
            };

            const result = fallbackMatchSingle(target, mockWardrobeItems);
            expect(result.matchReason).toContain('same');
        });

        it('should generate appropriate reason for similar match', () => {
            const target: TaggedItemInfo = {
                id: 't1',
                name: 'Red Top',
                category: 'tops',
                colors: ['red'],
                image_url: 'img1',
            };

            const result = fallbackMatchSingle(target, mockWardrobeItems);
            expect(result.matchReason).toContain('instead');
        });

        it('should generate appropriate reason for missing match', () => {
            const target: TaggedItemInfo = {
                id: 't1',
                name: 'Sneakers',
                category: 'shoes',
                colors: ['white'],
                image_url: 'img1',
            };

            const result = fallbackMatchSingle(target, mockWardrobeItems);
            expect(result.matchReason).toContain("don't have");
        });
    });
});
