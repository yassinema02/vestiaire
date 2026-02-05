/**
 * Weather Service
 * Handles weather data fetching from Open-Meteo API
 */

// Open-Meteo API types for current weather
export interface OpenMeteoResponse {
    latitude: number;
    longitude: number;
    current: {
        time: string;
        temperature_2m: number;
        apparent_temperature: number;
        relative_humidity_2m: number;
        weather_code: number;
        wind_speed_10m: number;
    };
    current_units: {
        temperature_2m: string;
        apparent_temperature: string;
    };
}

// Open-Meteo API types for forecast
export interface OpenMeteoForecastResponse {
    latitude: number;
    longitude: number;
    timezone: string;
    current: {
        time: string;
        temperature_2m: number;
        apparent_temperature: number;
        relative_humidity_2m: number;
        weather_code: number;
        wind_speed_10m: number;
    };
    daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        weather_code: number[];
        precipitation_probability_max: number[];
    };
    daily_units: {
        temperature_2m_max: string;
        temperature_2m_min: string;
        precipitation_probability_max: string;
    };
}

// Daily forecast for a single day
export interface DailyForecast {
    date: string;
    dayName: string;
    tempHigh: number;
    tempLow: number;
    condition: string;
    weatherCode: number;
    icon: string;
    precipitationChance: number;
}

// Weather context for app use
export interface WeatherContext {
    temp: number;
    feels_like: number;
    condition: string;
    humidity: number;
    wind_speed: number;
    weather_code: number;
    icon: string;
}

// WMO Weather interpretation codes mapping
const WEATHER_CODE_MAP: Record<number, { condition: string; icon: string }> = {
    0: { condition: 'Clear sky', icon: 'sunny' },
    1: { condition: 'Mainly clear', icon: 'partly-sunny' },
    2: { condition: 'Partly cloudy', icon: 'partly-sunny' },
    3: { condition: 'Overcast', icon: 'cloudy' },
    45: { condition: 'Fog', icon: 'cloud' },
    48: { condition: 'Depositing rime fog', icon: 'cloud' },
    51: { condition: 'Light drizzle', icon: 'rainy' },
    53: { condition: 'Moderate drizzle', icon: 'rainy' },
    55: { condition: 'Dense drizzle', icon: 'rainy' },
    56: { condition: 'Freezing drizzle', icon: 'rainy' },
    57: { condition: 'Dense freezing drizzle', icon: 'rainy' },
    61: { condition: 'Slight rain', icon: 'rainy' },
    63: { condition: 'Moderate rain', icon: 'rainy' },
    65: { condition: 'Heavy rain', icon: 'rainy' },
    66: { condition: 'Freezing rain', icon: 'rainy' },
    67: { condition: 'Heavy freezing rain', icon: 'rainy' },
    71: { condition: 'Slight snow', icon: 'snow' },
    73: { condition: 'Moderate snow', icon: 'snow' },
    75: { condition: 'Heavy snow', icon: 'snow' },
    77: { condition: 'Snow grains', icon: 'snow' },
    80: { condition: 'Slight rain showers', icon: 'rainy' },
    81: { condition: 'Moderate rain showers', icon: 'rainy' },
    82: { condition: 'Violent rain showers', icon: 'thunderstorm' },
    85: { condition: 'Slight snow showers', icon: 'snow' },
    86: { condition: 'Heavy snow showers', icon: 'snow' },
    95: { condition: 'Thunderstorm', icon: 'thunderstorm' },
    96: { condition: 'Thunderstorm with hail', icon: 'thunderstorm' },
    99: { condition: 'Thunderstorm with heavy hail', icon: 'thunderstorm' },
};

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Map WMO weather code to condition and icon
 */
export const mapWeatherCode = (code: number): { condition: string; icon: string } => {
    return WEATHER_CODE_MAP[code] || { condition: 'Unknown', icon: 'help-circle' };
};

export const weatherService = {
    /**
     * Fetch current weather for given coordinates
     */
    fetchWeather: async (
        latitude: number,
        longitude: number
    ): Promise<{ weather: WeatherContext | null; error: Error | null }> => {
        try {
            const params = new URLSearchParams({
                latitude: latitude.toString(),
                longitude: longitude.toString(),
                current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
            });

            const response = await fetch(`${OPEN_METEO_BASE_URL}?${params}`);

            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }

            const data: OpenMeteoResponse = await response.json();

            if (!data.current) {
                throw new Error('Invalid weather data received');
            }

            const { condition, icon } = mapWeatherCode(data.current.weather_code);

            const weather: WeatherContext = {
                temp: Math.round(data.current.temperature_2m),
                feels_like: Math.round(data.current.apparent_temperature),
                condition,
                humidity: data.current.relative_humidity_2m,
                wind_speed: Math.round(data.current.wind_speed_10m),
                weather_code: data.current.weather_code,
                icon,
            };

            return { weather, error: null };
        } catch (error) {
            console.error('Weather fetch error:', error);
            return { weather: null, error: error as Error };
        }
    },

    /**
     * Get weather icon name for Ionicons
     */
    getWeatherIcon: (weatherCode: number): string => {
        const { icon } = mapWeatherCode(weatherCode);
        return icon;
    },

    /**
     * Get weather condition description
     */
    getWeatherCondition: (weatherCode: number): string => {
        const { condition } = mapWeatherCode(weatherCode);
        return condition;
    },

    /**
     * Fetch 5-day weather forecast for given coordinates
     */
    fetchForecast: async (
        latitude: number,
        longitude: number
    ): Promise<{ forecast: DailyForecast[] | null; error: Error | null }> => {
        try {
            const params = new URLSearchParams({
                latitude: latitude.toString(),
                longitude: longitude.toString(),
                daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max',
                timezone: 'auto',
                forecast_days: '5',
            });

            const response = await fetch(`${OPEN_METEO_BASE_URL}?${params}`);

            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }

            const data: OpenMeteoForecastResponse = await response.json();

            if (!data.daily || !data.daily.time) {
                throw new Error('Invalid forecast data received');
            }

            const forecast: DailyForecast[] = data.daily.time.map((dateStr, index) => {
                const { condition, icon } = mapWeatherCode(data.daily.weather_code[index]);
                const dayName = getDayName(dateStr, index);

                return {
                    date: dateStr,
                    dayName,
                    tempHigh: Math.round(data.daily.temperature_2m_max[index]),
                    tempLow: Math.round(data.daily.temperature_2m_min[index]),
                    condition,
                    weatherCode: data.daily.weather_code[index],
                    icon,
                    precipitationChance: data.daily.precipitation_probability_max[index] ?? 0,
                };
            });

            return { forecast, error: null };
        } catch (error) {
            console.error('Forecast fetch error:', error);
            return { forecast: null, error: error as Error };
        }
    },
};

/**
 * Get human-readable day name from date string
 */
function getDayName(dateStr: string, index: number): string {
    if (index === 0) return 'Today';
    if (index === 1) return 'Tomorrow';

    const date = new Date(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}
