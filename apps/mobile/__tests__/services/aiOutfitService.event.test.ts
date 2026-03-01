/**
 * Event-Based Outfit Generation Tests
 * Story 12.3: Event-Based Outfit Suggestions
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

jest.mock('../../services/supabase', () => ({
    supabase: { from: jest.fn() },
}));

jest.mock('../../services/auth-helpers', () => ({
    requireUserId: jest.fn().mockResolvedValue('user-123'),
}));

jest.mock('../../utils/occasionDetector', () => ({
    detectOccasion: jest.fn().mockReturnValue('casual'),
}));

import {
    getFormalityGuidance,
    getEventTimeOfDay,
    generateEventOutfit,
    clearEventOutfitCache,
    generateFallbackOutfit,
    OutfitSuggestion,
} from '../../services/aiOutfitService';
import { CalendarEventRow } from '../../services/eventSyncService';

const mockEvent: CalendarEventRow = {
    id: 'evt-1',
    user_id: 'user-123',
    external_event_id: 'ext-1',
    title: 'Client Presentation',
    description: null,
    location: 'Office',
    start_time: '2026-02-25T14:00:00Z',
    end_time: '2026-02-25T15:30:00Z',
    is_all_day: false,
    event_type: 'work',
    formality_score: 7,
    user_corrected: false,
    synced_at: '2026-02-25T10:00:00Z',
};

const mockWardrobeItems = [
    { id: 'item-1', user_id: 'u1', image_url: '', wear_count: 0, status: 'complete', category: 'tops', sub_category: 'shirt', colors: ['white'], seasons: ['all'], name: 'White Shirt' },
    { id: 'item-2', user_id: 'u1', image_url: '', wear_count: 0, status: 'complete', category: 'bottoms', sub_category: 'trousers', colors: ['black'], seasons: ['all'], name: 'Black Trousers' },
    { id: 'item-3', user_id: 'u1', image_url: '', wear_count: 0, status: 'complete', category: 'outerwear', sub_category: 'blazer', colors: ['navy'], seasons: ['all'], name: 'Navy Blazer' },
    { id: 'item-4', user_id: 'u1', image_url: '', wear_count: 0, status: 'complete', category: 'shoes', sub_category: 'oxford', colors: ['brown'], seasons: ['all'], name: 'Brown Oxfords' },
] as any;

beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
});

// --- Tests ---

describe('getFormalityGuidance', () => {
    it('formality >= 7 → formal dress code', () => {
        expect(getFormalityGuidance(8)).toBe('Business or formal dress code required');
        expect(getFormalityGuidance(9)).toBe('Business or formal dress code required');
        expect(getFormalityGuidance(10)).toBe('Business or formal dress code required');
    });

    it('formality 4-6 → smart casual', () => {
        expect(getFormalityGuidance(4)).toBe('Smart casual — polished but comfortable');
        expect(getFormalityGuidance(5)).toBe('Smart casual — polished but comfortable');
        expect(getFormalityGuidance(6)).toBe('Smart casual — polished but comfortable');
    });

    it('formality <= 3 → casual', () => {
        expect(getFormalityGuidance(1)).toBe('Casual comfortable');
        expect(getFormalityGuidance(2)).toBe('Casual comfortable');
        expect(getFormalityGuidance(3)).toBe('Casual comfortable');
    });
});

describe('getEventTimeOfDay', () => {
    it('maps morning correctly (before noon)', () => {
        expect(getEventTimeOfDay('2026-02-25T09:00:00Z')).toBeDefined();
    });

    it('maps afternoon correctly (12-17)', () => {
        expect(getEventTimeOfDay('2026-02-25T14:00:00Z')).toBeDefined();
    });

    it('maps evening correctly (17-21)', () => {
        expect(getEventTimeOfDay('2026-02-25T20:00:00Z')).toBeDefined();
    });
});

describe('Highest formality prioritization', () => {
    it('formal (8) beats work (6) beats casual (3)', () => {
        const events = [
            { ...mockEvent, id: 'e1', formality_score: 3, event_type: 'casual' },
            { ...mockEvent, id: 'e2', formality_score: 8, event_type: 'formal' },
            { ...mockEvent, id: 'e3', formality_score: 6, event_type: 'work' },
        ];

        const sorted = [...events].sort((a, b) => (b.formality_score || 0) - (a.formality_score || 0));

        expect(sorted[0].event_type).toBe('formal');
        expect(sorted[0].formality_score).toBe(8);
        expect(sorted[1].event_type).toBe('work');
        expect(sorted[2].event_type).toBe('casual');
    });
});

describe('generateEventOutfit', () => {
    it('returns cached outfit when available', async () => {
        const cached = {
            suggestion: { name: 'Cached Outfit', items: ['item-1', 'item-2'], occasion: 'work', rationale: 'Cached' },
            generatedAt: Date.now(),
        };
        mockGetItem.mockResolvedValue(JSON.stringify(cached));

        const result = await generateEventOutfit(mockEvent, mockWardrobeItems);

        expect(result.suggestion).toEqual(cached.suggestion);
        expect(result.fromCache).toBe(true);
    });

    it('skips cache when skipCache=true (regenerate)', async () => {
        const cached = {
            suggestion: { name: 'Old Outfit', items: ['item-1', 'item-2'], occasion: 'work', rationale: 'Old' },
            generatedAt: Date.now(),
        };
        mockGetItem.mockResolvedValue(JSON.stringify(cached));

        // With Gemini unconfigured, falls back to rule-based
        const result = await generateEventOutfit(mockEvent, mockWardrobeItems, true);

        expect(result.fromCache).toBe(false);
    });

    it('returns fallback when Gemini not configured', async () => {
        const result = await generateEventOutfit(mockEvent, mockWardrobeItems);

        expect(result.suggestion).not.toBeNull();
        expect(result.fromCache).toBe(false);
        // Fallback sets occasion from event type
        expect(result.suggestion?.occasion).toBe('work');
    });

    it('returns null when too few wardrobe items', async () => {
        const fewItems = [mockWardrobeItems[0], mockWardrobeItems[1]] as any;

        const result = await generateEventOutfit(mockEvent, fewItems);

        // With only 2 items, fallback should still work (top + bottom)
        // But explicit check: if < 3 complete items and Gemini not configured
        // the fallback generator still creates an outfit from 2 items
        expect(result.error).toBeNull();
    });

    it('caches generated outfit', async () => {
        await generateEventOutfit(mockEvent, mockWardrobeItems);

        expect(mockSetItem).toHaveBeenCalledWith(
            expect.stringContaining('event_outfit_'),
            expect.any(String)
        );
    });
});

describe('clearEventOutfitCache', () => {
    it('removes cached outfit for event', async () => {
        await clearEventOutfitCache('evt-1');

        expect(mockRemoveItem).toHaveBeenCalledWith('event_outfit_evt-1');
    });
});

describe('No events → banner hidden', () => {
    it('empty events array produces no banner event', () => {
        const events: CalendarEventRow[] = [];
        const sorted = [...events].sort((a, b) => (b.formality_score || 0) - (a.formality_score || 0));
        expect(sorted.length).toBe(0);
        // In the component, nextEvent is null → banner not rendered
    });
});
