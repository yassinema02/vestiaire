/**
 * Notifications Screen
 * Notification preferences saved to AsyncStorage
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OotdNotificationPreference, OotdReminderPreferences } from '../../types/social';
import { ootdNotificationService } from '../../services/ootdNotificationService';
import { ootdReminderService } from '../../services/ootdReminderService';

const PREF_KEYS = {
    outfitSuggestions: 'notif_outfit_suggestions',
    wearReminders: 'notif_wear_reminders',
    weeklyDigest: 'notif_weekly_digest',
} as const;

interface NotifPreferences {
    outfitSuggestions: boolean;
    wearReminders: boolean;
    weeklyDigest: boolean;
}

const DEFAULTS: NotifPreferences = {
    outfitSuggestions: true,
    wearReminders: true,
    weeklyDigest: false,
};

const OOTD_OPTIONS: { label: string; value: OotdNotificationPreference }[] = [
    { label: 'All', value: 'all' },
    { label: 'Morning', value: 'morning_only' },
    { label: 'Off', value: 'off' },
];

export default function NotificationsScreen() {
    const router = useRouter();
    const [prefs, setPrefs] = useState<NotifPreferences>(DEFAULTS);
    const [ootdPref, setOotdPref] = useState<OotdNotificationPreference>('all');
    const [reminderPrefs, setReminderPrefs] = useState<OotdReminderPreferences>({ enabled: true, time: '09:00' });
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const keys = Object.values(PREF_KEYS);
            const results = await AsyncStorage.multiGet(keys);
            const loaded: NotifPreferences = { ...DEFAULTS };

            for (const [key, value] of results) {
                if (value === null) continue;
                const parsed = value === 'true';
                if (key === PREF_KEYS.outfitSuggestions) loaded.outfitSuggestions = parsed;
                if (key === PREF_KEYS.wearReminders) loaded.wearReminders = parsed;
                if (key === PREF_KEYS.weeklyDigest) loaded.weeklyDigest = parsed;
            }

            setPrefs(loaded);

            // Load OOTD preference
            const ootd = await ootdNotificationService.getPreference();
            setOotdPref(ootd);

            // Load OOTD reminder preferences
            const { prefs: reminder } = await ootdReminderService.getPreferences();
            setReminderPrefs(reminder);
        } catch {
            // Use defaults
        }
        setIsLoaded(true);
    };

    const togglePref = async (key: keyof NotifPreferences) => {
        const newValue = !prefs[key];
        setPrefs(prev => ({ ...prev, [key]: newValue }));
        await AsyncStorage.setItem(PREF_KEYS[key], String(newValue));
    };

    const handleOotdPrefChange = async (value: OotdNotificationPreference) => {
        setOotdPref(value);
        await ootdNotificationService.updatePreference(value);
    };

    const handleReminderToggle = async () => {
        const newEnabled = !reminderPrefs.enabled;
        setReminderPrefs(prev => ({ ...prev, enabled: newEnabled }));
        await ootdReminderService.updatePreferences({ enabled: newEnabled });
    };

    const cycleReminderTime = async () => {
        // Cycle through common times: 07:00 → 08:00 → 09:00 → 10:00 → 11:00 → 07:00
        const times = ['07:00', '08:00', '09:00', '10:00', '11:00'];
        const currentIdx = times.indexOf(reminderPrefs.time);
        const nextTime = times[(currentIdx + 1) % times.length];
        setReminderPrefs(prev => ({ ...prev, time: nextTime }));
        await ootdReminderService.updatePreferences({ time: nextTime });
    };

    const formatTime = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    if (!isLoaded) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/profile')}>
                    <Ionicons name="chevron-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Info Banner */}
                <View style={styles.infoBanner}>
                    <Ionicons name="information-circle" size={20} color="#6366f1" />
                    <Text style={styles.infoBannerText}>
                        Push notifications will activate when running a development build. Your preferences are saved for when they're enabled.
                    </Text>
                </View>

                {/* Toggles */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>

                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <Ionicons name="shirt-outline" size={22} color="#6366f1" />
                            <View style={styles.toggleText}>
                                <Text style={styles.toggleLabel}>Outfit Suggestions</Text>
                                <Text style={styles.toggleDescription}>
                                    Get daily outfit recommendations based on weather and events
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={prefs.outfitSuggestions}
                            onValueChange={() => togglePref('outfitSuggestions')}
                            trackColor={{ false: '#d1d5db', true: '#c7d2fe' }}
                            thumbColor={prefs.outfitSuggestions ? '#6366f1' : '#f4f3f4'}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <Ionicons name="calendar-outline" size={22} color="#22c55e" />
                            <View style={styles.toggleText}>
                                <Text style={styles.toggleLabel}>Wear Reminders</Text>
                                <Text style={styles.toggleDescription}>
                                    Reminders to log what you wore today
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={prefs.wearReminders}
                            onValueChange={() => togglePref('wearReminders')}
                            trackColor={{ false: '#d1d5db', true: '#bbf7d0' }}
                            thumbColor={prefs.wearReminders ? '#22c55e' : '#f4f3f4'}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <Ionicons name="mail-outline" size={22} color="#f59e0b" />
                            <View style={styles.toggleText}>
                                <Text style={styles.toggleLabel}>Weekly Digest</Text>
                                <Text style={styles.toggleDescription}>
                                    Weekly summary of your wardrobe activity and style stats
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={prefs.weeklyDigest}
                            onValueChange={() => togglePref('weeklyDigest')}
                            trackColor={{ false: '#d1d5db', true: '#fde68a' }}
                            thumbColor={prefs.weeklyDigest ? '#f59e0b' : '#f4f3f4'}
                        />
                    </View>
                </View>

                {/* Social section (Story 9.6) */}
                <View style={[styles.section, { marginTop: 20 }]}>
                    <Text style={styles.sectionTitle}>Social</Text>

                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <Ionicons name="camera-outline" size={22} color="#ec4899" />
                            <View style={styles.toggleText}>
                                <Text style={styles.toggleLabel}>OOTD Posts</Text>
                                <Text style={styles.toggleDescription}>
                                    Get notified when friends share their daily outfits
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.segmentedRow}>
                        {OOTD_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[
                                    styles.segmentBtn,
                                    ootdPref === opt.value && styles.segmentBtnActive,
                                ]}
                                onPress={() => handleOotdPrefChange(opt.value)}
                            >
                                <Text
                                    style={[
                                        styles.segmentBtnText,
                                        ootdPref === opt.value && styles.segmentBtnTextActive,
                                    ]}
                                >
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoText}>
                            Quiet hours: 10 PM – 7 AM  ·  Max 3/day
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    {/* OOTD Reminder (Story 9.7) */}
                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <Ionicons name="alarm-outline" size={22} color="#8b5cf6" />
                            <View style={styles.toggleText}>
                                <Text style={styles.toggleLabel}>OOTD Reminder</Text>
                                <Text style={styles.toggleDescription}>
                                    Daily reminder to share your outfit with your Squads
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={reminderPrefs.enabled}
                            onValueChange={handleReminderToggle}
                            trackColor={{ false: '#d1d5db', true: '#ddd6fe' }}
                            thumbColor={reminderPrefs.enabled ? '#8b5cf6' : '#f4f3f4'}
                        />
                    </View>

                    {reminderPrefs.enabled && (
                        <TouchableOpacity style={styles.timeRow} onPress={cycleReminderTime}>
                            <Ionicons name="time-outline" size={18} color="#8b5cf6" />
                            <Text style={styles.timeLabel}>Reminder time</Text>
                            <Text style={styles.timeValue}>{formatTime(reminderPrefs.time)}</Text>
                            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
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
    infoBanner: {
        flexDirection: 'row',
        backgroundColor: '#eef2ff',
        borderRadius: 12,
        padding: 14,
        gap: 10,
        marginBottom: 24,
        alignItems: 'flex-start',
    },
    infoBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#4338ca',
        lineHeight: 18,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 4,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 4,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    toggleInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        flex: 1,
        marginRight: 12,
    },
    toggleText: {
        flex: 1,
    },
    toggleLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1f2937',
        marginBottom: 2,
    },
    toggleDescription: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
    },
    divider: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginHorizontal: 16,
    },
    segmentedRow: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 12,
        gap: 8,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
    },
    segmentBtnActive: {
        backgroundColor: '#ec4899',
    },
    segmentBtnText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
    },
    segmentBtnTextActive: {
        color: '#fff',
    },
    infoRow: {
        paddingHorizontal: 16,
        paddingBottom: 14,
    },
    infoText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    timeLabel: {
        flex: 1,
        fontSize: 14,
        color: '#6b7280',
    },
    timeValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8b5cf6',
    },
});
