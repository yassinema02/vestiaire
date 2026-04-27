/**
 * Trip Weather Service
 * Geocode destinations + fetch forecast/climate from Open-Meteo
 * All APIs are free, no key required
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GeocodedLocation, DailyWeatherForecast } from '../types/packingList';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

const GEOCODE_CACHE_PREFIX = 'geocode_';
const GEOCODE_API = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';
const HISTORICAL_API = 'https://archive-api.open-meteo.com/v1/archive';

function getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

/**
 * Geocode a destination name to lat/lon
 * Cached in AsyncStorage by destination string
 */
async function geocodeDestination(name: string): Promise<GeocodedLocation | null> {
    const cacheKey = GEOCODE_CACHE_PREFIX + name.toLowerCase().trim();

    // Check cache
    try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch {}

    try {
        const params = new URLSearchParams({ name: name.trim(), count: '1', language: 'en' });
        const res = await fetchWithTimeout(`${GEOCODE_API}?${params}`, { timeout: 10_000 });
        if (!res.ok) return null;

        const data = await res.json();
        if (!data.results?.length) return null;

        const result = data.results[0];
        const location: GeocodedLocation = {
            lat: result.latitude,
            lon: result.longitude,
            displayName: result.name + (result.country ? `, ${result.country}` : ''),
        };

        // Cache result
        await AsyncStorage.setItem(cacheKey, JSON.stringify(location));
        return location;
    } catch (err) {
        console.warn('Geocoding failed for:', name, err);
        return null;
    }
}

/**
 * Fetch daily weather forecast for a location and date range
 * Uses forecast API for <=16 days out, historical archive API for further
 */
async function getTripForecast(
    lat: number,
    lon: number,
    startDate: string,
    endDate: string
): Promise<DailyWeatherForecast[]> {
    const today = new Date().toISOString().split('T')[0];
    const maxForecastDate = new Date();
    maxForecastDate.setDate(maxForecastDate.getDate() + 16);
    const maxForecast = maxForecastDate.toISOString().split('T')[0];

    const forecasts: DailyWeatherForecast[] = [];

    // Split dates into forecast-able and historical ranges
    const forecastEnd = endDate <= maxForecast ? endDate : maxForecast;
    const needsHistorical = endDate > maxForecast;
    const historicalStart = startDate > maxForecast ? startDate : maxForecast;

    // Fetch forecast for near-term dates
    if (startDate <= maxForecast) {
        const effectiveStart = startDate >= today ? startDate : today;
        try {
            const params = new URLSearchParams({
                latitude: String(lat),
                longitude: String(lon),
                start_date: effectiveStart,
                end_date: forecastEnd,
                daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
                timezone: 'auto',
            });
            const res = await fetchWithTimeout(`${FORECAST_API}?${params}`, { timeout: 10_000 });
            if (res.ok) {
                const data = await res.json();
                const daily = data.daily;
                if (daily?.time) {
                    for (let i = 0; i < daily.time.length; i++) {
                        forecasts.push({
                            date: daily.time[i],
                            tempHigh: Math.round(daily.temperature_2m_max[i]),
                            tempLow: Math.round(daily.temperature_2m_min[i]),
                            precipitationProbability: daily.precipitation_probability_max?.[i] ?? 0,
                            weatherCode: daily.weather_code[i],
                        });
                    }
                }
            }
        } catch (err) {
            console.warn('Forecast fetch failed:', err);
        }
    }

    // Fetch historical averages for dates beyond 16-day forecast
    // Strategy: look at same dates last year as a proxy for expected weather
    if (needsHistorical) {
        try {
            const lastYearStart = new Date(historicalStart);
            lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
            const lastYearEnd = new Date(endDate);
            lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

            const params = new URLSearchParams({
                latitude: String(lat),
                longitude: String(lon),
                start_date: lastYearStart.toISOString().split('T')[0],
                end_date: lastYearEnd.toISOString().split('T')[0],
                daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
                timezone: 'auto',
            });
            const res = await fetchWithTimeout(`${HISTORICAL_API}?${params}`, { timeout: 10_000 });
            if (res.ok) {
                const data = await res.json();
                const daily = data.daily;
                if (daily?.time) {
                    // Map last year's dates to this year's dates
                    const dates = getDateRange(historicalStart, endDate);
                    for (let i = 0; i < Math.min(daily.time.length, dates.length); i++) {
                        const targetDate = dates[i];
                        if (!forecasts.find(f => f.date === targetDate)) {
                            forecasts.push({
                                date: targetDate,
                                tempHigh: Math.round(daily.temperature_2m_max?.[i] ?? 20),
                                tempLow: Math.round(daily.temperature_2m_min?.[i] ?? 10),
                                precipitationProbability: (daily.precipitation_sum?.[i] ?? 0) > 1 ? 60 : 10,
                                weatherCode: daily.weather_code?.[i] ?? 0,
                            });
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('Historical weather fetch failed:', err);
        }
    }

    return forecasts.sort((a, b) => a.date.localeCompare(b.date));
}

export const tripWeatherService = {
    geocodeDestination,
    getTripForecast,
};
