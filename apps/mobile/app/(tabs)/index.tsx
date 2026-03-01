/**
 * Home Tab
 * Main dashboard with weather and outfit suggestions
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
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
import StreakCard from '../../components/gamification/StreakCard';
import ChallengeTrackerCard from '../../components/gamification/ChallengeTrackerCard';
import { gamificationService, UserStats } from '../../services/gamificationService';
import { challengeService, UserChallenge } from '../../services/challengeService';
import { itemsService } from '../../services/items';
import { countNeglected } from '../../utils/neglectedItems';
import { neglectService } from '../../services/neglectService';
import { useEventSync } from '../../hooks/useEventSync';
import { eventSyncService, CalendarEventRow } from '../../services/eventSyncService';
import { generateEventOutfit, clearEventOutfitCache, OutfitSuggestion } from '../../services/aiOutfitService';
import { WardrobeItem } from '../../services/items';
import { TripEvent } from '../../types/packingList';
import ResalePromptBanner from '../../components/features/ResalePromptBanner';
import { resalePromptService, ResalePrompt } from '../../services/resalePromptService';

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
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [activeChallenge, setActiveChallenge] = useState<UserChallenge | null>(null);
    const streakLostShown = useRef(false);
    const [nextEvent, setNextEvent] = useState<CalendarEventRow | null>(null);
    const [nextEventOutfit, setNextEventOutfit] = useState<OutfitSuggestion | null>(null);
    const [allWardrobeItems, setAllWardrobeItems] = useState<WardrobeItem[]>([]);
    const [upcomingTrip, setUpcomingTrip] = useState<TripEvent | null>(null);
    const [resalePrompts, setResalePrompts] = useState<ResalePrompt[]>([]);

    // Background event sync (Story 12.2)
    useEventSync();

    // Initialize weather and calendar stores on mount
    useEffect(() => {
        initialize();
        initializeCalendar();
    }, []);

    // Refresh weather, forecast, events, neglected count, and streak when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            refreshWeather();
            refreshForecast();
            refreshEvents();
            // Trigger neglect status computation (debounced 24h) then count from DB + load resale prompts
            neglectService.computeNeglectStatuses().then(() => {
                itemsService.getItems().then(({ items }) => {
                    setNeglectedCount(items.filter(i => i.neglect_status).length);
                    // Load resale prompts (Story 13.2)
                    resalePromptService.getResalePrompts(items).then(setResalePrompts).catch(() => {});
                });
            });
            // Load active challenge
            challengeService.getChallenge().then(({ challenge }) => {
                setActiveChallenge(challenge?.status === 'active' ? challenge : null);
            });
            // Load gamification stats + check streak status
            const loadStats = async () => {
                const { stats } = await gamificationService.getUserStats();
                if (stats) setUserStats(stats);

                // Check if streak was lost since last visit (show once per session)
                if (!streakLostShown.current) {
                    const status = await gamificationService.checkStreakStatus();
                    if (status.wasLost) {
                        streakLostShown.current = true;
                        Alert.alert(
                            'Streak Lost',
                            'Oh no! You lost your streak. Start a new one today by logging an outfit!',
                        );
                    }
                }
            };
            loadStats();

            // Load next event for banner (Story 12.3)
            const loadNextEvent = async () => {
                const { events } = await eventSyncService.getUpcomingEvents(7);
                if (events.length > 0) {
                    // Pick highest formality event (AC 4)
                    const sorted = [...events].sort((a, b) => (b.formality_score || 0) - (a.formality_score || 0));
                    setNextEvent(sorted[0]);

                    // Load wardrobe for outfit generation
                    const { items } = await itemsService.getItems();
                    if (items) {
                        setAllWardrobeItems(items);
                        const { suggestion } = await generateEventOutfit(sorted[0], items);
                        setNextEventOutfit(suggestion);
                    }
                } else {
                    setNextEvent(null);
                    setNextEventOutfit(null);
                }
            };
            loadNextEvent();

            // Detect upcoming trips (Story 12.6)
            const loadTrips = async () => {
                const { trips } = await eventSyncService.detectTripEvents(30);
                setUpcomingTrip(trips.length > 0 ? trips[0] : null);
            };
            loadTrips();
        }, [])
    );

    const handleConnectCalendar = () => {
        // Navigate to profile tab where calendar connection is handled
        router.push('/(tabs)/profile');
    };

    // Resale prompt handlers (Story 13.2)
    const handleResaleDismiss = async (itemId: string) => {
        await resalePromptService.dismissPrompt(itemId);
        setResalePrompts(prev => prev.filter(p => p.item.id !== itemId));
    };

    const handleResaleCreateListing = async (itemId: string) => {
        await resalePromptService.recordPromptTapped(itemId);
        router.push({ pathname: '/(tabs)/item-detail', params: { id: itemId, fromResalePrompt: 'true' } });
    };

    const handleResaleDismissAll = async () => {
        for (const prompt of resalePrompts) {
            await resalePromptService.dismissPrompt(prompt.item.id);
        }
        setResalePrompts([]);
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

            {/* Streak Card */}
            {userStats && (
                <View style={styles.streakSection}>
                    <StreakCard stats={userStats} compact />
                </View>
            )}

            {/* Challenge Tracker */}
            {activeChallenge && (
                <View style={styles.challengeSection}>
                    <ChallengeTrackerCard
                        challenge={activeChallenge}
                        onPress={() => router.push('/(tabs)/add')}
                    />
                </View>
            )}

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

            {/* Event Outfit Banner (Story 12.3) */}
            {nextEvent && (
                <View style={styles.section}>
                    <View style={styles.eventBanner}>
                        <View style={styles.eventBannerHeader}>
                            <Ionicons name="calendar" size={16} color="#5D4E37" />
                            <Text style={styles.eventBannerLabel}>Next Event</Text>
                        </View>
                        <Text style={styles.eventBannerTitle} numberOfLines={1}>{nextEvent.title}</Text>
                        <Text style={styles.eventBannerMeta}>
                            {nextEvent.is_all_day ? 'All day' : new Date(nextEvent.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            {nextEvent.event_type ? ` · ${nextEvent.event_type.charAt(0).toUpperCase() + nextEvent.event_type.slice(1)}` : ''}
                            {nextEvent.formality_score ? ` · ${nextEvent.formality_score}/10` : ''}
                        </Text>
                        {nextEventOutfit && (
                            <Text style={styles.eventBannerOutfit} numberOfLines={1}>
                                Suggested: {nextEventOutfit.name}
                            </Text>
                        )}
                        <View style={styles.eventBannerLinks}>
                            <TouchableOpacity
                                style={styles.eventBannerSeeAll}
                                onPress={() => router.push('/(tabs)/events')}
                            >
                                <Text style={styles.eventBannerSeeAllText}>See all events</Text>
                                <Ionicons name="chevron-forward" size={14} color="#6366f1" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.eventBannerSeeAll}
                                onPress={() => router.push('/(tabs)/plan-week')}
                            >
                                <Text style={styles.eventBannerSeeAllText}>Plan week</Text>
                                <Ionicons name="chevron-forward" size={14} color="#6366f1" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Trip Banner (Story 12.6) */}
            {upcomingTrip && (
                <TouchableOpacity
                    style={styles.tripBanner}
                    onPress={() => router.push('/(tabs)/travel')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="airplane" size={18} color="#6366f1" />
                    <View style={styles.tripBannerInfo}>
                        <Text style={styles.tripBannerTitle}>{upcomingTrip.title}</Text>
                        <Text style={styles.tripBannerDates}>
                            {upcomingTrip.durationDays} day{upcomingTrip.durationDays !== 1 ? 's' : ''}
                            {upcomingTrip.location ? ` · ${upcomingTrip.location}` : ''}
                        </Text>
                    </View>
                    <Text style={styles.tripBannerAction}>Pack now</Text>
                    <Ionicons name="chevron-forward" size={16} color="#6366f1" />
                </TouchableOpacity>
            )}

            {/* Resale Prompts Banner (Story 13.2) */}
            {resalePrompts.length > 0 && (
                <View style={styles.section}>
                    <ResalePromptBanner
                        prompts={resalePrompts}
                        onDismiss={handleResaleDismiss}
                        onCreateListing={handleResaleCreateListing}
                        onDismissAll={handleResaleDismissAll}
                    />
                </View>
            )}

            {/* AI Outfit Suggestions */}
            <View style={styles.section}>
                <OutfitSuggestionWidget
                    onAddItemsPress={() => router.push('/(tabs)/add')}
                />
            </View>

            {/* Check Before You Buy */}
            <View style={styles.section}>
                <TouchableOpacity
                    style={styles.shoppingButton}
                    onPress={() => router.push('/(tabs)/shopping')}
                    activeOpacity={0.8}
                >
                    <View style={styles.shoppingIcon}>
                        <Ionicons name="bag-outline" size={24} color="#fff" />
                    </View>
                    <View style={styles.shoppingContent}>
                        <Text style={styles.shoppingTitle}>Check Before You Buy</Text>
                        <Text style={styles.shoppingSubtitle}>See if it matches your wardrobe</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#6366f1" />
                </TouchableOpacity>
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
                                {neglectedCount} item{neglectedCount !== 1 ? 's' : ''} haven't been worn in 6+ months
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
    streakSection: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    challengeSection: {
        paddingHorizontal: 24,
        marginBottom: 16,
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
    shoppingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eef2ff',
        borderRadius: 16,
        padding: 16,
        gap: 14,
        borderWidth: 1,
        borderColor: '#c7d2fe',
    },
    shoppingIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shoppingContent: {
        flex: 1,
    },
    shoppingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    shoppingSubtitle: {
        fontSize: 13,
        color: '#6366f1',
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

    // Event Banner (Story 12.3)
    eventBanner: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
    },
    eventBannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    eventBannerLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#5D4E37',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    eventBannerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    eventBannerMeta: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
    eventBannerOutfit: {
        fontSize: 13,
        color: '#6366f1',
        fontWeight: '500',
        marginTop: 6,
    },
    eventBannerLinks: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 10,
    },
    eventBannerSeeAll: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    eventBannerSeeAllText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6366f1',
    },

    // Trip banner
    tripBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#eef2ff',
        borderRadius: 12,
        padding: 14,
        marginHorizontal: 16,
        marginBottom: 12,
    },
    tripBannerInfo: {
        flex: 1,
    },
    tripBannerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    tripBannerDates: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 1,
    },
    tripBannerAction: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6366f1',
    },
});
