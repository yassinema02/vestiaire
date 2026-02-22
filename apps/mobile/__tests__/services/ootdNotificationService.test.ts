/**
 * OOTD Notification Service Tests
 * Story 9.6: OOTD Notifications
 */

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockGetAllKeys = jest.fn().mockResolvedValue([]);
const mockMultiRemove = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: mockGetItem,
    setItem: mockSetItem,
    getAllKeys: mockGetAllKeys,
    multiRemove: mockMultiRemove,
}));

import {
    getPreference,
    updatePreference,
    isQuietHours,
    isMorning,
    getDailyCount,
    recordNotification,
    shouldNotify,
    getNotificationBody,
    cleanupOldCounts,
} from '../../services/ootdNotificationService';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getPreference', () => {
    it('returns "all" by default when no value stored', async () => {
        mockGetItem.mockResolvedValue(null);
        const pref = await getPreference();
        expect(pref).toBe('all');
    });

    it('returns stored preference', async () => {
        mockGetItem.mockResolvedValue('morning_only');
        const pref = await getPreference();
        expect(pref).toBe('morning_only');
    });

    it('returns "all" for invalid stored value', async () => {
        mockGetItem.mockResolvedValue('invalid');
        const pref = await getPreference();
        expect(pref).toBe('all');
    });

    it('returns "all" on AsyncStorage error', async () => {
        mockGetItem.mockRejectedValue(new Error('fail'));
        const pref = await getPreference();
        expect(pref).toBe('all');
    });
});

describe('updatePreference', () => {
    it('saves preference to AsyncStorage', async () => {
        await updatePreference('off');
        expect(mockSetItem).toHaveBeenCalledWith('notif_ootd_preference', 'off');
    });
});

describe('isQuietHours', () => {
    it('returns true at 10 PM', () => {
        expect(isQuietHours(new Date('2026-02-22T22:00:00'))).toBe(true);
    });

    it('returns true at 11 PM', () => {
        expect(isQuietHours(new Date('2026-02-22T23:30:00'))).toBe(true);
    });

    it('returns true at 3 AM', () => {
        expect(isQuietHours(new Date('2026-02-22T03:00:00'))).toBe(true);
    });

    it('returns true at 6:59 AM', () => {
        expect(isQuietHours(new Date('2026-02-22T06:59:00'))).toBe(true);
    });

    it('returns false at 7 AM', () => {
        expect(isQuietHours(new Date('2026-02-22T07:00:00'))).toBe(false);
    });

    it('returns false at 9 AM', () => {
        expect(isQuietHours(new Date('2026-02-22T09:00:00'))).toBe(false);
    });

    it('returns false at 5 PM', () => {
        expect(isQuietHours(new Date('2026-02-22T17:00:00'))).toBe(false);
    });

    it('returns false at 9:59 PM', () => {
        expect(isQuietHours(new Date('2026-02-22T21:59:00'))).toBe(false);
    });
});

describe('isMorning', () => {
    it('returns true at 8 AM', () => {
        expect(isMorning(new Date('2026-02-22T08:00:00'))).toBe(true);
    });

    it('returns true at 11:59 AM', () => {
        expect(isMorning(new Date('2026-02-22T11:59:00'))).toBe(true);
    });

    it('returns false at noon', () => {
        expect(isMorning(new Date('2026-02-22T12:00:00'))).toBe(false);
    });

    it('returns false at 2 PM', () => {
        expect(isMorning(new Date('2026-02-22T14:00:00'))).toBe(false);
    });
});

describe('getDailyCount', () => {
    it('returns 0 when no count stored', async () => {
        mockGetItem.mockResolvedValue(null);
        const count = await getDailyCount();
        expect(count).toBe(0);
    });

    it('returns stored count', async () => {
        mockGetItem.mockResolvedValue('2');
        const count = await getDailyCount();
        expect(count).toBe(2);
    });

    it('returns 0 on error', async () => {
        mockGetItem.mockRejectedValue(new Error('fail'));
        const count = await getDailyCount();
        expect(count).toBe(0);
    });
});

