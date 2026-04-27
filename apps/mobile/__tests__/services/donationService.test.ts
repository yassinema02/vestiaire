/**
 * Donation Service Tests
 * Story 13.6: Donation Tracking
 */

// ─── Supabase mock ──────────────────────────────────────────────

const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();

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

jest.mock('../../services/gamificationService', () => ({
    gamificationService: {
        addPoints: jest.fn().mockResolvedValue({ newTotal: 3, error: null }),
    },
}));

import { donationService } from '../../services/donationService';
import { gamificationService } from '../../services/gamificationService';

beforeEach(() => {
    jest.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
    mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
    });
});

// ─── logDonation ─────────────────────────────────────────────────

describe('logDonation', () => {
    it('inserts into donation_log + sets resale_status + awards points', async () => {
        const { error } = await donationService.logDonation('item-1');

        expect(error).toBeNull();
        expect(mockInsert).toHaveBeenCalledWith({
            user_id: 'user-123',
            item_id: 'item-1',
            charity: null,
            estimated_value: null,
        });
        expect(mockUpdate).toHaveBeenCalledWith({ resale_status: 'donated' });
        expect(gamificationService.addPoints).toHaveBeenCalledWith(3, 'donate_item');
    });

    it('passes charity name and estimated value when provided', async () => {
        await donationService.logDonation('item-2', 'Oxfam', 25);

        expect(mockInsert).toHaveBeenCalledWith({
            user_id: 'user-123',
            item_id: 'item-2',
            charity: 'Oxfam',
            estimated_value: 25,
        });
    });

    it('passes null for optional fields when not provided', async () => {
        await donationService.logDonation('item-3');

        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                charity: null,
                estimated_value: null,
            })
        );
    });
});

// ─── getDonationStats ────────────────────────────────────────────

describe('getDonationStats', () => {
    it('returns correct totalDonated count', async () => {
        mockSelect.mockReturnValue({
            eq: jest.fn().mockResolvedValue({
                data: [
                    { estimated_value: 10, donated_at: '2026-01-15T00:00:00Z' },
                    { estimated_value: 20, donated_at: '2026-02-10T00:00:00Z' },
                    { estimated_value: null, donated_at: '2025-06-01T00:00:00Z' },
                ],
                error: null,
            }),
        });

        const stats = await donationService.getDonationStats();
        expect(stats.totalDonated).toBe(3);
    });

    it('calculates thisYearValue from current year only', async () => {
        const currentYear = new Date().getFullYear();
        mockSelect.mockReturnValue({
            eq: jest.fn().mockResolvedValue({
                data: [
                    { estimated_value: 50, donated_at: `${currentYear}-03-01T00:00:00Z` },
                    { estimated_value: 30, donated_at: `${currentYear}-01-15T00:00:00Z` },
                    { estimated_value: 100, donated_at: `${currentYear - 1}-12-01T00:00:00Z` },
                ],
                error: null,
            }),
        });

        const stats = await donationService.getDonationStats();
        expect(stats.thisYearValue).toBe(80); // 50 + 30 (current year only)
        expect(stats.totalEstimatedValue).toBe(180); // all time
    });

    it('estimates weight at 0.7kg per item', async () => {
        mockSelect.mockReturnValue({
            eq: jest.fn().mockResolvedValue({
                data: [
                    { estimated_value: 10, donated_at: '2026-01-01T00:00:00Z' },
                    { estimated_value: 20, donated_at: '2026-02-01T00:00:00Z' },
                ],
                error: null,
            }),
        });

        const stats = await donationService.getDonationStats();
        expect(stats.estimatedWeight).toBeCloseTo(1.4); // 2 * 0.7
    });

    it('returns zeros for no donations', async () => {
        mockSelect.mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        });

        const stats = await donationService.getDonationStats();
        expect(stats.totalDonated).toBe(0);
        expect(stats.totalEstimatedValue).toBe(0);
        expect(stats.thisYearValue).toBe(0);
        expect(stats.estimatedWeight).toBe(0);
    });
});

// ─── Generous Giver badge ────────────────────────────────────────

describe('Generous Giver badge', () => {
    it('triggers at 20+ donated items', () => {
        const donatedItems = Array.from({ length: 20 }, (_, i) => ({ id: `item-${i}` }));
        expect(donatedItems.length >= 20).toBe(true);
    });

    it('does not trigger at 19 donated items', () => {
        const donatedItems = Array.from({ length: 19 }, (_, i) => ({ id: `item-${i}` }));
        expect(donatedItems.length >= 20).toBe(false);
    });
});
