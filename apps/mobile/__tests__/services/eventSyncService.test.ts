/**
 * Event Sync & Classification Service Tests
 * Story 12.2: Event Detection & Classification
 */

// --- Mocks ---

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: mockGetItem,
    setItem: mockSetItem,
}));

const mockSupabaseFrom = jest.fn();
const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockSelect = jest.fn();
const mockDelete = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../../services/supabase', () => ({
    supabase: {
        from: (...args: any[]) => {
            mockSupabaseFrom(...args);
            return {
                upsert: mockUpsert,
                select: (...sArgs: any[]) => {
                    mockSelect(...sArgs);
                    return {
                        eq: jest.fn().mockReturnValue({
                            is: jest.fn().mockResolvedValue({ data: [], error: null }),
                            gte: jest.fn().mockReturnValue({
                                lte: jest.fn().mockReturnValue({
                                    order: jest.fn().mockResolvedValue({ data: [], error: null }),
                                }),
                            }),
                        }),
                    };
                },
                delete: () => {
                    mockDelete();
                    return {
                        eq: jest.fn().mockReturnValue({
                            lt: jest.fn().mockResolvedValue({ error: null }),
                        }),
                    };
                },
                update: (data: any) => {
                    mockUpdate(data);
                    return {
                        eq: jest.fn().mockResolvedValue({ error: null }),
                    };
                },
            };
        },
    },
}));

jest.mock('../../services/auth-helpers', () => ({
    requireUserId: jest.fn().mockResolvedValue('user-123'),
}));

const mockFetchEventsInRangeApple = jest.fn();
jest.mock('../../services/appleCalendar', () => ({
    appleCalendarService: {
        fetchEventsInRange: (...args: any[]) => mockFetchEventsInRangeApple(...args),
        fetchTodayEvents: jest.fn().mockResolvedValue({ events: [], error: null }),
        isConnected: jest.fn().mockResolvedValue(false),
        getSelectedCalendarIds: jest.fn().mockResolvedValue([]),
        getSelectedCalendars: jest.fn().mockResolvedValue([]),
    },
}));

const mockFetchEventsInRangeGoogle = jest.fn();
jest.mock('../../services/calendar', () => ({
    calendarService: {
        fetchEventsInRange: (...args: any[]) => mockFetchEventsInRangeGoogle(...args),
        fetchTodayEvents: jest.fn().mockResolvedValue({ events: [], error: null }),
        isConnected: jest.fn().mockResolvedValue(false),
        getConnectedEmail: jest.fn().mockResolvedValue(null),
        getStoredTokens: jest.fn().mockResolvedValue(null),
        getStoredUserInfo: jest.fn().mockResolvedValue(null),
    },
}));

jest.mock('../../utils/occasionDetector', () => ({
    detectOccasion: jest.fn((title: string) => {
        const lower = title.toLowerCase();
        if (lower.includes('meeting') || lower.includes('standup')) return 'work';
        if (lower.includes('wedding') || lower.includes('gala')) return 'formal';
        if (lower.includes('dinner') || lower.includes('party')) return 'social';
        if (lower.includes('gym') || lower.includes('yoga')) return 'sport';
        return 'casual';
    }),
    getOccasionLabel: jest.fn((t: string) => t),
    getOccasionColor: jest.fn(() => '#000'),
    getOccasionIcon: jest.fn(() => 'circle'),
}));

jest.mock('react-native', () => ({
    Platform: { OS: 'ios' },
}));

// Mock calendarStore
jest.mock('../../stores/calendarStore', () => ({
    useCalendarStore: {
        getState: jest.fn().mockReturnValue({
            appleConnected: true,
            googleConnected: false,
            isConnected: true,
        }),
    },
}));

import { eventSyncService } from '../../services/eventSyncService';
import { eventClassificationService } from '../../services/eventClassificationService';

beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null); // No last sync
});

// --- Event Sync Tests ---

