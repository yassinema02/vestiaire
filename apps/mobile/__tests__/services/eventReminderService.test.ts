/**
 * Event Reminder Service Tests
 * Story 12.5: Outfit Reminders
 */

// --- Mocks ---

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
}));

const mockFrom = jest.fn();
const mockGetUser = jest.fn().mockResolvedValue({
    data: { user: { id: 'user-123' } },
});

jest.mock('../../services/supabase', () => ({
    supabase: {
        from: (...args: any[]) => mockFrom(...args),
        auth: { getUser: mockGetUser },
    },
}));

jest.mock('../../services/auth-helpers', () => ({
    requireUserId: jest.fn().mockResolvedValue('user-123'),
}));

jest.mock('../../services/eventSyncService', () => ({
    eventSyncService: {
        getUpcomingEvents: jest.fn().mockResolvedValue({ events: [], error: null }),
    },
}));

jest.mock('../../services/calendarOutfitService', () => ({
    calendarOutfitService: {
        getScheduledOutfitForEvent: jest.fn().mockResolvedValue({ outfit: null, error: null }),
    },
}));

jest.mock('../../services/items', () => ({
    itemsService: {
        getItems: jest.fn().mockResolvedValue({ items: [], error: null }),
    },
}));

import { eventReminderService } from '../../services/eventReminderService';
import { CalendarEventRow } from '../../services/eventSyncService';

// Mock Supabase chain
function mockSupabaseChain(result: any) {
    const chain: any = {};
    const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle'];
    methods.forEach(m => {
        chain[m] = jest.fn().mockReturnValue(chain);
    });
    chain.single = jest.fn().mockResolvedValue(result);
    mockFrom.mockReturnValue(chain);
    return chain;
}

const mockEvent: CalendarEventRow = {
    id: 'evt-1',
    user_id: 'user-123',
    external_event_id: 'ext-1',
    title: 'Client Presentation',
    description: null,
    location: 'Office',
    start_time: '2026-02-26T14:00:00Z',
    end_time: '2026-02-26T15:30:00Z',
    is_all_day: false,
    event_type: 'work',
    formality_score: 7,
    user_corrected: false,
    synced_at: '2026-02-25T10:00:00Z',
};

beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
});

// --- Tests ---

describe('shouldSendReminder', () => {
    it('returns true for work event when work is in prefs', async () => {
        mockSupabaseChain({
            data: {
                event_reminder_enabled: true,
                event_reminder_time: '20:00:00',
                event_reminder_event_types: ['work', 'formal'],
            },
            error: null,
        });

        const result = await eventReminderService.shouldSendReminder(mockEvent);
        expect(result).toBe(true);
    });

    it('returns false for casual event when only work/formal in prefs', async () => {
        mockSupabaseChain({
            data: {
                event_reminder_enabled: true,
                event_reminder_time: '20:00:00',
                event_reminder_event_types: ['work', 'formal'],
            },
            error: null,
        });

        const casualEvent = { ...mockEvent, event_type: 'casual' };
        const result = await eventReminderService.shouldSendReminder(casualEvent);
        expect(result).toBe(false);
    });

    it('returns false when reminders are disabled', async () => {
        mockSupabaseChain({
            data: {
                event_reminder_enabled: false,
                event_reminder_time: '20:00:00',
                event_reminder_event_types: ['work', 'formal'],
            },
            error: null,
        });

        const result = await eventReminderService.shouldSendReminder(mockEvent);
        expect(result).toBe(false);
    });

    it('returns false when event was already dismissed', async () => {
        mockSupabaseChain({
            data: {
                event_reminder_enabled: true,
                event_reminder_time: '20:00:00',
                event_reminder_event_types: ['work', 'formal'],
            },
            error: null,
        });
        mockGetItem.mockResolvedValueOnce(null); // LAST_SCHEDULED_KEY
        mockGetItem.mockResolvedValueOnce('true'); // reminder_dismissed_evt-1

        // Need to re-mock for the shouldSendReminder internal calls
        // AsyncStorage.getItem is called for dismissed check
        mockGetItem.mockImplementation((key: string) => {
            if (key === `reminder_dismissed_${mockEvent.id}`) return Promise.resolve('true');
            return Promise.resolve(null);
        });

        const result = await eventReminderService.shouldSendReminder(mockEvent);
        expect(result).toBe(false);
    });
});

describe('buildReminderBody', () => {
    it('includes iron tip when outfit has blazer', () => {
        const body = eventReminderService.buildReminderBody(
            mockEvent,
            ['Navy Blazer', 'White Shirt', 'Black Trousers']
        );

        expect(body).toContain('iron');
        expect(body).toContain('Navy Blazer');
    });

    it('says outfit is ready for non-formal items', () => {
        const body = eventReminderService.buildReminderBody(
            mockEvent,
            ['Blue T-Shirt', 'Jeans']
        );

        expect(body).toContain('ready');
        expect(body).not.toContain('iron');
    });

    it('returns plan CTA when no outfit scheduled', () => {
        const body = eventReminderService.buildReminderBody(mockEvent);

        expect(body).toContain('Plan your outfit');
    });

    it('truncates long event titles', () => {
        const longEvent = {
            ...mockEvent,
            title: 'Very Long Annual Quarterly Business Review Meeting',
        };
        const body = eventReminderService.buildReminderBody(longEvent);

        expect(body.length).toBeLessThan(120);
        expect(body).toContain('...');
    });
});

describe('updatePreferences', () => {
    it('saves to profiles and triggers reschedule', async () => {
        const chain = mockSupabaseChain({ data: null, error: null });
        chain.eq.mockResolvedValueOnce({ error: null });

        // Mock the subsequent getPreferences + scheduleTomorrowsReminders calls
        mockSupabaseChain({
            data: {
                event_reminder_enabled: true,
                event_reminder_time: '21:00:00',
                event_reminder_event_types: ['work', 'formal'],
            },
            error: null,
        });

        const result = await eventReminderService.updatePreferences({ time: '21:00' });

        expect(mockFrom).toHaveBeenCalledWith('profiles');
    });
});

describe('getPreferences', () => {
    it('returns defaults on error', async () => {
        mockSupabaseChain({
            data: null,
            error: { message: 'Not found' },
        });

        const { prefs, error } = await eventReminderService.getPreferences();

        expect(prefs.enabled).toBe(true);
        expect(prefs.time).toBe('20:00');
        expect(prefs.eventTypes).toEqual(['work', 'formal']);
    });

    it('parses stored preferences correctly', async () => {
        mockSupabaseChain({
            data: {
                event_reminder_enabled: false,
                event_reminder_time: '19:00:00',
                event_reminder_event_types: ['formal'],
            },
            error: null,
        });

        const { prefs } = await eventReminderService.getPreferences();

        expect(prefs.enabled).toBe(false);
        expect(prefs.time).toBe('19:00');
        expect(prefs.eventTypes).toEqual(['formal']);
    });
});
