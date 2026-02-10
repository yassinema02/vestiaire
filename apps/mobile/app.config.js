import { config } from 'dotenv';
config({ path: '.env.local' });

export default {
    expo: {
        name: 'Vestiaire',
        slug: 'vestiaire',
        version: '1.0.0',
        orientation: 'portrait',
        icon: './assets/icon.png',
        userInterfaceStyle: 'light',
        scheme: 'vestiaire',
        newArchEnabled: true,
        splash: {
            image: './assets/splash-icon.png',
            resizeMode: 'contain',
            backgroundColor: '#F5F0E8',
        },
        ios: {
            supportsTablet: false,
            bundleIdentifier: 'com.vestiaire.app',
            infoPlist: {
                NSCameraUsageDescription: 'Allow Vestiaire to access your camera to photograph clothing items.',
                NSPhotoLibraryUsageDescription: 'Allow Vestiaire to access your photos to add clothing items.',
                NSPhotoLibraryAddUsageDescription: 'Allow Vestiaire to save photos to your library.',
                NSLocationWhenInUseUsageDescription: 'Vestiaire uses your location to show local weather and provide weather-appropriate outfit recommendations.',
                NSCalendarsUsageDescription: 'Vestiaire needs access to your calendar to show upcoming events and suggest appropriate outfits.',
            },
        },
        android: {
            adaptiveIcon: {
                foregroundImage: './assets/adaptive-icon.png',
                backgroundColor: '#F5F0E8',
            },
            package: 'com.vestiaire.app',
            permissions: [
                'android.permission.CAMERA',
                'android.permission.READ_EXTERNAL_STORAGE',
                'android.permission.WRITE_EXTERNAL_STORAGE',
                'android.permission.ACCESS_COARSE_LOCATION',
                'android.permission.ACCESS_FINE_LOCATION',
            ],
        },
        web: {
            bundler: 'metro',
            favicon: './assets/favicon.png',
        },
        plugins: [
            'expo-router',
            [
                'expo-camera',
                {
                    cameraPermission: 'Allow Vestiaire to access your camera to photograph clothing items.',
                },
            ],
            [
                'expo-image-picker',
                {
                    photosPermission: 'Allow Vestiaire to access your photos to add clothing items.',
                },
            ],
            [
                'expo-media-library',
                {
                    photosPermission: 'Allow Vestiaire to access your photos.',
                    savePhotosPermission: 'Allow Vestiaire to save photos to your library.',
                },
            ],
            [
                'expo-location',
                {
                    locationWhenInUsePermission: 'Vestiaire uses your location to show local weather and provide weather-appropriate outfit recommendations.',
                },
            ],
            'expo-web-browser',
            'expo-secure-store',
            [
                'expo-calendar',
                {
                    calendarPermission: 'Vestiaire needs access to your calendar to show upcoming events and suggest appropriate outfits.',
                },
            ],
        ],
        experiments: {
            typedRoutes: true,
        },
        extra: {
            supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
            supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
            geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
            googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
            googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
            router: {
                origin: false,
            },
        },
    },
};
