/**
 * Privacy Screen
 * Data transparency, analytics opt-out, and account deletion
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../stores/authStore';

const ANALYTICS_KEY = 'privacy_analytics_optout';

interface DataCategory {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
}

const DATA_CATEGORIES: DataCategory[] = [
    {
        icon: 'shirt-outline',
        title: 'Wardrobe Items',
        description: 'Photos, categories, colors, brands, and metadata for your clothing items',
    },
    {
        icon: 'layers-outline',
        title: 'Outfit History',
        description: 'Saved outfits, AI-generated suggestions, and favorites',
    },
    {
        icon: 'calendar-outline',
        title: 'Wear Logs',
        description: 'Records of when you wore each item or outfit',
    },
    {
        icon: 'location-outline',
        title: 'Location',
        description: 'Your city for weather-based outfit recommendations (not precise GPS)',
    },
    {
        icon: 'trophy-outline',
        title: 'Gamification',
        description: 'Style points, badges, streaks, and level progress',
    },
];

export default function PrivacyScreen() {
    const router = useRouter();
    const { signOut } = useAuthStore();
    const [analyticsOptOut, setAnalyticsOptOut] = useState(false);
    const [showDataInfo, setShowDataInfo] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(ANALYTICS_KEY).then(val => {
            if (val === 'true') setAnalyticsOptOut(true);
        });
    }, []);

    const toggleAnalytics = async () => {
        const newValue = !analyticsOptOut;
        setAnalyticsOptOut(newValue);
        await AsyncStorage.setItem(ANALYTICS_KEY, String(newValue));
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This will permanently delete your account and all associated data. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Account',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Are you sure?',
                            'To complete account deletion, you will be signed out. Please contact support@vestiaire.app to finalize the removal of your data.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Sign Out & Request Deletion',
                                    style: 'destructive',
                                    onPress: async () => {
                                        await signOut();
                                        router.replace('/');
                                    },
                                },
                            ]
                        );
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/profile')}>
                    <Ionicons name="chevron-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Privacy</Text>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Data We Store */}
                <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => setShowDataInfo(!showDataInfo)}
                    activeOpacity={0.7}
                >
                    <View style={styles.sectionHeaderLeft}>
                        <Ionicons name="server-outline" size={22} color="#6366f1" />
                        <Text style={styles.sectionHeaderText}>Data We Store</Text>
                    </View>
                    <Ionicons
                        name={showDataInfo ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#9ca3af"
                    />
                </TouchableOpacity>

                {showDataInfo && (
                    <View style={styles.dataList}>
                        {DATA_CATEGORIES.map((item, index) => (
                            <View key={index} style={styles.dataItem}>
                                <Ionicons name={item.icon} size={20} color="#6b7280" />
                                <View style={styles.dataItemText}>
                                    <Text style={styles.dataItemTitle}>{item.title}</Text>
                                    <Text style={styles.dataItemDesc}>{item.description}</Text>
                                </View>
                            </View>
                        ))}
                        <View style={styles.dataNote}>
                            <Text style={styles.dataNoteText}>
                                All data is stored securely on Supabase servers. Photos are stored in encrypted cloud storage. We never sell your data to third parties.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Analytics Opt-Out */}
                <View style={styles.card}>
                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <Ionicons name="analytics-outline" size={22} color="#6b7280" />
                            <View style={styles.toggleText}>
                                <Text style={styles.toggleLabel}>Opt Out of Analytics</Text>
                                <Text style={styles.toggleDescription}>
                                    Disable anonymous usage analytics used to improve the app
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={analyticsOptOut}
                            onValueChange={toggleAnalytics}
                            trackColor={{ false: '#d1d5db', true: '#c7d2fe' }}
                            thumbColor={analyticsOptOut ? '#6366f1' : '#f4f3f4'}
                        />
                    </View>
                </View>

                {/* Delete Account */}
                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    <Text style={styles.deleteButtonText}>Delete Account</Text>
                </TouchableOpacity>

                <Text style={styles.deleteNote}>
                    Deleting your account will remove all your wardrobe data, outfits, and history permanently.
                </Text>
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
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginBottom: 2,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sectionHeaderText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    dataList: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        paddingHorizontal: 16,
        paddingBottom: 16,
        marginBottom: 16,
    },
    dataItem: {
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    dataItemText: {
        flex: 1,
    },
    dataItemTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1f2937',
        marginBottom: 2,
    },
    dataItemDesc: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
    },
    dataNote: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
    },
    dataNoteText: {
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 18,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 4,
        marginBottom: 24,
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
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fef2f2',
        borderRadius: 12,
        paddingVertical: 16,
        gap: 8,
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ef4444',
    },
    deleteNote: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 24,
        lineHeight: 18,
    },
});
