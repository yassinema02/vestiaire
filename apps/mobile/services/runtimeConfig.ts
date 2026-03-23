import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

function getString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

export const runtimeConfig = {
    supabaseUrl: getString(extra.supabaseUrl, process.env.EXPO_PUBLIC_SUPABASE_URL || ''),
    supabaseAnonKey: getString(extra.supabaseAnonKey, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''),
    googleIosClientId: getString(extra.googleIosClientId, process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || ''),
    googleWebClientId: getString(extra.googleWebClientId, process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || ''),
    googleAuthProxyRedirectUri: getString(extra.googleAuthProxyRedirectUri, ''),
    geminiApiKey: getString(extra.geminiApiKey, process.env.EXPO_PUBLIC_GEMINI_API_KEY || ''),
};

export function hasRuntimeValue(value: string): boolean {
    return Boolean(value && value !== 'your_api_key_here');
}
