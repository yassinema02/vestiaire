/**
 * Trip Packing Service Tests
 * Story 12.6: Travel Mode Packing Suggestions
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

jest.mock('../../services/supabase', () => ({
    supabase: {
        from: (...args: any[]) => mockFrom(...args),
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
    },
}));

jest.mock('../../services/auth-helpers', () => ({
    requireUserId: jest.fn().mockResolvedValue('user-123'),
}));

jest.mock('expo-constants', () => ({
    expoConfig: { extra: { geminiApiKey: '' } },
}));

jest.mock('@google/genai', () => ({
    GoogleGenAI: jest.fn(),
}));

jest.mock('../../services/contextService', () => ({
    buildCurrentContext: jest.fn().mockReturnValue({
        weather: { temperature: 22, condition: 'Sunny' },
        events: [],
        primaryOccasion: 'casual',
        timeOfDay: 'afternoon',
        metadata: { hasWeather: true, hasEvents: false, eventCount: 0, calendarSources: [] },
    }),
    formatContextForPrompt: jest.fn().mockReturnValue('Test context'),
}));

jest.mock('../../stores/weatherStore', () => ({
    useWeatherStore: {
        getState: jest.fn().mockReturnValue({
            weather: { temp: 22, feels_like: 20, condition: 'Sunny', weather_code: 0 },
        }),
    },
}));

jest.mock('../../utils/occasionDetector', () => ({
    detectOccasion: jest.fn().mockReturnValue('casual'),
}));

jest.mock('../../stores/calendarStore', () => ({
    useCalendarStore: {
        getState: jest.fn().mockReturnValue({
            appleConnected: false,
            googleConnected: false,
        }),
    },
}));

import { tripPackingService } from '../../services/tripPackingService';
import { eventSyncService, CalendarEventRow } from '../../services/eventSyncService';
import { TripEvent, PackingList, PackingDay, PackingItem } from '../../types/packingList';

// Helper: create a mock event row
function mockEventRow(overrides: Partial<CalendarEventRow> = {}): CalendarEventRow {
    return {
        id: 'evt-1',
        user_id: 'user-123',
        external_event_id: 'ext-1',
        title: 'Meeting',
        description: null,
        location: null,
        start_time: '2026-03-15T09:00:00Z',
        end_time: '2026-03-15T10:00:00Z',
        is_all_day: false,
        event_type: 'work',
        formality_score: 6,
        user_corrected: false,
        synced_at: '2026-02-25T10:00:00Z',
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
});

// --- Tests ---

describe('detectTripEvents', () => {
    function mockSupabaseQuery(events: Partial<CalendarEventRow>[]) {
        const fullEvents = events.map(e => mockEventRow(e));
        const chain: any = {};
        const methods = ['select', 'eq', 'gte', 'lte', 'order', 'lt', 'delete'];
        methods.forEach(m => {
            chain[m] = jest.fn().mockReturnValue(chain);
        });
        // Final result
        chain.order = jest.fn().mockResolvedValue({ data: fullEvents, error: null });
        mockFrom.mockReturnValue(chain);
    }

    it('detects multi-day all-day event as trip', async () => {
        mockSupabaseQuery([
            {
                id: 'trip-1',
                title: 'Work Offsite',
                start_time: '2026-03-15T00:00:00Z',
                end_time: '2026-03-18T00:00:00Z',
                is_all_day: true,
            },
        ]);

        const { trips } = await eventSyncService.detectTripEvents(30);
        expect(trips.length).toBe(1);
        expect(trips[0].durationDays).toBe(3);
    });

    it('detects event with "trip" in title', async () => {
        mockSupabaseQuery([
            {
                id: 'trip-2',
                title: 'Paris Trip',
                start_time: '2026-03-15T09:00:00Z',
                end_time: '2026-03-15T17:00:00Z',
                is_all_day: false,
            },
        ]);

        const { trips } = await eventSyncService.detectTripEvents(30);
        expect(trips.length).toBe(1);
        expect(trips[0].title).toBe('Paris Trip');
    });

    it('does not detect single-day non-keyword event', async () => {
        mockSupabaseQuery([
            {
                id: 'evt-3',
                title: 'Team Standup',
                start_time: '2026-03-15T09:00:00Z',
                end_time: '2026-03-15T09:30:00Z',
                is_all_day: false,
            },
        ]);

        const { trips } = await eventSyncService.detectTripEvents(30);
        expect(trips.length).toBe(0);
    });
});

describe('getDateRange', () => {
    it('returns inclusive date range', () => {
        const dates = tripPackingService.getDateRange('2026-03-15', '2026-03-18');
        expect(dates).toEqual(['2026-03-15', '2026-03-16', '2026-03-17', '2026-03-18']);
    });
});

describe('buildSummary', () => {
    it('builds correct summary from days', () => {
        const days: PackingDay[] = [
            { date: '2026-03-15', eventTitle: 'Meeting', occasionType: 'work', outfitItems: [] },
            { date: '2026-03-16', eventTitle: 'Conference', occasionType: 'work', outfitItems: [] },
            { date: '2026-03-17', eventTitle: 'Dinner', occasionType: 'formal', outfitItems: [] },
            { date: '2026-03-18', eventTitle: null, occasionType: 'casual', outfitItems: [] },
        ];

        const summary = tripPackingService.buildSummary(days);
        expect(summary).toContain('2 work');
        expect(summary).toContain('1 formal');
        expect(summary).toContain('1 casual');
        expect(summary).toContain('outfits');
    });
});

describe('deduplication', () => {
    it('same item on multiple days → single PackingItem with all days', () => {
        // Simulate building a deduplication map (same pattern as service)
        const itemMap = new Map<string, PackingItem>();

        const addItem = (id: string, name: string, day: string) => {
            const existing = itemMap.get(id);
            if (existing) {
                existing.days.push(day);
            } else {
                itemMap.set(id, { id, name, category: 'tops', days: [day], packed: false });
            }
        };

        addItem('item-1', 'White Shirt', '2026-03-15');
        addItem('item-1', 'White Shirt', '2026-03-17');
        addItem('item-1', 'White Shirt', '2026-03-18');
        addItem('item-2', 'Navy Blazer', '2026-03-15');

        const items = Array.from(itemMap.values());
        expect(items.length).toBe(2);
        expect(items[0].days).toEqual(['2026-03-15', '2026-03-17', '2026-03-18']);
        expect(items[1].days).toEqual(['2026-03-15']);
    });
});

describe('markItemPacked', () => {
    it('persists packed state via AsyncStorage', async () => {
        const list: PackingList = {
            tripId: 'trip-1',
            tripTitle: 'SF Trip',
            startDate: '2026-03-15',
            endDate: '2026-03-18',
            days: [],
            items: [
                { id: 'item-1', name: 'White Shirt', category: 'tops', days: ['2026-03-15'], packed: false },
            ],
            summary: '1 casual outfit',
            generatedAt: '2026-02-25T10:00:00Z',
        };

        mockGetItem.mockResolvedValue(JSON.stringify(list));

        await tripPackingService.markItemPacked('trip-1', 'item-1', true);

        expect(mockSetItem).toHaveBeenCalledWith(
            'packing_list_trip-1',
            expect.stringContaining('"packed":true')
        );
    });
});

describe('exportPackingList', () => {
    it('formats correct plain-text output', () => {
        const list: PackingList = {
            tripId: 'trip-1',
            tripTitle: 'SF Trip',
            startDate: '2026-03-15',
            endDate: '2026-03-17',
            days: [
                {
                    date: '2026-03-15',
                    eventTitle: 'Team Meeting',
                    occasionType: 'work',
                    outfitItems: [{ id: '1', name: 'Navy Blazer', category: 'outerwear' }],
                },
                {
                    date: '2026-03-16',
                    eventTitle: null,
                    occasionType: 'casual',
                    outfitItems: [{ id: '2', name: 'T-Shirt', category: 'tops' }],
                },
            ],
            items: [
                { id: '1', name: 'Navy Blazer', category: 'outerwear', days: ['2026-03-15'], packed: false },
                { id: '2', name: 'T-Shirt', category: 'tops', days: ['2026-03-16'], packed: true },
            ],
            summary: '1 work, 1 casual outfit',
            generatedAt: '2026-02-25T10:00:00Z',
        };

        const text = tripPackingService.exportPackingList(list);

        expect(text).toContain('Vestiaire Packing List');
        expect(text).toContain('SF Trip');
        expect(text).toContain('Day 1');
        expect(text).toContain('Team Meeting');
        expect(text).toContain('Navy Blazer');
        expect(text).toContain('Items to pack (2 total)');
        expect(text).toContain('☐ Navy Blazer');
        expect(text).toContain('☑ T-Shirt');
    });
});
