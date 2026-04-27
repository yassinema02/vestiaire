/**
 * Weather Widget Component
 * Displays current weather with temperature, condition, and feels-like
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWeatherStore } from '../../stores/weatherStore';
import { appTheme } from '../../theme/tokens';
import { Text } from '../ui/Typography';

interface WeatherWidgetProps {
  compact?: boolean;
}

export function WeatherWidget({ compact = false }: WeatherWidgetProps) {
  const {
    weather,
    location,
    isLoading,
    error,
    permissionDenied,
    refreshWeather,
    setManualLocation,
    clearError,
  } = useWeatherStore();

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [isSettingCity, setIsSettingCity] = useState(false);

  const handleRetry = () => {
    clearError();
    refreshWeather(true);
  };

  const handleSetCity = async () => {
    if (!cityInput.trim()) return;

    setIsSettingCity(true);
    const success = await setManualLocation(cityInput.trim());
    setIsSettingCity(false);

    if (success) {
      setShowLocationModal(false);
      setCityInput('');
    }
  };

  const getWeatherIconName = (): keyof typeof Ionicons.glyphMap => {
    if (!weather) return 'cloud-outline';

    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      sunny: 'sunny',
      'partly-sunny': 'partly-sunny',
      cloudy: 'cloudy',
      cloud: 'cloud',
      rainy: 'rainy',
      snow: 'snow',
      thunderstorm: 'thunderstorm',
    };

    return iconMap[weather.icon] || 'cloud-outline';
  };

  // Loading state
  if (isLoading && !weather) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="small" color={appTheme.palette.accent} />
          <Text style={styles.loadingText}>Getting weather...</Text>
        </View>
      </View>
    );
  }

  // Permission denied - show manual entry prompt
  if (permissionDenied && !weather) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <TouchableOpacity
          style={styles.permissionContent}
          onPress={() => setShowLocationModal(true)}
        >
          <Ionicons name="location-outline" size={24} color={appTheme.palette.accent} />
          <Text style={styles.permissionText}>Tap to enter your city</Text>
        </TouchableOpacity>
        {renderLocationModal()}
      </View>
    );
  }

  // Error state
  if (error && !weather) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <View style={styles.errorContent}>
          <Ionicons name="cloud-offline-outline" size={24} color={appTheme.palette.danger} />
          <Text style={styles.errorText} numberOfLines={1}>
            {error}
          </Text>
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // No weather data yet
  if (!weather) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <TouchableOpacity style={styles.emptyContent} onPress={handleRetry}>
          <Ionicons name="cloud-outline" size={24} color="#9ca3af" />
          <Text style={styles.emptyText}>Tap to load weather</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderLocationModal() {
    return (
      <Modal
        visible={showLocationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Enter your city to get local weather</Text>

            <TextInput
              style={styles.cityInput}
              placeholder="e.g., London, Paris, New York"
              placeholderTextColor="#9ca3af"
              value={cityInput}
              onChangeText={setCityInput}
              autoCapitalize="words"
              autoFocus
            />

            {error && <Text style={styles.modalError}>{error}</Text>}

            <TouchableOpacity
              style={[
                styles.setButton,
                (!cityInput.trim() || isSettingCity) && styles.setButtonDisabled,
              ]}
              onPress={handleSetCity}
              disabled={!cityInput.trim() || isSettingCity}
            >
              {isSettingCity ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.setButtonText}>Set Location</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Weather display
  return (
    <TouchableOpacity
      style={[styles.container, compact && styles.containerCompact]}
      onPress={() => setShowLocationModal(true)}
      activeOpacity={0.7}
    >
      <View style={styles.weatherContent}>
        <View style={styles.mainInfo}>
          <Ionicons
            name={getWeatherIconName()}
            size={compact ? 28 : 36}
            color={appTheme.palette.gold}
          />
          <Text style={[styles.temperature, compact && styles.temperatureCompact]}>
            {weather.temp}°
          </Text>
        </View>

        <View style={styles.detailsInfo}>
          <Text style={styles.condition} numberOfLines={1}>
            {weather.condition}
          </Text>
          <Text style={styles.feelsLike}>Feels like {weather.feels_like}°</Text>
          {location?.city && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={appTheme.palette.textSoft} />
              <Text style={styles.cityText} numberOfLines={1}>
                {location.city}
              </Text>
            </View>
          )}
        </View>

        {isLoading && (
          <ActivityIndicator
            size="small"
            color={appTheme.palette.accent}
            style={styles.refreshIndicator}
          />
        )}
      </View>

      {renderLocationModal()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: appTheme.palette.surfaceRaised,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.22)',
    ...appTheme.shadows.card,
  },
  containerCompact: {
    padding: 12,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: appTheme.palette.textMuted,
  },
  permissionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  permissionText: {
    fontSize: 14,
    color: appTheme.palette.accent,
    fontWeight: '700',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: appTheme.palette.danger,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(180, 72, 58, 0.09)',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 13,
    color: appTheme.palette.danger,
    fontWeight: '700',
  },
  emptyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 14,
    color: appTheme.palette.textSoft,
  },
  weatherContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  temperature: {
    fontSize: 32,
    fontWeight: '700',
    color: appTheme.palette.text,
  },
  temperatureCompact: {
    fontSize: 24,
  },
  detailsInfo: {
    flex: 1,
    marginLeft: 12,
  },
  condition: {
    fontSize: 14,
    fontWeight: '700',
    color: appTheme.palette.text,
  },
  feelsLike: {
    fontSize: 12,
    color: appTheme.palette.textMuted,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cityText: {
    fontSize: 12,
    color: appTheme.palette.textSoft,
  },
  refreshIndicator: {
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  cityInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },
  modalError: {
    fontSize: 13,
    color: '#ef4444',
    marginBottom: 12,
  },
  setButton: {
    backgroundColor: '#87A96B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  setButtonDisabled: {
    backgroundColor: '#D9C7B4',
  },
  setButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
