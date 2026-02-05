/**
 * Home Tab
 * Main dashboard with weather and outfit suggestions
 */

import { useCallback, useEffect } from 'react';
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

    // Initialize weather and calendar stores on mount
    useEffect(() => {
        initialize();
        initializeCalendar();
    }, []);

    // Refresh weather, forecast, and events when screen comes into focus (respects cache)
    useFocusEffect(
        useCallback(() => {
            refreshWeather();
            refreshForecast();
            refreshEvents();
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

            {/* Quick Actions */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionCard}>
                        <Ionicons name="camera-outline" size={24} color="#6366f1" />
                        <Text style={styles.actionText}>Add Item</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard}>
                        <Ionicons name="grid-outline" size={24} color="#6366f1" />
                        <Text style={styles.actionText}>Wardrobe</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard}>
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
});
