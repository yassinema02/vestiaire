/**
 * Calendar Settings Screen Tests
 * Story 12.1: Calendar Permission & Connection
 */

// --- Mocks ---

const mockRequestPermission = jest.fn();
const mockCheckPermission = jest.fn();
const mockGetCalendars = jest.fn();
const mockGetSelectedCalendarIds = jest.fn();
const mockSetSelectedCalendarIds = jest.fn();
const mockIsConnectedApple = jest.fn();
const mockFetchTodayEventsApple = jest.fn();
const mockDisconnectApple = jest.fn();
const mockGetSelectedCalendars = jest.fn();

jest.mock('../../services/appleCalendar', () => ({
    appleCalendarService: {
        requestPermission: mockRequestPermission,
        checkPermission: mockCheckPermission,
        getCalendars: mockGetCalendars,
        getSelectedCalendarIds: mockGetSelectedCalendarIds,
        setSelectedCalendarIds: mockSetSelectedCalendarIds,
        isConnected: mockIsConnectedApple,
        fetchTodayEvents: mockFetchTodayEventsApple,
        disconnect: mockDisconnectApple,
        getSelectedCalendars: mockGetSelectedCalendars,
    },
}));

const mockIsConnectedGoogle = jest.fn();
const mockGetConnectedEmail = jest.fn();
const mockDisconnectGoogle = jest.fn();
const mockStoreAuthentication = jest.fn();
const mockFetchTodayEventsGoogle = jest.fn();
const mockGetStoredTokens = jest.fn();
const mockGetStoredUserInfo = jest.fn();

jest.mock('../../services/calendar', () => ({
    calendarService: {
        isConnected: mockIsConnectedGoogle,
        getConnectedEmail: mockGetConnectedEmail,
        disconnect: mockDisconnectGoogle,
        storeAuthentication: mockStoreAuthentication,
        fetchTodayEvents: mockFetchTodayEventsGoogle,
        getStoredTokens: mockGetStoredTokens,
        getStoredUserInfo: mockGetStoredUserInfo,
    },
}));

jest.mock('../../utils/occasionDetector', () => ({
    detectOccasion: jest.fn().mockReturnValue('casual'),
}));

// Import store after mocks
import { useCalendarStore } from '../../stores/calendarStore';

beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useCalendarStore.setState({
        events: [],
        lastFetched: null,
        isLoading: false,
        error: null,
        googleConnected: false,
        googleEmail: null,
        isConnectingGoogle: false,
        appleConnected: false,
        appleSelectedCalendars: [],
        isConnectingApple: false,
        isConnected: false,
    });
});

// --- Tests ---

describe('Calendar Settings - Permission Flow', () => {
    it('initial state: not connected shows correct defaults', () => {
        const state = useCalendarStore.getState();
        expect(state.appleConnected).toBe(false);
        expect(state.googleConnected).toBe(false);
        expect(state.isConnected).toBe(false);
    });

    it('Apple: permission granted -> calendars shown and saved', async () => {
        const mockCalendars = [
            { id: 'cal-1', title: 'Work', color: '#007AFF', source: 'iCloud', isPrimary: true, allowsModifications: true },
            { id: 'cal-2', title: 'Personal', color: '#34C759', source: 'iCloud', isPrimary: false, allowsModifications: true },
        ];

        mockRequestPermission.mockResolvedValue({ granted: true, error: null });
        mockGetCalendars.mockResolvedValue({ calendars: mockCalendars, error: null });
        mockSetSelectedCalendarIds.mockResolvedValue(undefined);
        mockGetSelectedCalendars.mockResolvedValue(mockCalendars);
        mockFetchTodayEventsApple.mockResolvedValue({ events: [], error: null });

        const result = await useCalendarStore.getState().connectApple();

        expect(result).toBe(true);
        expect(mockRequestPermission).toHaveBeenCalled();
        expect(mockSetSelectedCalendarIds).toHaveBeenCalledWith(['cal-1', 'cal-2']);

        const state = useCalendarStore.getState();
        expect(state.appleConnected).toBe(true);
        expect(state.appleSelectedCalendars).toHaveLength(2);
        expect(state.isConnected).toBe(true);
    });

    it('Apple: permission denied -> error message and not connected', async () => {
        mockRequestPermission.mockResolvedValue({ granted: false, error: new Error('Permission denied') });

        const result = await useCalendarStore.getState().connectApple();

        expect(result).toBe(false);

        const state = useCalendarStore.getState();
        expect(state.appleConnected).toBe(false);
        expect(state.error).toBe('Permission denied');
    });
});

