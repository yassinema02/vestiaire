/**
 * Home Tab
 * Main dashboard with weather and outfit suggestions
 */

import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useWeatherStore } from '../../stores/weatherStore';
import { useCalendarStore } from '../../stores/calendarStore';
import { WeatherWidget } from '../../components/features/WeatherWidget';
import { ForecastWidget } from '../../components/features/ForecastWidget';
import { EventsWidget } from '../../components/features/EventsWidget';
import { OutfitSuggestionWidget } from '../../components/features/OutfitSuggestionWidget';
import { itemsService } from '../../services/items';
import { countNeglected } from '../../utils/neglectedItems';

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export default function HomeScreen() {
    const router = useRouter();
    const { user, signOut } = useAuthStore();
    const { initialize, refreshWeather, refreshForecast } = useWeatherStore();
    const {
        initialize: initializeCalendar,
        refreshEvents,
    } = useCalendarStore();
    const [neglectedCount, setNeglectedCount] = useState(0);

    // Initialize weather and calendar stores on mount
    useEffect(() => {
        initialize();
        initializeCalendar();
    }, []);

    // Refresh weather, forecast, events, and neglected count when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            refreshWeather();
            refreshForecast();
            refreshEvents();
            itemsService.getItems().then(({ items }) => {
                setNeglectedCount(countNeglected(items));
            });
        }, [])
    );

    const handleConnectCalendar = () => {
        // Navigate to profile tab where calendar connection is handled
        router.push('/(tabs)/profile');
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>{getGreeting()}!</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>
                <TouchableOpacity style={styles.notificationButton}>
                    <Ionicons name="notifications-outline" size={24} color="#1f2937" />
                </TouchableOpacity>
            </View>

            {/* Weather Widget */}
            <View style={styles.weatherSection}>
                <WeatherWidget />
            </View>

            {/* 5-Day Forecast */}
            <View style={styles.forecastSection}>
                <ForecastWidget />
            </View>

            {/* Today's Events */}
            <View style={styles.eventsSection}>
                <EventsWidget onConnectPress={handleConnectCalendar} />
            </View>

            {/* AI Outfit Suggestions */}
            <View style={styles.section}>
                <OutfitSuggestionWidget
                    onAddItemsPress={() => router.push('/(tabs)/add')}
                />
            </View>

            {/* Log Today's Outfit */}
            <View style={styles.section}>
                <TouchableOpacity
                    style={styles.logWearButton}
                    onPress={() => router.push('/(tabs)/log-wear')}
                    activeOpacity={0.8}
                >
                    <View style={styles.logWearIcon}>
                        <Ionicons name="checkmark-done" size={24} color="#fff" />
                    </View>
                    <View style={styles.logWearContent}>
                        <Text style={styles.logWearTitle}>Log Today's Outfit</Text>
                        <Text style={styles.logWearSubtitle}>Track what you're wearing</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#7D9A78" />
                </TouchableOpacity>
            </View>

            {/* Neglected Items Summary */}
            {neglectedCount > 0 && (
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.neglectedCard}
                        onPress={() => router.push('/(tabs)/wardrobe')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.neglectedIcon}>
                            <Ionicons name="moon-outline" size={22} color="#fff" />
                        </View>
                        <View style={styles.neglectedContent}>
                            <Text style={styles.neglectedTitle}>Forgotten Items</Text>
                            <Text style={styles.neglectedSubtitle}>
                                {neglectedCount} item{neglectedCount !== 1 ? 's' : ''} haven't been worn in 2+ months
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#f59e0b" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Wardrobe Analytics */}
            <View style={styles.section}>
                <TouchableOpacity
                    style={styles.analyticsButton}
                    onPress={() => router.push('/(tabs)/analytics')}
                    activeOpacity={0.8}
                >
                    <View style={styles.analyticsIcon}>
                        <Ionicons name="trophy" size={24} color="#fff" />
                    </View>
                    <View style={styles.analyticsContent}>
                        <Text style={styles.analyticsTitle}>Wardrobe Analytics</Text>
                        <Text style={styles.analyticsSubtitle}>See your most-worn items</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#6366f1" />
                </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/add')}>
                        <Ionicons name="camera-outline" size={24} color="#6366f1" />
                        <Text style={styles.actionText}>Add Item</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/wardrobe')}>
                        <Ionicons name="grid-outline" size={24} color="#6366f1" />
                        <Text style={styles.actionText}>Wardrobe</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/outfits')}>
                        <Ionicons name="sparkles-outline" size={24} color="#6366f1" />
                        <Text style={styles.actionText}>Outfits</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
                <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    contentContainer: {
        paddingTop: 60,
        paddingBottom: 120,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    greeting: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#6b7280',
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    weatherSection: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    forecastSection: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    eventsSection: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    section: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },
    placeholderCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    placeholderIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    placeholderTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    placeholderSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    neglectedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fffbeb',
        borderRadius: 16,
        padding: 16,
        gap: 14,
        borderWidth: 1,
        borderColor: '#fde68a',
    },
    neglectedIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#f59e0b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    neglectedContent: {
        flex: 1,
    },
    neglectedTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#92400e',
        marginBottom: 2,
    },
    neglectedSubtitle: {
        fontSize: 13,
        color: '#b45309',
    },
    logWearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    logWearIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#7D9A78',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logWearContent: {
        flex: 1,
    },
    logWearTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    logWearSubtitle: {
        fontSize: 13,
        color: '#6b7280',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#4b5563',
        marginTop: 8,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 24,
        marginTop: 8,
        padding: 16,
        backgroundColor: '#fee2e2',
        borderRadius: 12,
        gap: 8,
    },
    signOutText: {
        color: '#dc2626',
        fontWeight: '600',
    },
    analyticsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eef2ff',
        borderRadius: 16,
        padding: 16,
        gap: 14,
        borderWidth: 1,
        borderColor: '#c7d2fe',
    },
    analyticsIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    analyticsContent: {
        flex: 1,
    },
    analyticsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    analyticsSubtitle: {
        fontSize: 13,
        color: '#6366f1',
    },
});