describe('recordNotification', () => {
    it('increments daily count from 0 to 1', async () => {
        mockGetItem.mockResolvedValue(null);
        await recordNotification();
        expect(mockSetItem).toHaveBeenCalledWith(
            expect.stringMatching(/^notif_ootd_count_\d{4}-\d{2}-\d{2}$/),
            '1'
        );
    });

    it('increments daily count from 2 to 3', async () => {
        mockGetItem.mockResolvedValue('2');
        await recordNotification();
        expect(mockSetItem).toHaveBeenCalledWith(
            expect.stringMatching(/^notif_ootd_count_/),
            '3'
        );
    });
});

describe('getNotificationBody', () => {
    it('formats notification body correctly', () => {
        expect(getNotificationBody('Sarah')).toBe("Sarah just posted their OOTD! \uD83D\uDCF8");
    });

    it('works with different names', () => {
        expect(getNotificationBody('Alex')).toBe("Alex just posted their OOTD! \uD83D\uDCF8");
    });
});

describe('shouldNotify', () => {
    it('returns false when preference is off', async () => {
        mockGetItem.mockImplementation((key) => {
            if (key === 'notif_ootd_preference') return Promise.resolve('off');
            return Promise.resolve(null);
        });
        const result = await shouldNotify(new Date('2026-02-22T09:00:00'));
        expect(result).toBe(false);
    });

    it('returns false during quiet hours', async () => {
        mockGetItem.mockImplementation((key) => {
            if (key === 'notif_ootd_preference') return Promise.resolve('all');
            return Promise.resolve(null);
        });
        const result = await shouldNotify(new Date('2026-02-22T23:00:00'));
        expect(result).toBe(false);
    });

    it('returns true for "all" during normal hours', async () => {
        mockGetItem.mockImplementation((key) => {
            if (key === 'notif_ootd_preference') return Promise.resolve('all');
            return Promise.resolve(null);
        });
        const result = await shouldNotify(new Date('2026-02-22T09:00:00'));
        expect(result).toBe(true);
    });

    it('returns true for morning_only at 8 AM', async () => {
        mockGetItem.mockImplementation((key) => {
            if (key === 'notif_ootd_preference') return Promise.resolve('morning_only');
            return Promise.resolve(null);
        });
        const result = await shouldNotify(new Date('2026-02-22T08:00:00'));
        expect(result).toBe(true);
    });

    it('returns false for morning_only at 2 PM', async () => {
        mockGetItem.mockImplementation((key) => {
            if (key === 'notif_ootd_preference') return Promise.resolve('morning_only');
            return Promise.resolve(null);
        });
        const result = await shouldNotify(new Date('2026-02-22T14:00:00'));
        expect(result).toBe(false);
    });

    it('returns false when daily limit reached (3)', async () => {
        mockGetItem.mockImplementation((key) => {
            if (key === 'notif_ootd_preference') return Promise.resolve('all');
            if (key.startsWith('notif_ootd_count_')) return Promise.resolve('3');
            return Promise.resolve(null);
        });
        const result = await shouldNotify(new Date('2026-02-22T09:00:00'));
        expect(result).toBe(false);
    });

    it('returns true when under daily limit', async () => {
        mockGetItem.mockImplementation((key) => {
            if (key === 'notif_ootd_preference') return Promise.resolve('all');
            if (key.startsWith('notif_ootd_count_')) return Promise.resolve('2');
            return Promise.resolve(null);
        });
        const result = await shouldNotify(new Date('2026-02-22T09:00:00'));
        expect(result).toBe(true);
    });
});

describe('cleanupOldCounts', () => {
    it('removes keys older than 7 days', async () => {
        mockGetAllKeys.mockResolvedValue([
            'notif_ootd_count_2026-02-10',
            'notif_ootd_count_2026-02-14',
            'notif_ootd_count_2026-02-22',
            'some_other_key',
        ]);
        await cleanupOldCounts();
        expect(mockMultiRemove).toHaveBeenCalledWith([
            'notif_ootd_count_2026-02-10',
        ]);
    });

    it('does nothing when no old keys exist', async () => {
        mockGetAllKeys.mockResolvedValue([
            'notif_ootd_count_2026-02-22',
        ]);
        await cleanupOldCounts();
        expect(mockMultiRemove).not.toHaveBeenCalled();
    });
});
