/**
 * Location Service
 * Handles device location access and geocoding
 */

import * as Location from 'expo-location';

export interface UserLocation {
    latitude: number;
    longitude: number;
    city: string | null;
    isManual: boolean;
}

export interface LocationPermissionResult {
    granted: boolean;
    canAskAgain: boolean;
}

export const locationService = {
    /**
     * Request foreground location permission
     */
    requestPermission: async (): Promise<LocationPermissionResult> => {
        try {
            const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
            return {
                granted: status === 'granted',
                canAskAgain,
            };
        } catch (error) {
            console.error('Location permission error:', error);
            return { granted: false, canAskAgain: false };
        }
    },

    /**
     * Check current permission status
     */
    checkPermission: async (): Promise<LocationPermissionResult> => {
        try {
            const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
            return {
                granted: status === 'granted',
                canAskAgain,
            };
        } catch (error) {
            console.error('Check permission error:', error);
            return { granted: false, canAskAgain: false };
        }
    },

    /**
     * Get current device location
     */
    getCurrentLocation: async (): Promise<{ location: UserLocation | null; error: Error | null }> => {
        try {
            // Check permission first
            const { granted } = await locationService.checkPermission();
            if (!granted) {
                return { location: null, error: new Error('Location permission not granted') };
            }

            // Get current position
            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            // Attempt reverse geocoding to get city name
            let city: string | null = null;
            try {
                const [geocode] = await Location.reverseGeocodeAsync({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                if (geocode) {
                    city = geocode.city || geocode.subregion || geocode.region || null;
                }
            } catch (geocodeError) {
                console.warn('Reverse geocoding failed:', geocodeError);
                // Continue without city name
            }

            const location: UserLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                city,
                isManual: false,
            };

            return { location, error: null };
        } catch (error) {
            console.error('Get location error:', error);
            return { location: null, error: error as Error };
        }
    },

    /**
     * Geocode city name to coordinates
     */
    geocodeCity: async (cityName: string): Promise<{ location: UserLocation | null; error: Error | null }> => {
        try {
            const results = await Location.geocodeAsync(cityName);

            if (results.length === 0) {
                return { location: null, error: new Error('City not found') };
            }

            const location: UserLocation = {
                latitude: results[0].latitude,
                longitude: results[0].longitude,
                city: cityName,
                isManual: true,
            };

            return { location, error: null };
        } catch (error) {
            console.error('Geocode error:', error);
            return { location: null, error: error as Error };
        }
    },
};
