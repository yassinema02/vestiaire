// Global mock for expo-constants
jest.mock('expo-constants', () => ({
    __esModule: true,
    default: {
        expoConfig: {
            extra: {
                geminiApiKey: 'test-key',
                supabaseUrl: 'https://test.supabase.co',
                supabaseAnonKey: 'test-anon-key',
            },
        },
        appOwnership: 'expo',
    },
}));
