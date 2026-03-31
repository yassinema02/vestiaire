/**
 * Home Tab
 * Main dashboard with weather and outfit suggestions
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { neglectService } from '../../services/neglectService';
import { useEventSync } from '../../hooks/useEventSync';
import { useTabBarOnScroll } from '../../hooks/useTabBarOnScroll';
import { FailedImportBanner } from '../../components/features/FailedImportBanner';
import { eventSyncService, CalendarEventRow } from '../../services/eventSyncService';
import { generateEventOutfit, OutfitSuggestion } from '../../services/aiOutfitService';
import { TripEvent, ManualTripEvent, TRIP_TYPE_ICONS } from '../../types/packingList';
import { manualTripService } from '../../services/manualTripService';
import ResalePromptBanner from '../../components/features/ResalePromptBanner';
import { resalePromptService, ResalePrompt } from '../../services/resalePromptService';
import { appTheme } from '../../theme/tokens';
import { Text } from '../../components/ui/Typography';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDisplayName(
  user?: {
    email?: string | null;
    user_metadata?: {
      display_name?: string | null;
      full_name?: string | null;
      name?: string | null;
    };
  } | null
): string {
  const profileName =
    user?.user_metadata?.display_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim();

  if (profileName) {
    return profileName;
  }

  const email = user?.email;
  if (!email) return 'Stylist';
  const first = email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .trim();
  return first
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { initialize, refreshWeather, refreshForecast } = useWeatherStore();
  const { initialize: initializeCalendar, refreshEvents } = useCalendarStore();
  const [neglectedCount, setNeglectedCount] = useState(0);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<UserChallenge | null>(null);
  const streakLostShown = useRef(false);
  const [nextEvent, setNextEvent] = useState<CalendarEventRow | null>(null);
  const [nextEventOutfit, setNextEventOutfit] = useState<OutfitSuggestion | null>(null);
  const [allTrips, setAllTrips] = useState<TripEvent[]>([]);
  const [travelExpanded, setTravelExpanded] = useState(false);
  const [resalePrompts, setResalePrompts] = useState<ResalePrompt[]>([]);
  const tabBarScroll = useTabBarOnScroll();

  useEventSync();

  useEffect(() => {
    initialize();
    initializeCalendar();
  }, [initialize, initializeCalendar]);

  useFocusEffect(
    useCallback(() => {
      refreshWeather();
      refreshForecast();
      refreshEvents();

      neglectService.computeNeglectStatuses().then(() => {
        itemsService.getItems().then(({ items }) => {
          setNeglectedCount(items.filter(i => i.neglect_status).length);
          resalePromptService
            .getResalePrompts(items)
            .then(setResalePrompts)
            .catch(() => {});
        });
      });

      challengeService.getChallenge().then(({ challenge }) => {
        setActiveChallenge(challenge?.status === 'active' ? challenge : null);
      });

      const loadStats = async () => {
        const { stats } = await gamificationService.getUserStats();
        if (stats) setUserStats(stats);

        if (!streakLostShown.current) {
          const status = await gamificationService.checkStreakStatus();
          if (status.wasLost) {
            streakLostShown.current = true;
            Alert.alert(
              'Streak Lost',
              'Oh no! You lost your streak. Start a new one today by logging an outfit!'
            );
          }
        }
      };
      loadStats();

      const loadNextEvent = async () => {
        const { events } = await eventSyncService.getUpcomingEvents(7);
        if (events.length > 0) {
          const sorted = [...events].sort(
            (a, b) => (b.formality_score || 0) - (a.formality_score || 0)
          );
          setNextEvent(sorted[0]);

          const { items } = await itemsService.getItems();
          if (items) {
            const { suggestion } = await generateEventOutfit(sorted[0], items);
            setNextEventOutfit(suggestion);
          }
        } else {
          setNextEvent(null);
          setNextEventOutfit(null);
        }
      };
      loadNextEvent();

      const loadTrips = async () => {
        const trips = await manualTripService.getAllTrips();
        setAllTrips(trips);
        setTravelExpanded(trips.length > 0);
      };
      loadTrips();
    }, [refreshWeather, refreshForecast, refreshEvents])
  );

  const handleConnectCalendar = () => {
    router.push('/(tabs)/profile');
  };

  const handleResaleDismiss = async (itemId: string) => {
    await resalePromptService.dismissPrompt(itemId);
    setResalePrompts(prev => prev.filter(p => p.item.id !== itemId));
  };

  const handleResaleCreateListing = async (itemId: string) => {
    await resalePromptService.recordPromptTapped(itemId);
    router.push({
      pathname: '/(tabs)/item-detail',
      params: { id: itemId, fromResalePrompt: 'true' },
    });
  };

  const handleResaleDismissAll = async () => {
    for (const prompt of resalePrompts) {
      await resalePromptService.dismissPrompt(prompt.item.id);
    }
    setResalePrompts([]);
  };

  const displayName = getDisplayName(user);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={tabBarScroll.onScroll}
        scrollEventThrottle={tabBarScroll.scrollEventThrottle}
      >
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>{getGreeting()}</Text>
              <Text style={styles.heroTitle}>{displayName}</Text>
              <Text style={styles.heroSubtitle}>
                Your wardrobe, made easier to see, style, and wear.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.heroIconButton}
              onPress={() => router.push('/(tabs)/notifications')}
            >
              <Ionicons name="notifications-outline" size={22} color={appTheme.palette.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroMetrics}>
            <View style={styles.metricChip}>
              <Text style={styles.metricValue}>{userStats?.current_streak ?? 0}</Text>
              <Text style={styles.metricLabel}>day streak</Text>
            </View>
            <View style={styles.metricChip}>
              <Text style={styles.metricValue}>{neglectedCount}</Text>
              <Text style={styles.metricLabel}>pieces to revive</Text>
            </View>
            <View style={styles.metricChip}>
              <Text style={styles.metricValue}>{resalePrompts.length}</Text>
              <Text style={styles.metricLabel}>resale cues</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActionRail}>
          <TouchableOpacity
            style={[styles.quickActionCard, styles.quickActionPrimary]}
            onPress={() => router.push('/(tabs)/add')}
          >
            <Ionicons name="camera-outline" size={20} color={appTheme.palette.surface} />
            <Text style={styles.quickActionPrimaryTitle}>Add pieces</Text>
            <Text style={styles.quickActionPrimaryMeta}>Scan, upload, or import.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(tabs)/plan-week')}
          >
            <Ionicons name="calendar-outline" size={20} color={appTheme.palette.accent} />
            <Text style={styles.quickActionTitle}>Plan week</Text>
            <Text style={styles.quickActionMeta}>Build around your actual schedule.</Text>
          </TouchableOpacity>
        </View>

        <FailedImportBanner />

        {userStats ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>Momentum</Text>
            <Text style={styles.sectionTitle}>Your current rhythm</Text>
            <StreakCard stats={userStats} compact />
          </View>
        ) : null}

        {activeChallenge ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>Challenge</Text>
            <Text style={styles.sectionTitle}>Keep the streak moving</Text>
            <ChallengeTrackerCard
              challenge={activeChallenge}
              onPress={() => router.push('/(tabs)/add')}
            />
          </View>
        ) : null}

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionEyebrow}>Context</Text>
          <Text style={styles.sectionTitle}>Dress for the day</Text>
          <View style={styles.stackGap}>
            <WeatherWidget />
            <ForecastWidget />
            <EventsWidget onConnectPress={handleConnectCalendar} />
          </View>
        </View>

        {nextEvent ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>Next up</Text>
            <Text style={styles.sectionTitle}>Event styling cue</Text>
            <View style={styles.eventBanner}>
              <View style={styles.eventBannerHeader}>
                <Text style={styles.eventBannerPill}>Calendar</Text>
                <Text style={styles.eventBannerMeta}>
                  {nextEvent.is_all_day
                    ? 'All day'
                    : new Date(nextEvent.start_time).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                  {nextEvent.event_type
                    ? ` · ${nextEvent.event_type.charAt(0).toUpperCase() + nextEvent.event_type.slice(1)}`
                    : ''}
                  {nextEvent.formality_score ? ` · ${nextEvent.formality_score}/10 formality` : ''}
                </Text>
              </View>
              <Text style={styles.eventBannerTitle}>{nextEvent.title}</Text>
              {nextEventOutfit ? (
                <Text style={styles.eventBannerOutfit}>
                  Suggested edit: {nextEventOutfit.name}
                </Text>
              ) : null}
              <View style={styles.eventActions}>
                <TouchableOpacity
                  style={styles.eventButton}
                  onPress={() => router.push('/(tabs)/events')}
                >
                  <Text style={styles.eventButtonText}>See all events</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.eventButton, styles.eventButtonGhost]}
                  onPress={() => router.push('/(tabs)/plan-week')}
                >
                  <Text style={[styles.eventButtonText, styles.eventButtonGhostText]}>
                    Plan the week
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}

                    {/* Travel Section */}
                    {allTrips.length > 0 ? (
                        <View style={styles.travelSection}>
                            <TouchableOpacity
                                style={styles.travelHeader}
                                onPress={() => setTravelExpanded(!travelExpanded)}
                            >
                                <View style={styles.travelHeaderLeft}>
                                    <Ionicons name="airplane" size={18} color="#5D4E37" />
                                    <Text style={styles.travelHeaderTitle}>Travel</Text>
                                </View>
                                <Ionicons
                                    name={travelExpanded ? 'chevron-up' : 'chevron-down'}
                                    size={18}
                                    color="#9ca3af"
                                />
                            </TouchableOpacity>
                            {travelExpanded && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.travelCards}
                                >
                                    {allTrips.map(trip => (
                                        <TouchableOpacity
                                            key={trip.id}
                                            style={styles.travelCard}
                                            onPress={() => router.push(`/(tabs)/travel?tripId=${trip.id}`)}
                                        >
                                            <Ionicons
                                                name={
                                                    ('isManual' in trip
                                                        ? TRIP_TYPE_ICONS[(trip as ManualTripEvent).tripType]
                                                        : 'airplane-outline') as any
                                                }
                                                size={20}
                                                color="#87A96B"
                                            />
                                            <Text style={styles.travelCardTitle} numberOfLines={1}>
                                                {trip.location || trip.title}
                                            </Text>
                                            <Text style={styles.travelCardDates}>
                                                {trip.durationDays}d · {trip.startDate.slice(5)}
                                            </Text>
                                            <Text style={styles.travelCardAction}>Pack</Text>
                                        </TouchableOpacity>
                                    ))}
                                    <TouchableOpacity
                                        style={styles.travelAddCard}
                                        onPress={() => router.push('/(tabs)/travel?showCreate=true')}
                                    >
                                        <Ionicons name="add-circle-outline" size={24} color="#5D4E37" />
                                        <Text style={styles.travelAddText}>Plan a Trip</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            )}
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.travelCollapsed}
                            onPress={() => router.push('/(tabs)/travel?showCreate=true')}
                        >
                            <Ionicons name="airplane-outline" size={18} color="#5D4E37" />
                            <Text style={styles.travelCollapsedText}>Plan a Trip</Text>
                            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                        </TouchableOpacity>
                    )}

        {resalePrompts.length > 0 ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>Closet curation</Text>
            <Text style={styles.sectionTitle}>Pieces worth listing</Text>
            <ResalePromptBanner
              prompts={resalePrompts}
              onDismiss={handleResaleDismiss}
              onCreateListing={handleResaleCreateListing}
              onDismissAll={handleResaleDismissAll}
            />
          </View>
        ) : null}

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionEyebrow}>Suggestions</Text>
          <Text style={styles.sectionTitle}>AI outfit direction</Text>
          <OutfitSuggestionWidget onAddItemsPress={() => router.push('/(tabs)/add')} />
        </View>

        <View style={styles.mosaicRow}>
          <TouchableOpacity
            style={[styles.mosaicCard, styles.mosaicCardWarm]}
            onPress={() => router.push('/(tabs)/shopping')}
            activeOpacity={0.8}
          >
            <Ionicons name="bag-outline" size={22} color={appTheme.palette.accent} />
            <Text style={styles.mosaicTitle}>Check before you buy</Text>
            <Text style={styles.mosaicCopy}>
              See how a new piece fits your wardrobe before you spend.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mosaicCard, styles.mosaicCardForest]}
            onPress={() => router.push('/(tabs)/log-wear')}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-done" size={22} color={appTheme.palette.surface} />
            <Text style={[styles.mosaicTitle, styles.mosaicTitleInverse]}>Log today’s look</Text>
            <Text style={[styles.mosaicCopy, styles.mosaicCopyInverse]}>
              Track what you wore and keep your archive honest.
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mosaicRow}>
          {neglectedCount > 0 ? (
            <TouchableOpacity
              style={styles.secondaryPanel}
              onPress={() => router.push('/(tabs)/wardrobe')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryPanelLabel}>Forgotten items</Text>
              <Text style={styles.secondaryPanelTitle}>
                {neglectedCount} pieces need a comeback
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.secondaryPanel}
            onPress={() => router.push('/(tabs)/analytics')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryPanelLabel}>Analytics</Text>
            <Text style={styles.secondaryPanelTitle}>See what actually earns its place</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color={appTheme.palette.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appTheme.palette.canvas,
  },
  container: {
    flex: 1,
    backgroundColor: appTheme.palette.canvas,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 140,
    gap: 22,
  },
  hero: {
    backgroundColor: appTheme.palette.surfaceRaised,
    borderRadius: appTheme.radii.xl,
    padding: 24,
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.20)',
    ...appTheme.shadows.card,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    color: appTheme.palette.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontWeight: '700',
    fontSize: 11,
    marginBottom: 10,
  },
  heroTitle: {
    color: appTheme.palette.text,
    fontFamily: appTheme.typography.display,
    fontSize: 38,
    lineHeight: 42,
    marginBottom: 8,
  },
  heroSubtitle: {
    maxWidth: 270,
    color: appTheme.palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  heroIconButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: appTheme.palette.canvas,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMetrics: {
    flexDirection: 'row',
    gap: 10,
  },
  metricChip: {
    flex: 1,
    borderRadius: appTheme.radii.md,
    padding: 14,
    backgroundColor: appTheme.palette.canvas,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.18)',
  },
  metricValue: {
    color: appTheme.palette.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricLabel: {
    color: appTheme.palette.textMuted,
    fontSize: 12,
  },
  quickActionRail: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: appTheme.palette.surfaceRaised,
    borderRadius: appTheme.radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.22)',
    gap: 8,
    ...appTheme.shadows.card,
  },
  quickActionPrimary: {
    backgroundColor: appTheme.palette.accent,
    borderColor: 'transparent',
  },
  quickActionPrimaryTitle: {
    color: appTheme.palette.surface,
    fontSize: 17,
    fontWeight: '700',
  },
  quickActionPrimaryMeta: {
    color: '#F3DDD0',
    fontSize: 13,
    lineHeight: 19,
  },
  quickActionTitle: {
    color: appTheme.palette.text,
    fontSize: 17,
    fontWeight: '700',
  },
  quickActionMeta: {
    color: appTheme.palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionEyebrow: {
    color: appTheme.palette.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
    fontSize: 11,
  },
  sectionTitle: {
    color: appTheme.palette.text,
    fontFamily: appTheme.typography.display,
    fontSize: 28,
    lineHeight: 32,
  },
  stackGap: {
    gap: 12,
  },
  eventBanner: {
    borderRadius: appTheme.radii.lg,
    padding: 20,
    backgroundColor: appTheme.palette.surfaceRaised,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.22)',
    ...appTheme.shadows.card,
  },
  eventBannerHeader: {
    gap: 8,
    marginBottom: 10,
  },
  eventBannerPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: appTheme.radii.pill,
    backgroundColor: appTheme.palette.accentSoft,
    color: appTheme.palette.accentDeep,
    fontSize: 12,
    fontWeight: '700',
  },
  eventBannerTitle: {
    fontSize: 24,
    lineHeight: 29,
    color: appTheme.palette.text,
    fontFamily: appTheme.typography.display,
    marginBottom: 8,
  },
  eventBannerMeta: {
    fontSize: 13,
    color: appTheme.palette.textMuted,
  },
  eventBannerOutfit: {
    fontSize: 14,
    color: appTheme.palette.forest,
    fontWeight: '600',
    marginBottom: 16,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 10,
  },
  eventButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: appTheme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.palette.surfaceInverse,
  },
  eventButtonGhost: {
    backgroundColor: appTheme.palette.canvas,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.24)',
  },
  eventButtonText: {
    color: appTheme.palette.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  eventButtonGhostText: {
    color: appTheme.palette.text,
  },
  travelSection: {
    marginBottom: 16,
  },
  travelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  travelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  travelHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  travelCards: {
    gap: 10,
    paddingBottom: 4,
  },
  travelCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.15)',
  },
  travelCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  travelCardDates: {
    fontSize: 12,
    color: '#6b7280',
  },
  travelCardAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#87A96B',
    marginTop: 2,
  },
  travelAddCard: {
    width: 120,
    backgroundColor: 'rgba(93, 78, 55, 0.06)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(93, 78, 55, 0.2)',
  },
  travelAddText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5D4E37',
  },
  travelCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  travelCollapsedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4E37',
  },
  mosaicRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mosaicCard: {
    flex: 1,
    minHeight: 160,
    borderRadius: appTheme.radii.lg,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    ...appTheme.shadows.card,
  },
  mosaicCardWarm: {
    backgroundColor: appTheme.palette.surfaceRaised,
    borderColor: 'rgba(181, 150, 120, 0.22)',
  },
  mosaicCardForest: {
    backgroundColor: appTheme.palette.forest,
    borderColor: 'transparent',
  },
  mosaicTitle: {
    color: appTheme.palette.text,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: appTheme.typography.display,
  },
  mosaicTitleInverse: {
    color: appTheme.palette.surface,
  },
  mosaicCopy: {
    color: appTheme.palette.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  mosaicCopyInverse: {
    color: '#D9E5DD',
  },
  secondaryPanel: {
    flex: 1,
    borderRadius: appTheme.radii.lg,
    padding: 18,
    backgroundColor: appTheme.palette.surfaceRaised,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.22)',
    minHeight: 116,
    justifyContent: 'space-between',
    ...appTheme.shadows.card,
  },
  secondaryPanelLabel: {
    color: appTheme.palette.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontWeight: '700',
    fontSize: 11,
  },
  secondaryPanelTitle: {
    color: appTheme.palette.text,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: appTheme.typography.display,
  },
  signOutButton: {
    minHeight: 52,
    borderRadius: appTheme.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(180, 72, 58, 0.20)',
    backgroundColor: 'rgba(180, 72, 58, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutText: {
    color: appTheme.palette.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
