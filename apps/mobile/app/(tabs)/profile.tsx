/**
 * Profile Tab
 * User profile and settings with location and calendar preferences
 */

import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
    Switch,
    Platform,
    Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { LEVELS } from '@vestiaire/shared';
import { useAuthStore } from '../../stores/authStore';
import { useWeatherStore } from '../../stores/weatherStore';
import { useCalendarStore, AppleCalendar } from '../../stores/calendarStore';
import { CalendarSelector } from '../../components/features/CalendarSelector';
import { eveningReminderService, EveningReminderPreferences } from '../../services/eveningReminderService';
import { gamificationService, UserStats } from '../../services/gamificationService';
import { subscriptionService, SubscriptionStatus } from '../../services/subscriptionService';
import PointsHistorySheet from '../../components/gamification/PointsHistorySheet';
import StreakCard from '../../components/gamification/StreakCard';
import ActivityFeed from '../../components/gamification/ActivityFeed';
import LeaderboardTeaser from '../../components/gamification/LeaderboardTeaser';

// Complete auth session for web browser redirect
WebBrowser.maybeCompleteAuthSession();

export default function ProfileScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const {
        location,
        isLoading,
        error,
        setManualLocation,
        resetToDeviceLocation,
        clearError,
    } = useWeatherStore();
    const {
        // Google state
        googleConnected,
        googleEmail,
        isConnectingGoogle,
        handleGoogleOAuthSuccess,
        disconnectGoogle,
        // Apple state
        appleConnected,
        appleSelectedCalendars,
        isConnectingApple,
        connectApple,
        disconnectApple,
        setAppleCalendars,
        getAvailableAppleCalendars,
        // Common
        initialize: initializeCalendar,
        isConnected: isCalendarConnected,
    } = useCalendarStore();

    const [showLocationModal, setShowLocationModal] = useState(false);
    const [cityInput, setCityInput] = useState('');
    const [isSettingCity, setIsSettingCity] = useState(false);

    // Apple Calendar selector state
    const [showCalendarSelector, setShowCalendarSelector] = useState(false);
    const [availableAppleCalendars, setAvailableAppleCalendars] = useState<AppleCalendar[]>([]);

    // Gamification state
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [showPointsHistory, setShowPointsHistory] = useState(false);
    const [itemCount, setItemCount] = useState(0);

    // Subscription state
    const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);

    // Evening reminder state
    const [reminderEnabled, setReminderEnabled] = useState(true);
    const [reminderTime, setReminderTime] = useState('20:00');
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isLoadingReminder, setIsLoadingReminder] = useState(true);

    // Google OAuth configuration
    const googleWebClientId = Constants.expoConfig?.extra?.googleWebClientId;

    // Force the Expo proxy redirect URI - must match Google Cloud Console
    const proxyRedirectUri = 'https://auth.expo.io/@yassine06/vestiaire';

    // Use the Google provider with web client and explicit redirect URI
    // For Expo Go, we MUST use web client ID with the proxy (not iOS client)
    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: googleWebClientId,  // Web client for HTTPS redirect
        redirectUri: proxyRedirectUri,
        scopes: [
            'openid',
            'profile',
            'email',
            'https://www.googleapis.com/auth/calendar.readonly'
        ],
    });

    // Log the request URL for debugging
    useEffect(() => {
        if (request?.url) {
            console.log('OAuth Request URL:', request.url);
        }
    }, [request]);

    // Initialize calendar store on mount
    useEffect(() => {
        initializeCalendar();
    }, []);

    const handleShareAchievements = async () => {
        if (!userStats) return;
        const currentLevel = LEVELS.find(l => l.level === userStats.level);
        const title = currentLevel?.title ?? 'Closet Rookie';
        const message = `I'm Level ${userStats.level} (${title}) on Vestiaire with ${userStats.style_points} points and a ${userStats.current_streak}-day streak! #VestiaireStyle`;
        try {
            await Share.share({ message });
        } catch (error) {
            // User cancelled or share failed — ignore
        }
    };

    // Load gamification stats and subscription status on focus
    useFocusEffect(
        useCallback(() => {
            const loadStats = async () => {
                const { stats } = await gamificationService.getUserStats();
                if (stats) setUserStats(stats);
                const { count } = await gamificationService.getItemCount();
                setItemCount(count);
                const { status } = await subscriptionService.getStatus();
                setSubStatus(status);
            };
            loadStats();
        }, [])
    );

    // Load evening reminder preferences
    useEffect(() => {
        const loadReminderPrefs = async () => {
            setIsLoadingReminder(true);
            const { prefs } = await eveningReminderService.getPreferences();
            setReminderEnabled(prefs.enabled);
            setReminderTime(prefs.time);
            setIsLoadingReminder(false);
        };
        loadReminderPrefs();
    }, []);

    const handleToggleReminder = useCallback(async (value: boolean) => {
        setReminderEnabled(value);
        const { error } = await eveningReminderService.updatePreferences({ enabled: value });
        if (error) {
            setReminderEnabled(!value); // revert
            Alert.alert('Error', 'Failed to update reminder setting');
        }
    }, []);

    const handleTimeChange = useCallback(async (_event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
        }
        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            const newTime = `${hours}:${minutes}`;
            setReminderTime(newTime);
            const { error } = await eveningReminderService.updatePreferences({ time: newTime });
            if (error) {
                Alert.alert('Error', 'Failed to update reminder time');
            }
        }
    }, []);

    const getReminderTimeAsDate = (): Date => {
        const [hours, minutes] = reminderTime.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    const formatTime12h = (time: string): string => {
        const [h, m] = time.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    // Handle Google OAuth response
    useEffect(() => {
        console.log('OAuth Response:', JSON.stringify(response, null, 2));
        if (response?.type === 'success') {
            const { authentication } = response;
            if (authentication?.accessToken) {
                console.log('Access token obtained successfully');
                handleGoogleOAuthSuccess(authentication.accessToken, authentication.refreshToken || undefined);
            }
        } else if (response?.type === 'error') {
            console.error('OAuth Error:', response.error);
            Alert.alert('Connection Error', 'Failed to connect to Google Calendar. Please try again.');
        }
    }, [response]);

    const handleConnectGoogle = async () => {
        if (!googleWebClientId) {
            Alert.alert(
                'Configuration Required',
                'Google Calendar integration requires setup. Please configure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your environment.',
            );
            return;
        }

        try {
            // Use showInRecents to help with redirect handling
            const result = await promptAsync({ showInRecents: true });
            console.log('PromptAsync result:', result);
        } catch (error) {
            console.error('OAuth prompt error:', error);
            Alert.alert('Error', 'Failed to open Google sign-in');
        }
    };

    const handleDisconnectGoogle = () => {
        Alert.alert(
            'Disconnect Google Calendar',
            'This will remove access to your calendar events. You can reconnect anytime.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disconnect',
                    style: 'destructive',
                    onPress: disconnectGoogle,
                },
            ]
        );
    };

    const handleSetCity = async () => {
        if (!cityInput.trim()) return;

        setIsSettingCity(true);
        clearError();
        const success = await setManualLocation(cityInput.trim());
        setIsSettingCity(false);

        if (success) {
            setShowLocationModal(false);
            setCityInput('');
        }
    };

    const handleResetLocation = () => {
        Alert.alert(
            'Use Device Location',
            'This will use your device\'s GPS to determine your location.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Use Device Location',
                    onPress: async () => {
                        await resetToDeviceLocation();
                    },
                },
            ]
        );
    };

    // Apple Calendar handlers
    const handleConnectApple = async () => {
        const success = await connectApple();
        if (success) {
            // Load available calendars for the selector
            const calendars = await getAvailableAppleCalendars();
            setAvailableAppleCalendars(calendars);
        }
    };

    const handleDisconnectApple = () => {
        Alert.alert(
            'Disconnect iPhone Calendar',
            'This will remove access to your calendar events. You can reconnect anytime.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disconnect',
                    style: 'destructive',
                    onPress: disconnectApple,
                },
            ]
        );
    };

    const handleOpenCalendarSelector = async () => {
        const calendars = await getAvailableAppleCalendars();
        setAvailableAppleCalendars(calendars);
        setShowCalendarSelector(true);
    };

    const handleCalendarSelectionChange = (selectedIds: string[]) => {
        setAppleCalendars(selectedIds);
    };

    const renderLocationModal = () => (
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
                        <TouchableOpacity onPress={() => {
                            setShowLocationModal(false);
                            clearError();
                        }}>
                            <Ionicons name="close" size={24} color="#1f2937" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.modalSubtitle}>
                        Enter your city to get local weather for outfit recommendations
                    </Text>

                    <TextInput
                        style={styles.cityInput}
                        placeholder="e.g., London, Paris, New York"
                        placeholderTextColor="#9ca3af"
                        value={cityInput}
                        onChangeText={setCityInput}
                        autoCapitalize="words"
                        autoFocus
                    />

                    {error && (
                        <Text style={styles.modalError}>{error}</Text>
                    )}

                    <TouchableOpacity
                        style={[styles.setButton, (!cityInput.trim() || isSettingCity) && styles.setButtonDisabled]}
                        onPress={handleSetCity}
                        disabled={!cityInput.trim() || isSettingCity}
                    >
                        {isSettingCity ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.setButtonText}>Set Location</Text>
                        )}
                    </TouchableOpacity>

                    {location?.isManual && (
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={() => {
                                setShowLocationModal(false);
                                handleResetLocation();
                            }}
                        >
                            <Text style={styles.resetButtonText}>Use Device Location Instead</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.header}>
                <Text style={styles.title}>Profile</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity style={styles.headerIconButton} onPress={handleShareAchievements}>
                        <Ionicons name="share-outline" size={22} color="#6366f1" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIconButton} onPress={() => router.push('/(tabs)/edit-profile')}>
                        <Ionicons name="settings-outline" size={22} color="#1f2937" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.profileSection}>
                <View style={styles.avatarWrapper}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person" size={48} color="#9ca3af" />
                    </View>
                    {userStats && (
                        <View style={styles.levelBadgeAvatar}>
                            <Text style={styles.levelBadgeAvatarText}>{userStats.level}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.email}>{user?.email}</Text>
                {subStatus?.isPremium ? (
                    <View style={styles.premiumBadge}>
                        <Ionicons name="diamond" size={13} color="#6366f1" />
                        <Text style={styles.premiumBadgeText}>
                            {subStatus.isTrial ? 'Premium Trial' : 'Premium'}
                            {subStatus.daysRemaining ? ` · ${subStatus.daysRemaining}d left` : ''}
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.memberSince}>Member since 2024</Text>
                )}
            </View>

            {/* Style Points Card */}
            {userStats && (
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Style Points</Text>
                    <View style={styles.pointsCard}>
                        <View style={styles.pointsTopRow}>
                            <View style={styles.pointsIconWrap}>
                                <Ionicons name="star" size={22} color="#eab308" />
                            </View>
                            <View style={styles.pointsInfo}>
                                <Text style={styles.pointsTotal}>{userStats.style_points}</Text>
                                <Text style={styles.pointsLabel}>Style Points</Text>
                            </View>
                            {userStats.current_streak > 0 && (
                                <View style={styles.streakBadge}>
                                    <Ionicons name="flame" size={14} color="#f97316" />
                                    <Text style={styles.streakText}>{userStats.current_streak}d</Text>
                                </View>
                            )}
                        </View>

                        {/* Level progress (item-count based) */}
                        {(() => {
                            const currentLevel = LEVELS.find(l => l.level === userStats.level);
                            const nextLevel = LEVELS.find(l => l.level === userStats.level + 1);
                            const currentThreshold = currentLevel?.threshold ?? 0;
                            const nextThreshold = nextLevel?.threshold ?? currentThreshold;
                            const progress = nextLevel
                                ? (itemCount - currentThreshold) / (nextThreshold - currentThreshold)
                                : 1;
                            const remaining = nextLevel ? nextThreshold - itemCount : 0;

                            return (
                                <View style={styles.levelSection}>
                                    <View style={styles.levelRow}>
                                        <Text style={styles.levelTitle}>
                                            Level {userStats.level} — {currentLevel?.title ?? 'Closet Rookie'}
                                        </Text>
                                        {nextLevel && (
                                            <Text style={styles.levelNext}>
                                                {remaining} more item{remaining !== 1 ? 's' : ''} to Level {nextLevel.level}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={styles.progressBarBg}>
                                        <View
                                            style={[
                                                styles.progressBarFill,
                                                { width: `${Math.min(Math.max(progress, 0) * 100, 100)}%` },
                                            ]}
                                        />
                                    </View>
                                </View>
                            );
                        })()}

                        <TouchableOpacity
                            style={styles.historyButton}
                            onPress={() => setShowPointsHistory(true)}
                        >
                            <Ionicons name="time-outline" size={16} color="#6366f1" />
                            <Text style={styles.historyButtonText}>View History</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Streak Card */}
            {userStats && (
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Streak</Text>
                    <StreakCard stats={userStats} />
                </View>
            )}

            {/* Badges */}
            <View style={styles.sectionContainer}>
                <TouchableOpacity
                    style={styles.badgesButton}
                    onPress={() => router.push('/(tabs)/badges')}
                    activeOpacity={0.8}
                >
                    <View style={styles.badgesIconWrap}>
                        <Ionicons name="ribbon" size={22} color="#6366f1" />
                    </View>
                    <View style={styles.badgesButtonContent}>
                        <Text style={styles.badgesButtonTitle}>Badges</Text>
                        <Text style={styles.badgesButtonSubtitle}>View your collection</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#c7d2fe" />
                </TouchableOpacity>
            </View>

            {/* Recent Activity */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <ActivityFeed />
            </View>

            {/* Leaderboard Teaser */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Leaderboard</Text>
                <LeaderboardTeaser />
            </View>

            {/* Location Settings */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Location</Text>
                <View style={styles.locationCard}>
                    <View style={styles.locationInfo}>
                        <Ionicons
                            name={location?.isManual ? 'location' : 'navigate'}
                            size={22}
                            color="#6366f1"
                        />
                        <View style={styles.locationTextContainer}>
                            <Text style={styles.locationLabel}>
                                {location?.isManual ? 'Manual Location' : 'Device Location'}
                            </Text>
                            <Text style={styles.locationValue}>
                                {location?.city || 'Not set'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.changeButton}
                        onPress={() => setShowLocationModal(true)}
                    >
                        <Text style={styles.changeButtonText}>Change</Text>
                    </TouchableOpacity>
                </View>

                {location?.isManual && (
                    <TouchableOpacity
                        style={styles.resetLocationLink}
                        onPress={handleResetLocation}
                    >
                        <Ionicons name="navigate-outline" size={16} color="#6366f1" />
                        <Text style={styles.resetLocationText}>Use device location</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Calendar Settings */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Connected Calendars</Text>

                {/* Google Calendar */}
                <View style={styles.calendarCard}>
                    <View style={styles.calendarInfo}>
                        <View style={[
                            styles.calendarIconContainer,
                            googleConnected && styles.calendarIconConnected
                        ]}>
                            <Ionicons
                                name="logo-google"
                                size={20}
                                color={googleConnected ? '#4285f4' : '#9ca3af'}
                            />
                        </View>
                        <View style={styles.calendarTextContainer}>
                            <Text style={styles.calendarLabel}>Google Calendar</Text>
                            <Text style={styles.calendarStatus}>
                                {googleConnected
                                    ? googleEmail || 'Connected'
                                    : 'Not connected'}
                            </Text>
                        </View>
                    </View>
                    {isConnectingGoogle ? (
                        <ActivityIndicator size="small" color="#6366f1" />
                    ) : googleConnected ? (
                        <TouchableOpacity
                            style={styles.disconnectButton}
                            onPress={handleDisconnectGoogle}
                        >
                            <Text style={styles.disconnectButtonText}>Disconnect</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.connectCalendarButton}
                            onPress={handleConnectGoogle}
                        >
                            <Text style={styles.connectCalendarButtonText}>Connect</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Apple Calendar */}
                <View style={[styles.calendarCard, { marginTop: 12 }]}>
                    <View style={styles.calendarInfo}>
                        <View style={[
                            styles.calendarIconContainer,
                            appleConnected && styles.calendarIconConnected
                        ]}>
                            <Ionicons
                                name="calendar"
                                size={20}
                                color={appleConnected ? '#007AFF' : '#9ca3af'}
                            />
                        </View>
                        <View style={styles.calendarTextContainer}>
                            <Text style={styles.calendarLabel}>iPhone Calendar</Text>
                            <Text style={styles.calendarStatus}>
                                {appleConnected
                                    ? `${appleSelectedCalendars.length} calendar${appleSelectedCalendars.length !== 1 ? 's' : ''} selected`
                                    : 'Not connected'}
                            </Text>
                        </View>
                    </View>
                    {isConnectingApple ? (
                        <ActivityIndicator size="small" color="#6366f1" />
                    ) : appleConnected ? (
                        <View style={styles.appleCalendarButtons}>
                            <TouchableOpacity
                                style={styles.selectCalendarsButton}
                                onPress={handleOpenCalendarSelector}
                            >
                                <Text style={styles.selectCalendarsButtonText}>Select</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.disconnectButton}
                                onPress={handleDisconnectApple}
                            >
                                <Text style={styles.disconnectButtonText}>Disconnect</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.connectCalendarButton}
                            onPress={handleConnectApple}
                        >
                            <Text style={styles.connectCalendarButtonText}>Connect</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={styles.calendarHint}>
                    Connect your calendars to get outfit suggestions based on your schedule
                </Text>
            </View>

            {/* Evening Reminder Settings */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Evening Reminder</Text>
                <View style={styles.reminderCard}>
                    <View style={styles.reminderRow}>
                        <View style={styles.reminderInfo}>
                            <Ionicons name="notifications-outline" size={22} color="#6366f1" />
                            <View style={styles.reminderTextContainer}>
                                <Text style={styles.reminderLabel}>Log outfit reminder</Text>
                                <Text style={styles.reminderDescription}>
                                    Daily reminder to log what you wore
                                </Text>
                            </View>
                        </View>
                        {isLoadingReminder ? (
                            <ActivityIndicator size="small" color="#6366f1" />
                        ) : (
                            <Switch
                                value={reminderEnabled}
                                onValueChange={handleToggleReminder}
                                trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
                                thumbColor={reminderEnabled ? '#6366f1' : '#f4f3f4'}
                                ios_backgroundColor="#d1d5db"
                            />
                        )}
                    </View>

                    {reminderEnabled && (
                        <View style={styles.timePickerRow}>
                            <Text style={styles.timeLabel}>Reminder time</Text>
                            {Platform.OS === 'ios' ? (
                                <DateTimePicker
                                    value={getReminderTimeAsDate()}
                                    mode="time"
                                    display="compact"
                                    onChange={handleTimeChange}
                                    style={styles.iosTimePicker}
                                />
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={styles.timeButton}
                                        onPress={() => setShowTimePicker(true)}
                                    >
                                        <Ionicons name="time-outline" size={16} color="#6366f1" />
                                        <Text style={styles.timeButtonText}>
                                            {formatTime12h(reminderTime)}
                                        </Text>
                                    </TouchableOpacity>
                                    {showTimePicker && (
                                        <DateTimePicker
                                            value={getReminderTimeAsDate()}
                                            mode="time"
                                            display="spinner"
                                            onChange={handleTimeChange}
                                        />
                                    )}
                                </>
                            )}
                        </View>
                    )}
                </View>
                <Text style={styles.reminderHint}>
                    Skipped automatically if you've already logged an outfit today
                </Text>
            </View>

            {/* Premium Upgrade Banner (free users only) */}
            {subStatus && !subStatus.isPremium && (
                <View style={styles.sectionContainer}>
                    <TouchableOpacity
                        style={styles.premiumBanner}
                        onPress={() => router.push('/(tabs)/premium')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.premiumBannerIcon}>
                            <Ionicons name="diamond" size={22} color="#6366f1" />
                        </View>
                        <View style={styles.premiumBannerContent}>
                            <Text style={styles.premiumBannerTitle}>Upgrade to Premium</Text>
                            <Text style={styles.premiumBannerSubtitle}>Unlimited suggestions & listings</Text>
                        </View>
                        <View style={styles.premiumBannerCta}>
                            <Text style={styles.premiumBannerCtaText}>£4.99/mo</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* Menu Items */}
            <View style={styles.menuSection}>
                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => router.push('/(tabs)/premium')}
                >
                    <Ionicons name="diamond-outline" size={22} color="#6366f1" />
                    <Text style={styles.menuText}>
                        {subStatus?.isPremium ? 'Premium Subscription' : 'Upgrade to Premium'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => router.push('/(tabs)/analytics')}
                >
                    <Ionicons name="stats-chart-outline" size={22} color="#6366f1" />
                    <Text style={styles.menuText}>Wardrobe Analytics</Text>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => router.push('/(tabs)/listing-history')}
                >
                    <Ionicons name="pricetags-outline" size={22} color="#22c55e" />
                    <Text style={styles.menuText}>My Listings</Text>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/edit-profile')}>
                    <Ionicons name="person-outline" size={22} color="#6b7280" />
                    <Text style={styles.menuText}>Edit Profile</Text>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/notifications')}>
                    <Ionicons name="notifications-outline" size={22} color="#6b7280" />
                    <Text style={styles.menuText}>Notifications</Text>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/privacy')}>
                    <Ionicons name="shield-outline" size={22} color="#6b7280" />
                    <Text style={styles.menuText}>Privacy</Text>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/help')}>
                    <Ionicons name="help-circle-outline" size={22} color="#6b7280" />
                    <Text style={styles.menuText}>Help & Support</Text>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>
            </View>

            {renderLocationModal()}

            {/* Calendar Selector Modal */}
            <CalendarSelector
                visible={showCalendarSelector}
                onClose={() => setShowCalendarSelector(false)}
                calendars={availableAppleCalendars}
                selectedIds={appleSelectedCalendars.map(c => c.id)}
                onSelectionChange={handleCalendarSelectionChange}
            />

            {/* Points History Modal */}
            <PointsHistorySheet
                visible={showPointsHistory}
                onClose={() => setShowPointsHistory(false)}
            />
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
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    headerIconButton: {
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
    profileSection: {
        alignItems: 'center',
        paddingVertical: 24,
        marginBottom: 8,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    levelBadgeAvatar: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#F5F0E8',
    },
    levelBadgeAvatarText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#fff',
    },
    email: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    memberSince: {
        fontSize: 14,
        color: '#6b7280',
    },
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#eef2ff',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 12,
        marginTop: 6,
        borderWidth: 1,
        borderColor: '#c7d2fe',
    },
    premiumBadgeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6366f1',
    },
    sectionContainer: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    locationTextContainer: {
        flex: 1,
    },
    locationLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 2,
    },
    locationValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    changeButton: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    changeButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },
    resetLocationLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
    },
    resetLocationText: {
        fontSize: 14,
        color: '#6366f1',
        fontWeight: '500',
    },
    // Premium banner
    premiumBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#e0e7ff',
    },
    premiumBannerIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    premiumBannerContent: {
        flex: 1,
    },
    premiumBannerTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 2,
    },
    premiumBannerSubtitle: {
        fontSize: 12,
        color: '#6366f1',
    },
    premiumBannerCta: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    premiumBannerCtaText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    menuSection: {
        paddingHorizontal: 24,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: '#374151',
    },
    // Style Points styles
    pointsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    pointsTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    pointsIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#fefce8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pointsInfo: {
        flex: 1,
    },
    pointsTotal: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1f2937',
    },
    pointsLabel: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 1,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fff7ed',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fed7aa',
    },
    streakText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#f97316',
    },
    levelSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    levelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    levelTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6366f1',
    },
    levelNext: {
        fontSize: 11,
        color: '#9ca3af',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: 8,
        backgroundColor: '#6366f1',
        borderRadius: 4,
    },
    historyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 14,
        paddingVertical: 8,
    },
    historyButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },
    // Badges button
    badgesButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#e0e7ff',
    },
    badgesIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgesButtonContent: {
        flex: 1,
    },
    badgesButtonTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    badgesButtonSubtitle: {
        fontSize: 13,
        color: '#6366f1',
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
        lineHeight: 20,
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
        backgroundColor: '#6366f1',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    setButtonDisabled: {
        backgroundColor: '#c7d2fe',
    },
    setButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    resetButton: {
        marginTop: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    resetButtonText: {
        fontSize: 14,
        color: '#6366f1',
        fontWeight: '500',
    },
    // Calendar styles
    calendarCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    calendarInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    calendarIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarIconConnected: {
        backgroundColor: '#eff6ff',
    },
    calendarTextContainer: {
        flex: 1,
    },
    calendarLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    calendarStatus: {
        fontSize: 13,
        color: '#6b7280',
    },
    connectCalendarButton: {
        backgroundColor: '#4285f4',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    connectCalendarButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    disconnectButton: {
        backgroundColor: '#fef2f2',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    disconnectButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ef4444',
    },
    calendarHint: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 8,
        paddingHorizontal: 4,
    },
    appleCalendarButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    selectCalendarsButton: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    selectCalendarsButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#007AFF',
    },
    // Evening Reminder styles
    reminderCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    reminderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reminderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    reminderTextContainer: {
        flex: 1,
    },
    reminderLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    reminderDescription: {
        fontSize: 13,
        color: '#6b7280',
    },
    timePickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    timeLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    iosTimePicker: {
        width: 100,
    },
    timeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    timeButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },
    reminderHint: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 8,
        paddingHorizontal: 4,
    },
});
