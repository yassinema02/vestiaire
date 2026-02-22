/**
 * OOTD Reminder Service Tests
 * Story 9.7: OOTD Posting Reminder
 */

const mockFrom = jest.fn();

jest.mock('../../services/supabase', () => ({
    supabase: {
        from: mockFrom,
        auth: {
            getUser: jest.fn().mockResolvedValue({
                data: { user: { id: 'test-user-id' } },
            }),
        },
    },
}));

jest.mock('../../services/auth-helpers', () => ({
    requireUserId: jest.fn().mockResolvedValue('test-user-id'),
}));

import { ootdReminderService } from '../../services/ootdReminderService';

// Helper to build chainable Supabase query mock
function buildChain(overrides = {}) {
    const chain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        ...overrides,
    };
    return chain;
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getPreferences', () => {
    it('returns defaults when profile has data', async () => {
        const chain = buildChain({
            single: jest.fn().mockResolvedValue({
                data: { ootd_reminder_enabled: true, ootd_reminder_time: '09:00:00' },
                error: null,
            }),
        });
        mockFrom.mockReturnValue(chain);

        const { prefs, error } = await ootdReminderService.getPreferences();
        expect(prefs.enabled).toBe(true);
        expect(prefs.time).toBe('09:00');
        expect(error).toBeNull();
    });

    it('returns custom time parsed correctly', async () => {
        const chain = buildChain({
            single: jest.fn().mockResolvedValue({
                data: { ootd_reminder_enabled: false, ootd_reminder_time: '11:30:00' },
                error: null,
            }),
        });
        mockFrom.mockReturnValue(chain);

        const { prefs } = await ootdReminderService.getPreferences();
        expect(prefs.enabled).toBe(false);
        expect(prefs.time).toBe('11:30');
    });

    it('returns defaults on error', async () => {
        const chain = buildChain({
            single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
            }),
        });
        mockFrom.mockReturnValue(chain);

        const { prefs, error } = await ootdReminderService.getPreferences();
        expect(prefs.enabled).toBe(true);
        expect(prefs.time).toBe('09:00');
        expect(error).toBeTruthy();
    });
});

describe('hasPostedToday', () => {
    it('returns true when user has posted today', async () => {
        const chain = buildChain();
        // Override the chain so gte returns the final result
        chain.gte.mockResolvedValue({ count: 1, error: null });
        mockFrom.mockReturnValue(chain);

        const result = await ootdReminderService.hasPostedToday();
        expect(result).toBe(true);
        expect(mockFrom).toHaveBeenCalledWith('ootd_posts');
    });

    it('returns false when user has not posted today', async () => {
        const chain = buildChain();
        chain.gte.mockResolvedValue({ count: 0, error: null });
        mockFrom.mockReturnValue(chain);

        const result = await ootdReminderService.hasPostedToday();
        expect(result).toBe(false);
    });

    it('returns false on error', async () => {
        const chain = buildChain();
        chain.gte.mockRejectedValue(new Error('DB error'));
        mockFrom.mockReturnValue(chain);

        const result = await ootdReminderService.hasPostedToday();
        expect(result).toBe(false);
    });
});

describe('hasSquads', () => {
    it('returns true when user has squads', async () => {
        const chain = buildChain();
        chain.eq.mockResolvedValue({ count: 2, error: null });
        mockFrom.mockReturnValue(chain);

        const result = await ootdReminderService.hasSquads();
        expect(result).toBe(true);
        expect(mockFrom).toHaveBeenCalledWith('squad_memberships');
    });

    it('returns false when user has no squads', async () => {
        const chain = buildChain();
        chain.eq.mockResolvedValue({ count: 0, error: null });
        mockFrom.mockReturnValue(chain);

        const result = await ootdReminderService.hasSquads();
        expect(result).toBe(false);
    });
});

describe('shouldSendReminder', () => {
    it('returns false when disabled', async () => {
        // Mock getPreferences to return disabled
        const chain = buildChain({
            single: jest.fn().mockResolvedValue({
                data: { ootd_reminder_enabled: false, ootd_reminder_time: '09:00:00' },
                error: null,
            }),
        });
        mockFrom.mockReturnValue(chain);

        const result = await ootdReminderService.shouldSendReminder();
        expect(result).toBe(false);
    });

    it('returns false when user already posted today', async () => {
        let callCount = 0;
        mockFrom.mockImplementation((table) => {
            if (table === 'profiles') {
                return buildChain({
                    single: jest.fn().mockResolvedValue({
                        data: { ootd_reminder_enabled: true, ootd_reminder_time: '09:00:00' },
                        error: null,
                    }),
                });
            }
            if (table === 'ootd_posts') {
                const chain = buildChain();
                chain.gte.mockResolvedValue({ count: 1, error: null });
                return chain;
            }
            return buildChain();
        });

        const result = await ootdReminderService.shouldSendReminder();
        expect(result).toBe(false);
    });

    it('returns false when user has no squads', async () => {
        mockFrom.mockImplementation((table) => {
            if (table === 'profiles') {
                return buildChain({
                    single: jest.fn().mockResolvedValue({
                        data: { ootd_reminder_enabled: true, ootd_reminder_time: '09:00:00' },
                        error: null,
                    }),
                });
            }
            if (table === 'ootd_posts') {
                const chain = buildChain();
                chain.gte.mockResolvedValue({ count: 0, error: null });
                return chain;
            }
            if (table === 'squad_memberships') {
                const chain = buildChain();
                chain.eq.mockResolvedValue({ count: 0, error: null });
                return chain;
            }
            return buildChain();
        });

        const result = await ootdReminderService.shouldSendReminder();
        expect(result).toBe(false);
    });

    it('returns true when enabled, not posted, and has squads', async () => {
        mockFrom.mockImplementation((table) => {
            if (table === 'profiles') {
                return buildChain({
                    single: jest.fn().mockResolvedValue({
                        data: { ootd_reminder_enabled: true, ootd_reminder_time: '09:00:00' },
                        error: null,
                    }),
                });
            }
            if (table === 'ootd_posts') {
                const chain = buildChain();
                chain.gte.mockResolvedValue({ count: 0, error: null });
                return chain;
            }
            if (table === 'squad_memberships') {
                const chain = buildChain();
                chain.eq.mockResolvedValue({ count: 1, error: null });
                return chain;
            }
            return buildChain();
        });

        const result = await ootdReminderService.shouldSendReminder();
        expect(result).toBe(true);
    });
});

describe('scheduleReminder', () => {
    it('logs stub message', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();
        await ootdReminderService.scheduleReminder('09:00');
        expect(spy).toHaveBeenCalledWith(
            expect.stringContaining('Would schedule daily notification at 09:00')
        );
        spy.mockRestore();
    });
});

describe('cancelScheduledReminder', () => {
    it('logs stub message', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();
        await ootdReminderService.cancelScheduledReminder();
        expect(spy).toHaveBeenCalledWith(
            expect.stringContaining('Would cancel scheduled notifications')
        );
        spy.mockRestore();
    });
});