describe('eventSyncService', () => {
    describe('syncEvents', () => {
        it('fetches 7-day range with correct start/end dates', async () => {
            mockFetchEventsInRangeApple.mockResolvedValue({ events: [], error: null });

            const beforeSync = Date.now();
            await eventSyncService.syncEvents();

            expect(mockFetchEventsInRangeApple).toHaveBeenCalledTimes(1);
            const [startDate, endDate] = mockFetchEventsInRangeApple.mock.calls[0];
            expect(startDate).toBeInstanceOf(Date);
            expect(endDate).toBeInstanceOf(Date);

            // End date should be ~7 days after start
            const diffDays = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
            expect(diffDays).toBeCloseTo(7, 0);
        });

        it('upserts events with dedup on external_event_id', async () => {
            const events = [
                { id: 'evt-1', title: 'Team Meeting', startTime: '2026-02-25T10:00:00Z', endTime: '2026-02-25T11:00:00Z', location: null, isAllDay: false, occasion: 'work', source: 'apple' },
                { id: 'evt-2', title: 'Lunch', startTime: '2026-02-25T12:00:00Z', endTime: '2026-02-25T13:00:00Z', location: null, isAllDay: false, occasion: 'social', source: 'apple' },
            ];

            mockFetchEventsInRangeApple.mockResolvedValue({ events, error: null });

            await eventSyncService.syncEvents();

            expect(mockUpsert).toHaveBeenCalledTimes(2);
            // Check first upsert uses onConflict
            expect(mockUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    external_event_id: 'evt-1',
                    title: 'Team Meeting',
                }),
                { onConflict: 'user_id,external_event_id' }
            );
        });

        it('cleans stale events after sync', async () => {
            mockFetchEventsInRangeApple.mockResolvedValue({ events: [{ id: 'e1', title: 'Test', startTime: '2026-02-25T10:00:00Z', endTime: '2026-02-25T11:00:00Z', location: null, isAllDay: false }], error: null });

            await eventSyncService.syncEvents();

            expect(mockDelete).toHaveBeenCalled();
        });

        it('handles empty event list gracefully', async () => {
            mockFetchEventsInRangeApple.mockResolvedValue({ events: [], error: null });

            const result = await eventSyncService.syncEvents();

            expect(result.synced).toBe(0);
            expect(result.error).toBeNull();
        });
    });

    describe('shouldSync', () => {
        it('returns true when no last sync', async () => {
            mockGetItem.mockResolvedValue(null);
            expect(await eventSyncService.shouldSync()).toBe(true);
        });

        it('returns false when synced recently', async () => {
            mockGetItem.mockResolvedValue(String(Date.now()));
            expect(await eventSyncService.shouldSync()).toBe(false);
        });

        it('returns true when last sync > 1 hour ago', async () => {
            const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
            mockGetItem.mockResolvedValue(String(twoHoursAgo));
            expect(await eventSyncService.shouldSync()).toBe(true);
        });
    });
});

// --- Classification Tests ---

describe('eventClassificationService', () => {
    describe('classifyEvent - keyword path', () => {
        it('"Client meeting" → work, formality 6', async () => {
            const result = await eventClassificationService.classifyEvent('Client meeting');
            expect(result.type).toBe('work');
            expect(result.formalityScore).toBe(6);
            expect(result.confidence).toBeGreaterThanOrEqual(0.7);
            expect(result.source).toBe('keyword');
        });

        it('"Wedding reception" → formal, formality 9', async () => {
            const result = await eventClassificationService.classifyEvent('Wedding reception');
            expect(result.type).toBe('formal');
            expect(result.formalityScore).toBe(9);
        });

        it('"Team standup" → work, formality 6', async () => {
            const result = await eventClassificationService.classifyEvent('Team standup');
            expect(result.type).toBe('work');
            expect(result.formalityScore).toBe(6);
        });

        it('"Dinner with friends" → social, formality 4', async () => {
            const result = await eventClassificationService.classifyEvent('Dinner with friends');
            expect(result.type).toBe('social');
            expect(result.formalityScore).toBe(4);
        });

        it('"Morning yoga" → active, formality 2', async () => {
            const result = await eventClassificationService.classifyEvent('Morning yoga');
            expect(result.type).toBe('active');
            expect(result.formalityScore).toBe(2);
        });
    });

    describe('formality mapping', () => {
        it('work = 6', () => {
            expect(eventClassificationService.getFormalityScore('work')).toBe(6);
        });

        it('formal = 9', () => {
            expect(eventClassificationService.getFormalityScore('formal')).toBe(9);
        });

        it('casual = 3', () => {
            expect(eventClassificationService.getFormalityScore('casual')).toBe(3);
        });

        it('active = 2', () => {
            expect(eventClassificationService.getFormalityScore('active')).toBe(2);
        });

        it('social = 4', () => {
            expect(eventClassificationService.getFormalityScore('social')).toBe(4);
        });
    });

    describe('all-day events', () => {
        it('defaults to casual with formality 3', async () => {
            // classifyEvent doesn't know about all-day directly,
            // but classifyUnclassified handles it. Test the keyword fallback.
            const result = await eventClassificationService.classifyEvent('Vacation Day');
            // 'Vacation Day' won't match any keyword → casual default (low confidence)
            expect(result.type).toBe('casual');
            expect(result.formalityScore).toBe(3);
        });
    });

    describe('reclassifyEvent - user correction persists', () => {
        it('updates database with user_corrected = true', async () => {
            await eventClassificationService.reclassifyEvent('event-uuid', 'formal');

            expect(mockSupabaseFrom).toHaveBeenCalledWith('calendar_events');
            expect(mockUpdate).toHaveBeenCalledWith({
                event_type: 'formal',
                formality_score: 9,
                user_corrected: true,
            });
        });
    });
});
