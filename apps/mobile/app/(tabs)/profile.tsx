/**
 * Profile Tab
 * User profile and settings with location and calendar preferences
 */

import { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useAuthStore } from '../../stores/authStore';
import { useWeatherStore } from '../../stores/weatherStore';
import { useCalendarStore, AppleCalendar } from '../../stores/calendarStore';
import { CalendarSelector } from '../../components/features/CalendarSelector';

// Complete auth session for web browser redirect
WebBrowser.maybeCompleteAuthSession();

export default function ProfileScreen() {
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
                <TouchableOpacity style={styles.settingsButton}>
                    <Ionicons name="settings-outline" size={22} color="#1f2937" />
                </TouchableOpacity>
            </View>

            <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                    <Ionicons name="person" size={48} color="#9ca3af" />
                </View>
                <Text style={styles.email}>{user?.email}</Text>
                <Text style={styles.memberSince}>Member since 2024</Text>
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

            {/* Menu Items */}
            <View style={styles.menuSection}>
                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="person-outline" size={22} color="#6b7280" />
                    <Text style={styles.menuText}>Edit Profile</Text>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="notifications-outline" size={22} color="#6b7280" />
                    <Text style={styles.menuText}>Notifications</Text>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="shield-outline" size={22} color="#6b7280" />
                    <Text style={styles.menuText}>Privacy</Text>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
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
    settingsButton: {
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
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
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
});
