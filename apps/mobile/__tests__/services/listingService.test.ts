/**
 * Listing Service Tests
 * Story 13.3: One-Tap Resale Listing — prompt enhancement + resale_status
 */

// ─── Supabase mock ──────────────────────────────────────────────

const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();

jest.mock('../../services/supabase', () => ({
    supabase: {
        from: jest.fn((table: string) => ({
            insert: mockInsert,
            update: mockUpdate,
            select: mockSelect,
        })),
        auth: {
            getUser: jest.fn().mockResolvedValue({
                data: { user: { id: 'user-123' } },
            }),
        },
    },
}));

jest.mock('../../services/secureStorage', () => ({
    secureStorageAdapter: {},
}));

// Mock Gemini / aiUsageLogger
jest.mock('../../services/aiUsageLogger', () => ({
    trackedGenerateContent: jest.fn(),
}));

// Mock gamificationService
jest.mock('../../services/gamificationService', () => ({
    gamificationService: {
        addPoints: jest.fn().mockResolvedValue({ newTotal: 10, error: null }),
    },
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
    expoConfig: { extra: { geminiApiKey: '' } },
}));

import { buildListingPrompt, LISTING_TONE_INSTRUCTIONS } from '../../constants/prompts';
import { WardrobeItem } from '../../services/items';

// Helper
function makeItem(overrides: Partial<WardrobeItem> = {}): WardrobeItem {
    return {
        id: 'item-1',
        user_id: 'user-123',
        image_url: 'https://example.com/img.jpg',
        wear_count: 0,
        is_favorite: false,
        status: 'complete',
        created_at: new Date(Date.now() - 200 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockInsert.mockReturnValue({ select: jest.fn().mockReturnValue({ single: mockSingle }) });
    mockSingle.mockResolvedValue({ data: { id: 'listing-1', status: 'listed' }, error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });
});

// ─── Prompt Enhancement Tests ────────────────────────────────────

describe('buildListingPrompt (enhanced)', () => {
    const baseParams = {
        name: 'Black Heels',
        brand: 'Gucci',
        category: 'shoes',
        features: [],
        wearCount: 10,
        toneInstruction: LISTING_TONE_INSTRUCTIONS.casual,
    };

    it('includes wear count in prompt', () => {
        const prompt = buildListingPrompt(baseParams);
        expect(prompt).toContain('Times worn: 10');
    });

    it('includes "never worn" sustainability for wear_count 0', () => {
        const prompt = buildListingPrompt({ ...baseParams, wearCount: 0 });
        expect(prompt).toContain('new without tags');
        expect(prompt).toContain('unworn');
    });

    it('includes sustainability messaging for wear_count 5+', () => {
        const prompt = buildListingPrompt({ ...baseParams, wearCount: 10 });
        expect(prompt).toContain('Loved and well-cared for');
    });

    it('includes CPW when provided', () => {
        const prompt = buildListingPrompt({ ...baseParams, cpw: 12.50 });
        expect(prompt).toContain('Cost per wear: £12.50');
    });

    it('omits CPW line when not provided', () => {
        const prompt = buildListingPrompt(baseParams);
        expect(prompt).not.toContain('Cost per wear');
    });

    it('includes last worn date when provided', () => {
        const prompt = buildListingPrompt({ ...baseParams, lastWornAt: '3 months ago' });
        expect(prompt).toContain('Last worn: 3 months ago');
    });

    it('includes purchase date when provided', () => {
        const prompt = buildListingPrompt({ ...baseParams, purchaseDate: '1 year ago' });
        expect(prompt).toContain('Purchased: 1 year ago');
    });

    it('includes sustainability footer instruction', () => {
        const prompt = buildListingPrompt(baseParams);
        expect(prompt).toContain('End the description with a brief sustainability note');
    });

    it('includes "barely worn" messaging for wear_count 1-4', () => {
        const prompt = buildListingPrompt({ ...baseParams, wearCount: 3 });
        expect(prompt).toContain('barely worn');
        expect(prompt).toContain('loved and well-cared for');
    });
});

// ─── Fallback Generation Tests ──────────────────────────────────

describe('fallback listing generation', () => {
    it('includes sustainability note in fallback', async () => {
        // Import after mocks are set up (Gemini key is empty → uses fallback)
        const { listingService } = await import('../../services/listingService');
        const item = makeItem({ brand: 'Nike', category: 'shoes', wear_count: 5 });
        const { listing } = await listingService.generateListing(item, 'casual');

        expect(listing?.description).toContain('Give this piece a second life');
    });

    it('fallback for never-worn item says "Brand new"', async () => {
        const { listingService } = await import('../../services/listingService');
        const item = makeItem({ brand: 'Zara', category: 'tops', wear_count: 0 });
        const { listing } = await listingService.generateListing(item, 'casual');

        expect(listing?.description).toContain('Brand new');
    });
});

// ─── saveToHistory resale_status Tests ───────────────────────────

describe('saveToHistory', () => {
    it('updates items.resale_status to listed after saving', async () => {
        const { listingService } = await import('../../services/listingService');
        const item = makeItem({ id: 'item-42' });
        const listing = { title: 'Test', description: 'Desc', suggested_price_range: '$10-$20', hashtags: [] };

        await listingService.saveToHistory(item, listing);

        expect(mockUpdate).toHaveBeenCalledWith({ resale_status: 'listed' });
    });
});

// ─── getResaleStats Tests ────────────────────────────────────────

describe('getResaleStats', () => {
    it('returns correct totals', async () => {
        mockSelect.mockReturnValue({
            eq: jest.fn().mockResolvedValue({
                data: [
                    { status: 'listed', sold_price: null },
                    { status: 'listed', sold_price: null },
                    { status: 'sold', sold_price: 50 },
                    { status: 'sold', sold_price: 30 },
                    { status: 'cancelled', sold_price: null },
                ],
                error: null,
            }),
        });

        const { listingService } = await import('../../services/listingService');
        const stats = await listingService.getResaleStats();

        expect(stats.totalListed).toBe(2);
        expect(stats.totalSold).toBe(2);
        expect(stats.totalRevenue).toBe(80);
        expect(stats.error).toBeNull();
    });
});