describe('Calendar Settings - Calendar Selection', () => {
    it('save/load selected calendar IDs', async () => {
        const mockCalendars = [
            { id: 'cal-1', title: 'Work', color: '#007AFF', source: 'iCloud', isPrimary: true, allowsModifications: true },
        ];

        mockSetSelectedCalendarIds.mockResolvedValue(undefined);
        mockGetSelectedCalendars.mockResolvedValue(mockCalendars);
        mockFetchTodayEventsApple.mockResolvedValue({ events: [], error: null });

        // Set state to connected first
        useCalendarStore.setState({ appleConnected: true, isConnected: true });

        await useCalendarStore.getState().setAppleCalendars(['cal-1']);

        expect(mockSetSelectedCalendarIds).toHaveBeenCalledWith(['cal-1']);

        const state = useCalendarStore.getState();
        expect(state.appleSelectedCalendars).toHaveLength(1);
        expect(state.appleSelectedCalendars[0].id).toBe('cal-1');
    });
});

describe('Calendar Settings - Google OAuth', () => {
    it('token stored after OAuth success', async () => {
        mockStoreAuthentication.mockResolvedValue({
            success: true,
            userEmail: 'user@gmail.com',
            error: null,
        });
        mockFetchTodayEventsGoogle.mockResolvedValue({ events: [], error: null });

        const result = await useCalendarStore.getState().handleGoogleOAuthSuccess('mock-token', 'mock-refresh');

        expect(result).toBe(true);
        expect(mockStoreAuthentication).toHaveBeenCalledWith('mock-token', 'mock-refresh');

        const state = useCalendarStore.getState();
        expect(state.googleConnected).toBe(true);
        expect(state.googleEmail).toBe('user@gmail.com');
        expect(state.isConnected).toBe(true);
    });

    it('Google OAuth failure -> error state', async () => {
        mockStoreAuthentication.mockResolvedValue({
            success: false,
            userEmail: null,
            error: new Error('Auth failed'),
        });

        const result = await useCalendarStore.getState().handleGoogleOAuthSuccess('bad-token');

        expect(result).toBe(false);

        const state = useCalendarStore.getState();
        expect(state.googleConnected).toBe(false);
        expect(state.error).toBeTruthy();
    });
});

describe('Calendar Settings - Disconnect', () => {
    it('Apple: disconnect clears data and resets state', async () => {
        // Start connected
        useCalendarStore.setState({
            appleConnected: true,
            appleSelectedCalendars: [
                { id: 'cal-1', title: 'Work', color: '#007AFF', source: 'iCloud', isPrimary: true, allowsModifications: true },
            ],
            isConnected: true,
            googleConnected: false,
        });

        mockDisconnectApple.mockResolvedValue(undefined);
        mockFetchTodayEventsApple.mockResolvedValue({ events: [], error: null });

        await useCalendarStore.getState().disconnectApple();

        expect(mockDisconnectApple).toHaveBeenCalled();

        const state = useCalendarStore.getState();
        expect(state.appleConnected).toBe(false);
        expect(state.appleSelectedCalendars).toHaveLength(0);
        expect(state.isConnected).toBe(false);
    });

    it('Google: disconnect clears data and resets state', async () => {
        // Start connected
        useCalendarStore.setState({
            googleConnected: true,
            googleEmail: 'user@gmail.com',
            isConnected: true,
            appleConnected: false,
        });

        mockDisconnectGoogle.mockResolvedValue(undefined);

        await useCalendarStore.getState().disconnectGoogle();

        expect(mockDisconnectGoogle).toHaveBeenCalled();

        const state = useCalendarStore.getState();
        expect(state.googleConnected).toBe(false);
        expect(state.googleEmail).toBeNull();
        expect(state.isConnected).toBe(false);
    });
});

describe('Calendar Settings - Sync Status', () => {
    it('shows correct calendar count for Apple', () => {
        const calendars = [
            { id: 'cal-1', title: 'Work', color: '#007AFF', source: 'iCloud', isPrimary: true, allowsModifications: true },
            { id: 'cal-2', title: 'Personal', color: '#34C759', source: 'iCloud', isPrimary: false, allowsModifications: true },
            { id: 'cal-3', title: 'Family', color: '#FF3B30', source: 'Google', isPrimary: false, allowsModifications: true },
        ];

        useCalendarStore.setState({
            appleConnected: true,
            appleSelectedCalendars: calendars,
            isConnected: true,
        });

        const state = useCalendarStore.getState();
        expect(state.appleSelectedCalendars).toHaveLength(3);
        expect(state.appleConnected).toBe(true);
    });

    it('shows connected Google email', () => {
        useCalendarStore.setState({
            googleConnected: true,
            googleEmail: 'test@gmail.com',
            isConnected: true,
        });

        const state = useCalendarStore.getState();
        expect(state.googleEmail).toBe('test@gmail.com');
        expect(state.googleConnected).toBe(true);
    });

    it('lastFetched tracks sync time', () => {
        const now = Date.now();
        useCalendarStore.setState({ lastFetched: now });

        const state = useCalendarStore.getState();
        expect(state.lastFetched).toBe(now);
    });
});
