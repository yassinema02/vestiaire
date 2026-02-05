/**
 * Forecast Widget Component
 * Displays 5-day weather forecast in a collapsible section
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    LayoutAnimation,
    Platform,
    UIManager,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWeatherStore } from '../../stores/weatherStore';
import { DailyForecast } from '../../services/weather';
import { getClothingSuggestions, getWeatherSummary } from '../../utils/weatherClothingMap';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ForecastDayCardProps {
    day: DailyForecast;
    onPress: () => void;
}

function ForecastDayCard({ day, onPress }: ForecastDayCardProps) {
    const getWeatherIconName = (): keyof typeof Ionicons.glyphMap => {
        const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            'sunny': 'sunny',
            'partly-sunny': 'partly-sunny',
            'cloudy': 'cloudy',
            'cloud': 'cloud',
            'rainy': 'rainy',
            'snow': 'snow',
            'thunderstorm': 'thunderstorm',
        };
        return iconMap[day.icon] || 'cloud-outline';
    };

    return (
        <TouchableOpacity style={styles.dayCard} onPress={onPress} activeOpacity={0.7}>
            <Text style={styles.dayName} numberOfLines={1}>{day.dayName}</Text>
            <Ionicons name={getWeatherIconName()} size={28} color="#f59e0b" style={styles.dayIcon} />
            <View style={styles.tempRow}>
                <Text style={styles.tempHigh}>{day.tempHigh}°</Text>
                <Text style={styles.tempLow}>{day.tempLow}°</Text>
            </View>
            {day.precipitationChance > 0 && (
                <View style={styles.precipRow}>
                    <Ionicons name="water-outline" size={12} color="#60a5fa" />
                    <Text style={styles.precipText}>{day.precipitationChance}%</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

interface ForecastDetailModalProps {
    visible: boolean;
    day: DailyForecast | null;
    onClose: () => void;
}

function ForecastDetailModal({ visible, day, onClose }: ForecastDetailModalProps) {
    if (!day) return null;

    const suggestions = getClothingSuggestions(day.tempHigh, day.weatherCode, day.precipitationChance);
    const summary = getWeatherSummary(suggestions.tempCategory);

    const getWeatherIconName = (): keyof typeof Ionicons.glyphMap => {
        const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            'sunny': 'sunny',
            'partly-sunny': 'partly-sunny',
            'cloudy': 'cloudy',
            'cloud': 'cloud',
            'rainy': 'rainy',
            'snow': 'snow',
            'thunderstorm': 'thunderstorm',
        };
        return iconMap[day.icon] || 'cloud-outline';
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{day.dayName}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#1f2937" />
                        </TouchableOpacity>
                    </View>

                    {/* Weather Info */}
                    <View style={styles.modalWeatherSection}>
                        <Ionicons name={getWeatherIconName()} size={48} color="#f59e0b" />
                        <View style={styles.modalWeatherInfo}>
                            <Text style={styles.modalCondition}>{day.condition}</Text>
                            <Text style={styles.modalTemps}>
                                <Text style={styles.modalTempHigh}>{day.tempHigh}°</Text>
                                <Text style={styles.modalTempSeparator}> / </Text>
                                <Text style={styles.modalTempLow}>{day.tempLow}°</Text>
                            </Text>
                            {day.precipitationChance > 0 && (
                                <View style={styles.modalPrecipRow}>
                                    <Ionicons name="water" size={14} color="#60a5fa" />
                                    <Text style={styles.modalPrecipText}>
                                        {day.precipitationChance}% chance of precipitation
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Summary */}
                    <View style={styles.summaryBadge}>
                        <Text style={styles.summaryText}>{summary}</Text>
                    </View>

                    {/* Clothing Suggestions */}
                    <View style={styles.suggestionsSection}>
                        <Text style={styles.suggestionsTitle}>What to wear</Text>
                        <View style={styles.categoriesRow}>
                            {suggestions.categories.slice(0, 4).map((category, index) => (
                                <View key={index} style={styles.categoryChip}>
                                    <Text style={styles.categoryText}>
                                        {category.charAt(0).toUpperCase() + category.slice(1)}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {suggestions.tips.length > 0 && (
                            <View style={styles.tipsSection}>
                                {suggestions.tips.slice(0, 3).map((tip, index) => (
                                    <View key={index} style={styles.tipRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                        <Text style={styles.tipText}>{tip}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Action Button (Placeholder for Epic 4) */}
                    <TouchableOpacity style={styles.suggestionButton} activeOpacity={0.8}>
                        <Ionicons name="sparkles" size={18} color="#fff" />
                        <Text style={styles.suggestionButtonText}>Get Outfit Suggestion</Text>
                    </TouchableOpacity>
                    <Text style={styles.comingSoonText}>Coming soon in a future update</Text>
                </View>
            </View>
        </Modal>
    );
}

export function ForecastWidget() {
    const { forecast, isForecastLoading, refreshForecast } = useWeatherStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedDay, setSelectedDay] = useState<DailyForecast | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const toggleExpanded = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);

        // Refresh forecast when expanding if needed
        if (!isExpanded) {
            refreshForecast();
        }
    };

    const handleDayPress = (day: DailyForecast) => {
        setSelectedDay(day);
        setShowDetailModal(true);
    };

    const handleCloseModal = () => {
        setShowDetailModal(false);
        setSelectedDay(null);
    };

    // Loading state when no forecast
    if (isForecastLoading && !forecast) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Ionicons name="calendar-outline" size={20} color="#6366f1" />
                        <Text style={styles.headerTitle}>5-Day Forecast</Text>
                    </View>
                    <ActivityIndicator size="small" color="#6366f1" />
                </View>
            </View>
        );
    }

    // No forecast data
    if (!forecast || forecast.length === 0) {
        return (
            <TouchableOpacity style={styles.container} onPress={() => refreshForecast(true)}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Ionicons name="calendar-outline" size={20} color="#9ca3af" />
                        <Text style={[styles.headerTitle, styles.headerTitleMuted]}>5-Day Forecast</Text>
                    </View>
                    <Text style={styles.loadText}>Tap to load</Text>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header (always visible) */}
            <TouchableOpacity style={styles.header} onPress={toggleExpanded} activeOpacity={0.7}>
                <View style={styles.headerLeft}>
                    <Ionicons name="calendar-outline" size={20} color="#6366f1" />
                    <Text style={styles.headerTitle}>5-Day Forecast</Text>
                </View>
                <View style={styles.headerRight}>
                    {isForecastLoading && (
                        <ActivityIndicator size="small" color="#6366f1" style={styles.loadingIndicator} />
                    )}
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#9ca3af"
                    />
                </View>
            </TouchableOpacity>

            {/* Forecast Cards (visible when expanded) */}
            {isExpanded && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.forecastScroll}
                    style={styles.forecastContainer}
                >
                    {forecast.map((day, index) => (
                        <ForecastDayCard
                            key={day.date}
                            day={day}
                            onPress={() => handleDayPress(day)}
                        />
                    ))}
                </ScrollView>
            )}

            {/* Detail Modal */}
            <ForecastDetailModal
                visible={showDetailModal}
                day={selectedDay}
                onClose={handleCloseModal}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    headerTitleMuted: {
        color: '#9ca3af',
    },
    loadText: {
        fontSize: 13,
        color: '#9ca3af',
    },
    loadingIndicator: {
        marginRight: 4,
    },
    forecastContainer: {
        paddingBottom: 16,
    },
    forecastScroll: {
        paddingHorizontal: 12,
        gap: 8,
    },
    // Day Card
    dayCard: {
        width: 82,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    dayName: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 8,
        textAlign: 'center',
    },
    dayIcon: {
        marginBottom: 8,
    },
    tempRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    tempHigh: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
    },
    tempLow: {
        fontSize: 14,
        color: '#9ca3af',
    },
    precipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginTop: 4,
    },
    precipText: {
        fontSize: 11,
        color: '#60a5fa',
    },
    // Modal Styles
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
        maxWidth: 360,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
    },
    modalWeatherSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    modalWeatherInfo: {
        flex: 1,
    },
    modalCondition: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    modalTemps: {
        fontSize: 14,
    },
    modalTempHigh: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
    },
    modalTempSeparator: {
        color: '#9ca3af',
    },
    modalTempLow: {
        fontSize: 16,
        color: '#9ca3af',
    },
    modalPrecipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
    },
    modalPrecipText: {
        fontSize: 13,
        color: '#60a5fa',
    },
    summaryBadge: {
        backgroundColor: '#f0fdf4',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    summaryText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#166534',
        textAlign: 'center',
    },
    suggestionsSection: {
        marginBottom: 16,
    },
    suggestionsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 10,
    },
    categoriesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    categoryChip: {
        backgroundColor: '#eef2ff',
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#4f46e5',
    },
    tipsSection: {
        gap: 8,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    tipText: {
        flex: 1,
        fontSize: 13,
        color: '#4b5563',
        lineHeight: 18,
    },
    suggestionButton: {
        backgroundColor: '#6366f1',
        borderRadius: 12,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: 0.5,
    },
    suggestionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    comingSoonText: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 8,
    },
});
