/**
 * Weather Store
 * Zustand store for managing weather and location state
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { weatherService, WeatherContext, DailyForecast } from '../services/weather';
import { locationService, UserLocation } from '../services/location';

const WEATHER_CACHE_KEY = '@vestiaire_weather_cache';
const FORECAST_CACHE_KEY = '@vestiaire_forecast_cache';
const LOCATION_KEY = '@vestiaire_user_location';
const WEATHER_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const FORECAST_CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours

interface WeatherState {
    weather: WeatherContext | null;
    forecast: DailyForecast[] | null;
    location: UserLocation | null;
    lastFetched: number | null;
    forecastLastFetched: number | null;
    isLoading: boolean;
    isForecastLoading: boolean;
    error: string | null;
    permissionDenied: boolean;
}

interface WeatherActions {
    initialize: () => Promise<void>;
    refreshWeather: (force?: boolean) => Promise<void>;
    refreshForecast: (force?: boolean) => Promise<void>;
    setManualLocation: (cityName: string) => Promise<boolean>;
    resetToDeviceLocation: () => Promise<void>;
    clearError: () => void;
}

type WeatherStore = WeatherState & WeatherActions;

const shouldRefreshWeather = (lastFetched: number | null): boolean => {
    if (!lastFetched) return true;
    return Date.now() - lastFetched > WEATHER_CACHE_DURATION;
};

const shouldRefreshForecast = (lastFetched: number | null): boolean => {
    if (!lastFetched) return true;
    return Date.now() - lastFetched > FORECAST_CACHE_DURATION;
};

export const useWeatherStore = create<WeatherStore>((set, get) => ({
    // State
    weather: null,
    forecast: null,
    location: null,
    lastFetched: null,
    forecastLastFetched: null,
    isLoading: false,
    isForecastLoading: false,
    error: null,
    permissionDenied: false,

    // Actions
    initialize: async () => {
        try {
            // Load cached data from AsyncStorage
            const [cachedWeather, cachedLocation, cachedForecast] = await Promise.all([
                AsyncStorage.getItem(WEATHER_CACHE_KEY),
                AsyncStorage.getItem(LOCATION_KEY),
                AsyncStorage.getItem(FORECAST_CACHE_KEY),
            ]);

            if (cachedWeather) {
                const parsed = JSON.parse(cachedWeather);
                set({
                    weather: parsed.weather,
                    lastFetched: parsed.lastFetched,
                });
            }

            if (cachedLocation) {
                const location = JSON.parse(cachedLocation);
                set({ location });
            }

            if (cachedForecast) {
                const parsed = JSON.parse(cachedForecast);
                set({
                    forecast: parsed.forecast,
                    forecastLastFetched: parsed.forecastLastFetched,
                });
            }

            // Attempt to refresh weather and forecast
            await get().refreshWeather();
            await get().refreshForecast();
        } catch (error) {
            console.error('Weather store initialization error:', error);
        }
    },

    refreshWeather: async (force = false) => {
        const state = get();

        // Skip if already loading
        if (state.isLoading) return;

        // Check cache validity (unless forced)
        if (!force && !shouldRefreshWeather(state.lastFetched) && state.weather) {
            return;
        }

        set({ isLoading: true, error: null });

        try {
            let location = state.location;

            // If no location or not manual, get device location
            if (!location || !location.isManual) {
                // Check/request permission
                const { granted } = await locationService.requestPermission();

                if (!granted) {
                    set({
                        isLoading: false,
                        permissionDenied: true,
                        error: 'Location permission denied. Please enter your city manually.',
                    });
                    return;
                }

                // Get current location
                const { location: deviceLocation, error: locError } = await locationService.getCurrentLocation();

                if (locError || !deviceLocation) {
                    set({
                        isLoading: false,
                        error: 'Unable to get your location. Please try again or enter manually.',
                    });
                    return;
                }

                location = deviceLocation;
                set({ location, permissionDenied: false });

                // Persist location
                await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(location));
            }

            // Fetch weather for location
            const { weather, error: weatherError } = await weatherService.fetchWeather(
                location.latitude,
                location.longitude
            );

            if (weatherError || !weather) {
                set({
                    isLoading: false,
                    error: 'Unable to fetch weather data. Please try again.',
                });
                return;
            }

            const now = Date.now();

            // Update state
            set({
                weather,
                lastFetched: now,
                isLoading: false,
                error: null,
            });

            // Persist to cache
            await AsyncStorage.setItem(
                WEATHER_CACHE_KEY,
                JSON.stringify({ weather, lastFetched: now })
            );
        } catch (error) {
            console.error('Weather refresh error:', error);
            set({
                isLoading: false,
                error: 'An error occurred. Please try again.',
            });
        }
    },

    refreshForecast: async (force = false) => {
        const state = get();

        // Skip if already loading
        if (state.isForecastLoading) return;

        // Check cache validity (unless forced)
        if (!force && !shouldRefreshForecast(state.forecastLastFetched) && state.forecast) {
            return;
        }

        // Need location to fetch forecast
        if (!state.location) {
            return;
        }

        set({ isForecastLoading: true });

        try {
            const { forecast, error: forecastError } = await weatherService.fetchForecast(
                state.location.latitude,
                state.location.longitude
            );

            if (forecastError || !forecast) {
                set({ isForecastLoading: false });
                return;
            }

            const now = Date.now();

            set({
                forecast,
                forecastLastFetched: now,
                isForecastLoading: false,
            });

            // Persist to cache
            await AsyncStorage.setItem(
                FORECAST_CACHE_KEY,
                JSON.stringify({ forecast, forecastLastFetched: now })
            );
        } catch (error) {
            console.error('Forecast refresh error:', error);
            set({ isForecastLoading: false });
        }
    },

    setManualLocation: async (cityName: string) => {
        set({ isLoading: true, error: null });

        try {
            const { location, error } = await locationService.geocodeCity(cityName);

            if (error || !location) {
                set({
                    isLoading: false,
                    error: `Could not find "${cityName}". Please check the spelling.`,
                });
                return false;
            }

            // Save location
            set({ location, permissionDenied: false });
            await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(location));

            // Fetch weather for new location
            const { weather, error: weatherError } = await weatherService.fetchWeather(
                location.latitude,
                location.longitude
            );

            if (weatherError || !weather) {
                set({
                    isLoading: false,
                    error: 'Location set, but unable to fetch weather.',
                });
                return true; // Location was set successfully
            }

            const now = Date.now();
            set({
                weather,
                lastFetched: now,
                isLoading: false,
                error: null,
            });

            await AsyncStorage.setItem(
                WEATHER_CACHE_KEY,
                JSON.stringify({ weather, lastFetched: now })
            );

            // Also refresh forecast for new location
            await get().refreshForecast(true);

            return true;
        } catch (error) {
            console.error('Set manual location error:', error);
            set({
                isLoading: false,
                error: 'An error occurred. Please try again.',
            });
            return false;
        }
    },

    resetToDeviceLocation: async () => {
        // Clear stored location to force device location lookup
        await AsyncStorage.removeItem(LOCATION_KEY);
        set({ location: null, permissionDenied: false });

        // Refresh weather and forecast with device location
        await get().refreshWeather(true);
        await get().refreshForecast(true);
    },

    clearError: () => set({ error: null }),
}));
