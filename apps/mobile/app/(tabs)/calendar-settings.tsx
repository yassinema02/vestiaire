/**
 * Calendar Settings Screen
 * Dedicated screen for managing calendar integration (Apple + Google)
 * Story 12.1: Calendar Permission & Connection
 */

import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Switch } from 'react-native';
import { useCalendarStore, AppleCalendar } from '../../stores/calendarStore';
import { CalendarSelector } from '../../components/features/CalendarSelector';
import { useEventSync } from '../../hooks/useEventSync';
import { eventReminderService, EventReminderPreferences } from '../../services/eventReminderService';

// Complete auth session for web browser redirect
WebBrowser.maybeCompleteAuthSession();

export default function CalendarSettingsScreen() {
    const router = useRouter();
    const {
        googleConnected,
        googleEmail,
        isConnectingGoogle,
        handleGoogleOAuthSuccess,
        disconnectGoogle,
        appleConnected,
        appleSelectedCalendars,
        isConnectingApple,
        connectApple,
        disconnectApple,
        setAppleCalendars,
        getAvailableAppleCalendars,
        initialize: initializeCalendar,
        lastFetched,
    } = useCalendarStore();

    const [showCalendarSelector, setShowCalendarSelector] = useState(false);
    const [availableAppleCalendars, setAvailableAppleCalendars] = useState<AppleCalendar[]>([]);
    const { isSyncing, triggerSync } = useEventSync();

    // Reminder preferences
    const [reminderPrefs, setReminderPrefs] = useState<EventReminderPreferences>({
        enabled: true,
        time: '20:00',
        eventTypes: ['work', 'formal'],
    });
    const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);

    // Google OAuth configuration
    const googleWebClientId = Constants.expoConfig?.extra?.googleWebClientId;
    const proxyRedirectUri = 'https://auth.expo.io/@yassine06/vestiaire';

    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: googleWebClientId,
        redirectUri: proxyRedirectUri,
        scopes: [
            'openid',
            'profile',
            'email',
            'https://www.googleapis.com/auth/calendar.readonly',
        ],
    });

    // Initialize calendar store on mount
    useFocusEffect(
        useCallback(() => {
            initializeCalendar();
            loadReminderPrefs();
        }, [])
    );

    const loadReminderPrefs = async () => {
        setIsLoadingPrefs(true);
        const { prefs } = await eventReminderService.getPreferences();
        setReminderPrefs(prefs);
        setIsLoadingPrefs(false);
    };

    const handleToggleReminder = async (enabled: boolean) => {
        setReminderPrefs(prev => ({ ...prev, enabled }));
        await eventReminderService.updatePreferences({ enabled });
    };

    const handleSetReminderTime = async (time: string) => {
        setReminderPrefs(prev => ({ ...prev, time }));
        await eventReminderService.updatePreferences({ time });
    };

    const handleToggleEventType = async (type: string) => {
        const current = reminderPrefs.eventTypes;
        const updated = current.includes(type)
            ? current.filter(t => t !== type)
            : [...current, type];
        setReminderPrefs(prev => ({ ...prev, eventTypes: updated }));
        await eventReminderService.updatePreferences({ eventTypes: updated });
    };

    // Handle Google OAuth response
    useEffect(() => {
        if (response?.type === 'success' && response.authentication?.accessToken) {
            handleGoogleOAuthSuccess(
                response.authentication.accessToken,
                response.authentication.refreshToken ?? undefined
            ).then(success => {
                if (!success) {
                    Alert.alert('Connection Error', 'Failed to connect to Google Calendar. Please try again.');
                }
            });
        }
    }, [response]);

    const handleConnectGoogle = () => {
        if (!googleWebClientId) {
            Alert.alert(
                'Setup Required',
                'Google Calendar integration requires setup. Please configure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your environment.',
            );
            return;
        }
        promptAsync();
    };

    const handleDisconnectGoogle = () => {
        Alert.alert(
            'Disconnect Google Calendar',
            "You won't receive outfit suggestions for Google Calendar events.",
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Disconnect', style: 'destructive', onPress: disconnectGoogle },
            ],
        );
    };

    const handleConnectApple = async () => {
        const success = await connectApple();
        if (success) {
            const calendars = await getAvailableAppleCalendars();
            setAvailableAppleCalendars(calendars);
            setShowCalendarSelector(true);
        }
    };

    const handleDisconnectApple = () => {
        Alert.alert(
            'Disconnect Apple Calendar',
            "You won't receive outfit suggestions for calendar events.",
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Disconnect', style: 'destructive', onPress: disconnectApple },
            ],
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

    const formatLastSynced = (): string => {
        if (!lastFetched) return 'Never';
        const diff = Date.now() - lastFetched;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} min ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return 'Over a day ago';
    };

    const isConnected = googleConnected || appleConnected;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Calendar Integration</Text>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Explanation Card */}
                <View style={styles.explanationCard}>
                    <Text style={styles.explanationIcon}>📅</Text>
                    <Text style={styles.explanationTitle}>Connect your calendar</Text>
                    <Text style={styles.explanationText}>
                        We'll suggest outfits for your meetings and events. Your calendar data stays private on your device.
                    </Text>
                </View>

                {/* Apple Calendar (iOS only or both) */}
                {Platform.OS === 'ios' && (
                    <View style={styles.providerCard}>
                        <View style={styles.providerHeader}>
                            <View style={[styles.providerIcon, appleConnected && styles.providerIconConnected]}>
                                <Ionicons name="logo-apple" size={22} color={appleConnected ? '#fff' : '#1f2937'} />
                            </View>
                            <View style={styles.providerInfo}>
                                <Text style={styles.providerName}>Apple Calendar</Text>
                                <Text style={[styles.providerStatus, appleConnected && styles.providerStatusConnected]}>
                                    {isConnectingApple ? 'Connecting...' : appleConnected ? 'Connected' : 'Not connected'}
                                </Text>
                            </View>
                        </View>

                        {appleConnected ? (
                            <>
                                {/* Sync Status */}
                                <View style={styles.syncInfo}>
                                    <View style={styles.syncRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                                        <Text style={styles.syncText}>
                                            {appleSelectedCalendars.length} calendar{appleSelectedCalendars.length !== 1 ? 's' : ''} synced
                                        </Text>
                                    </View>
                                    <View style={styles.syncRow}>
                                        <Ionicons name="time-outline" size={16} color="#9ca3af" />
                                        <Text style={styles.syncTextMuted}>Last synced: {formatLastSynced()}</Text>
                                    </View>
                                </View>

                                {/* Selected Calendars List */}
                                <View style={styles.calendarList}>
                                    {appleSelectedCalendars.map(cal => (
                                        <View key={cal.id} style={styles.calendarRow}>
                                            <View style={[styles.calendarDot, { backgroundColor: cal.color }]} />
                                            <Text style={styles.calendarName} numberOfLines={1}>{cal.title}</Text>
                                            <Text style={styles.calendarSource}>({cal.source})</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Actions */}
                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={styles.selectButton} onPress={handleOpenCalendarSelector}>
                                        <Ionicons name="list-outline" size={16} color="#6366f1" />
                                        <Text style={styles.selectButtonText}>Edit Calendars</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnectApple}>
                                        <Text style={styles.disconnectButtonText}>Disconnect</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <TouchableOpacity
                                style={styles.connectButton}
                                onPress={handleConnectApple}
                                disabled={isConnectingApple}
                            >
                                {isConnectingApple ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="add-circle-outline" size={18} color="#fff" />
                                        <Text style={styles.connectButtonText}>Connect Apple Calendar</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Google Calendar */}
                <View style={[styles.providerCard, Platform.OS === 'ios' && { marginTop: 16 }]}>
                    <View style={styles.providerHeader}>
                        <View style={[styles.providerIcon, styles.googleIcon, googleConnected && styles.providerIconConnectedGoogle]}>
                            <Ionicons name="logo-google" size={20} color={googleConnected ? '#fff' : '#4285F4'} />
                        </View>
                        <View style={styles.providerInfo}>
                            <Text style={styles.providerName}>Google Calendar</Text>
                            <Text style={[styles.providerStatus, googleConnected && styles.providerStatusConnected]}>
                                {isConnectingGoogle ? 'Connecting...' : googleConnected ? googleEmail || 'Connected' : 'Not connected'}
                            </Text>
                        </View>
                    </View>

                    {googleConnected ? (
                        <>
                            {/* Sync Status */}
                            <View style={styles.syncInfo}>
                                <View style={styles.syncRow}>
                                    <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                                    <Text style={styles.syncText}>Primary calendar synced</Text>
                                </View>
                                <View style={styles.syncRow}>
                                    <Ionicons name="time-outline" size={16} color="#9ca3af" />
                                    <Text style={styles.syncTextMuted}>Last synced: {formatLastSynced()}</Text>
                                </View>
                                {googleEmail && (
                                    <View style={styles.syncRow}>
                                        <Ionicons name="mail-outline" size={16} color="#9ca3af" />
                                        <Text style={styles.syncTextMuted}>{googleEmail}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Disconnect */}
                            <View style={styles.actionRow}>
                                <View style={{ flex: 1 }} />
                                <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnectGoogle}>
                                    <Text style={styles.disconnectButtonText}>Disconnect</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <TouchableOpacity
                            style={[styles.connectButton, styles.connectGoogleButton]}
                            onPress={handleConnectGoogle}
                            disabled={isConnectingGoogle}
                        >
                            {isConnectingGoogle ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="logo-google" size={18} color="#fff" />
                                    <Text style={styles.connectButtonText}>Connect with Google</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Sync Events Button */}
                {isConnected && (
                    <TouchableOpacity
                        style={styles.syncButton}
                        onPress={triggerSync}
                        disabled={isSyncing}
                    >
                        {isSyncing ? (
                            <ActivityIndicator size="small" color="#6366f1" />
                        ) : (
                            <Ionicons name="sync-outline" size={18} color="#6366f1" />
                        )}
                        <Text style={styles.syncButtonText}>
                            {isSyncing ? 'Syncing events...' : 'Sync Events Now'}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Event Reminders Section */}
                {isConnected && (
                    <View style={styles.reminderSection}>
                        <View style={styles.reminderHeader}>
                            <Ionicons name="notifications-outline" size={20} color="#5D4E37" />
                            <Text style={styles.reminderTitle}>Event Reminders</Text>
                        </View>

                        {/* Toggle */}
                        <View style={styles.reminderRow}>
                            <View style={styles.reminderRowInfo}>
                                <Text style={styles.reminderRowLabel}>
                                    Evening reminder before events
                                </Text>
                                <Text style={styles.reminderRowHint}>
                                    Remind to prep outfit the night before
                                </Text>
                            </View>
                            <Switch
                                value={reminderPrefs.enabled}
                                onValueChange={handleToggleReminder}
                                trackColor={{ false: '#d1d5db', true: '#c7d2fe' }}
                                thumbColor={reminderPrefs.enabled ? '#6366f1' : '#f4f3f4'}
                            />
                        </View>

                        {reminderPrefs.enabled && (
                            <>
                                {/* Time picker */}
                                <View style={styles.reminderTimeSection}>
                                    <Text style={styles.reminderSubLabel}>Reminder time</Text>
                                    <View style={styles.timeChips}>
                                        {['18:00', '19:00', '20:00', '21:00', '22:00'].map(t => {
                                            const hour = parseInt(t.split(':')[0], 10);
                                            const label = hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
                                            const isSelected = reminderPrefs.time === t;
                                            return (
                                                <TouchableOpacity
                                                    key={t}
                                                    style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                                                    onPress={() => handleSetReminderTime(t)}
                                                >
                                                    <Text style={[
                                                        styles.timeChipText,
                                                        isSelected && styles.timeChipTextSelected,
                                                    ]}>
                                                        {label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Event type checkboxes */}
                                <View style={styles.reminderTypesSection}>
                                    <Text style={styles.reminderSubLabel}>Remind me for</Text>
                                    {[
                                        { type: 'work', label: 'Work events', icon: 'briefcase-outline' },
                                        { type: 'formal', label: 'Formal events', icon: 'sparkles-outline' },
                                        { type: 'social', label: 'Social events', icon: 'people-outline' },
                                        { type: 'active', label: 'Active events', icon: 'fitness-outline' },
                                    ].map(({ type, label, icon }) => {
                                        const checked = reminderPrefs.eventTypes.includes(type);
                                        return (
                                            <TouchableOpacity
                                                key={type}
                                                style={styles.typeRow}
                                                onPress={() => handleToggleEventType(type)}
                                            >
                                                <Ionicons
                                                    name={checked ? 'checkbox' : 'square-outline'}
                                                    size={22}
                                                    color={checked ? '#6366f1' : '#9ca3af'}
                                                />
                                                <Ionicons name={icon as any} size={16} color="#5D4E37" />
                                                <Text style={styles.typeLabel}>{label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        )}
                    </View>
                )}

                {/* Overall Status */}
                {isConnected && (
                    <View style={styles.overallStatus}>
                        <Ionicons name="shield-checkmark-outline" size={18} color="#22c55e" />
                        <Text style={styles.overallStatusText}>
                            Calendar data stays on your device and is never shared.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Calendar Selector Modal */}
            <CalendarSelector
                visible={showCalendarSelector}
                onClose={() => setShowCalendarSelector(false)}
                calendars={availableAppleCalendars}
                selectedIds={appleSelectedCalendars.map(c => c.id)}
                onSelectionChange={handleCalendarSelectionChange}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 16,
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        flex: 1,
        fontSize: 22,
        fontWeight: '600',
        color: '#1f2937',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },

    // Explanation Card
    explanationCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
    },
    explanationIcon: {
        fontSize: 32,
        marginBottom: 12,
    },
    explanationTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    explanationText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
    },

    // Provider Card
    providerCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
    },
    providerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 4,
    },
    providerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    providerIconConnected: {
        backgroundColor: '#1f2937',
    },
    googleIcon: {
        backgroundColor: '#eef2ff',
    },
    providerIconConnectedGoogle: {
        backgroundColor: '#4285F4',
    },
    providerInfo: {
        flex: 1,
    },
    providerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    providerStatus: {
        fontSize: 13,
        color: '#9ca3af',
        marginTop: 1,
    },
    providerStatusConnected: {
        color: '#22c55e',
    },

    // Sync Info
    syncInfo: {
        backgroundColor: '#f9fafb',
        borderRadius: 10,
        padding: 12,
        marginTop: 12,
        gap: 8,
    },
    syncRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    syncText: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '500',
    },
    syncTextMuted: {
        fontSize: 13,
        color: '#9ca3af',
    },

    // Calendar List
    calendarList: {
        marginTop: 12,
        gap: 8,
    },
    calendarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 4,
    },
    calendarDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    calendarName: {
        fontSize: 14,
        color: '#374151',
        flex: 1,
    },
    calendarSource: {
        fontSize: 12,
        color: '#9ca3af',
    },

    // Action Row
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 14,
        gap: 12,
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: '#eef2ff',
    },
    selectButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },
    disconnectButton: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: '#fef2f2',
    },
    disconnectButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ef4444',
    },

    // Connect Button
    connectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 14,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#1f2937',
    },
    connectGoogleButton: {
        backgroundColor: '#4285F4',
    },
    connectButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },

    // Sync Button
    syncButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
        paddingVertical: 12,
        backgroundColor: '#eef2ff',
        borderRadius: 12,
    },
    syncButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },

    // Reminder Section
    reminderSection: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
    },
    reminderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    reminderTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    reminderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reminderRowInfo: {
        flex: 1,
        marginRight: 12,
    },
    reminderRowLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    reminderRowHint: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },
    reminderTimeSection: {
        marginTop: 16,
    },
    reminderSubLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#5D4E37',
        marginBottom: 8,
    },
    timeChips: {
        flexDirection: 'row',
        gap: 6,
    },
    timeChip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    timeChipSelected: {
        backgroundColor: '#eef2ff',
    },
    timeChipText: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    timeChipTextSelected: {
        color: '#6366f1',
    },
    reminderTypesSection: {
        marginTop: 16,
        gap: 10,
    },
    typeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    typeLabel: {
        fontSize: 14,
        color: '#374151',
    },

    // Overall Status
    overallStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 20,
        paddingHorizontal: 4,
    },
    overallStatusText: {
        fontSize: 13,
        color: '#6b7280',
        flex: 1,
        lineHeight: 18,
    },
});
